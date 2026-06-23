-- name: CreateAPIKey :one
INSERT INTO api_keys (id, user_id, name, key_hash)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetAPIKeyByHash :one
SELECT ak.*, u.id as u_id, u.email, u.username, u.role
FROM api_keys ak JOIN users u ON ak.user_id = u.id
WHERE ak.key_hash = $1 LIMIT 1;

-- name: ListAPIKeysByUser :many
SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdateAPIKeyLastUsed :exec
UPDATE api_keys SET last_used = NOW() WHERE id = $1;

-- name: DeleteAPIKey :exec
DELETE FROM api_keys WHERE id = $1 AND user_id = $2;
