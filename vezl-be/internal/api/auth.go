package api

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vezl/vezl-be/internal/config"
	db "github.com/vezl/vezl-be/internal/db/sqlc"
	"github.com/vezl/vezl-be/internal/middleware"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	q   *db.Queries
	cfg *config.Config
}

func NewAuthHandler(q *db.Queries, cfg *config.Config) *AuthHandler {
	return &AuthHandler{q: q, cfg: cfg}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var body struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.q.GetUserByEmail(context.Background(), body.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(body.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	token := uuid.NewString()
	expiresAt := time.Now().AddDate(0, 0, h.cfg.SessionExpiryDays)
	_, err = h.q.CreateSession(context.Background(), db.CreateSessionParams{
		ID:        uuid.NewString(),
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create session"})
		return
	}

	c.SetCookie("vezl_session", token, int(time.Until(expiresAt).Seconds()), "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"user": gin.H{
		"id": user.ID, "email": user.Email, "username": user.Username, "role": user.Role,
	}})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	cookie, err := c.Cookie("vezl_session")
	if err == nil {
		h.q.DeleteSession(context.Background(), cookie)
	}
	c.SetCookie("vezl_session", "", -1, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *AuthHandler) Me(c *gin.Context) {
	u := middleware.GetUser(c)
	c.JSON(http.StatusOK, gin.H{
		"id": u.ID, "email": u.Email, "username": u.Username, "role": u.Role,
	})
}
