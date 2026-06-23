package api

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	db "github.com/vezl/vezl-be/internal/db/sqlc"
)

type WatchlistHandler struct {
	q *db.Queries
}

func NewWatchlistHandler(q *db.Queries) *WatchlistHandler {
	return &WatchlistHandler{q: q}
}

func (h *WatchlistHandler) List(c *gin.Context) {
	items, err := h.q.ListWatchlist(context.Background())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *WatchlistHandler) Create(c *gin.Context) {
	var body struct {
		Domain  string  `json:"domain" binding:"required"`
		Allowed bool    `json:"allowed"`
		Note    *string `json:"note"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	item, err := h.q.CreateWatchlistEntry(context.Background(), db.CreateWatchlistEntryParams{
		ID:      uuid.NewString(),
		Domain:  body.Domain,
		Allowed: body.Allowed,
		Note:    strToNullString(body.Note),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *WatchlistHandler) Delete(c *gin.Context) {
	if err := h.q.DeleteWatchlistEntry(context.Background(), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
