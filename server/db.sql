-- TriviaNight SQLite Schema

-- 1. Events
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    location TEXT
);

-- 2. Sets
CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT
);

-- 3. Event_Sets (Junction Table)
CREATE TABLE IF NOT EXISTS event_sets (
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    set_id INTEGER REFERENCES sets(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, set_id)
);

-- 4. Questions
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES sets(id) ON DELETE CASCADE,
    type TEXT CHECK(type IN ('multi_part', 'multiple_choice', 'matching')),
    prompt TEXT NOT NULL,
    content JSON NOT NULL -- Stores answers, distractors, or pairs
);

-- 5. Teams
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

-- 6. Answers (Analytics)
CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    is_correct BOOLEAN DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_set_id ON questions(set_id);
CREATE INDEX IF NOT EXISTS idx_teams_event_id ON teams(event_id);
CREATE INDEX IF NOT EXISTS idx_answers_team_id ON answers(team_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
