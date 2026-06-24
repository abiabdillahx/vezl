package redirect

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	db "github.com/vezl/vezl-be/internal/db/sqlc"
	"github.com/vezl/vezl-be/internal/errors"
	"github.com/vezl/vezl-be/internal/metrics"
)

type Handler struct {
	q          *db.Queries
	geoEnabled bool
}

func NewHandler(q *db.Queries, geoEnabled bool) *Handler {
	return &Handler{q: q, geoEnabled: geoEnabled}
}

func (h *Handler) Redirect(c *gin.Context) {
	shortcode := c.Param("shortcode")

	url, err := h.q.GetURLByShortcode(context.Background(), shortcode)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}

	// Check active
	if !url.Active {
		c.Status(http.StatusNotFound)
		return
	}

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

	// Check watchlist
	domain := extractDomain(url.OriginalUrl)
	if domain != "" {
		entry, err := h.q.GetWatchlistByDomain(context.Background(), domain)
		if err == nil && !entry.Allowed {
			c.Status(http.StatusForbidden)
			return
		}
	}

	// Secret-protected
	if url.Secret.Valid {
		c.JSON(http.StatusOK, gin.H{"protected": true, "shortcode": shortcode})
		return
	}

	// Async: increment hit + log metric
	go h.q.IncrementHit(context.Background(), url.ID)

	utm := json.RawMessage("{}")
	if url.Utm != nil {
		utm = url.Utm
	}
	metrics.LogAsync(h.q, metrics.LogParams{
		URLID:      url.ID,
		UserID:     url.UserID,
		IP:         c.ClientIP(),
		UserAgent:  c.GetHeader("User-Agent"),
		Language:   c.GetHeader("Accept-Language"),
		Referrer:   c.GetHeader("Referer"),
		UTM:        utm,
		GeoEnabled: h.geoEnabled,
	})

	c.Redirect(http.StatusTemporaryRedirect, url.OriginalUrl)
}

func extractDomain(rawURL string) string {
	rawURL = strings.TrimPrefix(rawURL, "https://")
	rawURL = strings.TrimPrefix(rawURL, "http://")
	parts := strings.SplitN(rawURL, "/", 2)
	return parts[0]
}
