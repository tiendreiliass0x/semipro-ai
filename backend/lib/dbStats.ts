import type { Database } from 'bun:sqlite';

export const getDbStats = (db: Database) => {
  const anecdotes = (db.query('SELECT COUNT(*) as count FROM anecdotes').get() as { count: number }).count;
  const media = (db.query('SELECT COUNT(*) as count FROM media').get() as { count: number }).count;
  const subscribers = (db.query('SELECT COUNT(*) as count FROM subscribers').get() as { count: number }).count;
  const projects = (db.query('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count;
  const storyNotes = (db.query('SELECT COUNT(*) as count FROM story_notes').get() as { count: number }).count;
  const storyBeats = (db.query('SELECT COUNT(*) as count FROM story_beats').get() as { count: number }).count;
  const projectPackages = (db.query('SELECT COUNT(*) as count FROM project_packages').get() as { count: number }).count;
  const storylinePackages = (db.query('SELECT COUNT(*) as count FROM storyline_packages').get() as { count: number }).count;
  const storylineRow = db.query('SELECT payload, updatedAt FROM storylines_cache WHERE id = 1').get() as { payload?: string; updatedAt?: number } | null;
  const storylineAccountRows = db.query('SELECT payload, updatedAt FROM storylines_cache_accounts').all() as Array<{ payload?: string; updatedAt?: number }>;

  let legacyStorylines = 0;
  if (storylineRow?.payload) {
    try {
      const parsed = JSON.parse(storylineRow.payload);
      legacyStorylines = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      legacyStorylines = 0;
    }
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
    try {
      const parsed = JSON.parse(row.payload);
      if (Array.isArray(parsed)) accountStorylines += parsed.length;
    } catch {
      // Ignore malformed row payloads in diagnostics.
    }
  });

  const storylines = accountStorylines > 0 ? accountStorylines : legacyStorylines;
  const storylinesUpdatedAt = accountStorylinesUpdatedAt || storylineRow?.updatedAt || null;

  return {
    anecdotes,
    media,
    subscribers,
    projects,
    storyNotes,
    storyBeats,
    projectPackages,
    storylines,
    storylinePackages,
    storylinesUpdatedAt,
    storylinesLegacy: legacyStorylines,
    storylinesAccountScoped: accountStorylines,
    storylineAccounts: storylineAccountRows.length,
  };
};
