import { count, eq } from 'drizzle-orm';
import type { Database } from '../data/database';
import {
  anecdotes,
  media,
  subscribers,
  projects,
  storyNotes,
  storyBeats,
  projectPackages,
  storylinePackages,
  storylinesCache,
  storylinesCacheAccounts,
} from '../data/drizzle-schema';

export const getDbStats = async (db: Database) => {
  const [[anecdoteCount], [mediaCount], [subscriberCount], [projectCount], [noteCount], [beatCount], [packageCount], [storylinePackageCount]] = await Promise.all([
    db.select({ count: count() }).from(anecdotes),
    db.select({ count: count() }).from(media),
    db.select({ count: count() }).from(subscribers),
    db.select({ count: count() }).from(projects),
    db.select({ count: count() }).from(storyNotes),
    db.select({ count: count() }).from(storyBeats),
    db.select({ count: count() }).from(projectPackages),
    db.select({ count: count() }).from(storylinePackages),
  ]);

  const [storylineRow] = await db
    .select({ payload: storylinesCache.payload, updatedAt: storylinesCache.updatedAt })
    .from(storylinesCache)
    .where(eq(storylinesCache.id, 1));

  const storylineAccountRows = await db
    .select({ payload: storylinesCacheAccounts.payload, updatedAt: storylinesCacheAccounts.updatedAt })
    .from(storylinesCacheAccounts);

  let legacyStorylines = 0;
  if (storylineRow?.payload) {
    const parsed = storylineRow.payload;
    legacyStorylines = Array.isArray(parsed) ? parsed.length : 0;
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
    const parsed = row.payload;
    if (Array.isArray(parsed)) accountStorylines += parsed.length;
  });

  const storylines = accountStorylines > 0 ? accountStorylines : legacyStorylines;
  const storylinesUpdatedAt = accountStorylinesUpdatedAt || storylineRow?.updatedAt || null;

  return {
    anecdotes: anecdoteCount.count,
    media: mediaCount.count,
    subscribers: subscriberCount.count,
    projects: projectCount.count,
    storyNotes: noteCount.count,
    storyBeats: beatCount.count,
    projectPackages: packageCount.count,
    storylines,
    storylinePackages: storylinePackageCount.count,
    storylinesUpdatedAt,
    storylinesLegacy: legacyStorylines,
    storylinesAccountScoped: accountStorylines,
    storylineAccounts: storylineAccountRows.length,
  };
};
