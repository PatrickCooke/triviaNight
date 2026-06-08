import { createRequire } from 'module';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getDb, initDb } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

const PORT = 3000;

const UPLOADS_DIR = join(process.cwd(), 'public/uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Socket.io Logic ---
io.on('connection', (socket) => {
    socket.on('join_event', (eventId) => {
        socket.join(`event_${eventId}`);
    });
    socket.on('set_slide', ({ eventId, index }) => {
        console.log(`>>> [SOCKET] Event ${eventId} updated to slide ${index}`);
        try {
            getDb().prepare('UPDATE events SET current_slide_index = ? WHERE id = ?').run(index, eventId);
        } catch (e) { console.error('>>> [SOCKET] DB Save Error:', e); }
        io.to(`event_${eventId}`).emit('slide_changed', index);
    });
    socket.on('toggle_leaderboard', ({ eventId, visible }) => {
        io.to(`event_${eventId}`).emit('leaderboard_toggled', visible);
    });
});

function generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// DB Startup
try {
    console.log('>>> [DB] Initializing database...');
    initDb();
    const db = getDb();
    const migrations = [
        { table: 'questions', column: 'media_url', type: 'TEXT' },
        { table: 'questions', column: 'category', type: 'TEXT' },
        { table: 'questions', column: 'title', type: 'TEXT' },
        { table: 'sets', column: 'category', type: 'TEXT' },
        { table: 'answers', column: 'answer_index', type: 'INTEGER DEFAULT 0' },
        { table: 'events', column: 'game_code', type: 'TEXT UNIQUE' },
        { table: 'events', column: 'current_slide_index', type: 'INTEGER DEFAULT 0' }
    ];
    for (const m of migrations) {
        try {
            console.log(`>>> [DB] Checking migration: ${m.table}.${m.column}`);
            db.prepare(`SELECT ${m.column.split(' ')[0]} FROM ${m.table} LIMIT 1`).get();
        } catch (e) {
            console.log(`>>> [DB] Applying migration: ${m.table}.${m.column}`);
            db.prepare(`ALTER TABLE ${m.table} ADD COLUMN ${m.column}`).run();
            // If we just added game_code, backfill existing rows
            if (m.column === 'game_code') {
                console.log('>>> [DB] Backfilling game codes...');
                const rows = db.prepare('SELECT id FROM events WHERE game_code IS NULL').all();
                for (const row of rows) {
                    const code = generateGameCode();
                    console.log(`>>> [DB] Assigning code ${code} to event ${row.id}`);
                    db.prepare('UPDATE events SET game_code = ? WHERE id = ?').run(code, row.id);
                }
            }
        }
    }
    console.log('>>> [DB] Migrations complete.');
} catch (err) {
    console.error('>>> [DB] Migration error', err);
}

// Multer
const storage = multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, UPLOADS_DIR),
    filename: (_req: any, file: any, cb: any) => cb(null, Date.now() + extname(file.originalname))
});
const upload = multer({ storage });

// --- CRUD API ---

app.post('/api/upload', upload.single('media'), (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/events', (_req: any, res: any) => {
    console.log('>>> [API] GET /api/events - Executing query...');
    const rows = getDb().prepare('SELECT * FROM events ORDER BY date DESC').all();
    console.log(`>>> [API] GET /api/events - Found ${rows.length} rows`);
    res.json(rows);
});

app.get('/api/events/verify/:code', (req: any, res: any) => {
    console.log(`>>> [API] Verifying code: ${req.params.code} - Executing query...`);
    const event = getDb().prepare('SELECT * FROM events WHERE game_code = ?').get(req.params.code.toUpperCase());
    console.log('>>> [API] Verify complete');
    if (event) res.json(event);
    else res.status(404).json({ error: 'Not found' });
});

app.post('/api/events', (req: any, res: any) => {
    const { title, date, location } = req.body;
    const gameCode = generateGameCode();
    const info = getDb().prepare('INSERT INTO events (title, date, location, game_code) VALUES (?, ?, ?, ?)')
        .run(title, date || new Date().toISOString(), location, gameCode);
    res.status(201).json({ id: info.lastInsertRowid, gameCode });
});

