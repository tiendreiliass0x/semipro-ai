import type { Database } from 'bun:sqlite';

const TABLE_DEFINITIONS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    name TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS account_memberships (
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
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    accountId TEXT NOT NULL,
    tokenHash TEXT UNIQUE NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    lastSeenAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS anecdotes (
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
  )`,
  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    anecdoteId TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (anecdoteId) REFERENCES anecdotes(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    subscribedAt INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS storylines_cache (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    updatedAt INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS storylines_cache_accounts (
    accountId TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS storyline_packages (
    id TEXT PRIMARY KEY,
    storylineId TEXT NOT NULL,
    accountId TEXT,
    payload TEXT NOT NULL,
    prompt TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    version INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    accountId TEXT,
    title TEXT NOT NULL,
    pseudoSynopsis TEXT NOT NULL,
    polishedSynopsis TEXT DEFAULT '',
    plotScript TEXT DEFAULT '',
    style TEXT DEFAULT 'cinematic',
    filmType TEXT DEFAULT 'cinematic live-action',
    durationMinutes INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft',
    deletedAt INTEGER,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS story_notes (
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
  )`,
  `CREATE TABLE IF NOT EXISTS story_beats (
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
  )`,
  `CREATE TABLE IF NOT EXISTS project_packages (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    payload TEXT NOT NULL,
    prompt TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    version INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS scene_videos (
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
  )`,
  `CREATE TABLE IF NOT EXISTS scene_prompt_layers (
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
  )`,
  `CREATE TABLE IF NOT EXISTS scene_video_prompt_traces (
    traceId TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    packageId TEXT NOT NULL,
    beatId TEXT NOT NULL,
    payload TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS project_final_films (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    sourceCount INTEGER DEFAULT 0,
    videoUrl TEXT DEFAULT '',
    error TEXT DEFAULT '',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS account_uploads (
    filename TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS project_style_bibles (
    projectId TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS project_screenplays (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    version INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS project_scenes_bibles (
    projectId TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt INTEGER NOT NULL
  )`,
];

const COLUMN_MIGRATIONS: Array<{ table: string; column: string; sql: string }> = [
  { table: 'storyline_packages', column: 'accountId', sql: 'TEXT' },
  { table: 'projects', column: 'filmType', sql: "TEXT DEFAULT 'cinematic live-action'" },
  { table: 'projects', column: 'plotScript', sql: "TEXT DEFAULT ''" },
  { table: 'projects', column: 'deletedAt', sql: 'INTEGER' },
  { table: 'projects', column: 'accountId', sql: 'TEXT' },
  { table: 'scene_videos', column: 'continuityScore', sql: 'REAL DEFAULT 0.75' },
  { table: 'scene_videos', column: 'continuityThreshold', sql: 'REAL DEFAULT 0.75' },
  { table: 'scene_videos', column: 'recommendRegenerate', sql: 'INTEGER DEFAULT 0' },
  { table: 'scene_videos', column: 'continuityReason', sql: "TEXT DEFAULT ''" },
  { table: 'scene_videos', column: 'modelKey', sql: "TEXT DEFAULT 'seedance'" },
  { table: 'scene_prompt_layers', column: 'continuationMode', sql: "TEXT DEFAULT 'strict'" },
  { table: 'scene_prompt_layers', column: 'anchorBeatId', sql: "TEXT DEFAULT ''" },
  { table: 'scene_prompt_layers', column: 'autoRegenerateThreshold', sql: 'REAL DEFAULT 0.75' },
  { table: 'scene_prompt_layers', column: 'generationModel', sql: "TEXT DEFAULT 'seedance'" },
  { table: 'story_beats', column: 'locked', sql: 'INTEGER DEFAULT 0' },
];

export const ensureTableColumn = (db: Database, tableName: string, columnName: string, columnSql: string) => {
  const columns = db.query(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.find(c => c.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`);
  }
};

const runTrackedMigration = (db: Database, key: string, migrate: () => number) => {
  const existing = db.query('SELECT value FROM app_meta WHERE key = ?').get(key) as { value?: string } | null;
  if (existing?.value === 'done') return;
  const changed = migrate();
  const now = Date.now();
  db.query(`
    INSERT INTO app_meta (key, value, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run(key, 'done', now);
  if (changed > 0) {
    console.log(`[migration:${key}] Applied to ${changed} row(s)`);
  }
};

const runOneTimeMigrations = (db: Database) => {
  runTrackedMigration(db, 'projects_duration_to_one_min_v1', () => {
    const result = db.query('UPDATE projects SET durationMinutes = 1 WHERE durationMinutes IS NULL OR durationMinutes != 1').run() as { changes?: number };
    return Number(result?.changes || 0);
  });

  runTrackedMigration(db, 'upload_ownership_from_projects_v1', () => {
    const syncUploadOwnership = db.query(`
      INSERT INTO account_uploads (filename, accountId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(filename) DO UPDATE SET accountId = excluded.accountId, updatedAt = excluded.updatedAt
    `);
    const extractUploadFilename = (rawUrl: string): string | null => {
      if (!rawUrl.startsWith('/uploads/')) return null;
      const [withoutQuery] = rawUrl.split('?');
      const parts = withoutQuery.split('/').filter(Boolean);
      const filename = parts[parts.length - 1] || '';
      return filename.trim() ? filename : null;
    };

    const now = Date.now();
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
      [row.sourceImageUrl, row.videoUrl].forEach(value => {
        const filename = extractUploadFilename(String(value || ''));
        if (!filename) return;
        syncUploadOwnership.run(filename, accountId, now, now);
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
      const filename = extractUploadFilename(String(row.videoUrl || ''));
      if (!filename) return;
      syncUploadOwnership.run(filename, accountId, now, now);
      mapped += 1;
    });

    return mapped;
  });
};

export const initializeSchema = (db: Database) => {
  for (const sql of TABLE_DEFINITIONS) {
    db.exec(sql);
  }
  for (const { table, column, sql } of COLUMN_MIGRATIONS) {
    ensureTableColumn(db, table, column, sql);
  }
  runOneTimeMigrations(db);
};
