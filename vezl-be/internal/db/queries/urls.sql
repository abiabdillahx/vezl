-- name: CreateURL :one
INSERT INTO urls (id, user_id, shortcode, original_url, notes, secret, active, hit_limit, expires_at, utm)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetURLByShortcode :one
SELECT * FROM urls WHERE shortcode = $1 LIMIT 1;

-- name: GetURLByID :one
SELECT * FROM urls WHERE id = $1 LIMIT 1;

-- name: ListURLsByUser :many
SELECT * FROM urls WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListAllURLs :many
SELECT * FROM urls ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: ListAllURLsWithUser :many
SELECT urls.*, users.username AS created_by FROM urls
JOIN users ON urls.user_id = users.id
ORDER BY urls.created_at DESC LIMIT $1 OFFSET $2;

-- name: CountURLsByUser :one
SELECT COUNT(*) FROM urls WHERE user_id = $1;

-- name: CountAllURLs :one
SELECT COUNT(*) FROM urls;

-- name: UpdateURL :one
UPDATE urls SET original_url=$2, notes=$3, secret=$4, active=$5, hit_limit=$6, expires_at=$7, utm=$8, updated_at=NOW()
WHERE id=$1 RETURNING *;

-- name: IncrementHit :exec
UPDATE urls SET hit = hit + 1, updated_at=NOW() WHERE id = $1;

-- name: DeleteURL :exec
DELETE FROM urls WHERE id = $1;
