import Database from 'better-sqlite3';
console.log('Import successful.');
try {
    const db = new Database(':memory:');
    console.log('Database object created.');
    const row = db.prepare('SELECT "it works" as test').get();
    console.log('Result:', row);
} catch (e) {
    console.error('Crash during execution:', e);
}
