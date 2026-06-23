package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	db "github.com/vezl/vezl-be/internal/db/sqlc"
	"github.com/vezl/vezl-be/internal/middleware"
)

type APIKeysHandler struct {
	q *db.Queries
}

func NewAPIKeysHandler(q *db.Queries) *APIKeysHandler {
	return &APIKeysHandler{q: q}
}

func (h *APIKeysHandler) List(c *gin.Context) {
	u := middleware.GetUser(c)
	keys, err := h.q.ListAPIKeysByUser(context.Background(), u.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, keys)
}

func (h *APIKeysHandler) Create(c *gin.Context) {
	u := middleware.GetUser(c)
	var body struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	raw := make([]byte, 32)
	rand.Read(raw)
	plainKey := hex.EncodeToString(raw)
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(plainKey)))

	key, err := h.q.CreateAPIKey(context.Background(), db.CreateAPIKeyParams{
		ID:      uuid.NewString(),
		UserID:  u.ID,
		Name:    body.Name,
		KeyHash: hash,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"key": key, "plain_key": plainKey})
}

func (h *APIKeysHandler) Delete(c *gin.Context) {
	u := middleware.GetUser(c)
	if err := h.q.DeleteAPIKey(context.Background(), db.DeleteAPIKeyParams{
		ID:     c.Param("id"),
		UserID: u.ID,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
