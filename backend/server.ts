import { serve } from 'bun';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { Database } from 'bun:sqlite';
import { createAnecdotesDb } from './db/anecdotes';
import { createAuthDb } from './db/auth';
import { createProjectsDb } from './db/projects';
import { createStorylinesDb } from './db/storylines';
import { createSubscribersDb } from './db/subscribers';
import { startBullBoard } from './lib/bullBoard';
import { generateHybridScreenplayWithLlm, generateProjectStoryboardWithLlm, generateScenesBibleWithLlm, generateStoryboardFrameWithLlm, generateStoryPackageWithLlm, polishNotesIntoBeatsWithLlm, refineSynopsisWithLlm, regenerateStoryboardSceneWithLlm } from './lib/storylineLlm';
import { buildCinematographerPrompt, buildDirectorSceneVideoPrompt, buildMergedScenePrompt, createFinalFilmFromClips, extractLastFrameFromVideo, generateSceneVideoWithFal } from './lib/sceneVideo';
import { enqueueFinalFilmQueueRun as enqueueFinalFilmQueueRunBull, enqueueSceneVideoQueueRun as enqueueSceneVideoQueueRunBull, enqueueStoryboardImageQueueRun as enqueueStoryboardImageQueueRunBull, getBullMqQueues, getQueueBackend, getQueueDashboardData, startQueueWorkers } from './lib/queueWorker';
import { resolveVideoModel } from './lib/videoModel';
import { handleAnecdotesRoutes } from './routes/anecdotes';
import { handleAccountRoutes } from './routes/account';
import { handleAuthRoutes } from './routes/auth';
import { handleProjectsRoutes } from './routes/projects';
import { handleStorylinesRoutes } from './routes/storylines';
import { handleSubscribersRoutes } from './routes/subscribers';
import { handleUploadsRoutes } from './routes/uploads';

const PORT = parseInt(process.env.PORT || '3001');
const ADMIN_ACCESS_KEY = process.env.ADMIN_ACCESS_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-4.1-mini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
};

const dataDir = join(import.meta.dir, 'data');
const uploadsDir = join(import.meta.dir, 'uploads');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

// Initialize SQLite database
const DB_PATH = join(dataDir, 'anecdotes.db');
const db = new Database(DB_PATH);

// Create tables if they don't exist
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

// Create subscribers table
db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    subscribedAt INTEGER NOT NULL
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
  CREATE TABLE IF NOT EXISTS storylines_cache_accounts (
    accountId TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS storyline_packages (
    id TEXT PRIMARY KEY,
    storylineId TEXT NOT NULL,
    accountId TEXT,
    payload TEXT NOT NULL,
    prompt TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    version INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

const ensureStorylinePackageColumn = (columnSql: string) => {
  try {
    db.exec(`ALTER TABLE storyline_packages ADD COLUMN ${columnSql}`);
  } catch {
    // no-op if column already exists
  }
};

ensureStorylinePackageColumn('accountId TEXT');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
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
  )
`);

const ensureProjectColumn = (columnSql: string) => {
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN ${columnSql}`);
  } catch {
    // no-op if column already exists
  }
};

ensureProjectColumn("filmType TEXT DEFAULT 'cinematic live-action'");

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

db.exec(`
  CREATE TABLE IF NOT EXISTS storyboard_image_jobs (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    packageId TEXT NOT NULL,
    beatId TEXT NOT NULL,
    prompt TEXT NOT NULL,
    imageModelKey TEXT DEFAULT 'fal',
    status TEXT DEFAULT 'queued',
    imageUrl TEXT DEFAULT '',
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
    // no-op if column already exists
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
    // no-op if column already exists
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
    status TEXT DEFAULT 'queued',
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

ensureTableColumn('story_beats', 'locked', 'INTEGER DEFAULT 0');
ensureTableColumn('projects', 'plotScript', "TEXT DEFAULT ''");
ensureTableColumn('projects', 'deletedAt', 'INTEGER');
ensureTableColumn('projects', 'accountId', 'TEXT');

const runOneTimeMigrations = () => {
  const migrationKey = 'projects_duration_to_one_min_v1';
  const alreadyRan = db.query('SELECT value FROM app_meta WHERE key = ?').get(migrationKey) as { value?: string } | null;
  if (alreadyRan?.value === 'done') return;

  const now = Date.now();
  const result = db.query('UPDATE projects SET durationMinutes = 1 WHERE durationMinutes IS NULL OR durationMinutes != 1').run() as { changes?: number };
  db.query(`
    INSERT INTO app_meta (key, value, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run(migrationKey, 'done', now);

  const changed = Number(result?.changes || 0);
  if (changed > 0) {
    console.log(`[migration] Updated ${changed} project(s) to 1-minute duration default`);
  }

  const uploadOwnershipMigrationKey = 'upload_ownership_from_projects_v1';
  const ownershipAlreadyRan = db.query('SELECT value FROM app_meta WHERE key = ?').get(uploadOwnershipMigrationKey) as { value?: string } | null;
  if (ownershipAlreadyRan?.value !== 'done') {
    const migrationNow = Date.now();
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
        syncUploadOwnership.run(filename, accountId, migrationNow, migrationNow);
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
      syncUploadOwnership.run(filename, accountId, migrationNow, migrationNow);
      mapped += 1;
    });

    db.query(`
      INSERT INTO app_meta (key, value, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `).run(uploadOwnershipMigrationKey, 'done', migrationNow);

    if (mapped > 0) {
      console.log(`[migration] Mapped ${mapped} upload reference(s) to owning account`);
    }
  }
};

