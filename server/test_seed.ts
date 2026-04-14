import db from './db.js';

try {
    console.log('Testing DB connection...');
    const result = db.prepare('SELECT 1 + 1 AS result').get();
    console.log('DB Connection OK:', result);
    
    console.log('Checking tables...');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables);

    process.exit(0);
} catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
}
