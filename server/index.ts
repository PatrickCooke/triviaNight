import { createRequire } from 'module';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getDb, initDb } from './db.js';
import { generateScoreSheet, generateMasterPrintout } from './pdf_generator.js';
import { searchReference } from './reference.js';

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

// --- Speed Round In-Memory State & Buffering ---
interface SpeedSubmission {
    team_id: number;
    question_id: number;
    answer_index: number;
    is_correct: number;
    submitted_value: string;
    timestamp: string;
}
let speedRoundState = {
    activeQuestionId: null as number | null,
    timerStartTime: 0,
    totalTime: 10000,
    timerActive: false,
    useMultiplier: true,
    eventId: null as number | null
};
let speedSubmissionsBuffer: SpeedSubmission[] = [];
let speedTimerTimeout: NodeJS.Timeout | null = null;

function flushSpeedSubmissions(eventId: number) {
    if (speedTimerTimeout) {
        clearTimeout(speedTimerTimeout);
        speedTimerTimeout = null;
    }
    if (speedSubmissionsBuffer.length > 0) {
        const db = getDb();
        const insert = db.prepare('INSERT INTO answers (team_id, question_id, answer_index, is_correct, submitted_value, is_graded, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const transaction = db.transaction((subs) => {
            for (const s of subs) {
                const existing = db.prepare('SELECT id FROM answers WHERE team_id = ? AND question_id = ? AND answer_index = ?').get(s.team_id, s.question_id, s.answer_index);
                if (existing) {
                    db.prepare('UPDATE answers SET is_correct = ?, submitted_value = ?, is_graded = 1, timestamp = ? WHERE id = ?').run(s.is_correct, s.submitted_value, s.timestamp, existing.id);
                } else {
                    insert.run(s.team_id, s.question_id, s.answer_index, s.is_correct, s.submitted_value, 1, s.timestamp);
                }
            }
        });
        transaction(speedSubmissionsBuffer);
        console.log(`>>> [SERVER] Flushed ${speedSubmissionsBuffer.length} Speed round submissions to DB`);
        speedSubmissionsBuffer = [];
    }
    speedRoundState.timerActive = false;
    io.to(`event_${eventId}`).emit('speed_timer_ended', { questionId: speedRoundState.activeQuestionId });
    io.to(`event_${eventId}`).emit('answers_updated');
}

