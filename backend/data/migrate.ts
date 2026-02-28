import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { createDatabase } from './database';
import { anecdotes, media, subscribers, storylinesCache } from './drizzle-schema';
import { count } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://yenengalabs:yenengalabs@localhost:5432/yenengalabs';
const dataDir = import.meta.dir;
const JSON_PATH = join(dataDir, 'anecdotes.json');
const SUBSCRIBERS_JSON_PATH = join(dataDir, 'subscribers.json');

const db = createDatabase(DATABASE_URL);

// JSON-to-DB seeding (one-time migration from legacy JSON files)
const [anecdoteCount] = await db.select({ count: count() }).from(anecdotes);
const [subscriberCount] = await db.select({ count: count() }).from(subscribers);

let migratedAnecdotes = 0;
let migratedSubscribers = 0;

if (anecdoteCount.count === 0 && existsSync(JSON_PATH)) {
  const jsonData = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    console.log(`Migrating ${jsonData.length} anecdotes from JSON to database...`);

    for (const a of jsonData) {
      await db.insert(anecdotes).values({
        id: a.id,
        date: a.date,
        year: a.year,
        title: a.title,
        story: a.story,
        storyteller: a.storyteller,
        location: a.location || '',
        notes: a.notes || '',
        tags: a.tags || [],
        createdAt: a.createdAt || Date.now(),
        updatedAt: a.updatedAt || Date.now(),
      });

      if (a.media && a.media.length > 0) {
        for (const m of a.media) {
          await db.insert(media).values({
            id: crypto.randomUUID(),
            anecdoteId: a.id,
            type: m.type || 'image',
            url: m.url,
            caption: m.caption || '',
            createdAt: m.createdAt || Date.now(),
          });
        }
      }
    }
    migratedAnecdotes = jsonData.length;
  } else {
    console.log('No anecdotes found in anecdotes.json.');
  }
} else if (anecdoteCount.count > 0) {
  console.log(`Anecdotes table already has ${anecdoteCount.count} row(s), skipping anecdote migration.`);
} else {
  console.log('No anecdotes.json found, skipping anecdote migration.');
}

if (subscriberCount.count === 0 && existsSync(SUBSCRIBERS_JSON_PATH)) {
  const subscribersJson = JSON.parse(readFileSync(SUBSCRIBERS_JSON_PATH, 'utf8'));
  if (Array.isArray(subscribersJson) && subscribersJson.length > 0) {
    console.log(`Migrating ${subscribersJson.length} subscribers from JSON to database...`);
    for (const s of subscribersJson) {
      if (!s?.email) continue;
      await db.insert(subscribers).values({
        id: s.id || crypto.randomUUID(),
        email: String(s.email).toLowerCase().trim(),
        name: s.name || '',
        subscribedAt: typeof s.subscribedAt === 'number' ? s.subscribedAt : Date.now(),
      });
    }
    migratedSubscribers = subscribersJson.length;
  } else {
    console.log('No subscribers found in subscribers.json.');
  }
} else if (subscriberCount.count > 0) {
  console.log(`Subscribers table already has ${subscriberCount.count} row(s), skipping subscriber migration.`);
} else {
  console.log('No subscribers.json found, skipping subscriber migration.');
}

console.log('Migration complete!');
console.log(`Database: PostgreSQL (${DATABASE_URL.replace(/\/\/[^@]*@/, '//***@')})`);
console.log(`Migrated anecdotes: ${migratedAnecdotes}`);
console.log(`Migrated subscribers: ${migratedSubscribers}`);

// Verify
const [newAnecdoteCount] = await db.select({ count: count() }).from(anecdotes);
console.log(`Total anecdotes in database: ${newAnecdoteCount.count}`);
const [newSubscriberCount] = await db.select({ count: count() }).from(subscribers);
console.log(`Total subscribers in database: ${newSubscriberCount.count}`);

process.exit(0);
