package api

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	db "github.com/vezl/vezl-be/internal/db/sqlc"
)

type MetricsHandler struct {
	q *db.Queries
}

func NewMetricsHandler(q *db.Queries) *MetricsHandler {
	return &MetricsHandler{q: q}
}

func (h *MetricsHandler) Aggregate(c *gin.Context) {
	urlID := c.Query("url_id")

	rows, err := h.q.GetAggregateMetrics(context.Background(), db.GetAggregateMetricsParams{
		Column1: time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC),
		Column2: time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC),
		Column3: urlID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}
