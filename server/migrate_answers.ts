import { getDb } from './db.js';

async function migrate() {
    const db = getDb();
    console.log('>>> [MIGRATION] Adding answer_index to answers table...');

    try {
        db.prepare('ALTER TABLE answers ADD COLUMN answer_index INTEGER DEFAULT 0').run();
        console.log('>>> [MIGRATION] Success!');
    } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
            console.log('>>> [MIGRATION] Column already exists, skipping.');
        } else {
            console.error('>>> [MIGRATION] Failed:', error);
        }
    }
}

migrate();
