-- Media Platform Database Schema
-- Run with: wrangler d1 execute media-db --file=schema.sql

-- Main media table for storing file metadata
CREATE TABLE IF NOT EXISTS media (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    file_key    TEXT NOT NULL UNIQUE,          -- R2 object key (path)
    public_url  TEXT NOT NULL,                 -- Full CDN URL
    file_type   TEXT NOT NULL                  -- 'image' | 'video' | 'file'
                CHECK (file_type IN ('image', 'video', 'file')),
    mime_type   TEXT NOT NULL,                 -- e.g. 'image/png'
    size        INTEGER NOT NULL,              -- File size in bytes
    folder      TEXT NOT NULL DEFAULT 'root',  -- Logical folder name
    tags        TEXT NOT NULL DEFAULT '[]',    -- JSON array of tag strings
    uploaded_at TEXT NOT NULL                  -- ISO 8601 UTC timestamp
                DEFAULT (datetime('now')),
    uploader_id TEXT                           -- Optional: future multi-user
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_media_file_type   ON media (file_type);
CREATE INDEX IF NOT EXISTS idx_media_folder      ON media (folder);
CREATE INDEX IF NOT EXISTS idx_media_uploaded    ON media (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_type_folder ON media (file_type, folder);

-- Rate limiting table for per-IP tracking
CREATE TABLE IF NOT EXISTS rate_limits (
    ip         TEXT NOT NULL,
    window     INTEGER NOT NULL,  -- Unix minute bucket
    count      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (ip, window)
);

-- Index for cleanup of old rate limit entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window);
