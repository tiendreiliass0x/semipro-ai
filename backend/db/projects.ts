import { eq, and, desc, asc, isNull, lt, sql } from 'drizzle-orm';
import type { Database } from '../data/database';
import {
  projects,
  storyNotes,
  storyBeats,
  projectPackages,
  sceneVideos,
  scenePromptLayers,
  sceneVideoPromptTraces,
  projectFinalFilms,
  projectStyleBibles,
  projectScreenplays,
  projectScenesBibles,
} from '../data/drizzle-schema';

type CreateProjectsDbArgs = {
  db: Database;
  generateId: () => string;
};

const PROJECT_COLUMNS = {
  id: projects.id,
  accountId: projects.accountId,
  title: projects.title,
  pseudoSynopsis: projects.pseudoSynopsis,
  polishedSynopsis: projects.polishedSynopsis,
  plotScript: projects.plotScript,
  style: projects.style,
  filmType: projects.filmType,
  durationMinutes: projects.durationMinutes,
  status: projects.status,
  deletedAt: projects.deletedAt,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
} as const;

export const createProjectsDb = ({ db, generateId }: CreateProjectsDbArgs) => {
  const DEFAULT_STYLE_BIBLE = {
    visualStyle: 'Grounded cinematic realism with expressive close-ups and motivated camera movement.',
    cameraGrammar: 'Use intentional composition, practical coverage, and transitions that preserve orientation.',
    doList: ['Keep emotional clarity', 'Show cause-and-effect', 'Use specific sensory detail'],
    dontList: ['Avoid generic inspirational cliches', 'Avoid timeline jumps without transition cards'],
  };

  const listProjects = async (accountId?: string) => {
    const condition = accountId
      ? and(isNull(projects.deletedAt), eq(projects.accountId, accountId))
      : isNull(projects.deletedAt);
    return db.select(PROJECT_COLUMNS).from(projects).where(condition).orderBy(desc(projects.updatedAt));
  };

  const getProjectById = async (id: string, accountId?: string) => {
    const condition = accountId
      ? and(eq(projects.id, id), eq(projects.accountId, accountId), isNull(projects.deletedAt))
      : and(eq(projects.id, id), isNull(projects.deletedAt));
    const [row] = await db.select(PROJECT_COLUMNS).from(projects).where(condition);
    return row ?? null;
  };

  const softDeleteProject = async (id: string) => {
    const now = Date.now();
    const deleted = await db
      .update(projects)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .returning({ id: projects.id });
    return deleted.length > 0;
  };

  const createProject = async (input: { accountId?: string; title?: string; pseudoSynopsis: string; style?: string; filmType?: string; durationMinutes?: number }) => {
    const now = Date.now();
    const id = generateId();
    const style = (input.style || 'cinematic').toLowerCase();
    const filmType = String(input.filmType || 'cinematic live-action').trim() || 'cinematic live-action';
    const durationMinutes = Number(input.durationMinutes || 1);
    const synopsis = String(input.pseudoSynopsis || '').trim();
    const explicitTitle = String(input.title || '').trim();
    const fallbackTitle = synopsis
      ? synopsis.split(/\s+/).slice(0, 6).join(' ').replace(/[.,!?;:]+$/g, '')
      : `Untitled Project ${new Date(now).toLocaleDateString()}`;
    const title = explicitTitle || fallbackTitle;

    await db.insert(projects).values({
      id,
      accountId: input.accountId || null,
      title,
      pseudoSynopsis: synopsis,
      polishedSynopsis: '',
      plotScript: '',
      style,
      filmType,
      durationMinutes,
      status: 'draft',
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(projectStyleBibles).values({
      projectId: id,
      payload: DEFAULT_STYLE_BIBLE,
      createdAt: now,
      updatedAt: now,
    });
    return getProjectById(id, input.accountId);
  };

  const getProjectStyleBible = async (projectId: string) => {
    const [row] = await db
      .select({ payload: projectStyleBibles.payload })
      .from(projectStyleBibles)
      .where(eq(projectStyleBibles.projectId, projectId));
    if (!row?.payload) return DEFAULT_STYLE_BIBLE;
    return row.payload;
  };

  const updateProjectStyleBible = async (projectId: string, payload: any) => {
    const now = Date.now();
    const data = payload || DEFAULT_STYLE_BIBLE;
    await db
      .insert(projectStyleBibles)
      .values({ projectId, payload: data, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: projectStyleBibles.projectId,
        set: { payload: data, updatedAt: now },
      });
    return getProjectStyleBible(projectId);
  };

  const getLatestProjectScreenplay = async (projectId: string) => {
    const [row] = await db
      .select()
      .from(projectScreenplays)
      .where(eq(projectScreenplays.projectId, projectId))
      .orderBy(desc(projectScreenplays.version))
      .limit(1);
    if (!row) return null;
    return { ...row, payload: row.payload ?? {} };
  };

  const saveProjectScreenplay = async (projectId: string, payload: any, status: string = 'draft') => {
    const now = Date.now();
    const id = generateId();
    const [versionRow] = await db
      .select({ maxVersion: sql<number>`coalesce(max(${projectScreenplays.version}), 0)` })
      .from(projectScreenplays)
      .where(eq(projectScreenplays.projectId, projectId));
    const version = (versionRow?.maxVersion || 0) + 1;
    await db.insert(projectScreenplays).values({
      id,
      projectId,
      payload: payload || {},
      status,
      version,
      createdAt: now,
      updatedAt: now,
    });
    return { id, projectId, payload, status, version, createdAt: now, updatedAt: now };
  };

  const getProjectScenesBible = async (projectId: string) => {
    const [row] = await db
      .select({ payload: projectScenesBibles.payload })
      .from(projectScenesBibles)
      .where(eq(projectScenesBibles.projectId, projectId));
    return row?.payload ?? null;
  };

  const updateProjectScenesBible = async (projectId: string, payload: any) => {
    const now = Date.now();
    const data = payload || {};
    await db
      .insert(projectScenesBibles)
      .values({ projectId, payload: data, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: projectScenesBibles.projectId,
        set: { payload: data, updatedAt: now },
      });
    return getProjectScenesBible(projectId);
  };

  const updateProjectSynopsis = async (id: string, polishedSynopsis: string, plotScript: string = '') => {
    const now = Date.now();
    await db
      .update(projects)
      .set({ polishedSynopsis, plotScript: plotScript || '', updatedAt: now })
      .where(eq(projects.id, id));
    return getProjectById(id);
  };

  const updateProjectBasics = async (id: string, input: { title?: string; pseudoSynopsis?: string; filmType?: string }) => {
    const now = Date.now();
    const existing = await getProjectById(id);
    if (!existing) return null;

    const nextTitle = typeof input.title === 'string' && input.title.trim()
      ? input.title.trim()
      : String(existing.title || '').trim();
    const nextPseudoSynopsis = typeof input.pseudoSynopsis === 'string' && input.pseudoSynopsis.trim()
      ? input.pseudoSynopsis.trim()
      : String(existing.pseudoSynopsis || '').trim();
    const nextFilmType = typeof input.filmType === 'string' && input.filmType.trim()
      ? input.filmType.trim()
      : String(existing.filmType || '').trim() || 'cinematic live-action';

    await db
      .update(projects)
      .set({ title: nextTitle, pseudoSynopsis: nextPseudoSynopsis, filmType: nextFilmType, updatedAt: now })
      .where(eq(projects.id, id));
    return getProjectById(id);
  };

  const addStoryNote = async (projectId: string, input: { rawText: string; minuteMark?: number; source?: string; transcript?: string }) => {
    const now = Date.now();
    const id = generateId();
    const [orderRow] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${storyNotes.orderIndex}), 0)` })
      .from(storyNotes)
      .where(eq(storyNotes.projectId, projectId));
    const orderIndex = (orderRow?.maxOrder || 0) + 1;
    await db.insert(storyNotes).values({
      id,
      projectId,
      source: input.source || 'typed',
      rawText: input.rawText,
      transcript: input.transcript || '',
      minuteMark: typeof input.minuteMark === 'number' ? input.minuteMark : null,
      orderIndex,
      createdAt: now,
      updatedAt: now,
    });
    const [row] = await db.select().from(storyNotes).where(eq(storyNotes.id, id));
    return row ?? null;
  };

  const listStoryNotes = async (projectId: string) => {
    return db
      .select()
      .from(storyNotes)
      .where(eq(storyNotes.projectId, projectId))
      .orderBy(asc(storyNotes.orderIndex), asc(storyNotes.createdAt));
  };

  const replaceProjectBeats = async (projectId: string, beats: any[]) => {
    const now = Date.now();
    const existingRows = await db
      .select()
      .from(storyBeats)
      .where(eq(storyBeats.projectId, projectId))
      .orderBy(asc(storyBeats.orderIndex));

    const lockByOrder = new Map<number, any>();
    existingRows.forEach(row => {
      if (row.locked) lockByOrder.set(Number(row.orderIndex), row);
    });

    await db.delete(storyBeats).where(eq(storyBeats.projectId, projectId));

    for (let index = 0; index < beats.length; index++) {
      const beat = beats[index];
      const orderIndex = index + 1;
      const lockedExisting = lockByOrder.get(orderIndex);

      if (lockedExisting) {
        await db.insert(storyBeats).values({
          id: generateId(),
          projectId,
          sourceNoteId: lockedExisting.sourceNoteId || null,
          orderIndex,
          minuteStart: Number(lockedExisting.minuteStart || 0),
          minuteEnd: Number(lockedExisting.minuteEnd || 1),
          pseudoBeat: String(lockedExisting.pseudoBeat || ''),
          polishedBeat: String(lockedExisting.polishedBeat || ''),
          objective: String(lockedExisting.objective || ''),
          conflict: String(lockedExisting.conflict || ''),
          turnText: String(lockedExisting.turnText || ''),
          intensity: Math.round(Number(lockedExisting.intensity || 50)),
          tags: lockedExisting.tags ?? [],
          locked: true,
          createdAt: now,
          updatedAt: now,
        });
        continue;
      }

      await db.insert(storyBeats).values({
        id: generateId(),
        projectId,
        sourceNoteId: beat.sourceNoteId || null,
        orderIndex,
        minuteStart: Number(beat.minuteStart || 0),
        minuteEnd: Number(beat.minuteEnd || 1),
        pseudoBeat: String(beat.pseudoBeat || ''),
        polishedBeat: String(beat.polishedBeat || ''),
        objective: String(beat.objective || ''),
        conflict: String(beat.conflict || ''),
        turnText: String(beat.turn || beat.turnText || ''),
        intensity: Math.round(Number(beat.intensity || 50)),
        tags: Array.isArray(beat.tags) ? beat.tags : [],
        locked: !!beat.locked,
        createdAt: now,
        updatedAt: now,
      });
    }
    return listStoryBeats(projectId);
  };

  const setBeatLocked = async (projectId: string, beatId: string, locked: boolean) => {
    const now = Date.now();
    await db
      .update(storyBeats)
      .set({ locked, updatedAt: now })
      .where(and(eq(storyBeats.id, beatId), eq(storyBeats.projectId, projectId)));
    const [row] = await db
      .select()
      .from(storyBeats)
      .where(and(eq(storyBeats.id, beatId), eq(storyBeats.projectId, projectId)));
    if (!row) return null;
    return {
      ...row,
      tags: row.tags ?? [],
      turn: row.turnText,
      locked: row.locked ?? false,
    };
  };

  const listStoryBeats = async (projectId: string) => {
    const rows = await db
      .select()
      .from(storyBeats)
      .where(eq(storyBeats.projectId, projectId))
      .orderBy(asc(storyBeats.orderIndex));
    return rows.map(row => ({
      ...row,
      tags: row.tags ?? [],
      turn: row.turnText,
      locked: row.locked ?? false,
    }));
  };

  const saveProjectPackage = async (projectId: string, payload: any, prompt: string) => {
    const now = Date.now();
    const id = generateId();
    const [versionRow] = await db
      .select({ maxVersion: sql<number>`coalesce(max(${projectPackages.version}), 0)` })
      .from(projectPackages)
      .where(eq(projectPackages.projectId, projectId));
    const version = (versionRow?.maxVersion || 0) + 1;
    await db.insert(projectPackages).values({
      id,
      projectId,
      payload,
      prompt: prompt || '',
      status: 'draft',
      version,
      createdAt: now,
      updatedAt: now,
    });
    return { id, projectId, payload, prompt: prompt || '', status: 'draft', version, createdAt: now, updatedAt: now };
  };

  const getLatestProjectPackage = async (projectId: string) => {
    const [row] = await db
      .select()
      .from(projectPackages)
      .where(eq(projectPackages.projectId, projectId))
      .orderBy(desc(projectPackages.version))
      .limit(1);
    if (!row) return null;
    return { ...row, payload: row.payload };
  };

  const setStoryboardSceneLocked = async (projectId: string, beatId: string, locked: boolean) => {
    const latest = await getLatestProjectPackage(projectId);
    if (!latest?.payload || typeof latest.payload !== 'object') return null;
    const p = latest.payload as any;
    if (!p.storyboard || !Array.isArray(p.storyboard)) return null;
    const now = Date.now();
    const updatedPayload = {
      ...p,
      storyboard: p.storyboard.map((scene: any) => (
        String(scene.beatId) === String(beatId)
          ? { ...scene, locked }
          : scene
      )),
    };
    await db
      .update(projectPackages)
      .set({ payload: updatedPayload, updatedAt: now })
      .where(eq(projectPackages.id, latest.id));
    return { ...latest, payload: updatedPayload, updatedAt: now };
  };

  const createSceneVideoJob = async (args: {
    projectId: string;
    packageId: string;
    beatId: string;
    provider: string;
    modelKey?: string;
    prompt: string;
    sourceImageUrl: string;
    continuityScore?: number;
    continuityThreshold?: number;
    recommendRegenerate?: boolean;
    continuityReason?: string;
    durationSeconds?: number;
  }) => {
    const id = generateId();
    const now = Date.now();
    const durationSeconds = Math.round(Number(args.durationSeconds || 5));
    await db.insert(sceneVideos).values({
      id,
      projectId: args.projectId,
      packageId: args.packageId,
      beatId: args.beatId,
      provider: args.provider || 'local-ffmpeg',
      modelKey: args.modelKey || 'seedance',
      prompt: args.prompt || '',
      sourceImageUrl: args.sourceImageUrl || '',
      continuityScore: Math.max(0, Math.min(1, Number(args.continuityScore ?? 0.75))),
      continuityThreshold: Math.max(0, Math.min(1, Number(args.continuityThreshold ?? 0.75))),
      recommendRegenerate: !!args.recommendRegenerate,
      continuityReason: args.continuityReason || '',
      status: 'queued',
      jobId: '',
      videoUrl: '',
      durationSeconds,
      error: '',
      createdAt: now,
      updatedAt: now,
    });
    const [row] = await db.select().from(sceneVideos).where(eq(sceneVideos.id, id));
    return row ?? null;
  };

  const updateSceneVideoJob = async (id: string, patch: Partial<{
    status: string;
    jobId: string;
    videoUrl: string;
    error: string;
    sourceImageUrl: string;
  }>) => {
    const now = Date.now();
    const [row] = await db.select().from(sceneVideos).where(eq(sceneVideos.id, id));
    if (!row) return null;
    await db
      .update(sceneVideos)
      .set({
        status: patch.status ?? row.status,
        jobId: patch.jobId ?? row.jobId,
        videoUrl: patch.videoUrl ?? row.videoUrl,
        error: patch.error ?? row.error,
        sourceImageUrl: patch.sourceImageUrl ?? row.sourceImageUrl,
        updatedAt: now,
      })
      .where(eq(sceneVideos.id, id));
    const [updated] = await db.select().from(sceneVideos).where(eq(sceneVideos.id, id));
    return updated ?? null;
  };

  const getLatestSceneVideo = async (projectId: string, beatId: string) => {
    const [row] = await db
      .select()
      .from(sceneVideos)
      .where(and(eq(sceneVideos.projectId, projectId), eq(sceneVideos.beatId, beatId)))
      .orderBy(desc(sceneVideos.createdAt))
      .limit(1);
    return row ?? null;
  };

  const listLatestSceneVideos = async (projectId: string) => {
    const rows = await db
      .select()
      .from(sceneVideos)
      .where(eq(sceneVideos.projectId, projectId))
      .orderBy(desc(sceneVideos.createdAt));
    const seen = new Set<string>();
    const items: any[] = [];
    for (const row of rows) {
      const beatId = String(row.beatId || '');
      if (!beatId || seen.has(beatId)) continue;
      seen.add(beatId);
      items.push(row);
    }
    return items;
  };

  const createProjectFinalFilm = async (args: { projectId: string; sourceCount: number }) => {
    const id = generateId();
    const now = Date.now();
    await db.insert(projectFinalFilms).values({
      id,
      projectId: args.projectId,
      status: 'queued',
      sourceCount: Number(args.sourceCount || 0),
      videoUrl: '',
      error: '',
      createdAt: now,
      updatedAt: now,
    });
    const [row] = await db.select().from(projectFinalFilms).where(eq(projectFinalFilms.id, id));
    return row ?? null;
  };

  const updateProjectFinalFilm = async (id: string, patch: Partial<{
    status: string;
    sourceCount: number;
    videoUrl: string;
    error: string;
  }>) => {
    const now = Date.now();
    const [row] = await db.select().from(projectFinalFilms).where(eq(projectFinalFilms.id, id));
    if (!row) return null;
    await db
      .update(projectFinalFilms)
      .set({
        status: patch.status ?? row.status,
        sourceCount: typeof patch.sourceCount === 'number' ? patch.sourceCount : row.sourceCount,
        videoUrl: patch.videoUrl ?? row.videoUrl,
        error: patch.error ?? row.error,
        updatedAt: now,
      })
      .where(eq(projectFinalFilms.id, id));
    const [updated] = await db.select().from(projectFinalFilms).where(eq(projectFinalFilms.id, id));
    return updated ?? null;
  };

  const getLatestProjectFinalFilm = async (projectId: string) => {
    const [row] = await db
      .select()
      .from(projectFinalFilms)
      .where(eq(projectFinalFilms.projectId, projectId))
      .orderBy(desc(projectFinalFilms.createdAt))
      .limit(1);
    return row ?? null;
  };

  const claimNextQueuedProjectFinalFilm = async () => {
    const [candidate] = await db
      .select({ id: projectFinalFilms.id })
      .from(projectFinalFilms)
      .where(eq(projectFinalFilms.status, 'queued'))
      .orderBy(asc(projectFinalFilms.createdAt))
      .limit(1);

    if (!candidate?.id) return null;

    const now = Date.now();
    const updated = await db
      .update(projectFinalFilms)
      .set({ status: 'processing', updatedAt: now })
      .where(and(eq(projectFinalFilms.id, candidate.id), eq(projectFinalFilms.status, 'queued')))
      .returning();

    if (!updated.length) return null;
    return updated[0];
  };

  const requeueStaleProcessingProjectFinalFilms = async (maxAgeMs: number = 10 * 60 * 1000) => {
    const now = Date.now();
    const staleBefore = now - Math.max(60_000, Number(maxAgeMs || 0));
    const updated = await db
      .update(projectFinalFilms)
      .set({ status: 'queued', updatedAt: now })
      .where(and(eq(projectFinalFilms.status, 'processing'), lt(projectFinalFilms.updatedAt, staleBefore)))
      .returning();
    return updated.length;
  };

  const claimNextQueuedSceneVideo = async () => {
    const [candidate] = await db
      .select({ id: sceneVideos.id })
      .from(sceneVideos)
      .where(eq(sceneVideos.status, 'queued'))
      .orderBy(asc(sceneVideos.createdAt))
      .limit(1);

    if (!candidate?.id) return null;

    const now = Date.now();
    const updated = await db
      .update(sceneVideos)
      .set({ status: 'processing', updatedAt: now })
      .where(and(eq(sceneVideos.id, candidate.id), eq(sceneVideos.status, 'queued')))
      .returning();

    if (!updated.length) return null;
    return updated[0];
  };

  const requeueStaleProcessingSceneVideos = async (maxAgeMs: number = 10 * 60 * 1000) => {
    const now = Date.now();
    const staleBefore = now - Math.max(60_000, Number(maxAgeMs || 0));
    const updated = await db
      .update(sceneVideos)
      .set({ status: 'queued', updatedAt: now })
      .where(and(eq(sceneVideos.status, 'processing'), lt(sceneVideos.updatedAt, staleBefore)))
      .returning();
    return updated.length;
  };

  const createScenePromptLayer = async (args: {
    projectId: string;
    packageId: string;
    beatId: string;
    directorPrompt: string;
    cinematographerPrompt: string;
    mergedPrompt: string;
    filmType?: string;
    generationModel?: string;
    continuationMode?: string;
    anchorBeatId?: string;
    autoRegenerateThreshold?: number;
    source?: string;
  }) => {
    const id = generateId();
    const now = Date.now();
    const [versionRow] = await db
      .select({ maxVersion: sql<number>`coalesce(max(${scenePromptLayers.version}), 0)` })
      .from(scenePromptLayers)
      .where(and(eq(scenePromptLayers.projectId, args.projectId), eq(scenePromptLayers.beatId, args.beatId)));
    const version = (versionRow?.maxVersion || 0) + 1;
    await db.insert(scenePromptLayers).values({
      id,
      projectId: args.projectId,
      packageId: args.packageId,
      beatId: args.beatId,
      directorPrompt: args.directorPrompt || '',
      cinematographerPrompt: args.cinematographerPrompt || '',
      mergedPrompt: args.mergedPrompt || '',
      filmType: args.filmType || '',
      generationModel: args.generationModel || 'seedance',
      continuationMode: args.continuationMode || 'strict',
      anchorBeatId: args.anchorBeatId || '',
      autoRegenerateThreshold: Number(args.autoRegenerateThreshold || 0.75),
      source: args.source || 'manual',
      version,
      createdAt: now,
      updatedAt: now,
    });
    const [row] = await db.select().from(scenePromptLayers).where(eq(scenePromptLayers.id, id));
    return row ?? null;
  };

  const getLatestScenePromptLayer = async (projectId: string, beatId: string) => {
    const [row] = await db
      .select()
      .from(scenePromptLayers)
      .where(and(eq(scenePromptLayers.projectId, projectId), eq(scenePromptLayers.beatId, beatId)))
      .orderBy(desc(scenePromptLayers.version), desc(scenePromptLayers.createdAt))
      .limit(1);
    return row ?? null;
  };

  const listScenePromptLayerHistory = async (projectId: string, beatId: string) => {
    return db
      .select()
      .from(scenePromptLayers)
      .where(and(eq(scenePromptLayers.projectId, projectId), eq(scenePromptLayers.beatId, beatId)))
      .orderBy(desc(scenePromptLayers.version), desc(scenePromptLayers.createdAt));
  };

  const listLatestScenePromptLayers = async (projectId: string) => {
    const rows = await db
      .select()
      .from(scenePromptLayers)
      .where(eq(scenePromptLayers.projectId, projectId))
      .orderBy(asc(scenePromptLayers.beatId), desc(scenePromptLayers.version), desc(scenePromptLayers.createdAt));
    const seen = new Set<string>();
    const items: any[] = [];
    for (const row of rows) {
      const beatId = String(row.beatId || '');
      if (!beatId || seen.has(beatId)) continue;
      seen.add(beatId);
      items.push(row);
    }
    return items;
  };

  const createSceneVideoPromptTrace = async (args: {
    traceId: string;
    projectId: string;
    packageId: string;
    beatId: string;
    payload: any;
  }) => {
    const now = Date.now();
    await db.insert(sceneVideoPromptTraces).values({
      traceId: String(args.traceId || ''),
      projectId: String(args.projectId || ''),
      packageId: String(args.packageId || ''),
      beatId: String(args.beatId || ''),
      payload: args.payload || {},
      createdAt: now,
    });
    const [row] = await db
      .select()
      .from(sceneVideoPromptTraces)
      .where(eq(sceneVideoPromptTraces.traceId, String(args.traceId || '')));
    if (!row) return null;
    return { ...row, payload: row.payload ?? {} };
  };

  const listSceneVideoPromptTraces = async (projectId: string, beatId: string, limit: number = 20) => {
    const rows = await db
      .select()
      .from(sceneVideoPromptTraces)
      .where(and(eq(sceneVideoPromptTraces.projectId, projectId), eq(sceneVideoPromptTraces.beatId, beatId)))
      .orderBy(desc(sceneVideoPromptTraces.createdAt), desc(sceneVideoPromptTraces.traceId))
      .limit(Math.max(1, Math.min(100, Number(limit || 20))));
    return rows.map(row => ({ ...row, payload: row.payload ?? {} }));
  };

  return {
    listProjects,
    getProjectById,
    softDeleteProject,
    createProject,
    updateProjectBasics,
    updateProjectSynopsis,
    addStoryNote,
    listStoryNotes,
    replaceProjectBeats,
    listStoryBeats,
    setBeatLocked,
    saveProjectPackage,
    getLatestProjectPackage,
    setStoryboardSceneLocked,
    createSceneVideoJob,
    updateSceneVideoJob,
    getLatestSceneVideo,
    listLatestSceneVideos,
    createProjectFinalFilm,
    updateProjectFinalFilm,
    getLatestProjectFinalFilm,
    claimNextQueuedProjectFinalFilm,
    requeueStaleProcessingProjectFinalFilms,
    claimNextQueuedSceneVideo,
    requeueStaleProcessingSceneVideos,
    createScenePromptLayer,
    getLatestScenePromptLayer,
    listScenePromptLayerHistory,
    listLatestScenePromptLayers,
    createSceneVideoPromptTrace,
    listSceneVideoPromptTraces,
    getProjectStyleBible,
    updateProjectStyleBible,
    getLatestProjectScreenplay,
    saveProjectScreenplay,
    getProjectScenesBible,
    updateProjectScenesBible,
  };
};