runOneTimeMigrations();

const generateId = (): string => crypto.randomUUID();

const getUploadFilenameFromUrl = (rawUrl: string): string | null => {
  if (!rawUrl.startsWith('/uploads/')) return null;
  const [withoutQuery] = rawUrl.split('?');
  const parts = withoutQuery.split('/').filter(Boolean);
  const filename = parts[parts.length - 1] || '';
  return filename.trim() ? filename : null;
};

const registerUploadOwnership = (args: { filename: string; accountId: string }) => {
  const filename = String(args.filename || '').trim();
  const accountId = String(args.accountId || '').trim();
  if (!filename || !accountId) return;
  const now = Date.now();
  db.query(`
    INSERT INTO account_uploads (filename, accountId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(filename) DO UPDATE SET accountId = excluded.accountId, updatedAt = excluded.updatedAt
  `).run(filename, accountId, now, now);
};

const getUploadOwnerAccountId = (filename: string): string | null => {
  const row = db.query('SELECT accountId FROM account_uploads WHERE filename = ?').get(filename) as { accountId?: string } | null;
  return row?.accountId ? String(row.accountId) : null;
};

const verifyAccessKey = (req: Request): boolean => {
  return Boolean(getAuthContext(req));
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const verifyAdminKey = (req: Request): boolean => {
  if (!ADMIN_ACCESS_KEY) return false;
  const key = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('adminKey');
  return key === ADMIN_ACCESS_KEY;
};

const getAuthContext = (req: Request) => {
  const authHeader = req.headers.get('authorization') || '';
  const pathname = new URL(req.url).pathname;
  let token = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (pathname.startsWith('/uploads/')) {
    const tokenFromQuery = new URL(req.url).searchParams.get('token') || '';
    token = tokenFromQuery.trim();
  }
  if (!token) return null;

  const session = getSessionByTokenHash(hashToken(token));
  if (!session) return null;
  if (Number(session.expiresAt || 0) < Date.now()) {
    revokeSessionByTokenHash(hashToken(token));
    return null;
  }
  if (String(session.userStatus || '') !== 'active' || String(session.accountStatus || '') !== 'active') {
    return null;
  }

  touchSession(session.id);
  return {
    sessionId: String(session.id),
    userId: String(session.userId),
    accountId: String(session.accountId),
    email: String(session.email || ''),
    userName: String(session.userName || ''),
    accountName: String(session.accountName || ''),
    accountSlug: String(session.accountSlug || ''),
  };
};

const getRequestAccountId = (req: Request): string | null => {
  const context = getAuthContext(req);
  return context?.accountId || null;
};

// Database helpers
const {
  getAllAnecdotes,
  getAnecdoteById,
  getAnecdotesByYear,
  createAnecdote,
  updateAnecdote,
  deleteAnecdote,
} = createAnecdotesDb({ db, uploadsDir, generateId });

const {
  loadStorylines,
  saveStorylines,
  listStorylinePackages,
  getLatestStorylinePackage,
  saveStorylinePackage,
} = createStorylinesDb({ db, generateId });

const {
  addSubscriber,
  listSubscribers,
  exportSubscribersCsv,
} = createSubscribersDb({ db, generateId });

const {
  getUserByEmail,
  getUserById,
  createUser,
  getAccountById,
  getAccountBySlug,
  createAccount,
  updateAccount,
  addMembership,
  listUserMemberships,
  createSession,
  getSessionByTokenHash,
  touchSession,
  revokeSessionByTokenHash,
  revokeExpiredSessions,
} = createAuthDb({ db, generateId });

const {
  listProjects,
  getProjectById,
  softDeleteProject,
  createProject,
  updateProjectBasics,
  updateProjectSynopsis,
  addStoryNote,
  listStoryNotes,
  replaceProjectBeats,
  listStoryBeats,
  setBeatLocked,
  saveProjectPackage,
  getLatestProjectPackage,
  getProjectPackageById,
  updateProjectPackagePayload,
  setStoryboardSceneLocked,
  createStoryboardImageJob,
  updateStoryboardImageJob,
  createSceneVideoJob,
  updateSceneVideoJob,
  getLatestSceneVideo,
  listLatestSceneVideos,
  createProjectFinalFilm,
  updateProjectFinalFilm,
  getLatestProjectFinalFilm,
  claimNextQueuedProjectFinalFilm,
  claimProjectFinalFilmById,
  requeueStaleProcessingProjectFinalFilms,
  claimNextQueuedStoryboardImageJob,
  claimStoryboardImageJobById,
  requeueStaleProcessingStoryboardImageJobs,
  claimNextQueuedSceneVideo,
  claimSceneVideoJobById,
  requeueStaleProcessingSceneVideos,
  createScenePromptLayer,
  getLatestScenePromptLayer,
  listScenePromptLayerHistory,
  listLatestScenePromptLayers,
  createSceneVideoPromptTrace,
  listSceneVideoPromptTraces,
  getProjectStyleBible,
  updateProjectStyleBible,
  getLatestProjectScreenplay,
  saveProjectScreenplay,
  getProjectScenesBible,
  updateProjectScenesBible,
} = createProjectsDb({ db, generateId });

let storyboardImageWorkerActive = false;
const processStoryboardImageJob = async (job: any) => {
  try {
    const projectId = String(job.projectId || '');
    const packageId = String(job.packageId || '');
    const beatId = String(job.beatId || '');
    console.log(`[queue][bullmq] Processing storyboard image job ${job.id} (project: ${projectId}, beat: ${beatId})`);
    const imageUrl = await generateStoryboardFrameWithLlm(
      String(job.prompt || ''),
      String(job.imageModelKey || 'fal').trim().toLowerCase() || 'fal'
    );

    const projectPackage = getProjectPackageById(packageId);
    if (!projectPackage) {
      updateStoryboardImageJob(job.id, { status: 'failed', error: `Storyboard package not found: ${packageId}` });
      return;
    }

    const storyboard = Array.isArray(projectPackage?.payload?.storyboard) ? projectPackage.payload.storyboard : [];
    if (!storyboard.length) {
      updateStoryboardImageJob(job.id, { status: 'failed', error: 'Storyboard package has no scenes' });
      return;
    }

    const hasTargetScene = storyboard.some((scene: any) => String(scene?.beatId) === beatId);
    if (!hasTargetScene) {
      updateStoryboardImageJob(job.id, { status: 'failed', error: `Scene beat not found in storyboard: ${beatId}` });
      return;
    }

    const updatedPayload = {
      ...projectPackage.payload,
      storyboard: storyboard.map((scene: any) => (
        String(scene?.beatId) === beatId
          ? { ...scene, imageUrl }
          : scene
      )),
    };
    updateProjectPackagePayload(packageId, updatedPayload);
    updateStoryboardImageJob(job.id, { status: 'completed', imageUrl, error: '' });
    console.log(`[queue][bullmq] Completed storyboard image job ${job.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate storyboard image';
    updateStoryboardImageJob(job.id, { status: 'failed', error: message });
    console.error(`[queue][bullmq] Failed storyboard image job ${job.id}: ${message}`);
  }
};

const processStoryboardImageQueue = async (triggerJobId?: string) => {
  if (storyboardImageWorkerActive) return;
  storyboardImageWorkerActive = true;

  try {
    const normalizedTriggerJobId = String(triggerJobId || '').trim();
    if (normalizedTriggerJobId && normalizedTriggerJobId !== 'startup-drain') {
      const targetedJob = claimStoryboardImageJobById(normalizedTriggerJobId);
      if (!targetedJob) return;
      await processStoryboardImageJob(targetedJob);
      return;
    }

    while (true) {
      const job = claimNextQueuedStoryboardImageJob();
      if (!job) break;
      await processStoryboardImageJob(job);
    }
  } finally {
    storyboardImageWorkerActive = false;
  }
};

let sceneVideoWorkerActive = false;
const processSceneVideoJob = async (job: any) => {
  try {
    console.log(`[queue][bullmq] Processing scene video job ${job.id} (project: ${job.projectId}, beat: ${job.beatId})`);
    const videoUrl = await generateSceneVideoWithFal({
      uploadsDir,
      sourceImageUrl: String(job.sourceImageUrl || ''),
      prompt: String(job.prompt || ''),
      modelKey: String(job.modelKey || 'seedance'),
      durationSeconds: Number(job.durationSeconds || 5),
    });

    const project = getProjectById(String(job.projectId || ''));
    if (project?.accountId) {
      const filename = getUploadFilenameFromUrl(String(videoUrl || ''));
      if (filename) {
        registerUploadOwnership({ filename, accountId: String(project.accountId) });
      }
    }

    updateSceneVideoJob(job.id, { status: 'completed', videoUrl, error: '' });
    console.log(`[queue][bullmq] Completed scene video job ${job.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate scene video';
    updateSceneVideoJob(job.id, { status: 'failed', error: message });
    console.error(`[queue][bullmq] Failed scene video job ${job.id}: ${message}`);
  }
};

const processSceneVideoQueue = async (triggerJobId?: string) => {
  if (sceneVideoWorkerActive) return;
  sceneVideoWorkerActive = true;

  try {
    const normalizedTriggerJobId = String(triggerJobId || '').trim();
    if (normalizedTriggerJobId && normalizedTriggerJobId !== 'startup-drain') {
      const targetedJob = claimSceneVideoJobById(normalizedTriggerJobId);
      if (!targetedJob) return;
      await processSceneVideoJob(targetedJob);
      return;
    }

    while (true) {
      const job = claimNextQueuedSceneVideo();
      if (!job) break;
      await processSceneVideoJob(job);
    }
  } finally {
    sceneVideoWorkerActive = false;
  }
};

let finalFilmWorkerActive = false;
const processFinalFilmJob = async (filmJob: any) => {
  try {
    const projectId = String(filmJob.projectId || '');
    console.log(`[queue][bullmq] Processing final film job ${filmJob.id} (project: ${projectId})`);

    const project = getProjectById(projectId);
    if (!project) {
      updateProjectFinalFilm(filmJob.id, { status: 'failed', error: 'Project not found' });
      return;
    }

    const latestPackage = getLatestProjectPackage(projectId);
    const storyboard = Array.isArray(latestPackage?.payload?.storyboard) ? latestPackage.payload.storyboard : [];
    if (!storyboard.length) {
      updateProjectFinalFilm(filmJob.id, { status: 'failed', error: 'No storyboard found. Generate scenes first.' });
      return;
    }

    const sceneVideos = listLatestSceneVideos(projectId);
    const completedByBeatId = new Map<string, any>();
    sceneVideos.forEach(item => {
      if (String(item?.status) === 'completed' && String(item?.videoUrl || '').trim()) {
        completedByBeatId.set(String(item.beatId), item);
      }
    });

    const clipUrls = storyboard
      .map((scene: any) => completedByBeatId.get(String(scene.beatId))?.videoUrl)
      .filter((url: any) => typeof url === 'string' && url.trim().length > 0);

    if (!clipUrls.length) {
      updateProjectFinalFilm(filmJob.id, { status: 'failed', error: 'No completed scene videos found to compile.' });
      return;
    }

    const outputFilename = `final-film-${projectId}-${Date.now()}.mp4`;
    const videoUrl = await createFinalFilmFromClips({
      uploadsDir,
      clipUrls,
      outputFilename,
    });

    if (project?.accountId) {
      registerUploadOwnership({ filename: outputFilename, accountId: String(project.accountId) });
    }

    updateProjectFinalFilm(filmJob.id, {
      status: 'completed',
      sourceCount: clipUrls.length,
      videoUrl,
      error: '',
    });
    console.log(`[queue][bullmq] Completed final film job ${filmJob.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build final film';
    updateProjectFinalFilm(filmJob.id, { status: 'failed', error: message });
    console.error(`[queue][bullmq] Failed final film job ${filmJob.id}: ${message}`);
  }
};

const processFinalFilmQueue = async (triggerJobId?: string) => {
  if (finalFilmWorkerActive) return;
  finalFilmWorkerActive = true;

  try {
    const normalizedTriggerJobId = String(triggerJobId || '').trim();
    if (normalizedTriggerJobId && normalizedTriggerJobId !== 'startup-drain') {
      const targetedJob = claimProjectFinalFilmById(normalizedTriggerJobId);
      if (!targetedJob) return;
      await processFinalFilmJob(targetedJob);
      return;
    }

    while (true) {
      const filmJob = claimNextQueuedProjectFinalFilm();
      if (!filmJob) break;
      await processFinalFilmJob(filmJob);
    }
  } finally {
    finalFilmWorkerActive = false;
  }
};

const queueBackend = getQueueBackend();
let enqueueStoryboardImageQueueRun = async (jobId: string) => {
  if (queueBackend === 'polling') {
    processStoryboardImageQueue().catch(() => null);
    return;
  }
  throw new Error(`[queue] BullMQ enqueue handler not initialized for storyboard image job ${jobId}`);
};
let enqueueSceneVideoQueueRun = async (jobId: string) => {
  if (queueBackend === 'polling') {
    processSceneVideoQueue().catch(() => null);
    return;
  }
  throw new Error(`[queue] BullMQ enqueue handler not initialized for scene video job ${jobId}`);
};
let enqueueFinalFilmQueueRun = async (jobId: string) => {
  if (queueBackend === 'polling') {
    processFinalFilmQueue().catch(() => null);
    return;
  }
  throw new Error(`[queue] BullMQ enqueue handler not initialized for final film job ${jobId}`);
};

const startPollingQueueWorkers = () => {
  console.log('[queue] Running in polling mode');
  setInterval(() => {
    processStoryboardImageQueue().catch(() => null);
  }, 2500);
  setInterval(() => {
    processSceneVideoQueue().catch(() => null);
  }, 2500);
  setInterval(() => {
    processFinalFilmQueue().catch(() => null);
  }, 2500);
  processStoryboardImageQueue().catch(() => null);
  processSceneVideoQueue().catch(() => null);
  processFinalFilmQueue().catch(() => null);
};

const startBullMqQueueWorkers = () => {
  if (queueBackend !== 'bullmq') return;

  startQueueWorkers({
    processStoryboardImageQueue,
    processSceneVideoQueue,
    processFinalFilmQueue,
    onLog: message => console.log(message),
  });

  enqueueStoryboardImageQueueRun = async (jobId: string) => {
    await enqueueStoryboardImageQueueRunBull(jobId);
  };
  enqueueSceneVideoQueueRun = async (jobId: string) => {
    await enqueueSceneVideoQueueRunBull(jobId);
  };
  enqueueFinalFilmQueueRun = async (jobId: string) => {
    await enqueueFinalFilmQueueRunBull(jobId);
  };

  console.log('[queue] Running in BullMQ mode');
};

setInterval(() => {
  const removed = revokeExpiredSessions();
  if (removed > 0) {
    console.log(`[auth] Removed ${removed} expired session(s)`);
  }
}, 5 * 60 * 1000);

const requeuedCount = requeueStaleProcessingSceneVideos();
if (requeuedCount > 0) {
  console.log(`[queue] Re-queued ${requeuedCount} stale processing scene video job(s)`);
}

const requeuedFinalFilmCount = requeueStaleProcessingProjectFinalFilms();
if (requeuedFinalFilmCount > 0) {
  console.log(`[queue] Re-queued ${requeuedFinalFilmCount} stale processing final film job(s)`);
}

const requeuedStoryboardImageCount = requeueStaleProcessingStoryboardImageJobs();
if (requeuedStoryboardImageCount > 0) {
  console.log(`[queue] Re-queued ${requeuedStoryboardImageCount} stale processing storyboard image job(s)`);
}

if (queueBackend === 'bullmq') {
  startBullMqQueueWorkers();
  enqueueStoryboardImageQueueRun('startup-drain').catch(error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[queue] Failed startup-drain enqueue for storyboard image queue: ${message}`);
  });
  enqueueSceneVideoQueueRun('startup-drain').catch(error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[queue] Failed startup-drain enqueue for scene video queue: ${message}`);
  });
  enqueueFinalFilmQueueRun('startup-drain').catch(error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[queue] Failed startup-drain enqueue for final film queue: ${message}`);
  });
} else {
  startPollingQueueWorkers();
}

