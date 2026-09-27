package metrics

import (
	"context"
	"database/sql"
	"log"
	"sync/atomic"
	"time"

	db "github.com/abiabdillahx/vezl/server/internal/db/sqlc"
	"github.com/abiabdillahx/vezl/server/internal/dbtype"
	"github.com/abiabdillahx/vezl/server/internal/geo"
	"github.com/google/uuid"
	"github.com/mileusna/useragent"
)

// Click is one redirect to record: a hit increment plus a metrics row.
type Click struct {
	URLID     string
	UserID    string
	IP        string
	UserAgent string
	Language  string
	Referrer  string
	UTM       dbtype.JSON
}

const (
	// Bounds memory under traffic spikes: at most queueSize clicks wait in
	// memory (~a few MB); beyond that clicks are dropped, not buffered.
	queueSize  = 8192
	batchSize  = 256
	flushEvery = 500 * time.Millisecond
)

// Recorder writes clicks from a single background goroutine, batching them
// into one transaction so SQLite sees one writer and one commit per batch.
type Recorder struct {
	db      *sql.DB
	q       *db.Queries
	geo     *geo.Resolver // nil disables geo lookup
	clicks  chan Click
	dropped atomic.Int64
}

func NewRecorder(sqlDB *sql.DB, q *db.Queries, g *geo.Resolver) *Recorder {
	r := &Recorder{db: sqlDB, q: q, geo: g, clicks: make(chan Click, queueSize)}
	go r.run()
	go r.reportDrops()
	return r
}

// Record enqueues a click without blocking the redirect. If the queue is full
// the click is dropped (and counted) rather than letting memory grow.
func (r *Recorder) Record(c Click) {
	select {
	case r.clicks <- c:
	default:
		r.dropped.Add(1)
	}
}

func (r *Recorder) run() {
	batch := make([]Click, 0, batchSize)
	ticker := time.NewTicker(flushEvery)
	defer ticker.Stop()
	for {
		select {
		case c := <-r.clicks:
			batch = append(batch, c)
			if len(batch) < batchSize {
				continue
			}
		case <-ticker.C:
			if len(batch) == 0 {
				continue
			}
		}
		r.flush(batch)
		batch = batch[:0]
	}
}

func (r *Recorder) flush(batch []Click) {
	ctx := context.Background()
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("metrics: begin: %v", err)
		return
	}
	defer tx.Rollback()
	qtx := r.q.WithTx(tx)
	for _, c := range batch {
		// A failed row (e.g. the link was deleted meanwhile) only skips that click.
		if err := qtx.IncrementHit(ctx, c.URLID); err != nil {
			log.Printf("metrics: increment hit: %v", err)
			continue
		}
		if err := qtx.CreateMetric(ctx, r.params(c)); err != nil {
			log.Printf("metrics: create metric: %v", err)
		}
	}
	if err := tx.Commit(); err != nil {
		log.Printf("metrics: commit %d clicks: %v", len(batch), err)
	}
}

func (r *Recorder) params(c Click) db.CreateMetricParams {
	ua := useragent.Parse(c.UserAgent)
	p := db.CreateMetricParams{
		ID:       uuid.NewString(),
		UrlID:    nullString(c.URLID),
		UserID:   c.UserID,
		Browser:  nullString(ua.Name),
		Os:       nullString(ua.OS),
		Device:   nullString("desktop"),
		Language: nullString(c.Language),
		Referrer: nullString(c.Referrer),
		Utm:      c.UTM,
	}
	if ua.Mobile {
		p.Device = nullString("mobile")
	} else if ua.Tablet {
		p.Device = nullString("tablet")
	}
	if r.geo != nil {
		if loc, ok := r.geo.Lookup(c.IP); ok {
			p.Country = nullString(loc.Country)
			p.Region = nullString(loc.Region)
			p.City = nullString(loc.City)
		}
	}
	return p
}

func (r *Recorder) reportDrops() {
	for range time.Tick(time.Minute) {
		if n := r.dropped.Swap(0); n > 0 {
			log.Printf("metrics: queue full, dropped %d clicks in the last minute", n)
		}
	}
}

func nullString(s string) sql.NullString {
	return sql.NullString{String: s, Valid: s != ""}
}
