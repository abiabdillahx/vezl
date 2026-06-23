-- name: CreateMetric :exec
INSERT INTO metrics (id, url_id, user_id, browser, os, device, language, referrer, country, region, city, utm)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);

-- name: GetMetricsByURL :many
SELECT * FROM metrics
WHERE url_id = $1
  AND ($2::timestamptz IS NULL OR timestamp >= $2)
  AND ($3::timestamptz IS NULL OR timestamp <= $3)
ORDER BY timestamp DESC;

-- name: GetAggregateMetrics :many
SELECT url_id, browser, os, device, country, COUNT(*) as count
FROM metrics
WHERE ($1::timestamptz IS NULL OR timestamp >= $1)
  AND ($2::timestamptz IS NULL OR timestamp <= $2)
  AND ($3::text IS NULL OR url_id = $3)
GROUP BY url_id, browser, os, device, country;
