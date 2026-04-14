import db from './db.js';

async function seed() {
    console.log('Seeding Prime Winter Trivia data...');

    try {
        // 1. Create Event
        console.log('Creating event...');
        const eventInfo = db.prepare('INSERT INTO events (title, date, location) VALUES (?, ?, ?)')
            .run('Prime Winter Trivia', '2026-01-09T19:00:00', 'Local Community Center');
        const eventId = eventInfo.lastInsertRowid;
        console.log('Event ID:', eventId);

        // 2. Create One Set
        console.log('Creating set...');
        const setInfo = db.prepare('INSERT INTO sets (name, description) VALUES (?, ?)')
            .run('Round 1: History/Geography', 'General historical and geographical questions.');
        const setId = setInfo.lastInsertRowid;
        console.log('Set ID:', setId);

        console.log('Seeding complete.');
    } catch (e) {
        console.error('Fatal error in seed:', e);
    }
}

seed().catch(console.error);
