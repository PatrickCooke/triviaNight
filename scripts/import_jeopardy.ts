/**
 * scripts/import_jeopardy.ts
 *
 * One-time import of jquestions.tsv into the jeopardy_reference table.
 * Run with:  tsx scripts/import_jeopardy.ts
 *
 * Safe to re-run: it drops and recreates the table each time.
 */

import { createReadStream } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { getDb } from '../server/db.js';

const TSV_PATH = join(process.cwd(), 'jquestions.tsv');
const BATCH_SIZE = 500;

async function main() {
  const db = getDb();

  console.log('>>> [Import] Dropping old tables if they exist...');
  db.exec(`DROP TABLE IF EXISTS jeopardy_fts`);
  db.exec(`DROP TABLE IF EXISTS jeopardy_reference`);

  console.log('>>> [Import] Creating jeopardy_reference table...');
  db.exec(`
    CREATE TABLE jeopardy_reference (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      round            INTEGER,
      clue_value       INTEGER,
      daily_double     INTEGER DEFAULT 0,
      category         TEXT,
      answer           TEXT,
      question         TEXT,
      air_date         TEXT
    );
    CREATE INDEX idx_jref_category ON jeopardy_reference(category);
    CREATE INDEX idx_jref_air_date  ON jeopardy_reference(air_date);
  `);

  console.log('>>> [Import] Creating FTS5 virtual table...');
  db.exec(`
    CREATE VIRTUAL TABLE jeopardy_fts USING fts5(
      category,
      answer,
      question,
      content='jeopardy_reference',
      content_rowid='id',
      tokenize='porter unicode61'
    );
  `);

  const insert = db.prepare(`
    INSERT INTO jeopardy_reference (round, clue_value, daily_double, category, answer, question, air_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFts = db.prepare(`
    INSERT INTO jeopardy_fts (rowid, category, answer, question)
    VALUES (?, ?, ?, ?)
  `);

  const batchInsert = db.transaction((rows: any[]) => {
    for (const row of rows) {
      const info = insert.run(
        row.round,
        row.clue_value,
        row.daily_double,
        row.category,
        row.answer,
        row.question,
        row.air_date
      );
      insertFts.run(info.lastInsertRowid, row.category ?? '', row.answer ?? '', row.question ?? '');
    }
  });

  const rl = createInterface({ input: createReadStream(TSV_PATH), crlfDelay: Infinity });

  let lineNum = 0;
  let batch: any[] = [];
  let totalInserted = 0;
  let skipped = 0;

  console.log('>>> [Import] Reading TSV...');

  for await (const line of rl) {
    lineNum++;

    // Skip header row
    if (lineNum === 1) continue;

    const parts = line.split('\t');
    // Columns: round, clue_value, daily_double_value, category, comments, answer, question, air_date, notes
    const [round, clue_value, daily_double_value, category, , answer, question, air_date] = parts;

    // Skip rows with no question or answer
    if (!answer?.trim() && !question?.trim()) {
      skipped++;
      continue;
    }

    batch.push({
      round: parseInt(round) || null,
      clue_value: parseInt(clue_value) || 0,
      daily_double: parseInt(daily_double_value) || 0,
      category: category?.trim() ?? '',
      answer: answer?.trim() ?? '',
      question: question?.trim() ?? '',
      air_date: air_date?.trim() ?? '',
    });

    if (batch.length >= BATCH_SIZE) {
      batchInsert(batch);
      totalInserted += batch.length;
      batch = [];
      if (totalInserted % 10000 === 0) {
        console.log(`>>> [Import] ${totalInserted.toLocaleString()} rows inserted...`);
      }
    }
  }

  // Flush remainder
  if (batch.length > 0) {
    batchInsert(batch);
    totalInserted += batch.length;
  }

  console.log(`>>> [Import] Done. ${totalInserted.toLocaleString()} rows inserted, ${skipped} skipped.`);
  console.log('>>> [Import] Optimizing FTS index...');
  db.exec(`INSERT INTO jeopardy_fts(jeopardy_fts) VALUES('optimize')`);
  console.log('>>> [Import] Complete.');
}

main().catch((err) => {
  console.error('>>> [Import] Fatal error:', err);
  process.exit(1);
});
