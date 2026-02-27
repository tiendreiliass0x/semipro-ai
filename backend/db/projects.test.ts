import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createProjectsDb } from './projects';

describe('projects db prompt traces', () => {
  test('stores and lists scene video prompt traces ordered by newest first', () => {
    const db = new Database(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        accountId TEXT,
        title TEXT,
        pseudoSynopsis TEXT,
        polishedSynopsis TEXT,
        plotScript TEXT,
        style TEXT,
        durationMinutes INTEGER,
        status TEXT,
        deletedAt INTEGER,
        createdAt INTEGER,
        updatedAt INTEGER
      )
    `);
    db.exec(`
      CREATE TABLE scene_video_prompt_traces (
        traceId TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        packageId TEXT NOT NULL,
        beatId TEXT NOT NULL,
        payload TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);
    db.query('INSERT INTO projects (id, title) VALUES (?, ?)').run('p1', 'Project 1');

    let id = 0;
    const projectsDb = createProjectsDb({
      db,
      generateId: () => `id-${++id}`,
    });

    const first = projectsDb.createSceneVideoPromptTrace({
      traceId: 'trace-1',
      projectId: 'p1',
      packageId: 'pkg-1',
      beatId: 'beat-1',
      payload: { a: 1 },
    });
    const second = projectsDb.createSceneVideoPromptTrace({
      traceId: 'trace-2',
      projectId: 'p1',
      packageId: 'pkg-1',
      beatId: 'beat-1',
      payload: { a: 2 },
    });

    expect(first?.traceId).toBe('trace-1');
    expect(second?.traceId).toBe('trace-2');

    const items = projectsDb.listSceneVideoPromptTraces('p1', 'beat-1', 10);
    expect(items.length).toBe(2);
    expect(items[0].traceId).toBe('trace-2');
    expect(items[1].traceId).toBe('trace-1');
    expect(items[0].payload).toEqual({ a: 2 });
    expect(items[1].payload).toEqual({ a: 1 });

    const limited = projectsDb.listSceneVideoPromptTraces('p1', 'beat-1', 1);
    expect(limited.length).toBe(1);
    expect(limited[0].traceId).toBe('trace-2');
  });
});

describe('projects db storyboard image jobs', () => {
  const createStoryboardTestDb = () => {
    const db = new Database(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        title TEXT
      )
    `);
    db.exec(`
      CREATE TABLE project_packages (
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
      CREATE TABLE storyboard_image_jobs (
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
    db.exec(`
      CREATE TABLE scene_videos (
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
      CREATE TABLE project_final_films (
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
    db.query('INSERT INTO projects (id, title) VALUES (?, ?)').run('p1', 'Project 1');
    return db;
  };

  test('updates project package payload by package id', () => {
    const db = createStoryboardTestDb();
    let id = 0;
    const projectsDb = createProjectsDb({
      db,
      generateId: () => `pkg-id-${++id}`,
    });

    const saved = projectsDb.saveProjectPackage('p1', {
      storyboard: [{ beatId: 'beat-1', imageUrl: '' }],
    }, 'initial');
    const loaded = projectsDb.getProjectPackageById(String(saved.id));
    expect(loaded?.payload?.storyboard?.[0]?.imageUrl).toBe('');

    const updated = projectsDb.updateProjectPackagePayload(String(saved.id), {
      storyboard: [{ beatId: 'beat-1', imageUrl: '/uploads/new-image.png' }],
    });
    expect(updated?.payload?.storyboard?.[0]?.imageUrl).toBe('/uploads/new-image.png');
  });

  test('creates, claims, updates, and requeues storyboard image jobs', () => {
    const db = createStoryboardTestDb();
    let id = 0;
    const projectsDb = createProjectsDb({
      db,
      generateId: () => `job-id-${++id}`,
    });

    const pkg = projectsDb.saveProjectPackage('p1', {
      storyboard: [{ beatId: 'beat-1', imageUrl: '' }],
    }, 'seed');

    const job = projectsDb.createStoryboardImageJob({
      projectId: 'p1',
      packageId: String(pkg.id),
      beatId: 'beat-1',
      prompt: 'Scene frame prompt',
      imageModelKey: 'FAL',
    });
    expect(job?.status).toBe('queued');
    expect(job?.imageModelKey).toBe('fal');

    const claimed = projectsDb.claimNextQueuedStoryboardImageJob();
    expect(claimed?.id).toBe(job.id);
    expect(claimed?.status).toBe('processing');
    expect(projectsDb.claimNextQueuedStoryboardImageJob()).toBeNull();

    const completed = projectsDb.updateStoryboardImageJob(String(job.id), {
      status: 'completed',
      imageUrl: '/uploads/frame-a.png',
      error: '',
    });
    expect(completed?.status).toBe('completed');
    expect(completed?.imageUrl).toBe('/uploads/frame-a.png');

    const staleJob = projectsDb.createStoryboardImageJob({
      projectId: 'p1',
      packageId: String(pkg.id),
      beatId: 'beat-1',
      prompt: 'Retry prompt',
      imageModelKey: 'fal',
    });
    projectsDb.claimNextQueuedStoryboardImageJob();
    db.query('UPDATE storyboard_image_jobs SET updatedAt = ? WHERE id = ?').run(Date.now() - (20 * 60 * 1000), String(staleJob.id));

    const requeued = projectsDb.requeueStaleProcessingStoryboardImageJobs(60_000);
    expect(requeued).toBe(1);

    const reclaimed = projectsDb.claimNextQueuedStoryboardImageJob();
    expect(reclaimed?.id).toBe(staleJob.id);
    expect(reclaimed?.status).toBe('processing');
  });

  test('claims specific queued jobs by id for BullMQ-triggered execution', () => {
    const db = createStoryboardTestDb();
    let id = 0;
    const projectsDb = createProjectsDb({
      db,
      generateId: () => `targeted-id-${++id}`,
    });

    const pkg = projectsDb.saveProjectPackage('p1', { storyboard: [] }, 'seed');

    const imageJob = projectsDb.createStoryboardImageJob({
      projectId: 'p1',
      packageId: String(pkg.id),
      beatId: 'beat-1',
      prompt: 'prompt',
      imageModelKey: 'fal',
    });
    const claimedImage = projectsDb.claimStoryboardImageJobById(String(imageJob.id));
    expect(claimedImage?.id).toBe(imageJob.id);
    expect(claimedImage?.status).toBe('processing');
    expect(projectsDb.claimStoryboardImageJobById(String(imageJob.id))).toBeNull();

    const sceneJob = projectsDb.createSceneVideoJob({
      projectId: 'p1',
      packageId: String(pkg.id),
      beatId: 'beat-1',
      provider: 'fal-seedance',
      prompt: 'scene prompt',
      sourceImageUrl: '/uploads/frame.png',
    });
    const claimedScene = projectsDb.claimSceneVideoJobById(String(sceneJob.id));
    expect(claimedScene?.id).toBe(sceneJob.id);
    expect(claimedScene?.status).toBe('processing');
    expect(projectsDb.claimSceneVideoJobById(String(sceneJob.id))).toBeNull();

    const finalFilm = projectsDb.createProjectFinalFilm({ projectId: 'p1', sourceCount: 1 });
    const claimedFinal = projectsDb.claimProjectFinalFilmById(String(finalFilm.id));
    expect(claimedFinal?.id).toBe(finalFilm.id);
    expect(claimedFinal?.status).toBe('processing');
    expect(projectsDb.claimProjectFinalFilmById(String(finalFilm.id))).toBeNull();
  });
});
