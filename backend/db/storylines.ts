import type { Database } from 'bun:sqlite';

type CreateStorylinesDbArgs = {
  db: Database;
  generateId: () => string;
};

const parsePayload = (value: unknown) => {
  try {
    return JSON.parse(String(value || '[]'));
  } catch {
    return null;
  }
};

export const createStorylinesDb = ({ db, generateId }: CreateStorylinesDbArgs) => {
  const loadLegacyStorylines = () => {
    const row = db.query('SELECT payload FROM storylines_cache WHERE id = 1').get() as { payload?: string } | null;
    if (!row?.payload) return [];
    const parsed = parsePayload(row.payload);
    return Array.isArray(parsed) ? parsed : [];
  };

  const loadStorylines = (accountId?: string) => {
    const normalizedAccountId = String(accountId || '').trim();
    if (!normalizedAccountId) {
      return loadLegacyStorylines();
    }

    const row = db.query('SELECT payload FROM storylines_cache_accounts WHERE accountId = ?').get(normalizedAccountId) as { payload?: string } | null;
    if (row?.payload) {
      const parsed = parsePayload(row.payload);
      return Array.isArray(parsed) ? parsed : [];
    }

    // One-way bridge for legacy global cache so existing users keep their storylines.
    const legacy = loadLegacyStorylines();
    if (legacy.length) {
      const now = Date.now();
      db.query(`
        INSERT INTO storylines_cache_accounts (accountId, payload, updatedAt)
        VALUES (?, ?, ?)
        ON CONFLICT(accountId) DO UPDATE SET payload = excluded.payload, updatedAt = excluded.updatedAt
      `).run(normalizedAccountId, JSON.stringify(legacy), now);
    }

    return legacy;
  };

  const saveStorylines = (data: any, accountId?: string) => {
    try {
      const now = Date.now();
      const normalizedAccountId = String(accountId || '').trim();
      if (normalizedAccountId) {
        db.query(`
          INSERT INTO storylines_cache_accounts (accountId, payload, updatedAt)
          VALUES (?, ?, ?)
          ON CONFLICT(accountId) DO UPDATE SET payload = excluded.payload, updatedAt = excluded.updatedAt
        `).run(normalizedAccountId, JSON.stringify(data), now);
        return true;
      }

      db.query(`
        INSERT INTO storylines_cache (id, payload, updatedAt)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updatedAt = excluded.updatedAt
      `).run(JSON.stringify(data), now);
      return true;
    } catch {
      return false;
    }
  };

  const listStorylinePackages = (storylineId: string, accountId?: string) => {
    const normalizedAccountId = String(accountId || '').trim();
    const rows = (normalizedAccountId
      ? db.query(`
          SELECT id, storylineId, accountId, payload, prompt, status, version, createdAt, updatedAt
          FROM storyline_packages
          WHERE storylineId = ? AND accountId = ?
          ORDER BY version DESC
        `).all(storylineId, normalizedAccountId)
      : db.query(`
          SELECT id, storylineId, accountId, payload, prompt, status, version, createdAt, updatedAt
          FROM storyline_packages
          WHERE storylineId = ? AND accountId IS NULL
          ORDER BY version DESC
        `).all(storylineId)) as any[];

    return rows.map(row => ({
      id: row.id,
      storylineId: row.storylineId,
      accountId: row.accountId || null,
      prompt: row.prompt || '',
      status: row.status || 'draft',
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload: parsePayload(row.payload) || {},
    }));
  };

  const getLatestStorylinePackage = (storylineId: string, accountId?: string) => {
    const normalizedAccountId = String(accountId || '').trim();
    const row = (normalizedAccountId
      ? db.query(`
          SELECT id, storylineId, accountId, payload, prompt, status, version, createdAt, updatedAt
          FROM storyline_packages
          WHERE storylineId = ? AND accountId = ?
          ORDER BY version DESC
          LIMIT 1
        `).get(storylineId, normalizedAccountId)
      : db.query(`
          SELECT id, storylineId, accountId, payload, prompt, status, version, createdAt, updatedAt
          FROM storyline_packages
          WHERE storylineId = ? AND accountId IS NULL
          ORDER BY version DESC
          LIMIT 1
        `).get(storylineId)) as any;

    if (!row) return null;
    return {
      id: row.id,
      storylineId: row.storylineId,
      accountId: row.accountId || null,
      prompt: row.prompt || '',
      status: row.status || 'draft',
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload: parsePayload(row.payload) || {},
    };
  };

  const saveStorylinePackage = (storylineId: string, payload: any, prompt: string, status: string = 'draft', accountId?: string) => {
    const now = Date.now();
    const normalizedAccountId = String(accountId || '').trim();
    const latest = (normalizedAccountId
      ? db.query(`
          SELECT version
          FROM storyline_packages
          WHERE storylineId = ? AND accountId = ?
          ORDER BY version DESC
          LIMIT 1
        `).get(storylineId, normalizedAccountId)
      : db.query(`
          SELECT version
          FROM storyline_packages
          WHERE storylineId = ? AND accountId IS NULL
          ORDER BY version DESC
          LIMIT 1
        `).get(storylineId)) as { version?: number } | null;

    const version = (latest?.version || 0) + 1;
    const id = generateId();

    db.query(`
      INSERT INTO storyline_packages (id, storylineId, accountId, payload, prompt, status, version, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, storylineId, normalizedAccountId || null, JSON.stringify(payload), prompt || '', status || 'draft', version, now, now);

    return {
      id,
      storylineId,
      accountId: normalizedAccountId || null,
      payload,
      prompt: prompt || '',
      status: status || 'draft',
      version,
      createdAt: now,
      updatedAt: now,
    };
  };

  return {
    loadStorylines,
    saveStorylines,
    listStorylinePackages,
    getLatestStorylinePackage,
    saveStorylinePackage,
  };
};
