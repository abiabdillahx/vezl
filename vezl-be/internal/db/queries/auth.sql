-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 LIMIT 1;

-- name: CreateUser :one
INSERT INTO users (id, email, username, password, role)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListUsers :many
SELECT * FROM users ORDER BY created_at DESC;

-- name: UpdateUser :one
UPDATE users SET email=$2, username=$3, role=$4, updated_at=NOW()
WHERE id=$1 RETURNING *;

-- name: UpdatePassword :exec
UPDATE users SET password=$2, updated_at=NOW() WHERE id=$1;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: CreateSession :one
INSERT INTO sessions (id, user_id, token, expires_at)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetSessionByToken :one
SELECT s.*, u.id as u_id, u.email, u.username, u.role
FROM sessions s JOIN users u ON s.user_id = u.id
WHERE s.token = $1 AND s.expires_at > NOW()
LIMIT 1;

-- name: DeleteSession :exec
DELETE FROM sessions WHERE token = $1;

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions WHERE expires_at <= NOW();
