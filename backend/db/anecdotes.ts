import { basename, join } from 'path';
import { existsSync } from 'fs';
import { eq, desc } from 'drizzle-orm';
import type { Database } from '../data/database';
import { anecdotes, media } from '../data/drizzle-schema';

type CreateAnecdotesDbArgs = {
  db: Database;
  uploadsDir: string;
  generateId: () => string;
};

export const createAnecdotesDb = ({ db, uploadsDir, generateId }: CreateAnecdotesDbArgs) => {
  const getAllAnecdotes = async () => {
    const rows = await db.select().from(anecdotes).orderBy(desc(anecdotes.year), desc(anecdotes.date));
    const allMedia = await db.select().from(media);
    const mediaByAnecdote = new Map<string, typeof allMedia>();
    for (const m of allMedia) {
      const list = mediaByAnecdote.get(m.anecdoteId) || [];
      list.push(m);
      mediaByAnecdote.set(m.anecdoteId, list);
    }
    return rows.map(a => ({
      ...a,
      tags: a.tags ?? [],
      media: mediaByAnecdote.get(a.id) || [],
    }));
  };

  const getAnecdoteById = async (id: string) => {
    const [a] = await db.select().from(anecdotes).where(eq(anecdotes.id, id));
    if (!a) return null;
    const anecdoteMedia = await db.select().from(media).where(eq(media.anecdoteId, id));
    return {
      ...a,
      tags: a.tags ?? [],
      media: anecdoteMedia,
    };
  };

  const getAnecdotesByYear = async (year: number) => {
    const rows = await db.select().from(anecdotes).where(eq(anecdotes.year, year)).orderBy(desc(anecdotes.date));
    const ids = rows.map(r => r.id);
    const allMedia = ids.length
      ? await db.select().from(media)
      : [];
    const mediaByAnecdote = new Map<string, typeof allMedia>();
    for (const m of allMedia) {
      if (!ids.includes(m.anecdoteId)) continue;
      const list = mediaByAnecdote.get(m.anecdoteId) || [];
      list.push(m);
      mediaByAnecdote.set(m.anecdoteId, list);
    }
    return rows.map(a => ({
      ...a,
      tags: a.tags ?? [],
      media: mediaByAnecdote.get(a.id) || [],
    }));
  };

  const createAnecdote = async (data: any) => {
    const id = generateId();
    const now = Date.now();
    await db.insert(anecdotes).values({
      id,
      date: data.date,
      year: data.year,
      title: data.title,
      story: data.story,
      storyteller: data.storyteller,
      location: data.location || '',
      notes: data.notes || '',
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
    });

    if (data.media && data.media.length > 0) {
      await db.insert(media).values(
        data.media.map((m: any) => ({
          id: generateId(),
          anecdoteId: id,
          type: m.type,
          url: m.url,
          caption: m.caption || '',
          createdAt: now,
        })),
      );
    }

    return getAnecdoteById(id);
  };

  const updateAnecdote = async (id: string, data: any) => {
    const existing = await getAnecdoteById(id);
    if (!existing) return null;

    const now = Date.now();
    await db
      .update(anecdotes)
      .set({
        date: data.date ?? existing.date,
        year: data.year ?? existing.year,
        title: data.title ?? existing.title,
        story: data.story ?? existing.story,
        storyteller: data.storyteller ?? existing.storyteller,
        location: data.location ?? existing.location,
        notes: data.notes ?? existing.notes,
        tags: data.tags ?? existing.tags,
        updatedAt: now,
      })
      .where(eq(anecdotes.id, id));

    if (data.media) {
      await db.delete(media).where(eq(media.anecdoteId, id));
      if (data.media.length > 0) {
        await db.insert(media).values(
          data.media.map((m: any) => ({
            id: generateId(),
            anecdoteId: id,
            type: m.type,
            url: m.url,
            caption: m.caption || '',
            createdAt: now,
          })),
        );
      }
    }

    return getAnecdoteById(id);
  };

  const deleteAnecdote = async (id: string) => {
    const mediaRows = await db.select({ url: media.url }).from(media).where(eq(media.anecdoteId, id));
    for (const m of mediaRows) {
      if (m.url && m.url.startsWith('/uploads/')) {
        const fp = join(uploadsDir, basename(m.url));
        if (existsSync(fp)) {
          const file = Bun.file(fp);
          file.delete?.();
        }
      }
    }

    await db.delete(anecdotes).where(eq(anecdotes.id, id));
    return true;
  };

  return {
    getAllAnecdotes,
    getAnecdoteById,
    getAnecdotesByYear,
    createAnecdote,
    updateAnecdote,
    deleteAnecdote,
  };
};