app.put('/api/events/:id', (req: any, res: any) => {
    const { title, date, location } = req.body;
    getDb().prepare('UPDATE events SET title = ?, date = ?, location = ? WHERE id = ?').run(title, date, location, req.params.id);
    res.json({ message: 'ok' });
});

app.delete('/api/events/:id', (req: any, res: any) => {
    getDb().prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ message: 'ok' });
});

app.get('/api/sets', (_req: any, res: any) => {
    const rows = getDb().prepare('SELECT * FROM sets ORDER BY name ASC').all();
    console.log(`>>> [API] GET /api/sets - Found ${rows.length} rows`);
    res.json(rows);
});

app.post('/api/sets', (req: any, res: any) => {
    const { name, category, description } = req.body;
    const info = getDb().prepare('INSERT INTO sets (name, category, description) VALUES (?, ?, ?)')
        .run(name, category || '', description);
    res.status(201).json({ id: info.lastInsertRowid });
});

app.put('/api/sets/:id', (req: any, res: any) => {
    const { name, category, description } = req.body;
    getDb().prepare('UPDATE sets SET name = ?, category = ?, description = ? WHERE id = ?').run(name, category, description, req.params.id);
    res.json({ message: 'ok' });
});

app.delete('/api/sets/:id', (req: any, res: any) => {
    getDb().prepare('DELETE FROM sets WHERE id = ?').run(req.params.id);
    res.json({ message: 'ok' });
});

app.get('/api/questions', (_req: any, res: any) => {
    try {
        const rows = getDb().prepare('SELECT * FROM questions ORDER BY id DESC').all();
        console.log(`>>> [API] GET /api/questions - Found ${rows.length} rows`);
        res.json(rows.map((q: any) => {
            let content = q.content;
            if (typeof content === 'string') {
                try { content = JSON.parse(content); } catch (e) { content = {}; }
            }
            return { ...q, content };
        }));
    } catch (e) {
        console.error('>>> [API] Questions Error:', e);
        res.status(500).json([]);
    }
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
        .run(type, category, title, prompt, JSON.stringify(content), media_url, req.params.id);
    res.json({ message: 'ok' });
});

app.delete('/api/questions/:id', (req: any, res: any) => {
    getDb().prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
    res.json({ message: 'ok' });
});

app.post('/api/questions/bulk', (req: any, res: any) => {
    const { questions } = req.body;
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'Questions must be an array' });

    const db = getDb();
    const insert = db.prepare('INSERT INTO questions (type, category, title, prompt, content, media_url) VALUES (?, ?, ?, ?, ?, ?)');
    
    try {
        const transaction = db.transaction((qs: any[]) => {
            for (const q of qs) {
                insert.run(
                    q.type, 
                    q.category || '', 
                    q.title || '', 
                    q.prompt, 
                    JSON.stringify(q.content), 
                    q.media_url || ''
                );
            }
        });
        transaction(questions);
        res.status(201).json({ message: `Imported ${questions.length} questions` });
    } catch (e) {
        console.error('>>> [API] Bulk Import Error:', e);
        res.status(500).json({ error: 'Failed to import questions' });
    }
});

