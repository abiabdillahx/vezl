CREATE TABLE users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    username    TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'member',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE urls (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shortcode    TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    notes        TEXT,
    secret       TEXT,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    hit          INTEGER NOT NULL DEFAULT 0,
    hit_limit    INTEGER NOT NULL DEFAULT -1,
    expires_at   TIMESTAMPTZ,
    utm          JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    utm       JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE watchlist (
    id         TEXT PRIMARY KEY,
    domain     TEXT NOT NULL,
    allowed    BOOLEAN NOT NULL DEFAULT FALSE,
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE api_keys (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    key_hash   TEXT UNIQUE NOT NULL,
    last_used  TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