const bullBoardEnabled = String(process.env.BULL_BOARD_ENABLED || 'true').trim().toLowerCase() !== 'false';
if (queueBackend === 'bullmq' && bullBoardEnabled) {
  const bullBoardPort = Number(process.env.BULL_BOARD_PORT || '3010');
  const bullBoardBasePath = String(process.env.BULL_BOARD_BASE_PATH || '/admin/queues/board');
  startBullBoard({
    adminAccessKey: ADMIN_ACCESS_KEY,
    port: Number.isFinite(bullBoardPort) ? bullBoardPort : 3010,
    basePath: bullBoardBasePath,
    queues: getBullMqQueues(),
    onLog: message => console.log(message),
  });
}

const buildStorylineContext = (storyline: any) => ({
  id: storyline.id,
  title: storyline.title,
  description: storyline.description,
  style: storyline.style,
  tone: storyline.tone,
  openingLine: storyline.openingLine,
  closingLine: storyline.closingLine,
  timeframe: storyline.timeframe,
  tags: Array.isArray(storyline.tags) ? storyline.tags.slice(0, 12) : [],
  beats: Array.isArray(storyline.beats)
    ? storyline.beats.map((beat: any, index: number) => {
      const source = (beat?.anecdote && typeof beat.anecdote === 'object')
        ? beat.anecdote
        : (beat?.source && typeof beat.source === 'object')
            ? beat.source
            : {};
      return {
        order: index + 1,
        beatId: beat.id,
        intensity: beat.intensity,
        summary: beat.summary,
        voiceover: beat.voiceover,
        connection: beat.connection,
        anecdote: {
          id: source.id ?? beat.id ?? `beat-${index + 1}`,
          date: source.date ?? '',
          year: source.year ?? null,
          title: source.title ?? beat.summary ?? '',
          story: source.story ?? beat.summary ?? '',
          storyteller: source.storyteller ?? '',
          location: source.location ?? '',
          tags: Array.isArray(source.tags) ? source.tags : [],
        },
      };
    })
    : [],
});