// --- Socket.io Logic ---
io.on('connection', (socket) => {
    socket.on('join_event', (eventId) => {
        socket.join(`event_${eventId}`);
    });
    socket.on('join_role', ({ eventId, role }) => {
        socket.join(`event_${eventId}_${role}`);
        console.log(`>>> [SOCKET] Client joined as ${role} for event ${eventId}`);
    });
    socket.on('set_slide', ({ eventId, index }) => {
        console.log(`>>> [SOCKET] Event ${eventId} updated to slide ${index}`);
        if (speedRoundState.timerActive && speedRoundState.eventId === Number(eventId)) {
            flushSpeedSubmissions(Number(eventId));
        }
        try {
            getDb().prepare('UPDATE events SET current_slide_index = ? WHERE id = ?').run(index, eventId);
        } catch (e) { console.error('>>> [SOCKET] DB Save Error:', e); }
        io.to(`event_${eventId}`).emit('slide_changed', index);
    });
    socket.on('toggle_leaderboard', ({ eventId, visible }) => {
        io.to(`event_${eventId}`).emit('leaderboard_toggled', visible);
    });

    socket.on('start_speed_timer', ({ eventId, questionId, duration, useMultiplier }) => {
        console.log(`>>> [SOCKET] Starting speed timer for event ${eventId}, question ${questionId}`);
        if (speedTimerTimeout) clearTimeout(speedTimerTimeout);
        
        speedSubmissionsBuffer = [];
        speedRoundState = {
            activeQuestionId: questionId,
            timerStartTime: Date.now(),
            totalTime: duration || 10000,
            timerActive: true,
            useMultiplier: useMultiplier !== false,
            eventId: eventId
        };
        
        io.to(`event_${eventId}`).emit('speed_timer_started', {
            questionId,
            duration: speedRoundState.totalTime,
            startTime: speedRoundState.timerStartTime,
            useMultiplier: speedRoundState.useMultiplier
        });
        
        speedTimerTimeout = setTimeout(() => {
            console.log(`>>> [SOCKET] Speed timer expired for event ${eventId}`);
            flushSpeedSubmissions(eventId);
        }, speedRoundState.totalTime + 500); // 500ms network padding
    });

    socket.on('stop_speed_timer', ({ eventId }) => {
        console.log(`>>> [SOCKET] Host explicitly stopped speed timer for event ${eventId}`);
        flushSpeedSubmissions(eventId);
    });

    socket.on('submit_speed_answer', ({ eventId, teamId, questionId, answerIndex, submittedValue }) => {
        const now = Date.now();
        const elapsed = now - speedRoundState.timerStartTime;
        
        if (!speedRoundState.timerActive || speedRoundState.activeQuestionId !== questionId || elapsed > speedRoundState.totalTime) {
            socket.emit('speed_answer_result', { error: 'Time is up!' });
            return;
        }

        // Validate correctness
        const db = getDb();
        const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
        if (!q) {
            socket.emit('speed_answer_result', { error: 'Question not found' });
            return;
        }
        const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
        
        let isCorrect = 0;
        if (q.type === 'multiple_choice') {
            isCorrect = (content.correct === submittedValue) ? 1 : 0;
        } else if (q.type === 'matching') {
            isCorrect = (content.pairs[answerIndex] && content.pairs[answerIndex].right === submittedValue) ? 1 : 0;
        } else if (q.type === 'sequencing') {
            isCorrect = (content.items[answerIndex] === submittedValue) ? 1 : 0;
        }

        let points = 0.0;
        if (isCorrect) {
            if (speedRoundState.useMultiplier) {
                const timeLeft = speedRoundState.totalTime - elapsed;
                points = timeLeft / speedRoundState.totalTime;
                if (points < 0) points = 0;
            } else {
                points = 1.0;
            }
        }

        // Check if player has already submitted for this part
        const existingIdx = speedSubmissionsBuffer.findIndex(
            s => s.team_id === teamId && s.question_id === questionId && s.answer_index === answerIndex
        );
        const sub = {
            team_id: teamId,
            question_id: questionId,
            answer_index: answerIndex,
            is_correct: points,
            submitted_value: submittedValue,
            timestamp: new Date(now).toISOString()
        };
        if (existingIdx >= 0) {
            speedSubmissionsBuffer[existingIdx] = sub;
        } else {
            speedSubmissionsBuffer.push(sub);
        }

        socket.emit('speed_answer_result', { success: true, points });

        // If all registered speed round players have submitted, end timer early
        try {
            const players = db.prepare('SELECT id FROM teams WHERE event_id = ?').all(eventId);
            const submittedTeamIds = new Set(
                speedSubmissionsBuffer
                    .filter(s => s.question_id === questionId)
                    .map(s => s.team_id)
            );
            if (players.length > 0 && submittedTeamIds.size >= players.length) {
                console.log(`>>> [SOCKET] All ${players.length} registered players submitted. Ending timer early for event ${eventId}`);
                flushSpeedSubmissions(eventId);
            }
        } catch (e) {
            console.error('Error checking early timer end:', e);
        }
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
        { table: 'events', column: 'current_slide_index', type: 'INTEGER DEFAULT 0' },
        { table: 'events', column: "game_mode TEXT CHECK(game_mode IN ('analog', 'digital', 'pub', 'speed')) DEFAULT 'pub'", type: '' },
        { table: 'teams', column: 'session_token', type: 'TEXT' },
        { table: 'answers', column: 'submitted_value', type: 'TEXT' },
        { table: 'answers', column: 'is_graded', type: 'INTEGER DEFAULT 1' },
        { table: 'events', column: 'digital_input', type: 'INTEGER DEFAULT 0' }
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
    // Fix: rebuild events table if game_mode CHECK constraint is missing 'pub'
    // SQLite can't ALTER COLUMN, so we check the schema and recreate if needed.
    try {
        const schemaSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='events'").get() as any)?.sql ?? '';
        if (schemaSql && !schemaSql.includes("'pub'")) {
            console.log(">>> [DB] Rebuilding events table to add 'pub' to game_mode CHECK constraint...");
            db.exec(`
                PRAGMA foreign_keys = OFF;
                BEGIN;
                CREATE TABLE IF NOT EXISTS events_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    date TEXT,
                    location TEXT,
                    game_code TEXT UNIQUE,
                    current_slide_index INTEGER DEFAULT 0,
                    game_mode TEXT CHECK(game_mode IN ('analog', 'digital', 'pub', 'speed')) DEFAULT 'pub',
                    digital_input INTEGER DEFAULT 0
                );
                INSERT INTO events_new SELECT id, title, date, location, game_code, current_slide_index, game_mode, digital_input FROM events;
                DROP TABLE events;
                ALTER TABLE events_new RENAME TO events;
                COMMIT;
                PRAGMA foreign_keys = ON;
            `);
            console.log(">>> [DB] events table rebuilt successfully.");
        }
    } catch (rebuildErr) {
        console.error('>>> [DB] Failed to rebuild events table:', rebuildErr);
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
    const { title, date, location, game_mode, digital_input } = req.body;
    const gameCode = generateGameCode();
    const resolvedMode = game_mode || 'pub';
    const info = getDb().prepare('INSERT INTO events (title, date, location, game_code, game_mode, digital_input) VALUES (?, ?, ?, ?, ?, ?)')
        .run(title, date || new Date().toISOString(), location, gameCode, resolvedMode, digital_input ? 1 : 0);
    res.status(201).json({ id: info.lastInsertRowid, gameCode });
});

app.put('/api/events/:id', (req: any, res: any) => {
    const { title, date, location, game_mode, digital_input } = req.body;
    const resolvedMode = game_mode || 'pub';
    getDb().prepare('UPDATE events SET title = ?, date = ?, location = ?, game_mode = ?, digital_input = ? WHERE id = ?').run(title, date, location, resolvedMode, digital_input ? 1 : 0, req.params.id);
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

app.get('/api/events/:id/scoresheet', async (req: any, res: any) => {
    try {
        const db = getDb();
        const event = db.prepare('SELECT title FROM events WHERE id = ?').get(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const sets = db.prepare('SELECT s.* FROM sets s JOIN event_sets es ON s.id = es.set_id WHERE es.event_id = ?').all(req.params.id);
        const rounds = [];

        for (const set of sets) {
            const questions = db.prepare('SELECT q.* FROM questions q JOIN question_sets qs ON q.id = qs.question_id WHERE qs.set_id = ?').all(set.id);
            rounds.push({
                title: set.name,
                questions: questions.map((q: any) => ({
                    ...q,
                    content: typeof q.content === 'string' ? JSON.parse(q.content) : q.content
                }))
            });
        }

        const pdfBuffer = await generateScoreSheet(rounds, req.query.seed as string);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=scoresheet_${req.params.id}.pdf`);
        res.send(pdfBuffer);
    } catch (e) {
        console.error('>>> [API] Score Sheet Error:', e);
        res.status(500).json({ error: 'Failed to generate score sheet' });
    }
});

app.get('/api/events/:id/printout', async (req: any, res: any) => {
    try {
        const db = getDb();
        const mode = (req.query.mode as string) || 'questions';
        const event = db.prepare('SELECT title FROM events WHERE id = ?').get(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const sets = db.prepare('SELECT s.* FROM sets s JOIN event_sets es ON s.id = es.set_id WHERE es.event_id = ?').all(req.params.id);
        const rounds = [];

        for (const set of sets) {
            const questions = db.prepare('SELECT q.* FROM questions q JOIN question_sets qs ON q.id = qs.question_id WHERE qs.set_id = ?').all(set.id);
            rounds.push({
                title: set.name,
                questions: questions.map((q: any) => ({
                    ...q,
                    content: typeof q.content === 'string' ? JSON.parse(q.content) : q.content
                }))
            });
        }

        const pdfBuffer = await generateMasterPrintout(rounds, mode as any);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=master_${mode}_${req.params.id}.pdf`);
        res.send(pdfBuffer);
    } catch (e) {
        console.error('>>> [API] Printout Error:', e);
        res.status(500).json({ error: 'Failed to generate master printout' });
    }
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
    const { name } = req.body;
    const eventId = req.params.id;
    console.log(`>>> [API] POST /api/events/${eventId}/teams - Adding team: "${name}"`);
    try {
        const info = getDb().prepare('INSERT INTO teams (event_id, name) VALUES (?, ?)').run(eventId, name);
        console.log(`>>> [API] Team added with ID: ${info.lastInsertRowid}`);
        res.status(201).json({ id: info.lastInsertRowid });
    } catch (e) {
        console.error('>>> [API] Team Add Error:', e);
        res.status(500).json({ error: 'Failed to add team' });
    }
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

app.post('/api/teams/claim', (req: any, res: any) => {
    const { event_id, name, session_token } = req.body;
    const db = getDb();
    try {
        let team = db.prepare('SELECT * FROM teams WHERE event_id = ? AND name = ?').get(event_id, name);
        if (team) {
            if (!team.session_token) {
                db.prepare('UPDATE teams SET session_token = ? WHERE id = ?').run(session_token, team.id);
                return res.json({ success: true, team_id: team.id, name: team.name });
            } else if (team.session_token === session_token) {
                return res.json({ success: true, team_id: team.id, name: team.name });
            } else {
                return res.status(400).json({ error: 'This team is already claimed by another device.' });
            }
        } else {
            const info = db.prepare('INSERT INTO teams (event_id, name, session_token) VALUES (?, ?, ?)')
                .run(event_id, name, session_token);
            const newTeam = { id: info.lastInsertRowid, name, event_id };
            io.to(`event_${event_id}`).emit('team_joined', newTeam);
            return res.status(201).json({ success: true, team_id: info.lastInsertRowid, name });
        }
    } catch (e) {
        console.error('Claim Team Error:', e);
        res.status(500).json({ error: 'Failed to join/create team' });
    }
});

app.post('/api/teams/verify-session', (req: any, res: any) => {
    const { team_id, session_token } = req.body;
    const db = getDb();
    try {
        const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(team_id);
        if (team && team.session_token === session_token) {
            res.json({ success: true, team_id: team.id, name: team.name });
        } else {
            res.status(401).json({ error: 'Invalid session' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to verify session' });
    }
});

app.post('/api/answers/submit-digital', (req: any, res: any) => {
    const { team_id, session_token, question_id, answers } = req.body;
    const db = getDb();
    
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(team_id);
    if (!team || team.session_token !== session_token) {
        return res.status(401).json({ error: 'Unauthorized: Invalid team session' });
    }

    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(question_id);
    if (!q) return res.status(404).json({ error: 'Question not found' });
    const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;

    try {
        const transaction = db.transaction((subs) => {
            for (const sub of subs) {
                let isCorrect = 0;
                let isGraded = 1;
                
                if (q.type === 'multiple_choice') {
                    isCorrect = (content.correct === sub.value) ? 1 : 0;
                } else if (q.type === 'matching') {
                    isCorrect = (content.pairs[sub.index] && content.pairs[sub.index].right === sub.value) ? 1 : 0;
                } else if (q.type === 'sequencing') {
                    isCorrect = (content.items[sub.index] === sub.value) ? 1 : 0;
                } else if (q.type === 'multi_part') {
                    isCorrect = 0;
                    isGraded = 0; // Requires host review
                }

                const existing = db.prepare('SELECT id FROM answers WHERE team_id = ? AND question_id = ? AND answer_index = ?').get(team_id, question_id, sub.index);
                if (existing) {
                    db.prepare('UPDATE answers SET is_correct = ?, submitted_value = ?, is_graded = ? WHERE id = ?').run(isCorrect, sub.value, isGraded, existing.id);
                } else {
                    db.prepare('INSERT INTO answers (team_id, question_id, answer_index, is_correct, submitted_value, is_graded) VALUES (?, ?, ?, ?, ?, ?)')
                        .run(team_id, question_id, sub.index, isCorrect, sub.value, isGraded);
                }
            }
        });
        transaction(answers);
        io.to(`event_${team.event_id}`).emit('answers_updated');
        res.json({ success: true });
    } catch (e) {
        console.error('Submit Digital Answer Error:', e);
        res.status(500).json({ error: 'Failed to submit answers' });
    }
});

app.get('/api/events/:id/review-queue', (req: any, res: any) => {
    const db = getDb();
    try {
        const rows = db.prepare(`
            SELECT 
                a.id as answer_id,
                a.team_id,
                a.question_id,
                a.answer_index,
                a.submitted_value,
                t.name as team_name,
                q.prompt as question_prompt,
                q.content as question_content
            FROM answers a
            JOIN teams t ON a.team_id = t.id
            JOIN questions q ON a.question_id = q.id
            WHERE t.event_id = ? AND a.is_graded = 0
        `).all(req.params.id);
        
        res.json(rows.map((row: any) => {
            let content = row.question_content;
            if (typeof content === 'string') {
                try { content = JSON.parse(content); } catch (e) { content = {}; }
            }
            return { ...row, question_content: content };
        }));
    } catch (e) {
        console.error('Review Queue Error:', e);
        res.status(500).json([]);
    }
});

app.post('/api/answers/:id/grade', (req: any, res: any) => {
    const { is_correct } = req.body;
    const db = getDb();
    try {
        db.prepare('UPDATE answers SET is_correct = ?, is_graded = 1 WHERE id = ?').run(is_correct ? 1 : 0, req.params.id);
        const row = db.prepare('SELECT t.event_id FROM answers a JOIN teams t ON a.team_id = t.id WHERE a.id = ?').get(req.params.id);
        if (row) {
            io.to(`event_${row.event_id}`).emit('answers_updated');
        }
        res.json({ success: true });
    } catch (e) {
        console.error('Grade Answer Error:', e);
        res.status(500).json({ error: 'Failed to grade answer' });
    }
});

// Submission status — for each team, which questions on the current slide have been submitted
app.get('/api/events/:id/submission-status/:questionId', (req: any, res: any) => {
    try {
        const db = getDb();
        const teams = db.prepare('SELECT id, name FROM teams WHERE event_id = ?').all(req.params.id) as any[];
        const answers = db.prepare(`
            SELECT a.team_id, COUNT(a.id) as count FROM answers a
            JOIN teams t ON a.team_id = t.id
            WHERE t.event_id = ? AND a.question_id = ? AND (a.submitted_value IS NOT NULL OR a.is_graded = 1)
            GROUP BY a.team_id
        `).all(req.params.id, req.params.questionId) as any[];
        const submittedSet = new Set(answers.map((a: any) => a.team_id));
        res.json(teams.map((t: any) => ({ team_id: t.id, team_name: t.name, submitted: submittedSet.has(t.id) })));
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/events/:id/multipliers', (req: any, res: any) => {
    try {
        const rows = getDb().prepare('SELECT * FROM team_round_multipliers trm JOIN teams t ON trm.team_id = t.id WHERE t.event_id = ?').all(req.params.id);
        res.json(rows);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/multipliers', (req: any, res: any) => {
    const { team_id, set_id, multiplier } = req.body;
    try {
        const db = getDb();
        const existing = db.prepare('SELECT 1 FROM team_round_multipliers WHERE team_id = ? AND set_id = ?').get(team_id, set_id);
        if (existing) {
            db.prepare('UPDATE team_round_multipliers SET multiplier = ? WHERE team_id = ? AND set_id = ?').run(multiplier, team_id, set_id);
        } else {
            db.prepare('INSERT INTO team_round_multipliers (team_id, set_id, multiplier) VALUES (?, ?, ?)').run(team_id, set_id, multiplier);
        }
        res.json({ message: 'ok' });
    } catch (e) {
        console.error('>>> [API] Multiplier Error:', e);
        res.status(500).json({ error: 'Failed to update multiplier' });
    }
});

// Question Results Summary Endpoint
app.get('/api/events/:id/questions/:questionId/results-summary', (req: any, res: any) => {
    const { id: eventId, questionId } = req.params;
    try {
        const db = getDb();

        if (speedRoundState.timerActive && speedRoundState.eventId === Number(eventId)) {
            flushSpeedSubmissions(Number(eventId));
        }

        const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
        if (!q) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;

        const answers = db.prepare(`
            SELECT a.*, t.name as team_name
            FROM answers a
            JOIN teams t ON a.team_id = t.id
            WHERE t.event_id = ? AND a.question_id = ?
        `).all(eventId, questionId) as any[];

        const teams = db.prepare('SELECT id FROM teams WHERE event_id = ?').all(eventId) as any[];
        const totalTeams = teams.length;

        const submittedTeamIds = new Set(answers.map((a: any) => a.team_id));
        const totalResponses = submittedTeamIds.size;

        if (q.type === 'multiple_choice') {
            const options: string[] = [content.correct, ...(content.distractors || [])];
            const counts: Record<string, number> = {};
            options.forEach(opt => { counts[opt] = 0; });

            answers.forEach((a: any) => {
                if (a.submitted_value) {
                    const trimmed = a.submitted_value.trim();
                    const matched = options.find(o => o.toLowerCase() === trimmed.toLowerCase());
                    if (matched) {
                        counts[matched] = (counts[matched] || 0) + 1;
                    } else {
                        counts[trimmed] = (counts[trimmed] || 0) + 1;
                    }
                }
            });

            const bins = options.map(opt => ({
                label: opt,
                count: counts[opt] || 0,
                percentage: totalResponses > 0 ? Math.round(((counts[opt] || 0) / totalResponses) * 100) : 0
            }));

            return res.json({
                questionId: Number(questionId),
                type: 'multiple_choice',
                prompt: q.prompt,
                bins,
                totalResponses,
                totalTeams
            });
        } else if (q.type === 'sequencing') {
            const items: string[] = content.items || [];
            const bins = items.map((item, correctIdx) => {
                const correctCount = answers.filter((a: any) => 
                    a.answer_index === correctIdx && (
                        (a.submitted_value && a.submitted_value.trim().toLowerCase() === item.trim().toLowerCase()) ||
                        Number(a.is_correct) > 0
                    )
                ).length;
                return {
                    label: item,
                    count: correctCount,
                    correctPosition: correctIdx + 1,
                    percentage: totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0
                };
            });

            return res.json({
                questionId: Number(questionId),
                type: 'sequencing',
                prompt: q.prompt,
                bins,
                totalResponses,
                totalTeams
            });
        } else if (q.type === 'matching') {
            const pairs: Array<{ left: string; right: string }> = content.pairs || [];
            const bins = pairs.map((pair, idx) => {
                const correctCount = answers.filter((a: any) => 
                    a.answer_index === idx && (
                        (a.submitted_value && a.submitted_value.trim().toLowerCase() === pair.right.trim().toLowerCase()) ||
                        Number(a.is_correct) > 0
                    )
                ).length;
                return {
                    label: pair.right,
                    clue: pair.left,
                    count: correctCount,
                    percentage: totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0
                };
            });

            return res.json({
                questionId: Number(questionId),
                type: 'matching',
                prompt: q.prompt,
                bins,
                totalResponses,
                totalTeams
            });
        } else if (q.type === 'multi_part') {
            const rawParts = content.parts || (content.answers || []).map((a: string) => ({ text: a }));
            const parts = rawParts.map((part: any, idx: number) => {
                const partAnswers = answers.filter((a: any) => 
                    a.answer_index === idx && a.submitted_value && a.submitted_value.trim() !== ''
                );
                
                const wordFrequency: Record<string, { text: string; count: number }> = {};
                partAnswers.forEach((a: any) => {
                    const text = a.submitted_value.trim();
                    const key = text.toLowerCase();
                    if (!wordFrequency[key]) {
                        wordFrequency[key] = { text, count: 1 };
                    } else {
                        wordFrequency[key].count++;
                    }
                });

                const words = Object.values(wordFrequency).sort((a, b) => b.count - a.count);

                return {
                    partIndex: idx,
                    prompt: part.subPrompt || part.text || `Part ${idx + 1}`,
                    words,
                    totalResponses: partAnswers.length
                };
            });

            return res.json({
                questionId: Number(questionId),
                type: 'multi_part',
                prompt: q.prompt,
                parts,
                totalResponses,
                totalTeams
            });
        }

        res.json({ questionId: Number(questionId), type: q.type, prompt: q.prompt });
    } catch (e) {
        console.error('Results summary error:', e);
        res.status(500).json({ error: 'Failed to fetch results summary' });
    }
});

// --- Reference Library Routes ---

// GET /api/reference/search?q=space&limit=50&offset=0
app.get('/api/reference/search', (req: any, res: any) => {
    const query  = String(req.query.q  ?? '').trim();
    const limit  = Math.min(parseInt(req.query.limit  as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    if (!query) return res.json({ results: [], total: 0 });

    try {
        const data = searchReference(query, limit, offset);
        res.json(data);
    } catch (e) {
        console.error('>>> [Reference] Search error:', e);
        res.status(500).json({ error: 'Reference search failed' });
    }
});

// GET /api/reference/categories  — used to power autocomplete / browse
app.get('/api/reference/categories', (_req: any, res: any) => {
    try {
        const db = getDb();
        const rows = db.prepare(
            `SELECT DISTINCT category FROM jeopardy_reference ORDER BY category LIMIT 2000`
        ).all();
        res.json(rows.map((r: any) => r.category));
    } catch (e) {
        console.error('>>> [Reference] Categories error:', e);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
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
