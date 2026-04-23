import { createRequire } from 'module';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getDb, initDb } from './db.js';

const require = createRequire(import.meta.url);
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

const PORT = 3001;

const UPLOADS_DIR = join(process.cwd(), 'public/uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Socket.io Logic ---
io.on('connection', (socket) => {
    console.log(`>>> [SOCKET] New connection: ${socket.id}`);

    socket.on('join_event', (eventId) => {
        socket.join(`event_${eventId}`);
        console.log(`>>> [SOCKET] Device ${socket.id} joined event_${eventId}`);
    });

    socket.on('set_slide', ({ eventId, index }) => {
        console.log(`>>> [SOCKET] Event ${eventId} slide -> ${index}`);
        io.to(`event_${eventId}`).emit('slide_changed', index);
    });

    socket.on('toggle_leaderboard', ({ eventId, visible }) => {
        console.log(`>>> [SOCKET] Event ${eventId} leaderboard -> ${visible}`);
        io.to(`event_${eventId}`).emit('leaderboard_toggled', visible);
    });

    socket.on('disconnect', () => {
        console.log(`>>> [SOCKET] Disconnected: ${socket.id}`);
    });
});

// DB Startup
try {
    initDb();
    const db = getDb();
    const migrations = [
        { table: 'questions', column: 'media_url', type: 'TEXT' },
        { table: 'questions', column: 'category', type: 'TEXT' },
        { table: 'questions', column: 'title', type: 'TEXT' },
        { table: 'sets', column: 'category', type: 'TEXT' },
        { table: 'answers', column: 'answer_index', type: 'INTEGER DEFAULT 0' }
    ];
    for (const m of migrations) {
        try {
            db.prepare(`SELECT ${m.column.split(' ')[0]} FROM ${m.table} LIMIT 1`).get();
        } catch (e) {
            db.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column}`).run();
        }
    }
} catch (err) {
    console.error('>>> [DB] Migration error');
}

const storage = multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, UPLOADS_DIR),
    filename: (_req: any, file: any, cb: any) => {
        const name = Date.now() + extname(file.originalname);
        cb(null, name);
    }
});
const upload = multer({ storage });

// --- API ROUTES ---

app.post('/api/upload', upload.single('media'), (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/events', (_req: any, res: any) => res.json(getDb().prepare('SELECT * FROM events ORDER BY date DESC').all()));

app.post('/api/events', (req: any, res: any) => {
    const { title, date, location } = req.body;
    const info = getDb().prepare('INSERT INTO events (title, date, location) VALUES (?, ?, ?)')
        .run(title, date || new Date().toISOString(), location);
    res.status(201).json({ id: info.lastInsertRowid });
});

app.put('/api/events/:id', (req: any, res: any) => {
    const { title, date, location } = req.body;
    getDb().prepare('UPDATE events SET title = ?, date = ?, location = ? WHERE id = ?')
        .run(title, date, location, req.params.id);
    res.json({ message: 'updated' });
});

app.delete('/api/events/:id', (req: any, res: any) => {
    getDb().prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ message: 'deleted' });
});

app.get('/api/sets', (_req: any, res: any) => res.json(getDb().prepare('SELECT * FROM sets ORDER BY name ASC').all()));

app.post('/api/sets', (req: any, res: any) => {
    const { name, category, description } = req.body;
    const info = getDb().prepare('INSERT INTO sets (name, category, description) VALUES (?, ?, ?)')
        .run(name, category || '', description);
    res.status(201).json({ id: info.lastInsertRowid });
});

app.put('/api/sets/:id', (req: any, res: any) => {
    const { name, category, description } = req.body;
    getDb().prepare('UPDATE sets SET name = ?, category = ?, description = ? WHERE id = ?')
        .run(name, category, description, req.params.id);
    res.json({ message: 'updated' });
});

app.delete('/api/sets/:id', (req: any, res: any) => {
    getDb().prepare('DELETE FROM sets WHERE id = ?').run(req.params.id);
    res.json({ message: 'deleted' });
});

app.get('/api/questions', (_req: any, res: any) => {
    const rows = getDb().prepare('SELECT * FROM questions ORDER BY id DESC').all();
    res.json(rows.map((q: any) => ({ ...q, content: JSON.parse(q.content) })));
});

app.post('/api/questions', (req: any, res: any) => {
    const { type, category, title, prompt, content, media_url, setId } = req.body;
    const db = getDb();
    const info = db.prepare('INSERT INTO questions (type, category, title, prompt, content, media_url) VALUES (?, ?, ?, ?, ?, ?)')
        .run(type, category || '', title || '', prompt, JSON.stringify(content), media_url || '');
    const qId = info.lastInsertRowid;
    if (setId) db.prepare('INSERT INTO question_sets (question_id, set_id) VALUES (?, ?)').run(qId, setId);
    res.status(201).json({ id: qId });
});

app.put('/api/questions/:id', (req: any, res: any) => {
    const { type, category, title, prompt, content, media_url } = req.body;
    getDb().prepare('UPDATE questions SET type = ?, category = ?, title = ?, prompt = ?, content = ?, media_url = ? WHERE id = ?')
        .run(type, category, title || '', prompt, JSON.stringify(content), media_url, req.params.id);
    res.json({ message: 'updated' });
});

app.delete('/api/questions/:id', (req: any, res: any) => {
    getDb().prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
    res.json({ message: 'deleted' });
});

app.get('/api/events/:id/sets', (req: any, res: any) => res.json(getDb().prepare('SELECT s.* FROM sets s JOIN event_sets es ON s.id = es.set_id WHERE es.event_id = ?').all(req.params.id)));
app.post('/api/events/:id/sets', (req: any, res: any) => {
    getDb().prepare('INSERT INTO event_sets (event_id, set_id) VALUES (?, ?)').run(req.params.id, req.body.set_id);
    res.json({ message: 'linked' });
});
app.delete('/api/events/:id/sets/:setId', (req: any, res: any) => {
    getDb().prepare('DELETE FROM event_sets WHERE event_id = ? AND set_id = ?').run(req.params.id, req.params.setId);
    res.json({ message: 'unlinked' });
});

app.get('/api/sets/:id/questions', (req: any, res: any) => {
    const rows = getDb().prepare('SELECT q.* FROM questions q JOIN question_sets qs ON q.id = qs.question_id WHERE qs.set_id = ?').all(req.params.id);
    res.json(rows.map((q: any) => ({ ...q, content: JSON.parse(q.content) })));
});

app.post('/api/sets/:id/questions', (req: any, res: any) => {
    getDb().prepare('INSERT INTO question_sets (question_id, set_id) VALUES (?, ?)').run(req.body.questionId, req.params.id);
    res.json({ message: 'linked' });
});

app.delete('/api/sets/:id/questions/:qId', (req: any, res: any) => {
    getDb().prepare('DELETE FROM question_sets WHERE set_id = ? AND question_id = ?').run(req.params.id, req.params.qId);
    res.json({ message: 'unlinked' });
});

app.get('/api/events/:id/teams', (req: any, res: any) => res.json(getDb().prepare('SELECT * FROM teams WHERE event_id = ?').all(req.params.id)));
app.post('/api/events/:id/teams', (req: any, res: any) => {
    const info = getDb().prepare('INSERT INTO teams (event_id, name) VALUES (?, ?)').run(req.params.id, req.body.name);
    res.status(201).json({ id: info.lastInsertRowid });
});
app.delete('/api/teams/:id', (req: any, res: any) => {
    getDb().prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
    res.json({ message: 'deleted' });
});

app.get('/api/events/:id/answers', (req: any, res: any) => {
    const rows = getDb().prepare(`SELECT a.* FROM answers a JOIN teams t ON a.team_id = t.id WHERE t.event_id = ?`).all(req.params.id);
    res.json(rows);
});

app.post('/api/answers', (req: any, res: any) => {
    const { team_id, question_id, answer_index, is_correct } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM answers WHERE team_id = ? AND question_id = ? AND answer_index = ?').get(team_id, question_id, answer_index || 0);
    if (existing) {
        db.prepare('UPDATE answers SET is_correct = ? WHERE id = ?').run(is_correct ? 1 : 0, existing.id);
    } else {
        db.prepare('INSERT INTO answers (team_id, question_id, answer_index, is_correct) VALUES (?, ?, ?, ?)').run(team_id, question_id, answer_index || 0, is_correct ? 1 : 0);
    }
    res.json({ message: 'saved' });
});

app.post('/api/questions/bulk', (req: any, res: any) => {
    const insert = getDb().prepare('INSERT INTO questions (type, category, prompt, content) VALUES (?, ?, ?, ?)');
    const insertMany = getDb().transaction((qs: any) => {
        for (const q of qs) insert.run(q.type, q.category || '', q.prompt, JSON.stringify(q.content));
    });
    insertMany(req.body.questions);
    res.json({ message: 'success' });
});

httpServer.listen(PORT, () => console.log(`>>> [READY] http://localhost:${PORT}`));
