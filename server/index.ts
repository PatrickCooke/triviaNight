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

app.get('/api/events', (req, res) => {
    try {
        const events = db.prepare('SELECT * FROM events ORDER BY date DESC').all();
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

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

app.get('/api/sets', (req, res) => {
    try {
        const sets = db.prepare('SELECT * FROM sets ORDER BY name ASC').all();
        res.json(sets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sets' });
    }
});

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

app.delete('/api/sets/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM sets WHERE id = ?').run(id);
        res.json({ message: 'Set deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete set' });
    }
});

// --- Questions API ---

interface QuestionRow {
    id: number;
    set_id: number;
    type: string;
    prompt: string;
    content: string;
}

app.get('/api/questions', (req, res) => {
    try {
        const questions = db.prepare('SELECT * FROM questions ORDER BY id DESC').all() as QuestionRow[];
        res.json(questions.map(q => ({ ...q, content: JSON.parse(q.content) })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all questions' });
    }
});

app.get('/api/sets/:setId/questions', (req, res) => {
    const { setId } = req.params;
    try {
        const questions = db.prepare('SELECT * FROM questions WHERE set_id = ? ORDER BY id ASC').all(setId) as QuestionRow[];
        res.json(questions.map(q => ({ ...q, content: JSON.parse(q.content) })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

app.post('/api/questions', (req, res) => {
    const { set_id, type, prompt, content } = req.body;
    try {
        const info = db.prepare('INSERT INTO questions (set_id, type, prompt, content) VALUES (?, ?, ?, ?)')
            .run(set_id, type, prompt, JSON.stringify(content));
        res.status(201).json({ id: info.lastInsertRowid, set_id, type, prompt, content });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create question' });
    }
});

app.put('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    const { set_id, type, prompt, content } = req.body;
    try {
        db.prepare('UPDATE questions SET set_id = ?, type = ?, prompt = ?, content = ? WHERE id = ?')
            .run(set_id, type, prompt, JSON.stringify(content), id);
        res.json({ message: 'Question updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update question' });
    }
});

app.delete('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM questions WHERE id = ?').run(id);
        res.json({ message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

// --- Event-Sets Mapping API ---

app.get('/api/events/:eventId/sets', (req, res) => {
    const { eventId } = req.params;
    try {
        const sets = db.prepare(`
            SELECT s.* FROM sets s
            JOIN event_sets es ON s.id = es.set_id
            WHERE es.event_id = ?
        `).all(eventId);
        res.json(sets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch event sets' });
    }
});

app.post('/api/events/:eventId/sets', (req, res) => {
    const { eventId } = req.params;
    const { set_id } = req.body;
    try {
        db.prepare('INSERT INTO event_sets (event_id, set_id) VALUES (?, ?)').run(eventId, set_id);
        res.status(201).json({ message: 'Set added to event' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add set to event' });
    }
});

app.delete('/api/events/:eventId/sets/:setId', (req, res) => {
    const { eventId, setId } = req.params;
    try {
        db.prepare('DELETE FROM event_sets WHERE event_id = ? AND set_id = ?').run(eventId, setId);
        res.json({ message: 'Set removed from event' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove set from event' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
