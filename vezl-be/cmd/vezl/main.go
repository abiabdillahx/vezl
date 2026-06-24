package main

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"runtime"

	"github.com/vezl/vezl-be/internal/api"
	"github.com/vezl/vezl-be/internal/config"
	db "github.com/vezl/vezl-be/internal/db/sqlc"
	"github.com/vezl/vezl-be/internal/metrics"
	"github.com/vezl/vezl-be/internal/middleware"
	"github.com/vezl/vezl-be/internal/static"
	"golang.org/x/crypto/bcrypt"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

const forbiddenPage = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>403 Forbidden</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <style>
        body { background-color: #09090b; color: #fafafa; font-family: Outfit, sans-serif; display: flex; height: 100vh; margin: 0; align-items: center; justify-content: center; text-align: center; }
        .container { max-width: 400px; padding: 2rem; }
        h1 { color: #f31260; margin-bottom: 1rem; }
        p { color: #a1a1aa; margin-bottom: 1.5rem; }
        a { color: #006FEE; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
<div class="container">
    <h1>403 Forbidden</h1>
    <p>Access to this link is blocked due to security policy.</p>
    <p>If you believe this is a mistake, please contact the administrator.</p>
</div>
</body>
</html>`
func main() {
	cfg := config.Load()

	// DB pool
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	// Run migrations
	sqlDB := stdlib.OpenDBFromPool(pool)
	runMigrations(sqlDB, migrationsFS)

	queries := db.New(sqlDB)

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
	r.GET("/debug/stats", func(c *gin.Context) {
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
		if path != "/" && !strings.Contains(path[1:], "/") {
			code := path[1:]
			if url, err := queries.GetURLByShortcode(c.Request.Context(), code); err == nil && url.Active {
				// Valid shortcode — handle redirect logic

				// Check expiry
				if url.ExpiresAt.Valid && url.ExpiresAt.Time.Before(time.Now()) {
					c.Status(http.StatusGone)
					return
				}

				// Check hit limit
				if url.HitLimit != -1 && url.Hit >= url.HitLimit {
					c.Status(http.StatusGone)
					return
				}

				// Check watchlist: block redirect to blacklisted domains
				if urlDomain := extractDomain(url.OriginalUrl); urlDomain != "" {
					if entry, wlErr := queries.GetWatchlistByDomain(c.Request.Context(), urlDomain); wlErr == nil && !entry.Allowed {
						c.Data(http.StatusForbidden, "text/html; charset=utf-8", []byte(forbiddenPage))
						return
					}
				}

				if url.Secret.Valid {
					c.JSON(http.StatusOK, gin.H{"protected": true, "shortcode": code})
					return
				}
				// Async: increment hit + log metric
				go queries.IncrementHit(context.Background(), url.ID)

				utm := json.RawMessage("{}")
				if url.Utm != nil {
					utm = url.Utm
				}
				metrics.LogAsync(queries, metrics.LogParams{
					URLID:      url.ID,
					UserID:     url.UserID,
					IP:         c.ClientIP(),
					UserAgent:  c.GetHeader("User-Agent"),
					Language:   c.GetHeader("Accept-Language"),
					Referrer:   c.GetHeader("Referer"),
					UTM:        utm,
					GeoEnabled: cfg.GeoEnabled,
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

func runMigrations(sqlDB *sql.DB, fsys embed.FS) {
	src, err := iofs.New(fsys, "migrations")
	if err != nil {
		log.Fatalf("migrations source: %v", err)
	}
	driver, err := postgres.WithInstance(sqlDB, &postgres.Config{})
	if err != nil {
		log.Fatalf("migrations driver: %v", err)
	}
	m, err := migrate.NewWithInstance("iofs", src, "postgres", driver)
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

func extractDomain(rawURL string) string {
	rawURL = strings.TrimPrefix(rawURL, "https://")
	rawURL = strings.TrimPrefix(rawURL, "http://")
	parts := strings.SplitN(rawURL, "/", 2)
	return parts[0]
}
