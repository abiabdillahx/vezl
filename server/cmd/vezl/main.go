package main

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/google/uuid"
	"runtime"

	"github.com/abiabdillahx/vezl/server/internal/api"
	"github.com/abiabdillahx/vezl/server/internal/config"
	"github.com/abiabdillahx/vezl/server/internal/errors"
	"github.com/abiabdillahx/vezl/server/internal/geo"
db "github.com/abiabdillahx/vezl/server/internal/db/sqlc"
	"github.com/abiabdillahx/vezl/server/internal/metrics"
	"github.com/abiabdillahx/vezl/server/internal/middleware"
	"github.com/abiabdillahx/vezl/server/internal/static"
	"golang.org/x/crypto/bcrypt"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS


func main() {
	cfg := config.Load()

	sqlDB := openDB(cfg.DatabasePath)
	defer sqlDB.Close()

	// Run migrations
	runMigrations(sqlDB, migrationsFS)

	queries := db.New(sqlDB)

	var geoResolver *geo.Resolver
	if cfg.GeoEnabled {
		geoResolver = geo.NewResolver(cfg.GeoDBPath, cfg.GeoAutoUpdate)
	}
	recorder := metrics.NewRecorder(sqlDB, queries, geoResolver)

	// Bootstrap admin
	if cfg.AdminEmail != "" && cfg.AdminPassword != "" {
		bootstrapAdmin(queries, cfg)
	}

	r := gin.Default()

	// API routes
	v1 := r.Group("/api/v1", api.FlattenNullTypes())

	authH := api.NewAuthHandler(queries, cfg)
	v1.POST("/auth/login", authH.Login)
	v1.POST("/auth/logout", authH.Logout)
	v1.GET("/auth/me", middleware.Auth(queries), authH.Me)

	authed := v1.Group("", middleware.Auth(queries))
	adminOnly := v1.Group("", middleware.Auth(queries), middleware.AdminOnly())

	urlsH := api.NewURLsHandler(queries)
	authed.GET("/urls", urlsH.List)
	authed.POST("/urls", urlsH.Create)
	authed.GET("/urls/:id", urlsH.Get)
	authed.PATCH("/urls/:id", urlsH.Update)
	authed.DELETE("/urls/:id", urlsH.Delete)
	authed.GET("/urls/:id/stats", urlsH.Stats)

	metricsH := api.NewMetricsHandler(queries)
	authed.GET("/metrics", metricsH.Aggregate)

	apikeysH := api.NewAPIKeysHandler(queries)
	authed.GET("/api-keys", apikeysH.List)
	authed.POST("/api-keys", apikeysH.Create)
	authed.DELETE("/api-keys/:id", apikeysH.Delete)

	usersH := api.NewUsersHandler(queries)
	adminOnly.GET("/users", usersH.List)
	adminOnly.POST("/users", usersH.Create)
	adminOnly.PATCH("/users/:id", usersH.Update)
	adminOnly.DELETE("/users/:id", usersH.Delete)

	watchlistH := api.NewWatchlistHandler(queries)
	adminOnly.GET("/watchlist", watchlistH.List)
	adminOnly.POST("/watchlist", watchlistH.Create)
	adminOnly.DELETE("/watchlist/:id", watchlistH.Delete)

	// Debug stats endpoint
	r.GET("/debug/stats", middleware.Auth(queries), middleware.AdminOnly(), func(c *gin.Context) {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		c.JSON(http.StatusOK, gin.H{
			"alloc_mb":       fmt.Sprintf("%.2f", float64(m.Alloc)/1024/1024),
			"sys_mb":         fmt.Sprintf("%.2f", float64(m.Sys)/1024/1024),
			"heap_alloc_mb":  fmt.Sprintf("%.2f", float64(m.HeapAlloc)/1024/1024),
			"heap_sys_mb":    fmt.Sprintf("%.2f", float64(m.HeapSys)/1024/1024),
			"heap_idle_mb":   fmt.Sprintf("%.2f", float64(m.HeapIdle)/1024/1024),
			"heap_inuse_mb":  fmt.Sprintf("%.2f", float64(m.HeapInuse)/1024/1024),
			"num_gc":         m.NumGC,
			"goroutines":     runtime.NumGoroutine(),
			"cpu_cores":      runtime.NumCPU(),
			"go_version":     runtime.Version(),
		})
	})

	// Static FE (embedded React build)
	staticFS, _ := fs.Sub(static.Dist, "dist")

	// All unmatched routes: try shortcode redirect → SPA fallback
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// 1. Serve static assets (JS, CSS, images) from embedded dist
		assetPath := strings.TrimPrefix(path, "/")
		if f, err := staticFS.Open(assetPath); err == nil {
			f.Close()
			// Set cache headers for static assets
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
			c.FileFromFS(assetPath, http.FS(staticFS))
			return
		}

		// 2. Single-segment path → try shortcode redirect
		if path != "/" && !strings.Contains(path[1:], "/") && !api.IsReservedShortcode(path[1:]) {
			code := path[1:]
			if url, err := queries.GetURLByShortcode(c.Request.Context(), code); err == nil && url.Active {
				// Valid shortcode — handle redirect logic

				// Check expiry
				if url.ExpiresAt.Valid && url.ExpiresAt.Time.Before(time.Now()) {
					c.Data(http.StatusGone, "text/html; charset=utf-8", []byte(errors.GonePage))
					return
				}

				// Check hit limit
				if url.HitLimit != -1 && url.Hit >= url.HitLimit {
					c.Data(http.StatusGone, "text/html; charset=utf-8", []byte(errors.GonePage))
					return
				}

				// Check watchlist: block redirect to blacklisted domains
				if urlDomain := api.HostOf(url.OriginalUrl); urlDomain != "" {
					if entry, wlErr := queries.GetWatchlistByDomain(c.Request.Context(), urlDomain); wlErr == nil && !entry.Allowed {
						c.Data(http.StatusForbidden, "text/html; charset=utf-8", []byte(errors.ForbiddenPage))
						return
					}
				}

				if url.Secret.Valid {
					c.JSON(http.StatusOK, gin.H{"protected": true, "shortcode": code})
					return
				}
				// Queued: hit increment + metric are written in batches off the request path
				recorder.Record(metrics.Click{
					URLID:     url.ID,
					UserID:    url.UserID,
					IP:        c.ClientIP(),
					UserAgent: c.GetHeader("User-Agent"),
					Language:  c.GetHeader("Accept-Language"),
					Referrer:  c.GetHeader("Referer"),
					UTM:       url.Utm,
				})

				c.Redirect(http.StatusTemporaryRedirect, url.OriginalUrl)
				return
			}
			// Not a valid shortcode → fall through to SPA
		}

		// 3. SPA fallback — serve index.html
		c.FileFromFS("/", http.FS(staticFS))
	})

	log.Printf("starting on :%s", cfg.Port)
	r.Run(":" + cfg.Port)
}

