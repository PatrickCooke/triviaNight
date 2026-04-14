import express from 'express';
import cors from 'cors';
import db, { initDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
initDb();

// --- Events API ---

// Get all events
app.get('/api/events', (req, res) => {
    try {
        const events = db.prepare('SELECT * FROM events ORDER BY date DESC').all();
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Create event
app.post('/api/events', (req, res) => {
    const { title, date, location } = req.body;
    try {
        const info = db.prepare('INSERT INTO events (title, date, location) VALUES (?, ?, ?)')
            .run(title, date || new Date().toISOString(), location);
        res.status(201).json({ id: info.lastInsertRowid, title, date, location });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Update event
app.put('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const { title, date, location } = req.body;
    try {
        db.prepare('UPDATE events SET title = ?, date = ?, location = ? WHERE id = ?')
            .run(title, date, location, id);
        res.json({ message: 'Event updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM events WHERE id = ?').run(id);
        res.json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// --- Sets API ---

// Get all sets
app.get('/api/sets', (req, res) => {
    try {
        const sets = db.prepare('SELECT * FROM sets ORDER BY name ASC').all();
        res.json(sets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sets' });
    }
});

// Create set
app.post('/api/sets', (req, res) => {
    const { name, description } = req.body;
    try {
        const info = db.prepare('INSERT INTO sets (name, description) VALUES (?, ?)')
            .run(name, description);
        res.status(201).json({ id: info.lastInsertRowid, name, description });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create set' });
    }
});

// Update set
app.put('/api/sets/:id', (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        db.prepare('UPDATE sets SET name = ?, description = ? WHERE id = ?')
            .run(name, description, id);
        res.json({ message: 'Set updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update set' });
    }
});

// Delete set
app.delete('/api/sets/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM sets WHERE id = ?').run(id);
        res.json({ message: 'Set deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete set' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
