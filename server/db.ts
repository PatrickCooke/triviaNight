import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const DB_PATH = join(process.cwd(), 'trivia.db');
const SCHEMA_PATH = join(process.cwd(), 'server/db.sql');

let db: any = null;

export function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('foreign_keys = ON');
    }
    return db;
}

export function initDb() {
    const database = getDb();
    try {
        const schema = readFileSync(SCHEMA_PATH, 'utf8');
        database.exec(schema);
    } catch (error) {
        console.error('>>> [DB] Init Error:', error);
    }
}
