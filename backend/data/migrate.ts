import { Database } from 'bun:sqlite';
import { basename, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const dataDir = import.meta.dir;
const DB_PATH = join(dataDir, 'anecdotes.db');
const JSON_PATH = join(dataDir, 'anecdotes.json');
const SUBSCRIBERS_JSON_PATH = join(dataDir, 'subscribers.json');

// Initialize database
const db = new Database(DB_PATH);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    name TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS account_memberships (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'active',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    UNIQUE(accountId, userId),
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    accountId TEXT NOT NULL,
    tokenHash TEXT UNIQUE NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    lastSeenAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
  )
`);

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
  CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    subscribedAt INTEGER NOT NULL
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

db.exec(`
  CREATE TABLE IF NOT EXISTS storylines_cache (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS storyline_packages (
    id TEXT PRIMARY KEY,
    storylineId TEXT NOT NULL,
    payload TEXT NOT NULL,
    prompt TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    version INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    accountId TEXT,
    title TEXT NOT NULL,
    pseudoSynopsis TEXT NOT NULL,
    polishedSynopsis TEXT DEFAULT '',
    plotScript TEXT DEFAULT '',
    style TEXT DEFAULT 'cinematic',
    durationMinutes INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft',
    deletedAt INTEGER,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS story_notes (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    source TEXT DEFAULT 'typed',
    rawText TEXT NOT NULL,
    transcript TEXT DEFAULT '',
    minuteMark REAL,
    orderIndex INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS story_beats (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    sourceNoteId TEXT,
    orderIndex INTEGER NOT NULL,
    minuteStart REAL NOT NULL,
    minuteEnd REAL NOT NULL,
    pseudoBeat TEXT NOT NULL,
    polishedBeat TEXT NOT NULL,
    objective TEXT DEFAULT '',
    conflict TEXT DEFAULT '',
    turnText TEXT DEFAULT '',
    intensity INTEGER DEFAULT 50,
    tags TEXT DEFAULT '[]',
    locked INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS project_packages (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    payload TEXT NOT NULL,
    prompt TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    version INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS scene_videos (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    packageId TEXT NOT NULL,
    beatId TEXT NOT NULL,
    provider TEXT DEFAULT 'local-ffmpeg',
    modelKey TEXT DEFAULT 'seedance',
    prompt TEXT DEFAULT '',
    sourceImageUrl TEXT DEFAULT '',
    continuityScore REAL DEFAULT 0.75,
    continuityThreshold REAL DEFAULT 0.75,
    recommendRegenerate INTEGER DEFAULT 0,
    continuityReason TEXT DEFAULT '',
    status TEXT DEFAULT 'queued',
    jobId TEXT DEFAULT '',
    videoUrl TEXT DEFAULT '',
    durationSeconds INTEGER DEFAULT 5,
    error TEXT DEFAULT '',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

const ensureSceneVideoColumn = (columnSql: string) => {
  try {
    db.exec(`ALTER TABLE scene_videos ADD COLUMN ${columnSql}`);
  } catch {
    // no-op when column already exists
  }
};

ensureSceneVideoColumn('continuityScore REAL DEFAULT 0.75');
ensureSceneVideoColumn('continuityThreshold REAL DEFAULT 0.75');
ensureSceneVideoColumn('recommendRegenerate INTEGER DEFAULT 0');
ensureSceneVideoColumn("continuityReason TEXT DEFAULT ''");
ensureSceneVideoColumn("modelKey TEXT DEFAULT 'seedance'");

db.exec(`
  CREATE TABLE IF NOT EXISTS scene_prompt_layers (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    packageId TEXT NOT NULL,
    beatId TEXT NOT NULL,
    directorPrompt TEXT DEFAULT '',
    cinematographerPrompt TEXT DEFAULT '',
    mergedPrompt TEXT DEFAULT '',
    filmType TEXT DEFAULT '',
    generationModel TEXT DEFAULT 'seedance',
    continuationMode TEXT DEFAULT 'strict',
    anchorBeatId TEXT DEFAULT '',
    autoRegenerateThreshold REAL DEFAULT 0.75,
    source TEXT DEFAULT 'manual',
    version INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS scene_video_prompt_traces (
    traceId TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    packageId TEXT NOT NULL,
    beatId TEXT NOT NULL,
    payload TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

const ensureScenePromptLayerColumn = (columnSql: string) => {
  try {
    db.exec(`ALTER TABLE scene_prompt_layers ADD COLUMN ${columnSql}`);
  } catch {
    // no-op when column already exists
  }
};

ensureScenePromptLayerColumn("continuationMode TEXT DEFAULT 'strict'");
ensureScenePromptLayerColumn("anchorBeatId TEXT DEFAULT ''");
ensureScenePromptLayerColumn('autoRegenerateThreshold REAL DEFAULT 0.75');
ensureScenePromptLayerColumn("generationModel TEXT DEFAULT 'seedance'");

db.exec(`
  CREATE TABLE IF NOT EXISTS project_final_films (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    status TEXT DEFAULT 'processing',
    sourceCount INTEGER DEFAULT 0,
    videoUrl TEXT DEFAULT '',
    error TEXT DEFAULT '',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS account_uploads (
    filename TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS project_style_bibles (
    projectId TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS project_screenplays (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    version INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS project_scenes_bibles (
    projectId TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

const ensureTableColumn = (tableName: string, columnName: string, columnSql: string) => {
  const columns = db.query(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.find(column => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`);
  }
};

ensureTableColumn('projects', 'accountId', 'TEXT');
ensureTableColumn('projects', 'deletedAt', 'INTEGER');

const migrationKey = 'projects_duration_to_one_min_v1';
const alreadyRan = db.query('SELECT value FROM app_meta WHERE key = ?').get(migrationKey) as { value?: string } | null;
if (alreadyRan?.value !== 'done') {
  const now = Date.now();
  const result = db.query('UPDATE projects SET durationMinutes = 1 WHERE durationMinutes IS NULL OR durationMinutes != 1').run() as { changes?: number };
  db.query(`
    INSERT INTO app_meta (key, value, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run(migrationKey, 'done', now);
  const changed = Number(result?.changes || 0);
  if (changed > 0) {
    console.log(`Migrated ${changed} project(s) to 1-minute duration`);
  }
}

const uploadOwnershipMigrationKey = 'upload_ownership_from_projects_v1';
const uploadOwnershipAlreadyRan = db.query('SELECT value FROM app_meta WHERE key = ?').get(uploadOwnershipMigrationKey) as { value?: string } | null;
if (uploadOwnershipAlreadyRan?.value !== 'done') {
  const now = Date.now();
  const upsertOwnership = db.query(`
    INSERT INTO account_uploads (filename, accountId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(filename) DO UPDATE SET accountId = excluded.accountId, updatedAt = excluded.updatedAt
  `);
  const getUploadFilename = (rawUrl: string): string | null => {
    if (!rawUrl.startsWith('/uploads/')) return null;
    const value = basename(rawUrl.split('?')[0] || '');
    return value.trim() ? value : null;
  };

  let mapped = 0;
  const sceneRows = db.query(`
    SELECT p.accountId as accountId, sv.sourceImageUrl as sourceImageUrl, sv.videoUrl as videoUrl
    FROM scene_videos sv
    JOIN projects p ON p.id = sv.projectId
    WHERE p.accountId IS NOT NULL
  `).all() as Array<{ accountId?: string | null; sourceImageUrl?: string | null; videoUrl?: string | null }>;

  sceneRows.forEach(row => {
    const accountId = String(row.accountId || '').trim();
    if (!accountId) return;
    [row.sourceImageUrl, row.videoUrl].forEach(url => {
      const filename = getUploadFilename(String(url || ''));
      if (!filename) return;
      upsertOwnership.run(filename, accountId, now, now);
      mapped += 1;
    });
  });

  const finalFilmRows = db.query(`
    SELECT p.accountId as accountId, pf.videoUrl as videoUrl
    FROM project_final_films pf
    JOIN projects p ON p.id = pf.projectId
    WHERE p.accountId IS NOT NULL
  `).all() as Array<{ accountId?: string | null; videoUrl?: string | null }>;
  finalFilmRows.forEach(row => {
    const accountId = String(row.accountId || '').trim();
    if (!accountId) return;
    const filename = getUploadFilename(String(row.videoUrl || ''));
    if (!filename) return;
    upsertOwnership.run(filename, accountId, now, now);
    mapped += 1;
  });

  db.query(`
    INSERT INTO app_meta (key, value, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run(uploadOwnershipMigrationKey, 'done', now);

  if (mapped > 0) {
    console.log(`Mapped ${mapped} upload reference(s) to owning account`);
  }
}

const anecdoteCount = db.query('SELECT COUNT(*) as count FROM anecdotes').get() as { count: number };
const subscriberCount = db.query('SELECT COUNT(*) as count FROM subscribers').get() as { count: number };

const insertAnecdote = db.query(`
  INSERT INTO anecdotes (id, date, year, title, story, storyteller, location, notes, tags, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMedia = db.query(`
  INSERT INTO media (id, anecdoteId, type, url, caption, createdAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertSubscriber = db.query(`
  INSERT INTO subscribers (id, email, name, subscribedAt)
  VALUES (?, ?, ?, ?)
`);

let migratedAnecdotes = 0;
let migratedSubscribers = 0;

if (anecdoteCount.count === 0 && existsSync(JSON_PATH)) {
  const jsonData = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    console.log(`Migrating ${jsonData.length} anecdotes from JSON to SQLite...`);

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
    migratedAnecdotes = jsonData.length;
  } else {
    console.log('No anecdotes found in anecdotes.json.');
  }
} else if (anecdoteCount.count > 0) {
  console.log(`Anecdotes table already has ${anecdoteCount.count} row(s), skipping anecdote migration.`);
} else {
  console.log('No anecdotes.json found, skipping anecdote migration.');
}

if (subscriberCount.count === 0 && existsSync(SUBSCRIBERS_JSON_PATH)) {
  const subscribersJson = JSON.parse(readFileSync(SUBSCRIBERS_JSON_PATH, 'utf8'));
  if (Array.isArray(subscribersJson) && subscribersJson.length > 0) {
    console.log(`Migrating ${subscribersJson.length} subscribers from JSON to SQLite...`);
    for (const s of subscribersJson) {
      if (!s?.email) continue;
      insertSubscriber.run(
        s.id || crypto.randomUUID(),
        String(s.email).toLowerCase().trim(),
        s.name || '',
        typeof s.subscribedAt === 'number' ? s.subscribedAt : Date.now()
      );
    }
    migratedSubscribers = subscribersJson.length;
  } else {
    console.log('No subscribers found in subscribers.json.');
  }
} else if (subscriberCount.count > 0) {
  console.log(`Subscribers table already has ${subscriberCount.count} row(s), skipping subscriber migration.`);
} else {
  console.log('No subscribers.json found, skipping subscriber migration.');
}

console.log('Migration complete!');
console.log(`Database: ${DB_PATH}`);
console.log(`Migrated anecdotes: ${migratedAnecdotes}`);
console.log(`Migrated subscribers: ${migratedSubscribers}`);

// Verify
const newCount = db.query('SELECT COUNT(*) as count FROM anecdotes').get() as { count: number };
console.log(`Total anecdotes in database: ${newCount.count}`);
const newSubscriberCount = db.query('SELECT COUNT(*) as count FROM subscribers').get() as { count: number };
console.log(`Total subscribers in database: ${newSubscriberCount.count}`);
const storylineRow = db.query('SELECT payload FROM storylines_cache WHERE id = 1').get() as { payload?: string } | null;
const storylineTotal = storylineRow?.payload ? (JSON.parse(storylineRow.payload).length || 0) : 0;
console.log(`Total storylines in database: ${storylineTotal}`);
