package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	db "github.com/vezl/vezl-be/internal/db/sqlc"
	"github.com/vezl/vezl-be/internal/middleware"
)

type MetricsHandler struct {
	q *db.Queries
}

func NewMetricsHandler(q *db.Queries) *MetricsHandler {
	return &MetricsHandler{q: q}
}

func (h *MetricsHandler) Aggregate(c *gin.Context) {
	u := middleware.GetUser(c)

	// Non-admins only ever see metrics for their own links.
	rows, err := h.q.GetAggregateMetrics(c.Request.Context(), db.GetAggregateMetricsParams{
		AllUsers: u.Role == "admin",
		UserID:   u.ID,
		FromTime: time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC),
		ToTime:   time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		UrlID:    c.Query("url_id"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}
