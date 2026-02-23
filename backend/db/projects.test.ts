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
