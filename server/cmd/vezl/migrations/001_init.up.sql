-- SQLite schema. Timestamps are stored as UTC text (CURRENT_TIMESTAMP or Go's
-- time.Time via the driver's _time_format=sqlite), so they sort and compare as strings.

CREATE TABLE users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    username    TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'member',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  DATETIME NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE urls (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shortcode    TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    notes        TEXT,
    secret       TEXT,
    active       BOOLEAN NOT NULL DEFAULT 1,
    hit          INTEGER NOT NULL DEFAULT 0,
    hit_limit    INTEGER NOT NULL DEFAULT -1,
    expires_at   DATETIME,
    utm          TEXT NOT NULL DEFAULT '{}',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_urls_user_created ON urls(user_id, created_at);

CREATE TABLE tags (
    id   TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE url_tags (
    url_id TEXT NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (url_id, tag_id)
);

CREATE TABLE metrics (
    id        TEXT PRIMARY KEY,
    url_id    TEXT REFERENCES urls(id) ON DELETE CASCADE,
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    browser   TEXT,
    os        TEXT,
    device    TEXT,
    language  TEXT,
    referrer  TEXT,
    country   TEXT,
    region    TEXT,
    city      TEXT,
    utm       TEXT NOT NULL DEFAULT '{}',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_url_ts ON metrics(url_id, timestamp);
CREATE INDEX idx_metrics_user_ts ON metrics(user_id, timestamp);

CREATE TABLE watchlist (
    id         TEXT PRIMARY KEY,
    domain     TEXT NOT NULL,
    allowed    BOOLEAN NOT NULL DEFAULT 0,
    note       TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_keys (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    key_hash   TEXT UNIQUE NOT NULL,
    last_used  DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
