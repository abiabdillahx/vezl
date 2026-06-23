package metrics

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"

	"github.com/google/uuid"
	"github.com/mileusna/useragent"
	db "github.com/vezl/vezl-be/internal/db/sqlc"
	"github.com/vezl/vezl-be/internal/geo"
)

type LogParams struct {
	URLID      string
	UserID     string
	IP         string
	UserAgent  string
	Language   string
	Referrer   string
	UTM        json.RawMessage
	GeoEnabled bool
}

func strToNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *s, Valid: true}
}

func LogAsync(q *db.Queries, p LogParams) {
	go func() {
		ua := useragent.Parse(p.UserAgent)

		params := db.CreateMetricParams{
			ID:       uuid.NewString(),
			UrlID:    strToNullString(&p.URLID),
			UserID:   p.UserID,
			Browser:  strToNullString(strPtr(ua.Name)),
			Os:       strToNullString(strPtr(ua.OS)),
			Language: strToNullString(strPtr(p.Language)),
			Referrer: strToNullString(strPtr(p.Referrer)),
			Utm:      p.UTM,
		}

		if ua.Mobile {
			params.Device = strToNullString(strPtr("mobile"))
		} else if ua.Tablet {
			params.Device = strToNullString(strPtr("tablet"))
		} else {
			params.Device = strToNullString(strPtr("desktop"))
		}

		if p.GeoEnabled && p.IP != "" {
			if loc, err := geo.Lookup(p.IP); err == nil {
				params.Country = strToNullString(strPtr(loc.Country))
				params.Region = strToNullString(strPtr(loc.Region))
				params.City = strToNullString(strPtr(loc.City))
			}
		}

		if err := q.CreateMetric(context.Background(), params); err != nil {
			log.Printf("metrics: failed to create metric: %v", err)
		}
	}()
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
