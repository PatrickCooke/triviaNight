import { createRequire } from 'module';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { getDb, initDb } from './db.js';

const require = createRequire(import.meta.url);
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 3001;

const UPLOADS_DIR = join(process.cwd(), 'public/uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// DB Startup
try {
    initDb();
    const db = getDb();
    const migrations = [
        { table: 'questions', column: 'media_url', type: 'TEXT' },
        { table: 'questions', column: 'category', type: 'TEXT' },
        { table: 'questions', column: 'title', type: 'TEXT' },
        { table: 'sets', column: 'category', type: 'TEXT' }
    ];
    for (const m of migrations) {
        try {
            db.prepare(`SELECT ${m.column} FROM ${m.table} LIMIT 1`).get();
        } catch (e) {
            db.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`).run();
        }
    }
} catch (err) {
    console.error('>>> [DB] Migration error');
}

// Multer Setup
const storage = multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, UPLOADS_DIR),
    filename: (_req: any, file: any, cb: any) => {
        const name = Date.now() + extname(file.originalname);
        cb(null, name);
    }
});
const upload = multer({ storage });

// --- MEDIA API ---
app.post('/api/upload', upload.single('media'), (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// --- EVENTS API ---
app.get('/api/events', (_req: any, res: any) => {
    try {
        res.json(getDb().prepare('SELECT * FROM events ORDER BY date DESC').all());
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/events', (req: any, res: any) => {
    try {
        const { title, date, location } = req.body;
        const info = getDb().prepare('INSERT INTO events (title, date, location) VALUES (?, ?, ?)')
            .run(title, date || new Date().toISOString(), location);
        res.status(201).json({ id: info.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.put('/api/events/:id', (req: any, res: any) => {
    try {
        const { title, date, location } = req.body;
        getDb().prepare('UPDATE events SET title = ?, date = ?, location = ? WHERE id = ?')
            .run(title, date, location, req.params.id);
        res.json({ message: 'updated' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.delete('/api/events/:id', (req: any, res: any) => {
    try {
        getDb().prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
        res.json({ message: 'deleted' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

// --- SETS API ---
app.get('/api/sets', (_req: any, res: any) => {
    try {
        res.json(getDb().prepare('SELECT * FROM sets ORDER BY name ASC').all());
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/sets', (req: any, res: any) => {
    try {
        const { name, category, description } = req.body;
        const info = getDb().prepare('INSERT INTO sets (name, category, description) VALUES (?, ?, ?)')
            .run(name, category || '', description);
        res.status(201).json({ id: info.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.put('/api/sets/:id', (req: any, res: any) => {
    try {
        const { name, category, description } = req.body;
        getDb().prepare('UPDATE sets SET name = ?, category = ?, description = ? WHERE id = ?')
            .run(name, category, description, req.params.id);
        res.json({ message: 'updated' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.delete('/api/sets/:id', (req: any, res: any) => {
    try {
        getDb().prepare('DELETE FROM sets WHERE id = ?').run(req.params.id);
        res.json({ message: 'deleted' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

// --- QUESTIONS API ---
app.get('/api/questions', (_req: any, res: any) => {
    try {
        const rows = getDb().prepare('SELECT * FROM questions ORDER BY id DESC').all();
        res.json(rows.map((q: any) => ({ ...q, content: JSON.parse(q.content) })));
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/questions', (req: any, res: any) => {
    try {
        const { type, category, title, prompt, content, media_url, setId } = req.body;
        const db = getDb();
        const info = db.prepare('INSERT INTO questions (type, category, title, prompt, content, media_url) VALUES (?, ?, ?, ?, ?, ?)')
            .run(type, category || '', title || '', prompt, JSON.stringify(content), media_url || '');
        const qId = info.lastInsertRowid;
        if (setId) db.prepare('INSERT INTO question_sets (question_id, set_id) VALUES (?, ?)').run(qId, setId);
        res.status(201).json({ id: qId });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.put('/api/questions/:id', (req: any, res: any) => {
    try {
        const { type, category, title, prompt, content, media_url } = req.body;
        getDb().prepare('UPDATE questions SET type = ?, category = ?, title = ?, prompt = ?, content = ?, media_url = ? WHERE id = ?')
            .run(type, category, title || '', prompt, JSON.stringify(content), media_url, req.params.id);
        res.json({ message: 'updated' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.delete('/api/questions/:id', (req: any, res: any) => {
    try {
        getDb().prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
        res.json({ message: 'deleted' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

// --- MAPPING API (Junctions) ---
app.get('/api/events/:id/sets', (req: any, res: any) => {
    try {
        const rows = getDb().prepare('SELECT s.* FROM sets s JOIN event_sets es ON s.id = es.set_id WHERE es.event_id = ?').all(req.params.id);
        res.json(rows);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/events/:id/sets', (req: any, res: any) => {
    try {
        getDb().prepare('INSERT INTO event_sets (event_id, set_id) VALUES (?, ?)').run(req.params.id, req.body.set_id);
        res.json({ message: 'linked' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.delete('/api/events/:id/sets/:setId', (req: any, res: any) => {
    try {
        getDb().prepare('DELETE FROM event_sets WHERE event_id = ? AND set_id = ?').run(req.params.id, req.params.setId);
        res.json({ message: 'unlinked' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.get('/api/sets/:id/questions', (req: any, res: any) => {
    try {
        const rows = getDb().prepare('SELECT q.* FROM questions q JOIN question_sets qs ON q.id = qs.question_id WHERE qs.set_id = ?').all(req.params.id);
        res.json(rows.map((q: any) => ({ ...q, content: JSON.parse(q.content) })));
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/sets/:id/questions', (req: any, res: any) => {
    try {
        getDb().prepare('INSERT INTO question_sets (question_id, set_id) VALUES (?, ?)').run(req.body.questionId, req.params.id);
        res.json({ message: 'linked' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.delete('/api/sets/:id/questions/:qId', (req: any, res: any) => {
    try {
        getDb().prepare('DELETE FROM question_sets WHERE set_id = ? AND question_id = ?').run(req.params.id, req.params.qId);
        res.json({ message: 'unlinked' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.post('/api/questions/bulk', (req: any, res: any) => {
    try {
        const insert = getDb().prepare('INSERT INTO questions (type, category, prompt, content) VALUES (?, ?, ?, ?)');
        const insertMany = getDb().transaction((qs: any) => {
            for (const q of qs) insert.run(q.type, q.category || '', q.prompt, JSON.stringify(q.content));
        });
        insertMany(req.body.questions);
        res.json({ message: 'success' });
    } catch (e) { res.status(500).json({ error: 'fail' }); }
});

app.listen(PORT, () => console.log(`>>> [READY] http://localhost:${PORT}`));
