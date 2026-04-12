# Architecture: SQLite Schema

The triviaNight system uses a relational SQLite schema to maintain referential integrity between events, question sets, and team performance.

## Schema Definition

### 1. Events
Tracks the metadata for a specific trivia night.
- `id`: INTEGER PRIMARY KEY
- `title`: TEXT NOT NULL
- `date`: DATETIME DEFAULT CURRENT_TIMESTAMP
- `location`: TEXT

### 2. Sets
Themed groupings of questions.
- `id`: INTEGER PRIMARY KEY
- `name`: TEXT NOT NULL
- `description`: TEXT

### 3. Event_Sets (Junction Table)
Maps which sets are used in which events.
- `event_id`: INTEGER REFERENCES Events(id)
- `set_id`: INTEGER REFERENCES Sets(id)
- PRIMARY KEY (event_id, set_id)

### 4. Questions
Supports Multi-Part, Multiple Choice, and Matching.
- `id`: INTEGER PRIMARY KEY
- `set_id`: INTEGER REFERENCES Sets(id)
- `type`: TEXT CHECK(type IN ('multi_part', 'multiple_choice', 'matching'))
- `prompt`: TEXT NOT NULL
- `content`: JSON NOT NULL -- Stores answers, distractors, or pairs based on type

### 5. Teams
Temporary entities tied to an Event.
- `id`: INTEGER PRIMARY KEY
- `event_id`: INTEGER REFERENCES Events(id)
- `name`: TEXT NOT NULL

### 6. Answers (Analytics)
Records team responses for difficulty calculation.
- `id`: INTEGER PRIMARY KEY
- `team_id`: INTEGER REFERENCES Teams(id)
- `question_id`: INTEGER REFERENCES Questions(id)
- `is_correct`: BOOLEAN
- `timestamp`: DATETIME DEFAULT CURRENT_TIMESTAMP
