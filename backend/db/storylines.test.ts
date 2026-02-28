import { describe, expect, test } from 'bun:test';
import { createTestDb, type TestDb } from '../test-helpers/setupDb';
import { createStorylinesDb } from './storylines';
import { accounts, storylinesCache } from '../data/drizzle-schema';

const setupDb = async () => {
  const db = await createTestDb();
  await db.insert(accounts).values({ id: 'acc-1', name: 'A1', slug: 'a1', plan: 'free', status: 'active', createdAt: Date.now(), updatedAt: Date.now() });
  await db.insert(accounts).values({ id: 'acc-2', name: 'A2', slug: 'a2', plan: 'free', status: 'active', createdAt: Date.now(), updatedAt: Date.now() });
  return db;
};

describe('storylines db account scoping', () => {
  test('keeps storyline cache isolated per account with legacy fallback bridge', async () => {
    const db = await setupDb();
    const legacyStorylines = [{ id: 'legacy-1', beats: [] }];
    await db.insert(storylinesCache).values({ id: 1, payload: legacyStorylines, updatedAt: Date.now() });

    let id = 0;
    const storylinesDb = createStorylinesDb({
      db: db as any,
      generateId: () => `id-${++id}`,
    });

    expect(await storylinesDb.loadStorylines('acc-1')).toEqual(legacyStorylines);

    const scoped = [{ id: 'acc-1-line', beats: [] }];
    expect(await storylinesDb.saveStorylines(scoped, 'acc-1')).toBe(true);
    expect(await storylinesDb.loadStorylines('acc-1')).toEqual(scoped);

    expect(await storylinesDb.loadStorylines('acc-2')).toEqual(legacyStorylines);
    expect(await storylinesDb.loadStorylines()).toEqual(legacyStorylines);
  });

  test('versions storyline packages independently by account', async () => {
    const db = await setupDb();
    let id = 0;
    const storylinesDb = createStorylinesDb({
      db: db as any,
      generateId: () => `id-${++id}`,
    });

    const a1 = await storylinesDb.saveStorylinePackage('line-1', { v: 1 }, 'p1', 'draft', 'acc-1');
    const a2 = await storylinesDb.saveStorylinePackage('line-1', { v: 2 }, 'p2', 'draft', 'acc-1');
    const b1 = await storylinesDb.saveStorylinePackage('line-1', { v: 3 }, 'p3', 'draft', 'acc-2');
    const global1 = await storylinesDb.saveStorylinePackage('line-1', { v: 4 }, 'p4', 'draft');

    expect(a1.version).toBe(1);
    expect(a2.version).toBe(2);
    expect(b1.version).toBe(1);
    expect(global1.version).toBe(1);

    expect((await storylinesDb.getLatestStorylinePackage('line-1', 'acc-1'))?.version).toBe(2);
    expect((await storylinesDb.getLatestStorylinePackage('line-1', 'acc-2'))?.version).toBe(1);
    expect((await storylinesDb.getLatestStorylinePackage('line-1'))?.version).toBe(1);

    expect((await storylinesDb.listStorylinePackages('line-1', 'acc-1')).length).toBe(2);
    expect((await storylinesDb.listStorylinePackages('line-1', 'acc-2')).length).toBe(1);
    expect((await storylinesDb.listStorylinePackages('line-1')).length).toBe(1);
  });
});