// Analytics
app.get('/api/analytics/questions', (req: any, res: any) => {
    try {
        const rows = getDb().prepare(`
            SELECT 
                q.id, 
                q.prompt, 
                q.category,
                COUNT(a.id) as total_attempts,
                SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
            FROM questions q
            LEFT JOIN answers a ON q.id = a.question_id
            GROUP BY q.id
            HAVING total_attempts > 0
            ORDER BY total_attempts DESC
        `).all();
        res.json(rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/analytics/teams', (req: any, res: any) => {
    try {
        const rows = getDb().prepare(`
            SELECT 
                t.name, 
                e.title as event_title,
                COUNT(a.id) as total_answers,
                SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as score
            FROM teams t
            JOIN events e ON t.event_id = e.id
            LEFT JOIN answers a ON t.id = a.team_id
            GROUP BY t.id
            ORDER BY score DESC
        `).all();
        res.json(rows);
    } catch (e) { res.status(500).json([]); }
});

// Mappings
app.get('/api/events/:id/sets', (req: any, res: any) => res.json(getDb().prepare('SELECT s.* FROM sets s JOIN event_sets es ON s.id = es.set_id WHERE es.event_id = ?').all(req.params.id)));
app.post('/api/events/:id/sets', (req: any, res: any) => {
    getDb().prepare('INSERT INTO event_sets (event_id, set_id) VALUES (?, ?)').run(req.params.id, req.body.set_id);
    res.json({ message: 'ok' });
});
app.delete('/api/events/:id/sets/:setId', (req: any, res: any) => {
    getDb().prepare('DELETE FROM event_sets WHERE event_id = ? AND set_id = ?').run(req.params.id, req.params.setId);
    res.json({ message: 'ok' });
});
app.get('/api/sets/:id/questions', (req: any, res: any) => {
    try {
        const rows = getDb().prepare('SELECT q.* FROM questions q JOIN question_sets qs ON q.id = qs.question_id WHERE qs.set_id = ?').all(req.params.id);
        res.json(rows.map((q: any) => {
            let content = q.content;
            if (typeof content === 'string') {
                try { content = JSON.parse(content); } catch (e) { content = {}; }
            }
            return { ...q, content };
        }));
    } catch (e) {
        console.error('>>> [API] Set Questions Error:', e);
        res.status(500).json([]);
    }
});
app.post('/api/sets/:id/questions', (req: any, res: any) => {
    getDb().prepare('INSERT INTO question_sets (question_id, set_id) VALUES (?, ?)').run(req.body.questionId, req.params.id);
    res.json({ message: 'ok' });
});
app.delete('/api/sets/:id/questions/:qId', (req: any, res: any) => {
    getDb().prepare('DELETE FROM question_sets WHERE set_id = ? AND question_id = ?').run(req.params.id, req.params.qId);
    res.json({ message: 'ok' });
});
app.get('/api/events/:id/teams', (req: any, res: any) => res.json(getDb().prepare('SELECT * FROM teams WHERE event_id = ?').all(req.params.id)));
app.post('/api/events/:id/teams', (req: any, res: any) => {
    const info = getDb().prepare('INSERT INTO teams (event_id, name) VALUES (?, ?)').run(req.params.id, req.body.name);
    res.status(201).json({ id: info.lastInsertRowid });
});
app.delete('/api/teams/:id', (req: any, res: any) => {
    getDb().prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
    res.json({ message: 'ok' });
});
app.get('/api/events/:id/answers', (req: any, res: any) => {
    const rows = getDb().prepare(`SELECT a.* FROM answers a JOIN teams t ON a.team_id = t.id WHERE t.event_id = ?`).all(req.params.id);
    res.json(rows);
});
app.post('/api/answers', (req: any, res: any) => {
    const { team_id, question_id, answer_index, is_correct } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM answers WHERE team_id = ? AND question_id = ? AND answer_index = ?').get(team_id, question_id, answer_index || 0);
    if (existing) db.prepare('UPDATE answers SET is_correct = ? WHERE id = ?').run(is_correct ? 1 : 0, existing.id);
    else db.prepare('INSERT INTO answers (team_id, question_id, answer_index, is_correct) VALUES (?, ?, ?, ?)').run(team_id, question_id, answer_index || 0, is_correct ? 1 : 0);
    res.json({ message: 'ok' });
});

// Static Production Serving (MOVE TO END)
const clientDist = join(__dirname, '../client/dist');
if (existsSync(clientDist)) {
    console.log('>>> [SERVER] Serving static production files from:', clientDist);
    app.use(express.static(clientDist));
    app.get('*', (req: any, res: any, next: any) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path.startsWith('/uploads')) return next();
        res.sendFile(join(clientDist, 'index.html'));
    });
}

httpServer.listen(PORT, '0.0.0.0', () => console.log(`>>> [READY] http://localhost:${PORT}`));
