package api

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	db "github.com/vezl/vezl-be/internal/db/sqlc"
	"golang.org/x/crypto/bcrypt"
)

type UsersHandler struct {
	q *db.Queries
}

func NewUsersHandler(q *db.Queries) *UsersHandler {
	return &UsersHandler{q: q}
}

func (h *UsersHandler) List(c *gin.Context) {
	users, err := h.q.ListUsers(context.Background())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *UsersHandler) Create(c *gin.Context) {
	var body struct {
		Email    string `json:"email" binding:"required"`
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Role == "" {
		body.Role = "member"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "hash failed"})
		return
	}

	user, err := h.q.CreateUser(context.Background(), db.CreateUserParams{
		ID:       uuid.NewString(),
		Email:    body.Email,
		Username: body.Username,
		Password: string(hash),
		Role:     body.Role,
	})
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, user)
}

func (h *UsersHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Email    string  `json:"email" binding:"required"`
		Username string  `json:"username" binding:"required"`
		Role     string  `json:"role" binding:"required"`
		Password *string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update email, username, role
	user, err := h.q.UpdateUser(context.Background(), db.UpdateUserParams{
		ID: id, Email: body.Email, Username: body.Username, Role: body.Role,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Optionally update password
	if body.Password != nil && *body.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(*body.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "hash failed"})
			return
		}
		if err := h.q.UpdatePassword(context.Background(), db.UpdatePasswordParams{
			ID: id, Password: string(hash),
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, user)
}

func (h *UsersHandler) Delete(c *gin.Context) {
	if err := h.q.DeleteUser(context.Background(), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
