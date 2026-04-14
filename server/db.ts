import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'trivia.db');
const SCHEMA_PATH = join(process.cwd(), 'server/db.sql');

/**
 * Initialize and export the database connection
 */
const db = new Database(DB_PATH, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Executes the initialization schema
 */
export function initDb() {
    try {
        const schema = readFileSync(SCHEMA_PATH, 'utf8');
        db.exec(schema);
        console.log('Database initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

export default db;
