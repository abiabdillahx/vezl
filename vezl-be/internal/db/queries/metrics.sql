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
WHERE (sqlc.arg(all_users)::boolean OR user_id = sqlc.arg(user_id))
  AND timestamp >= sqlc.arg(from_time)::timestamptz
  AND timestamp <= sqlc.arg(to_time)::timestamptz
  AND (sqlc.arg(url_id)::text = '' OR url_id = sqlc.arg(url_id))
GROUP BY url_id, browser, os, device, country;
