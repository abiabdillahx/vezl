-- name: CreateMetric :exec
INSERT INTO metrics (id, url_id, user_id, browser, os, device, language, referrer, country, region, city, utm)
VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12);

-- name: GetMetricsByURL :many
SELECT * FROM metrics
WHERE url_id = sqlc.arg(url_id)
  AND timestamp >= sqlc.arg(from_time)
  AND timestamp <= sqlc.arg(to_time)
ORDER BY timestamp DESC;

-- name: GetAggregateMetrics :many
SELECT url_id, browser, os, device, country, COUNT(*) as count
FROM metrics
WHERE (CAST(sqlc.arg(all_users) AS BOOLEAN) OR user_id = sqlc.arg(user_id))
  AND timestamp >= sqlc.arg(from_time)
  AND timestamp <= sqlc.arg(to_time)
  AND (CAST(sqlc.arg(url_id) AS TEXT) = '' OR url_id = sqlc.arg(url_id))
GROUP BY url_id, browser, os, device, country;
