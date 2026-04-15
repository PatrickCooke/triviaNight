import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import db, { initDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const UPLOADS_DIR = join(process.cwd(), 'public/uploads');
if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize database
initDb();

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
    }
});
const upload = multer({ storage });

// --- Media API ---
app.post('/api/upload', upload.single('media'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

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
    const { name, category, description } = req.body;
    try {
        const info = db.prepare('INSERT INTO sets (name, category, description) VALUES (?, ?, ?)')
            .run(name, category, description);
        res.status(201).json({ id: info.lastInsertRowid, name, category, description });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create set' });
    }
});

app.put('/api/sets/:id', (req, res) => {
    const { id } = req.params;
    const { name, category, description } = req.body;
    try {
        db.prepare('UPDATE sets SET name = ?, category = ?, description = ? WHERE id = ?')
            .run(name, category, description, id);
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

// --- Questions API (Refactored) ---
interface QuestionRow {
    id: number;
    type: string;
    category: string;
    prompt: string;
    content: string;
    media_url: string;
}

app.get('/api/questions', (req, res) => {
    try {
        const questions = db.prepare('SELECT * FROM questions ORDER BY id DESC').all() as QuestionRow[];
        res.json(questions.map(q => ({ ...q, content: JSON.parse(q.content) })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch questions from bank' });
    }
});

app.get('/api/sets/:setId/questions', (req, res) => {
    const { setId } = req.params;
    try {
        const questions = db.prepare(`
            SELECT q.* FROM questions q
            JOIN question_sets qs ON q.id = qs.question_id
            WHERE qs.set_id = ?
            ORDER BY q.id ASC
        `).all(setId) as QuestionRow[];
        res.json(questions.map(q => ({ ...q, content: JSON.parse(q.content) })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch questions for set' });
    }
});

app.post('/api/questions', (req, res) => {
    const { type, category, prompt, content, media_url, setId } = req.body;
    try {
        const info = db.prepare('INSERT INTO questions (type, category, prompt, content, media_url) VALUES (?, ?, ?, ?, ?)')
            .run(type, category, prompt, JSON.stringify(content), media_url);
        const questionId = info.lastInsertRowid;
        if (setId) {
            db.prepare('INSERT INTO question_sets (question_id, set_id) VALUES (?, ?)').run(questionId, setId);
        }
        res.status(201).json({ id: questionId, type, category, prompt, content, media_url });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create question' });
    }
});

app.put('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    const { type, category, prompt, content, media_url } = req.body;
    try {
        db.prepare('UPDATE questions SET type = ?, category = ?, prompt = ?, content = ?, media_url = ? WHERE id = ?')
            .run(type, category, prompt, JSON.stringify(content), media_url, id);
        res.json({ message: 'Question updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update question' });
    }
});

// Link existing question to a set
app.post('/api/sets/:setId/questions', (req, res) => {
    const { setId } = req.params;
    const { questionId } = req.body;
    try {
        db.prepare('INSERT INTO question_sets (question_id, set_id) VALUES (?, ?)').run(questionId, setId);
        res.json({ message: 'Question linked to set' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to link question' });
    }
});

// Unlink question from a set
app.delete('/api/sets/:setId/questions/:questionId', (req, res) => {
    const { setId, questionId } = req.params;
    try {
        db.prepare('DELETE FROM question_sets WHERE set_id = ? AND question_id = ?').run(setId, questionId);
        res.json({ message: 'Question unlinked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unlink question' });
    }
});

app.delete('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM questions WHERE id = ?').run(id);
        res.json({ message: 'Question deleted from bank' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

// --- Bulk Import API ---
app.post('/api/questions/bulk', (req, res) => {
    const { questions } = req.body;
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'Invalid data' });

    const insert = db.prepare('INSERT INTO questions (type, category, prompt, content) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((qs) => {
        for (const q of qs) insert.run(q.type, q.category, q.prompt, JSON.stringify(q.content));
    });

    try {
        insertMany(questions);
        res.json({ message: `Successfully imported ${questions.length} questions` });
    } catch (error) {
        res.status(500).json({ error: 'Bulk import failed' });
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