// openDB opens the SQLite database file, creating its directory if needed.
// WAL + busy_timeout let the async hit/metric writers run alongside reads;
// _time_format=sqlite stores time.Time as sortable UTC-offset text.
func openDB(path string) *sql.DB {
	if dir := filepath.Dir(path); dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			log.Fatalf("db dir: %v", err)
		}
	}
	dsn := "file:" + path +
		"?_pragma=foreign_keys(1)" +
		"&_pragma=journal_mode(WAL)" +
		"&_pragma=busy_timeout(5000)" +
		"&_pragma=synchronous(NORMAL)" +
		"&_pragma=journal_size_limit(16777216)" + // truncate WAL back to 16MB after checkpoints
		"&_time_format=sqlite"
	sqlDB, err := sql.Open("sqlite", dsn)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("db connect: %v", err)
	}
	return sqlDB
}

func runMigrations(sqlDB *sql.DB, fsys embed.FS) {
	src, err := iofs.New(fsys, "migrations")
	if err != nil {
		log.Fatalf("migrations source: %v", err)
	}
	driver, err := sqlite.WithInstance(sqlDB, &sqlite.Config{})
	if err != nil {
		log.Fatalf("migrations driver: %v", err)
	}
	m, err := migrate.NewWithInstance("iofs", src, "sqlite", driver)
	if err != nil {
		log.Fatalf("migrate init: %v", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("migrate up: %v", err)
	}
}

func bootstrapAdmin(q *db.Queries, cfg *config.Config) {
	_, err := q.GetUserByEmail(context.Background(), cfg.AdminEmail)
	if err == nil {
		return // already exists
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("bcrypt: %v", err)
	}
	_, err = q.CreateUser(context.Background(), db.CreateUserParams{
		ID:       uuid.NewString(),
		Email:    cfg.AdminEmail,
		Username: cfg.AdminUsername,
		Password: string(hash),
		Role:     "admin",
	})
	if err != nil {
		log.Printf("bootstrap admin: %v", err)
	} else {
		fmt.Printf("admin user created: %s\n", cfg.AdminEmail)
	}
}