const generateStoryPackage = async (storyline: any, prompt: string) => {
  return generateStoryPackageWithLlm(buildStorylineContext(storyline), prompt);
};

const generateStoryboardScene = async (storyline: any, scene: any, prompt: string) => {
  const regenerated = await regenerateStoryboardSceneWithLlm(buildStorylineContext(storyline), scene, prompt);

  return {
    ...regenerated,
    sceneNumber: Number(regenerated?.sceneNumber || scene.sceneNumber),
    beatId: String(regenerated?.beatId || scene.beatId),
    slugline: String(regenerated?.slugline || scene.slugline || ''),
    visualDirection: String(regenerated?.visualDirection || scene.visualDirection || ''),
    camera: String(regenerated?.camera || scene.camera || ''),
    audio: String(regenerated?.audio || scene.audio || ''),
    voiceover: String(regenerated?.voiceover || scene.voiceover || ''),
    onScreenText: String(regenerated?.onScreenText || scene.onScreenText || ''),
    transition: String(regenerated?.transition || scene.transition || ''),
    durationSeconds: Number(regenerated?.durationSeconds || scene.durationSeconds || 6),
  };
};

const validateStorylinesPayload = (storylines: any): string[] => {
  const errors: string[] = [];
  if (!Array.isArray(storylines)) {
    errors.push('storylines must be an array');
    return errors;
  }

  const isString = (value: any) => typeof value === 'string';
  const isNumber = (value: any) => typeof value === 'number' && Number.isFinite(value);
  const pushError = (path: string, message: string) => {
    if (errors.length < 40) errors.push(`${path}: ${message}`);
  };

  storylines.forEach((line: any, lineIndex: number) => {
    const linePath = `storylines[${lineIndex}]`;
    if (!line || typeof line !== 'object') {
      pushError(linePath, 'must be an object');
      return;
    }

    const requiredStringFields = ['id', 'title', 'description', 'style', 'tone', 'openingLine', 'closingLine'];
    requiredStringFields.forEach(field => {
      if (!isString(line[field])) pushError(`${linePath}.${field}`, 'must be a string');
    });

    if (!Array.isArray(line.tags)) pushError(`${linePath}.tags`, 'must be an array');
    if (!Array.isArray(line.beats)) pushError(`${linePath}.beats`, 'must be an array');

    if (!line.timeframe || typeof line.timeframe !== 'object') {
      pushError(`${linePath}.timeframe`, 'must be an object');
    } else {
      if (!isString(line.timeframe.start)) pushError(`${linePath}.timeframe.start`, 'must be a string');
      if (!isString(line.timeframe.end)) pushError(`${linePath}.timeframe.end`, 'must be a string');
      if (!Array.isArray(line.timeframe.years)) {
        pushError(`${linePath}.timeframe.years`, 'must be an array');
      } else {
        line.timeframe.years.forEach((year: any, yearIndex: number) => {
          if (!isNumber(year)) pushError(`${linePath}.timeframe.years[${yearIndex}]`, 'must be a number');
        });
      }
    }

    if (!Array.isArray(line.beats)) return;

    line.beats.forEach((beat: any, beatIndex: number) => {
      const beatPath = `${linePath}.beats[${beatIndex}]`;
      if (!beat || typeof beat !== 'object') {
        pushError(beatPath, 'must be an object');
        return;
      }

      ['id', 'summary', 'voiceover'].forEach(field => {
        if (!isString(beat[field])) pushError(`${beatPath}.${field}`, 'must be a string');
      });
      if (!isNumber(beat.intensity)) pushError(`${beatPath}.intensity`, 'must be a number');

      const source = beat.anecdote ?? beat.source;
      if (source != null) {
        if (!source || typeof source !== 'object') {
          pushError(`${beatPath}.anecdote`, 'must be an object when provided');
        } else if (source.id != null && !isString(source.id)) {
          pushError(`${beatPath}.anecdote.id`, 'must be a string when provided');
        }
      }

      if (beat.connection != null) {
        if (!beat.connection || typeof beat.connection !== 'object') {
          pushError(`${beatPath}.connection`, 'must be an object or null');
        } else {
          if (!isString(beat.connection.type)) pushError(`${beatPath}.connection.type`, 'must be a string');
          if (!isString(beat.connection.label)) pushError(`${beatPath}.connection.label`, 'must be a string');
        }
      }
    });
  });

  return errors;
};

