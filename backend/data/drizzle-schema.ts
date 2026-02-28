import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  real,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';

// ── Auth ──────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('passwordHash').notNull(),
  name: text('name').default(''),
  status: text('status').default('active'),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  plan: text('plan').default('free'),
  status: text('status').default('active'),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const accountMemberships = pgTable(
  'account_memberships',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').default('member'),
    status: text('status').default('active'),
    createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
    updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
  },
  (t) => [unique().on(t.accountId, t.userId)],
);

export const userSessions = pgTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('accountId')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  tokenHash: text('tokenHash').unique().notNull(),
  expiresAt: bigint('expiresAt', { mode: 'number' }).notNull(),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  lastSeenAt: bigint('lastSeenAt', { mode: 'number' }).notNull(),
});

// ── Anecdotes ─────────────────────────────────────────

export const anecdotes = pgTable('anecdotes', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  year: integer('year').notNull(),
  title: text('title').notNull(),
  story: text('story').notNull(),
  storyteller: text('storyteller').notNull(),
  location: text('location').default(''),
  notes: text('notes').default(''),
  tags: jsonb('tags').default([]),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const media = pgTable('media', {
  id: text('id').primaryKey(),
  anecdoteId: text('anecdoteId')
    .notNull()
    .references(() => anecdotes.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  url: text('url').notNull(),
  caption: text('caption').default(''),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
});

// ── Subscribers ───────────────────────────────────────

export const subscribers = pgTable('subscribers', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name').default(''),
  subscribedAt: bigint('subscribedAt', { mode: 'number' }).notNull(),
});

// ── Storylines ────────────────────────────────────────

export const storylinesCache = pgTable('storylines_cache', {
  id: integer('id').primaryKey(),
  payload: jsonb('payload').notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const storylinesCacheAccounts = pgTable('storylines_cache_accounts', {
  accountId: text('accountId')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const storylinePackages = pgTable('storyline_packages', {
  id: text('id').primaryKey(),
  storylineId: text('storylineId').notNull(),
  accountId: text('accountId'),
  payload: jsonb('payload').notNull(),
  prompt: text('prompt').default(''),
  status: text('status').default('draft'),
  version: integer('version').notNull(),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

// ── Projects ──────────────────────────────────────────

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  accountId: text('accountId'),
  title: text('title').notNull(),
  pseudoSynopsis: text('pseudoSynopsis').notNull(),
  polishedSynopsis: text('polishedSynopsis').default(''),
  plotScript: text('plotScript').default(''),
  style: text('style').default('cinematic'),
  filmType: text('filmType').default('cinematic live-action'),
  durationMinutes: integer('durationMinutes').default(1),
  status: text('status').default('draft'),
  deletedAt: bigint('deletedAt', { mode: 'number' }),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const storyNotes = pgTable('story_notes', {
  id: text('id').primaryKey(),
  projectId: text('projectId')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  source: text('source').default('typed'),
  rawText: text('rawText').notNull(),
  transcript: text('transcript').default(''),
  minuteMark: real('minuteMark'),
  orderIndex: integer('orderIndex').notNull(),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const storyBeats = pgTable('story_beats', {
  id: text('id').primaryKey(),
  projectId: text('projectId')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sourceNoteId: text('sourceNoteId'),
  orderIndex: integer('orderIndex').notNull(),
  minuteStart: real('minuteStart').notNull(),
  minuteEnd: real('minuteEnd').notNull(),
  pseudoBeat: text('pseudoBeat').notNull(),
  polishedBeat: text('polishedBeat').notNull(),
  objective: text('objective').default(''),
  conflict: text('conflict').default(''),
  turnText: text('turnText').default(''),
  intensity: integer('intensity').default(50),
  tags: jsonb('tags').default([]),
  locked: boolean('locked').default(false),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const projectPackages = pgTable('project_packages', {
  id: text('id').primaryKey(),
  projectId: text('projectId')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').notNull(),
  prompt: text('prompt').default(''),
  status: text('status').default('draft'),
  version: integer('version').notNull(),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const sceneVideos = pgTable('scene_videos', {
  id: text('id').primaryKey(),
  projectId: text('projectId')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  packageId: text('packageId').notNull(),
  beatId: text('beatId').notNull(),
  provider: text('provider').default('local-ffmpeg'),
  modelKey: text('modelKey').default('seedance'),
  prompt: text('prompt').default(''),
  sourceImageUrl: text('sourceImageUrl').default(''),
  continuityScore: real('continuityScore').default(0.75),
  continuityThreshold: real('continuityThreshold').default(0.75),
  recommendRegenerate: boolean('recommendRegenerate').default(false),
  continuityReason: text('continuityReason').default(''),
  status: text('status').default('queued'),
  jobId: text('jobId').default(''),
  videoUrl: text('videoUrl').default(''),
  durationSeconds: integer('durationSeconds').default(5),
  error: text('error').default(''),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const scenePromptLayers = pgTable('scene_prompt_layers', {
  id: text('id').primaryKey(),
  projectId: text('projectId')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  packageId: text('packageId').notNull(),
  beatId: text('beatId').notNull(),
  directorPrompt: text('directorPrompt').default(''),
  cinematographerPrompt: text('cinematographerPrompt').default(''),
  mergedPrompt: text('mergedPrompt').default(''),
  filmType: text('filmType').default(''),
  generationModel: text('generationModel').default('seedance'),
  continuationMode: text('continuationMode').default('strict'),
  anchorBeatId: text('anchorBeatId').default(''),
  autoRegenerateThreshold: real('autoRegenerateThreshold').default(0.75),
  source: text('source').default('manual'),
  version: integer('version').notNull(),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const sceneVideoPromptTraces = pgTable('scene_video_prompt_traces', {
  traceId: text('traceId').primaryKey(),
  projectId: text('projectId')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  packageId: text('packageId').notNull(),
  beatId: text('beatId').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
});

export const projectFinalFilms = pgTable('project_final_films', {
  id: text('id').primaryKey(),
  projectId: text('projectId')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status').default('queued'),
  sourceCount: integer('sourceCount').default(0),
  videoUrl: text('videoUrl').default(''),
  error: text('error').default(''),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const accountUploads = pgTable('account_uploads', {
  filename: text('filename').primaryKey(),
  accountId: text('accountId')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const projectStyleBibles = pgTable('project_style_bibles', {
  projectId: text('projectId')
    .primaryKey()
    .references(() => projects.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').notNull(),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const projectScreenplays = pgTable('project_screenplays', {
  id: text('id').primaryKey(),
  projectId: text('projectId')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').notNull(),
  status: text('status').default('draft'),
  version: integer('version').notNull(),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const projectScenesBibles = pgTable('project_scenes_bibles', {
  projectId: text('projectId')
    .primaryKey()
    .references(() => projects.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').notNull(),
  createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

export const appMeta = pgTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: bigint('updatedAt', { mode: 'number' }).notNull(),
});

// ── Inferred Types ────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type AccountMembership = typeof accountMemberships.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type Anecdote = typeof anecdotes.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type StorylinePackage = typeof storylinePackages.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type StoryNote = typeof storyNotes.$inferSelect;
export type StoryBeat = typeof storyBeats.$inferSelect;
export type ProjectPackage = typeof projectPackages.$inferSelect;
export type SceneVideo = typeof sceneVideos.$inferSelect;
export type ScenePromptLayer = typeof scenePromptLayers.$inferSelect;
export type SceneVideoPromptTrace = typeof sceneVideoPromptTraces.$inferSelect;
export type ProjectFinalFilm = typeof projectFinalFilms.$inferSelect;
export type AccountUpload = typeof accountUploads.$inferSelect;
export type ProjectStyleBible = typeof projectStyleBibles.$inferSelect;
export type ProjectScreenplay = typeof projectScreenplays.$inferSelect;
export type ProjectScenesBible = typeof projectScenesBibles.$inferSelect;
