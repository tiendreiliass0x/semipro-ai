import { Database } from 'bun:sqlite';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

const dataDir = import.meta.dir;
const DB_PATH = join(dataDir, 'anecdotes.db');
const JSON_PATH = join(dataDir, 'anecdotes.json');

// Initialize database
const db = new Database(DB_PATH);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS anecdotes (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    year INTEGER NOT NULL,
    title TEXT NOT NULL,
    story TEXT NOT NULL,
    storyteller TEXT NOT NULL,
    location TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    anecdoteId TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (anecdoteId) REFERENCES anecdotes(id) ON DELETE CASCADE
  )
`);

// Check if we have JSON data to migrate
if (!existsSync(JSON_PATH)) {
  console.log('No anecdotes.json found. Database is ready with empty tables.');
  process.exit(0);
}

// Check if we already have data in the database
const count = db.query('SELECT COUNT(*) as count FROM anecdotes').get() as { count: number };
if (count.count > 0) {
  console.log(`Database already has ${count.count} anecdotes. Skipping migration.`);
  process.exit(0);
}

// Load JSON data
const jsonData = JSON.parse(readFileSync(JSON_PATH, 'utf8'));

if (!Array.isArray(jsonData) || jsonData.length === 0) {
  console.log('No data in anecdotes.json. Database is ready.');
  process.exit(0);
}

console.log(`Migrating ${jsonData.length} anecdotes from JSON to SQLite...`);

const insertAnecdote = db.query(`
  INSERT INTO anecdotes (id, date, year, title, story, storyteller, location, notes, tags, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMedia = db.query(`
  INSERT INTO media (id, anecdoteId, type, url, caption, createdAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const a of jsonData) {
  insertAnecdote.run(
    a.id,
    a.date,
    a.year,
    a.title,
    a.story,
    a.storyteller,
    a.location || '',
    a.notes || '',
    JSON.stringify(a.tags || []),
    a.createdAt || Date.now(),
    a.updatedAt || Date.now()
  );
  
  // Migrate media
  if (a.media && a.media.length > 0) {
    for (const m of a.media) {
      insertMedia.run(
        crypto.randomUUID(),
        a.id,
        m.type || 'image',
        m.url,
        m.caption || '',
        m.createdAt || Date.now()
      );
    }
  }
}

console.log('Migration complete!');
console.log(`Database: ${DB_PATH}`);

// Verify
const newCount = db.query('SELECT COUNT(*) as count FROM anecdotes').get() as { count: number };
console.log(`Total anecdotes in database: ${newCount.count}`);
