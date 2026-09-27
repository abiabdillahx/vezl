package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	db "github.com/abiabdillahx/vezl/server/internal/db/sqlc"
	"github.com/abiabdillahx/vezl/server/internal/dbtype"
	"github.com/abiabdillahx/vezl/server/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

const shortcodeChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

type URLsHandler struct {
	q *db.Queries
}

func NewURLsHandler(q *db.Queries) *URLsHandler {
	return &URLsHandler{q: q}
}

func strToNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *s, Valid: true}
}

func timeToNullTime(t *time.Time) sql.NullTime {
	if t == nil {
		return sql.NullTime{Valid: false}
	}
	// Stored as UTC so text timestamps in SQLite compare correctly.
	return sql.NullTime{Time: t.UTC(), Valid: true}
}

func genShortcode(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = shortcodeChars[rand.Intn(len(shortcodeChars))]
	}
	return string(b)
}

// loadOwnedURL fetches the URL for :id and checks the caller may access it
// (owner or admin). Responds 404 otherwise, so foreign IDs aren't disclosed.
func (h *URLsHandler) loadOwnedURL(c *gin.Context) (db.Url, bool) {
	u := middleware.GetUser(c)
	url, err := h.q.GetURLByID(c.Request.Context(), c.Param("id"))
	if err != nil || (u.Role != "admin" && url.UserID != u.ID) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return db.Url{}, false
	}
	return url, true
}

func (h *URLsHandler) List(c *gin.Context) {
	u := middleware.GetUser(c)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if u.Role == "admin" {
		urls, err := h.q.ListAllURLsWithUser(context.Background(), db.ListAllURLsWithUserParams{
			Limit: int64(limit), Offset: int64(offset),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, urls)
		return
	}

	urls, err := h.q.ListURLsByUser(context.Background(), db.ListURLsByUserParams{
		UserID: u.ID, Limit: int64(limit), Offset: int64(offset),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, urls)
}

func (h *URLsHandler) Create(c *gin.Context) {
	u := middleware.GetUser(c)
	var body struct {
		OriginalURL string          `json:"original_url" binding:"required"`
		Shortcode   string          `json:"shortcode"`
		Notes       *string         `json:"notes"`
		Secret      *string         `json:"secret"`
		HitLimit    *int64          `json:"hit_limit"`
		ExpiresAt   *time.Time      `json:"expires_at"`
		UTM         json.RawMessage `json:"utm"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validateTargetURL(body.OriginalURL); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	customShortcode := body.Shortcode
	if customShortcode != "" {
		if err := validateShortcode(customShortcode); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	sc := customShortcode
	if sc == "" {
		sc = genShortcode(6)
	}
	hitLimit := int64(-1)
	if body.HitLimit != nil {
		hitLimit = *body.HitLimit
	}
	utm := json.RawMessage("{}")
	if body.UTM != nil {
		utm = body.UTM
	}

	const maxRetries = 10
	var url db.Url
	var err error

	for attempt := 0; attempt < maxRetries; attempt++ {
		url, err = h.q.CreateURL(context.Background(), db.CreateURLParams{
			ID:          uuid.NewString(),
			UserID:      u.ID,
			Shortcode:   sc,
			OriginalUrl: body.OriginalURL,
			Notes:       strToNullString(body.Notes),
			Secret:      strToNullString(body.Secret),
			Active:      true,
			HitLimit:    hitLimit,
			ExpiresAt:   timeToNullTime(body.ExpiresAt),
			Utm:         dbtype.JSON(utm),
		})
		if err == nil {
			c.JSON(http.StatusCreated, url)
			return
		}

		// Check for unique constraint violation on shortcode
		var sqliteErr *sqlite.Error
		if errors.As(err, &sqliteErr) && sqliteErr.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE {
			if customShortcode != "" {
				// User provided a shortcode — tell them it's taken
				c.JSON(http.StatusConflict, gin.H{"error": "Shortcode already taken"})
				return
			}
			// Auto-generated — retry with a new random shortcode
			sc = genShortcode(6)
			continue
		}

		// Other DB error
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusConflict, gin.H{"error": "Failed to generate unique shortcode, please try again"})
}

func (h *URLsHandler) Get(c *gin.Context) {
	url, ok := h.loadOwnedURL(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, url)
}

func (h *URLsHandler) Update(c *gin.Context) {
	existing, ok := h.loadOwnedURL(c)
	if !ok {
		return
	}
	var body struct {
		OriginalURL string          `json:"original_url" binding:"required"`
		Notes       *string         `json:"notes"`
		Secret      *string         `json:"secret"`
		Active      bool            `json:"active"`
		HitLimit    int64           `json:"hit_limit"`
		ExpiresAt   *time.Time      `json:"expires_at"`
		UTM         json.RawMessage `json:"utm"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateTargetURL(body.OriginalURL); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	utm := json.RawMessage("{}")
	if body.UTM != nil {
		utm = body.UTM
	}
	url, err := h.q.UpdateURL(context.Background(), db.UpdateURLParams{
		ID:          existing.ID,
		OriginalUrl: body.OriginalURL,
		Notes:       strToNullString(body.Notes),
		Secret:      strToNullString(body.Secret),
		Active:      body.Active,
		HitLimit:    body.HitLimit,
		ExpiresAt:   timeToNullTime(body.ExpiresAt),
		Utm:         dbtype.JSON(utm),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, url)
}

func (h *URLsHandler) Delete(c *gin.Context) {
	url, ok := h.loadOwnedURL(c)
	if !ok {
		return
	}
	if err := h.q.DeleteURL(context.Background(), url.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *URLsHandler) Stats(c *gin.Context) {
	url, ok := h.loadOwnedURL(c)
	if !ok {
		return
	}
	metrics, err := h.q.GetMetricsByURL(context.Background(), db.GetMetricsByURLParams{
		UrlID:    strToNullString(&url.ID),
		FromTime: time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC),
		ToTime:   time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, metrics)
}
