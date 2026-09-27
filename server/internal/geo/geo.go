// Package geo resolves IPs to locations from a local DB-IP City Lite
// (MaxMind-format .mmdb) database, so clicks never wait on a network call.
//
// IP geolocation by DB-IP.com (https://db-ip.com), licensed CC BY 4.0.
package geo

import (
	"compress/gzip"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/oschwald/geoip2-golang"
)

type Location struct {
	Country string
	Region  string
	City    string
}

// DB-IP publishes a new Lite database at the start of every month.
const (
	downloadURL   = "https://download.db-ip.com/free/dbip-city-lite-%s.mmdb.gz"
	maxAge        = 35 * 24 * time.Hour
	checkInterval = 24 * time.Hour
)

// Resolver looks up IPs in the .mmdb file at path. It is safe for concurrent
// use; with auto-update it downloads the database when missing or stale and
// swaps it in without a restart. Lookups return false until a database is loaded.
type Resolver struct {
	path   string
	mu     sync.RWMutex
	reader *geoip2.Reader
	client *http.Client
}

func NewResolver(path string, autoUpdate bool) *Resolver {
	r := &Resolver{path: path, client: &http.Client{Timeout: 5 * time.Minute}}
	if err := r.load(); err != nil && !os.IsNotExist(err) {
		log.Printf("geo: %v", err)
	}
	if autoUpdate {
		go r.updateLoop()
	} else if r.current() == nil {
		log.Printf("geo: no database at %s, locations will be empty", path)
	}
	return r
}

func (r *Resolver) Lookup(ip string) (Location, bool) {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return Location{}, false
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.reader == nil {
		return Location{}, false
	}
	rec, err := r.reader.City(parsed)
	if err != nil {
		return Location{}, false
	}
	loc := Location{Country: rec.Country.Names["en"], City: rec.City.Names["en"]}
	if len(rec.Subdivisions) > 0 {
		loc.Region = rec.Subdivisions[0].Names["en"]
	}
	return loc, loc.Country != ""
}

func (r *Resolver) current() *geoip2.Reader {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.reader
}

// load (re)opens the database file and swaps it in, closing the old reader.
func (r *Resolver) load() error {
	reader, err := geoip2.Open(r.path)
	if err != nil {
		return err
	}
	r.mu.Lock()
	old := r.reader
	r.reader = reader
	r.mu.Unlock()
	if old != nil {
		old.Close()
	}
	return nil
}

func (r *Resolver) updateLoop() {
	for {
		if r.stale() {
			if err := r.download(); err != nil {
				log.Printf("geo: update failed: %v", err)
			} else if err := r.load(); err != nil {
				log.Printf("geo: load after update: %v", err)
			} else {
				log.Printf("geo: database updated (%s)", r.path)
			}
		}
		time.Sleep(checkInterval)
	}
}

func (r *Resolver) stale() bool {
	info, err := os.Stat(r.path)
	return err != nil || time.Since(info.ModTime()) > maxAge
}

// download fetches this month's database (falling back to last month's, which
// is still current in the first days of a month) into place atomically.
func (r *Resolver) download() error {
	now := time.Now().UTC()
	var lastErr error
	for _, month := range []time.Time{now, now.AddDate(0, -1, 0)} {
		url := fmt.Sprintf(downloadURL, month.Format("2006-01"))
		if lastErr = r.fetch(url); lastErr == nil {
			return nil
		}
	}
	return lastErr
}

func (r *Resolver) fetch(url string) error {
	resp, err := r.client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: %s", url, resp.Status)
	}
	gz, err := gzip.NewReader(resp.Body)
	if err != nil {
		return err
	}
	defer gz.Close()

	if err := os.MkdirAll(filepath.Dir(r.path), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(r.path), ".geo-*.mmdb")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if _, err := io.Copy(tmp, gz); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	// Refuse to replace a working database with a corrupt download.
	check, err := geoip2.Open(tmp.Name())
	if err != nil {
		return fmt.Errorf("downloaded database is invalid: %w", err)
	}
	check.Close()
	return os.Rename(tmp.Name(), r.path)
}
