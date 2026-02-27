import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createStorylinesDb } from './storylines';

const setupDb = () => {
  const db = new Database(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY
    )
  `);
  db.exec(`
    CREATE TABLE storylines_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE storylines_cache_accounts (
      accountId TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);
  db.exec(`
    CREATE TABLE storyline_packages (
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
  db.query('INSERT INTO accounts (id) VALUES (?)').run('acc-1');
  db.query('INSERT INTO accounts (id) VALUES (?)').run('acc-2');
  return db;
};

describe('storylines db account scoping', () => {
  test('keeps storyline cache isolated per account with legacy fallback bridge', () => {
    const db = setupDb();
    const legacyStorylines = [{ id: 'legacy-1', beats: [] }];
    db.query('INSERT INTO storylines_cache (id, payload, updatedAt) VALUES (1, ?, ?)').run(JSON.stringify(legacyStorylines), Date.now());

    let id = 0;
    const storylinesDb = createStorylinesDb({
      db,
      generateId: () => `id-${++id}`,
    });

    expect(storylinesDb.loadStorylines('acc-1')).toEqual(legacyStorylines);

    const scoped = [{ id: 'acc-1-line', beats: [] }];
    expect(storylinesDb.saveStorylines(scoped, 'acc-1')).toBe(true);
    expect(storylinesDb.loadStorylines('acc-1')).toEqual(scoped);

    expect(storylinesDb.loadStorylines('acc-2')).toEqual(legacyStorylines);
    expect(storylinesDb.loadStorylines()).toEqual(legacyStorylines);
  });

  test('versions storyline packages independently by account', () => {
    const db = setupDb();
    let id = 0;
    const storylinesDb = createStorylinesDb({
      db,
      generateId: () => `id-${++id}`,
    });

    const a1 = storylinesDb.saveStorylinePackage('line-1', { v: 1 }, 'p1', 'draft', 'acc-1');
    const a2 = storylinesDb.saveStorylinePackage('line-1', { v: 2 }, 'p2', 'draft', 'acc-1');
    const b1 = storylinesDb.saveStorylinePackage('line-1', { v: 3 }, 'p3', 'draft', 'acc-2');
    const global1 = storylinesDb.saveStorylinePackage('line-1', { v: 4 }, 'p4', 'draft');

    expect(a1.version).toBe(1);
    expect(a2.version).toBe(2);
    expect(b1.version).toBe(1);
    expect(global1.version).toBe(1);

    expect(storylinesDb.getLatestStorylinePackage('line-1', 'acc-1')?.version).toBe(2);
    expect(storylinesDb.getLatestStorylinePackage('line-1', 'acc-2')?.version).toBe(1);
    expect(storylinesDb.getLatestStorylinePackage('line-1')?.version).toBe(1);

    expect(storylinesDb.listStorylinePackages('line-1', 'acc-1').length).toBe(2);
    expect(storylinesDb.listStorylinePackages('line-1', 'acc-2').length).toBe(1);
    expect(storylinesDb.listStorylinePackages('line-1').length).toBe(1);
  });
});