const getDbStats = () => {
  const anecdotes = (db.query('SELECT COUNT(*) as count FROM anecdotes').get() as { count: number }).count;
  const media = (db.query('SELECT COUNT(*) as count FROM media').get() as { count: number }).count;
  const subscribers = (db.query('SELECT COUNT(*) as count FROM subscribers').get() as { count: number }).count;
  const projects = (db.query('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count;
  const storyNotes = (db.query('SELECT COUNT(*) as count FROM story_notes').get() as { count: number }).count;
  const storyBeats = (db.query('SELECT COUNT(*) as count FROM story_beats').get() as { count: number }).count;
  const projectPackages = (db.query('SELECT COUNT(*) as count FROM project_packages').get() as { count: number }).count;
  const storylinePackages = (db.query('SELECT COUNT(*) as count FROM storyline_packages').get() as { count: number }).count;
  const storylineRow = db.query('SELECT payload, updatedAt FROM storylines_cache WHERE id = 1').get() as { payload?: string; updatedAt?: number } | null;
  const storylineAccountRows = db.query('SELECT payload, updatedAt FROM storylines_cache_accounts').all() as Array<{ payload?: string; updatedAt?: number }>;

  let legacyStorylines = 0;
  if (storylineRow?.payload) {
    try {
      const parsed = JSON.parse(storylineRow.payload);
      legacyStorylines = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      legacyStorylines = 0;
    }
  }

  let accountStorylines = 0;
  let accountStorylinesUpdatedAt: number | null = null;
  storylineAccountRows.forEach(row => {
    if (typeof row.updatedAt === 'number') {
      accountStorylinesUpdatedAt = accountStorylinesUpdatedAt == null
        ? row.updatedAt
        : Math.max(accountStorylinesUpdatedAt, row.updatedAt);
    }
    if (!row.payload) return;
    try {
      const parsed = JSON.parse(row.payload);
      if (Array.isArray(parsed)) accountStorylines += parsed.length;
    } catch {
      // Ignore malformed row payloads in diagnostics.
    }
  });

  const storylines = accountStorylines > 0 ? accountStorylines : legacyStorylines;
  const storylinesUpdatedAt = accountStorylinesUpdatedAt || storylineRow?.updatedAt || null;

  return {
    anecdotes,
    media,
    subscribers,
    projects,
    storyNotes,
    storyBeats,
    projectPackages,
    storylines,
    storylinePackages,
    storylinesUpdatedAt,
    storylinesLegacy: legacyStorylines,
    storylinesAccountScoped: accountStorylines,
    storylineAccounts: storylineAccountRows.length,
  };
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
};

const renderQueueDashboardHtml = (data: Awaited<ReturnType<typeof getQueueDashboardData>>) => {
  const queueCards = data.queues.map(queue => {
    const failedRows = queue.recentFailed.length
      ? queue.recentFailed.map(item => `
          <tr>
            <td>${escapeHtml(item.id)}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.failedReason)}</td>
            <td>${escapeHtml(formatTime(item.timestamp))}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4">No failed jobs</td></tr>';

    return `
      <section class="card">
        <h2>${escapeHtml(queue.name)}</h2>
        <div class="counts">
          <span>waiting: <strong>${queue.counts.waiting}</strong></span>
          <span>active: <strong>${queue.counts.active}</strong></span>
          <span>completed: <strong>${queue.counts.completed}</strong></span>
          <span>failed: <strong>${queue.counts.failed}</strong></span>
          <span>delayed: <strong>${queue.counts.delayed}</strong></span>
          <span>paused: <strong>${queue.counts.paused}</strong></span>
        </div>
        <h3>Recent failed jobs</h3>
        <table>
          <thead>
            <tr><th>Id</th><th>Name</th><th>Reason</th><th>Created</th></tr>
          </thead>
          <tbody>${failedRows}</tbody>
        </table>
      </section>
    `;
  }).join('');

  const body = data.queues.length
    ? queueCards
    : '<p>No BullMQ queues active. Current backend is polling mode.</p>';

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Queue Dashboard</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color: #111; background: #f6f7fb; }
        h1 { margin: 0 0 8px; }
        .meta { color: #444; margin-bottom: 20px; }
        .card { background: #fff; border: 1px solid #dbe1ec; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .counts { display: flex; gap: 12px; flex-wrap: wrap; margin: 8px 0 14px; }
        table { width: 100%; border-collapse: collapse; background: #fff; }
        th, td { text-align: left; border-top: 1px solid #eef1f7; padding: 8px 10px; font-size: 13px; vertical-align: top; }
        th { border-top: 0; font-size: 12px; color: #4c5a70; text-transform: uppercase; letter-spacing: .03em; }
      </style>
    </head>
    <body>
      <h1>Queue Dashboard</h1>
      <div class="meta">Backend: <strong>${escapeHtml(data.backend)}</strong> | Updated: ${escapeHtml(formatTime(data.timestamp))}</div>
      ${body}
    </body>
  </html>`;
};

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    if (method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 204 });

    const uploadsResponse = await handleUploadsRoutes({
      req,
      pathname,
      method,
      uploadsDir,
      corsHeaders,
      verifyAccessKey,
      getRequestAccountId,
      getUploadOwnerAccountId,
      registerUploadOwnership,
    });
    if (uploadsResponse) return uploadsResponse;

    if (pathname === '/api/health' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/api/admin/db-stats' && method === 'GET') {
      if (!verifyAdminKey(req)) return new Response(JSON.stringify({ error: 'Admin key required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(getDbStats()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (pathname === '/api/admin/queues' && method === 'GET') {
      if (!verifyAdminKey(req)) return new Response(JSON.stringify({ error: 'Admin key required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      try {
        const data = await getQueueDashboardData();
        if (url.searchParams.get('format') === 'json') {
          return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(renderQueueDashboardHtml(data), { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load queue dashboard';
        return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const authResponse = await handleAuthRoutes({
      req,
      pathname,
      method,
      corsHeaders,
      getUserByEmail,
      createUser,
      getAccountBySlug,
      createAccount,
      addMembership,
      listUserMemberships,
      createSession,
      revokeSessionByTokenHash,
      getAuthContext,
    });
    if (authResponse) return authResponse;

    const accountResponse = await handleAccountRoutes({
      req,
      pathname,
      method,
      corsHeaders,
      getAuthContext,
      getAccountById,
      getAccountBySlug,
      updateAccount,
    });
    if (accountResponse) return accountResponse;

    const projectsResponse = await handleProjectsRoutes({
      req,
      pathname,
      method,
      corsHeaders,
      verifyAccessKey,
      getRequestAccountId,
      listProjects,
      getProjectById,
      softDeleteProject,
      createProject,
      updateProjectBasics,
      updateProjectSynopsis,
      addStoryNote,
      listStoryNotes,
      replaceProjectBeats,
      listStoryBeats,
      setBeatLocked,
      saveProjectPackage,
      getLatestProjectPackage,
      createStoryboardImageJob,
      updateStoryboardImageJob,
      setStoryboardSceneLocked,
      createSceneVideoJob,
      updateSceneVideoJob,
      getLatestSceneVideo,
      listLatestSceneVideos,
      createScenePromptLayer,
      getLatestScenePromptLayer,
      listScenePromptLayerHistory,
      listLatestScenePromptLayers,
      createSceneVideoPromptTrace,
      listSceneVideoPromptTraces,
      createProjectFinalFilm,
      updateProjectFinalFilm,
      getLatestProjectFinalFilm,
      enqueueStoryboardImageQueueRun,
      enqueueSceneVideoQueueRun,
      enqueueFinalFilmQueueRun,
      getProjectStyleBible,
      updateProjectStyleBible,
      getLatestProjectScreenplay,
      saveProjectScreenplay,
      getProjectScenesBible,
      updateProjectScenesBible,
      refineSynopsisWithLlm,
      generateHybridScreenplayWithLlm,
      generateScenesBibleWithLlm,
      polishNotesIntoBeatsWithLlm,
      generateProjectStoryboardWithLlm,
      generateStoryboardFrameWithLlm,
      buildDirectorSceneVideoPrompt,
      buildCinematographerPrompt,
      buildMergedScenePrompt,
      createFinalFilmFromClips,
      extractLastFrameFromVideo,
      registerUploadOwnership,
      uploadsDir,
    });
    if (projectsResponse) return projectsResponse;

    const storylinesResponse = await handleStorylinesRoutes({
      req,
      pathname,
      method,
      url,
      corsHeaders,
      verifyAccessKey,
      getRequestAccountId,
      loadStorylines,
      saveStorylines,
      validateStorylinesPayload,
      generateStoryPackage,
      generateStoryboardScene,
      listStorylinePackages,
      getLatestStorylinePackage,
      saveStorylinePackage,
    });
    if (storylinesResponse) return storylinesResponse;

    const anecdotesResponse = await handleAnecdotesRoutes({
      req,
      pathname,
      method,
      corsHeaders,
      verifyAccessKey,
      getAllAnecdotes,
      getAnecdoteById,
      getAnecdotesByYear,
      createAnecdote,
      updateAnecdote,
      deleteAnecdote,
    });
    if (anecdotesResponse) return anecdotesResponse;

    const subscribersResponse = await handleSubscribersRoutes({
      req,
      pathname,
      method,
      corsHeaders,
      verifyAccessKey,
      addSubscriber,
      listSubscribers,
      exportSubscribersCsv,
    });
    if (subscribersResponse) return subscribersResponse;

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  },
});

console.log(`Server running on port ${PORT}`);
console.log(`Admin key configured: ${ADMIN_ACCESS_KEY ? 'yes' : 'no'}`);
console.log(`LLM model: ${OPENAI_MODEL}`);
console.log(`Image model: ${OPENAI_IMAGE_MODEL}`);
const resolveVideoModelLog = (key: 'seedance' | 'kling' | 'veo3') => {
  try {
    const model = resolveVideoModel(key);
    return `${model.key} -> ${model.modelId}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'not configured';
    return `${key} -> unavailable (${message})`;
  }
};
console.log(`Video models: ${resolveVideoModelLog('seedance')} | ${resolveVideoModelLog('kling')} | ${resolveVideoModelLog('veo3')}`);
console.log(`Database: ${DB_PATH}`);
