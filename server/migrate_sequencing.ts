import { getDb } from './db.js';

async function migrate() {
    const db = getDb();
    console.log('>>> [MIGRATION] Starting sequencing migration...');

    try {
        // 1. Begin transaction
        db.prepare('BEGIN TRANSACTION').run();

        // 2. Check if sequencing is already allowed (just in case)
        const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='questions'").get().sql;
        if (schema.includes("'sequencing'")) {
            console.log('>>> [MIGRATION] Sequencing already supported. Skipping.');
            db.prepare('ROLLBACK').run();
            return;
        }

        console.log('>>> [MIGRATION] Recreating questions table to support "sequencing" type...');

        // 3. Create a temporary table with the NEW schema
        db.prepare(`
            CREATE TABLE questions_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT CHECK(type IN ('multi_part', 'multiple_choice', 'matching', 'sequencing')),
                category TEXT,
                title TEXT,
                prompt TEXT NOT NULL,
                content JSON NOT NULL,
                media_url TEXT
            )
        `).run();

        // 4. Copy data from old to new (mapping column names)
        db.prepare(`
            INSERT INTO questions_new (id, type, category, title, prompt, content, media_url)
            SELECT id, type, category, title, prompt, content, media_url FROM questions
        `).run();

        // 5. Drop old table
        db.prepare('DROP TABLE questions').run();

        // 6. Rename new table to original name
        db.prepare('ALTER TABLE questions_new RENAME TO questions').run();

        // 7. Re-create index
        db.prepare('CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category)').run();

        // 8. Commit
        db.prepare('COMMIT').run();
        console.log('>>> [MIGRATION] Migration successful!');
    } catch (error) {
        console.error('>>> [MIGRATION] FAILED:', error);
        db.prepare('ROLLBACK').run();
    }
}

migrate();
