import { describe, expect, test } from 'bun:test';
import { createTestDb } from '../test-helpers/setupDb';
import { createProjectsDb } from './projects';
import { projects } from '../data/drizzle-schema';

describe('projects db prompt traces', () => {
  test('stores and lists scene video prompt traces ordered by newest first', async () => {
    const db = await createTestDb();
    await db.insert(projects).values({ id: 'p1', title: 'Project 1', pseudoSynopsis: 'synopsis', createdAt: Date.now(), updatedAt: Date.now() });

    let id = 0;
    const projectsDb = createProjectsDb({
      db: db as any,
      generateId: () => `id-${++id}`,
    });

    const first = await projectsDb.createSceneVideoPromptTrace({
      traceId: 'trace-1',
      projectId: 'p1',
      packageId: 'pkg-1',
      beatId: 'beat-1',
      payload: { a: 1 },
    });
    const second = await projectsDb.createSceneVideoPromptTrace({
      traceId: 'trace-2',
      projectId: 'p1',
      packageId: 'pkg-1',
      beatId: 'beat-1',
      payload: { a: 2 },
    });

    expect(first?.traceId).toBe('trace-1');
    expect(second?.traceId).toBe('trace-2');

    const items = await projectsDb.listSceneVideoPromptTraces('p1', 'beat-1', 10);
    expect(items.length).toBe(2);
    expect(items[0].traceId).toBe('trace-2');
    expect(items[1].traceId).toBe('trace-1');
    expect(items[0].payload).toEqual({ a: 2 });
    expect(items[1].payload).toEqual({ a: 1 });

    const limited = await projectsDb.listSceneVideoPromptTraces('p1', 'beat-1', 1);
    expect(limited.length).toBe(1);
    expect(limited[0].traceId).toBe('trace-2');
  });
});
