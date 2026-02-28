import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '../data/drizzle-schema';
import { createAuthDb } from '../db/auth';
import { createHash } from 'crypto';

const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  name TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_memberships (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'active',
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  UNIQUE("accountId", "userId")
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "accountId" TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  "tokenHash" TEXT UNIQUE NOT NULL,
  "expiresAt" BIGINT NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "lastSeenAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS anecdotes (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  story TEXT NOT NULL,
  storyteller TEXT NOT NULL,
  location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  tags JSONB DEFAULT '[]',
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  "anecdoteId" TEXT NOT NULL REFERENCES anecdotes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  "createdAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  "subscribedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS storylines_cache (
  id INTEGER PRIMARY KEY,
  payload JSONB NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS storylines_cache_accounts (
  "accountId" TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS storyline_packages (
  id TEXT PRIMARY KEY,
  "storylineId" TEXT NOT NULL,
  "accountId" TEXT,
  payload JSONB NOT NULL,
  prompt TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  version INTEGER NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  "accountId" TEXT,
  title TEXT NOT NULL,
  "pseudoSynopsis" TEXT NOT NULL,
  "polishedSynopsis" TEXT DEFAULT '',
  "plotScript" TEXT DEFAULT '',
  style TEXT DEFAULT 'cinematic',
  "filmType" TEXT DEFAULT 'cinematic live-action',
  "durationMinutes" INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  "deletedAt" BIGINT,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_notes (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'typed',
  "rawText" TEXT NOT NULL,
  transcript TEXT DEFAULT '',
  "minuteMark" REAL,
  "orderIndex" INTEGER NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_beats (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "sourceNoteId" TEXT,
  "orderIndex" INTEGER NOT NULL,
  "minuteStart" REAL NOT NULL,
  "minuteEnd" REAL NOT NULL,
  "pseudoBeat" TEXT NOT NULL,
  "polishedBeat" TEXT NOT NULL,
  objective TEXT DEFAULT '',
  conflict TEXT DEFAULT '',
  "turnText" TEXT DEFAULT '',
  intensity INTEGER DEFAULT 50,
  tags JSONB DEFAULT '[]',
  locked BOOLEAN DEFAULT false,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_packages (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  prompt TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  version INTEGER NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS scene_videos (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "packageId" TEXT NOT NULL,
  "beatId" TEXT NOT NULL,
  provider TEXT DEFAULT 'local-ffmpeg',
  "modelKey" TEXT DEFAULT 'seedance',
  prompt TEXT DEFAULT '',
  "sourceImageUrl" TEXT DEFAULT '',
  "continuityScore" REAL DEFAULT 0.75,
  "continuityThreshold" REAL DEFAULT 0.75,
  "recommendRegenerate" BOOLEAN DEFAULT false,
  "continuityReason" TEXT DEFAULT '',
  status TEXT DEFAULT 'queued',
  "jobId" TEXT DEFAULT '',
  "videoUrl" TEXT DEFAULT '',
  "durationSeconds" INTEGER DEFAULT 5,
  error TEXT DEFAULT '',
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS scene_prompt_layers (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "packageId" TEXT NOT NULL,
  "beatId" TEXT NOT NULL,
  "directorPrompt" TEXT DEFAULT '',
  "cinematographerPrompt" TEXT DEFAULT '',
  "mergedPrompt" TEXT DEFAULT '',
  "filmType" TEXT DEFAULT '',
  "generationModel" TEXT DEFAULT 'seedance',
  "continuationMode" TEXT DEFAULT 'strict',
  "anchorBeatId" TEXT DEFAULT '',
  "autoRegenerateThreshold" REAL DEFAULT 0.75,
  source TEXT DEFAULT 'manual',
  version INTEGER NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS scene_video_prompt_traces (
  "traceId" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "packageId" TEXT NOT NULL,
  "beatId" TEXT NOT NULL,
  payload JSONB NOT NULL,
  "createdAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_final_films (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued',
  "sourceCount" INTEGER DEFAULT 0,
  "videoUrl" TEXT DEFAULT '',
  error TEXT DEFAULT '',
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_uploads (
  filename TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_style_bibles (
  "projectId" TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_screenplays (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'draft',
  version INTEGER NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_scenes_bibles (
  "projectId" TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  "updatedAt" BIGINT NOT NULL
);
`;

export const createTestDb = async () => {
  const client = new PGlite();
  await client.exec(TABLE_SQL);
  const db = drizzle(client, { schema });
  return db;
};

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

let idCounter = 0;

export const resetIdCounter = () => { idCounter = 0; };

export const testGenerateId = () => `test-id-${++idCounter}`;

export const seedTestUser = async (db: TestDb, overrides?: { email?: string; password?: string }) => {
  const email = overrides?.email || 'test@example.com';
  const password = overrides?.password || 'test-password-123';
  const authDb = createAuthDb({ db, generateId: testGenerateId });

  const passwordHash = `hashed-${password}`;
  const user = await authDb.createUser({ email, passwordHash, name: email.split('@')[0] });
  const account = await authDb.createAccount({ name: 'Test Workspace', slug: 'test-workspace' });
  await authDb.addMembership({ accountId: account!.id, userId: user!.id, role: 'owner' });

  const token = 'test-token-' + Date.now();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  await authDb.createSession({ userId: user!.id, accountId: account!.id, tokenHash, expiresAt });

  return { user, account, token, tokenHash, authDb };
};
