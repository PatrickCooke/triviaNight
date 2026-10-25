-- Migration: apply schema changes that CREATE TABLE IF NOT EXISTS won't add to existing DBs
-- Run this once against trivia.db before restarting the container.
--
--   sqlite3 trivia.db < migrate.sql

-- events table
ALTER TABLE events ADD COLUMN game_code TEXT UNIQUE;
ALTER TABLE events ADD COLUMN current_slide_index INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN game_mode TEXT CHECK(game_mode IN ('analog', 'digital', 'speed')) DEFAULT 'analog';

-- teams table
ALTER TABLE teams ADD COLUMN session_token TEXT;

-- answers table
ALTER TABLE answers ADD COLUMN answer_index INTEGER DEFAULT 0;
ALTER TABLE answers ADD COLUMN submitted_value TEXT;
ALTER TABLE answers ADD COLUMN is_graded INTEGER DEFAULT 1;
