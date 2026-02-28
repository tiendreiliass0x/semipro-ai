import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import type { Database } from '../data/database';
import {
  storylinesCache,
  storylinesCacheAccounts,
  storylinePackages,
} from '../data/drizzle-schema';

type CreateStorylinesDbArgs = {
  db: Database;
  generateId: () => string;
};

export const createStorylinesDb = ({ db, generateId }: CreateStorylinesDbArgs) => {
  const loadLegacyStorylines = async () => {
    const [row] = await db
      .select({ payload: storylinesCache.payload })
      .from(storylinesCache)
      .where(eq(storylinesCache.id, 1));
    if (!row?.payload) return [];
    const parsed = row.payload;
    return Array.isArray(parsed) ? parsed : [];
  };

  const loadStorylines = async (accountId?: string) => {
    const normalizedAccountId = String(accountId || '').trim();
    if (!normalizedAccountId) {
      return loadLegacyStorylines();
    }

    const [row] = await db
      .select({ payload: storylinesCacheAccounts.payload })
      .from(storylinesCacheAccounts)
      .where(eq(storylinesCacheAccounts.accountId, normalizedAccountId));

    if (row?.payload) {
      const parsed = row.payload;
      return Array.isArray(parsed) ? parsed : [];
    }

    const legacy = await loadLegacyStorylines();
    if (legacy.length) {
      const now = Date.now();
      await db
        .insert(storylinesCacheAccounts)
        .values({ accountId: normalizedAccountId, payload: legacy, updatedAt: now })
        .onConflictDoUpdate({
          target: storylinesCacheAccounts.accountId,
          set: { payload: legacy, updatedAt: now },
        });
    }

    return legacy;
  };

  const saveStorylines = async (data: any, accountId?: string) => {
    try {
      const now = Date.now();
      const normalizedAccountId = String(accountId || '').trim();
      if (normalizedAccountId) {
        await db
          .insert(storylinesCacheAccounts)
          .values({ accountId: normalizedAccountId, payload: data, updatedAt: now })
          .onConflictDoUpdate({
            target: storylinesCacheAccounts.accountId,
            set: { payload: data, updatedAt: now },
          });
        return true;
      }

      await db
        .insert(storylinesCache)
        .values({ id: 1, payload: data, updatedAt: now })
        .onConflictDoUpdate({
          target: storylinesCache.id,
          set: { payload: data, updatedAt: now },
        });
      return true;
    } catch {
      return false;
    }
  };

  const listStorylinePackages = async (storylineId: string, accountId?: string) => {
    const normalizedAccountId = String(accountId || '').trim();
    const condition = normalizedAccountId
      ? and(eq(storylinePackages.storylineId, storylineId), eq(storylinePackages.accountId, normalizedAccountId))
      : and(eq(storylinePackages.storylineId, storylineId), isNull(storylinePackages.accountId));

    const rows = await db
      .select()
      .from(storylinePackages)
      .where(condition)
      .orderBy(desc(storylinePackages.version));

    return rows.map(row => ({
      id: row.id,
      storylineId: row.storylineId,
      accountId: row.accountId || null,
      prompt: row.prompt || '',
      status: row.status || 'draft',
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload: row.payload ?? {},
    }));
  };

  const getLatestStorylinePackage = async (storylineId: string, accountId?: string) => {
    const normalizedAccountId = String(accountId || '').trim();
    const condition = normalizedAccountId
      ? and(eq(storylinePackages.storylineId, storylineId), eq(storylinePackages.accountId, normalizedAccountId))
      : and(eq(storylinePackages.storylineId, storylineId), isNull(storylinePackages.accountId));

    const [row] = await db
      .select()
      .from(storylinePackages)
      .where(condition)
      .orderBy(desc(storylinePackages.version))
      .limit(1);

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
      payload: row.payload ?? {},
    };
  };

  const saveStorylinePackage = async (storylineId: string, payload: any, prompt: string, status: string = 'draft', accountId?: string) => {
    const now = Date.now();
    const normalizedAccountId = String(accountId || '').trim();
    const condition = normalizedAccountId
      ? and(eq(storylinePackages.storylineId, storylineId), eq(storylinePackages.accountId, normalizedAccountId))
      : and(eq(storylinePackages.storylineId, storylineId), isNull(storylinePackages.accountId));

    const [latest] = await db
      .select({ version: storylinePackages.version })
      .from(storylinePackages)
      .where(condition)
      .orderBy(desc(storylinePackages.version))
      .limit(1);

    const version = (latest?.version || 0) + 1;
    const id = generateId();

    await db.insert(storylinePackages).values({
      id,
      storylineId,
      accountId: normalizedAccountId || null,
      payload,
      prompt: prompt || '',
      status: status || 'draft',
      version,
      createdAt: now,
      updatedAt: now,
    });

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
