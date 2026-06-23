package middleware

import (
	"context"
	"crypto/sha256"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vezl/vezl-be/internal/db/sqlc"
)

const UserKey = "user"

type AuthUser struct {
	ID       string
	Email    string
	Username string
	Role     string
}

func Auth(q *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try session cookie first
		cookie, err := c.Cookie("vezl_session")
		if err == nil && cookie != "" {
			sess, err := q.GetSessionByToken(context.Background(), cookie)
			if err == nil {
				c.Set(UserKey, &AuthUser{
					ID:       sess.UserID,
					Email:    sess.Email,
					Username: sess.Username,
					Role:     sess.Role,
				})
				c.Next()
				return
			}
		}

		// Try Bearer token (API key)
		auth := c.GetHeader("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			raw := strings.TrimPrefix(auth, "Bearer ")
			hash := fmt.Sprintf("%x", sha256.Sum256([]byte(raw)))
			key, err := q.GetAPIKeyByHash(context.Background(), hash)
			if err == nil {
				// Update last used async
				go q.UpdateAPIKeyLastUsed(context.Background(), key.ID)
				c.Set(UserKey, &AuthUser{
					ID:       key.UserID,
					Email:    key.Email,
					Username: key.Username,
					Role:     key.Role,
				})
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
	}
}

func GetUser(c *gin.Context) *AuthUser {
	u, _ := c.Get(UserKey)
	user, _ := u.(*AuthUser)
	return user
}
