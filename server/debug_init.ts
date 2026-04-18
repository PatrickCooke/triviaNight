import db, { initDb } from './db.js';

console.log('Starting debug init...');

try {
    console.log('Calling initDb()...');
    initDb();
    console.log('initDb() finished.');

    const migrations = [
        { table: 'questions', column: 'media_url', type: 'TEXT' },
        { table: 'questions', column: 'category', type: 'TEXT' },
        { table: 'sets', column: 'category', type: 'TEXT' }
    ];

    for (const m of migrations) {
        try {
            console.log(`Checking ${m.table}.${m.column}...`);
            db.prepare(`SELECT ${m.column} FROM ${m.table} LIMIT 1`).get();
            console.log(`Column ${m.column} exists.`);
        } catch (e) {
            console.log(`Adding column ${m.column} to ${m.table}...`);
            db.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`).run();
            console.log('Success.');
        }
    }

    console.log('Debug init completed successfully.');
    process.exit(0);
} catch (error) {
    console.error('DEBUG INIT FAILED:');
    console.error(error);
    process.exit(1);
}
