import { describe, expect, test } from 'bun:test';
import { createTestDb } from '../test-helpers/setupDb';
import { createProjectsDb } from './projects';

describe('projects db prompt traces', () => {
  test('stores and lists scene video prompt traces ordered by newest first', () => {
    const db = createTestDb();
    db.query('INSERT INTO projects (id, title, pseudoSynopsis, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)').run('p1', 'Project 1', 'synopsis', Date.now(), Date.now());

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
