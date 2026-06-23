-- name: CreateWatchlistEntry :one
INSERT INTO watchlist (id, domain, allowed, note)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetWatchlistByDomain :one
SELECT * FROM watchlist WHERE $1 = domain OR $1 LIKE '%.' || domain LIMIT 1;

-- name: ListWatchlist :many
SELECT * FROM watchlist ORDER BY created_at DESC;

-- name: DeleteWatchlistEntry :exec
DELETE FROM watchlist WHERE id = $1;
