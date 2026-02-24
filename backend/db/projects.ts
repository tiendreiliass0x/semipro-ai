import type { Database } from 'bun:sqlite';

type CreateProjectsDbArgs = {
  db: Database;
  generateId: () => string;
};

export const createProjectsDb = ({ db, generateId }: CreateProjectsDbArgs) => {
  const DEFAULT_STYLE_BIBLE = {
    visualStyle: 'Grounded cinematic realism with expressive close-ups and motivated camera movement.',
    cameraGrammar: 'Use intentional composition, practical coverage, and transitions that preserve orientation.',
    doList: ['Keep emotional clarity', 'Show cause-and-effect', 'Use specific sensory detail'],
    dontList: ['Avoid generic inspirational cliches', 'Avoid timeline jumps without transition cards'],
  };

  const listProjects = (accountId?: string) => {
    if (accountId) {
      return db.query(`
        SELECT id, accountId, title, pseudoSynopsis, polishedSynopsis, plotScript, style, durationMinutes, status, deletedAt, createdAt, updatedAt
        FROM projects
        WHERE deletedAt IS NULL AND accountId = ?
        ORDER BY updatedAt DESC
      `).all(accountId) as any[];
    }

    return db.query(`
      SELECT id, accountId, title, pseudoSynopsis, polishedSynopsis, plotScript, style, durationMinutes, status, deletedAt, createdAt, updatedAt
      FROM projects
      WHERE deletedAt IS NULL
      ORDER BY updatedAt DESC
    `).all() as any[];
  };

  const getProjectById = (id: string, accountId?: string) => {
    if (accountId) {
      return db.query(`
        SELECT id, accountId, title, pseudoSynopsis, polishedSynopsis, plotScript, style, durationMinutes, status, deletedAt, createdAt, updatedAt
        FROM projects
        WHERE id = ? AND accountId = ? AND deletedAt IS NULL
      `).get(id, accountId) as any;
    }

    return db.query(`
      SELECT id, accountId, title, pseudoSynopsis, polishedSynopsis, plotScript, style, durationMinutes, status, deletedAt, createdAt, updatedAt
      FROM projects
      WHERE id = ? AND deletedAt IS NULL
    `).get(id) as any;
  };

  const softDeleteProject = (id: string) => {
    const now = Date.now();
    const result = db.query('UPDATE projects SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL').run(now, now, id) as { changes?: number };
    return Number(result?.changes || 0) > 0;
  };

  const createProject = (input: { accountId?: string; title?: string; pseudoSynopsis: string; style?: string; durationMinutes?: number }) => {
    const now = Date.now();
    const id = generateId();
    const style = (input.style || 'cinematic').toLowerCase();
    const durationMinutes = Number(input.durationMinutes || 1);
    const synopsis = String(input.pseudoSynopsis || '').trim();
    const explicitTitle = String(input.title || '').trim();
    const fallbackTitle = synopsis
      ? synopsis.split(/\s+/).slice(0, 6).join(' ').replace(/[.,!?;:]+$/g, '')
      : `Untitled Project ${new Date(now).toLocaleDateString()}`;
    const title = explicitTitle || fallbackTitle;

    db.query(`
      INSERT INTO projects (id, accountId, title, pseudoSynopsis, polishedSynopsis, plotScript, style, durationMinutes, status, deletedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.accountId || null, title, synopsis, '', '', style, durationMinutes, 'draft', null, now, now);
    db.query(`
      INSERT INTO project_style_bibles (projectId, payload, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
    `).run(id, JSON.stringify(DEFAULT_STYLE_BIBLE), now, now);
    return getProjectById(id, input.accountId);
  };

  const getProjectStyleBible = (projectId: string) => {
    const row = db.query('SELECT payload FROM project_style_bibles WHERE projectId = ?').get(projectId) as { payload?: string } | null;
    if (!row?.payload) return DEFAULT_STYLE_BIBLE;
    try {
      return JSON.parse(row.payload);
    } catch {
      return DEFAULT_STYLE_BIBLE;
    }
  };

  const updateProjectStyleBible = (projectId: string, payload: any) => {
    const now = Date.now();
    const serialized = JSON.stringify(payload || DEFAULT_STYLE_BIBLE);
    db.query(`
      INSERT INTO project_style_bibles (projectId, payload, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(projectId) DO UPDATE SET payload = excluded.payload, updatedAt = excluded.updatedAt
    `).run(projectId, serialized, now, now);
    return getProjectStyleBible(projectId);
  };

  const getLatestProjectScreenplay = (projectId: string) => {
    const row = db.query(`
      SELECT id, projectId, payload, version, status, createdAt, updatedAt
      FROM project_screenplays
      WHERE projectId = ?
      ORDER BY version DESC
      LIMIT 1
    `).get(projectId) as any;
    if (!row) return null;
    return {
      ...row,
      payload: JSON.parse(row.payload || '{}'),
    };
  };

  const saveProjectScreenplay = (projectId: string, payload: any, status: string = 'draft') => {
    const now = Date.now();
    const id = generateId();
    const row = db.query('SELECT COALESCE(MAX(version), 0) as maxVersion FROM project_screenplays WHERE projectId = ?').get(projectId) as { maxVersion: number };
    const version = Number(row?.maxVersion || 0) + 1;
    db.query(`
      INSERT INTO project_screenplays (id, projectId, payload, status, version, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectId, JSON.stringify(payload || {}), status, version, now, now);
    return { id, projectId, payload, status, version, createdAt: now, updatedAt: now };
  };

  const getProjectScenesBible = (projectId: string) => {
    const row = db.query('SELECT payload FROM project_scenes_bibles WHERE projectId = ?').get(projectId) as { payload?: string } | null;
    if (!row?.payload) return null;
    try {
      return JSON.parse(row.payload);
    } catch {
      return null;
    }
  };

  const updateProjectScenesBible = (projectId: string, payload: any) => {
    const now = Date.now();
    db.query(`
      INSERT INTO project_scenes_bibles (projectId, payload, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(projectId) DO UPDATE SET payload = excluded.payload, updatedAt = excluded.updatedAt
    `).run(projectId, JSON.stringify(payload || {}), now, now);
    return getProjectScenesBible(projectId);
  };

  const updateProjectSynopsis = (id: string, polishedSynopsis: string, plotScript: string = '') => {
    const now = Date.now();
    db.query('UPDATE projects SET polishedSynopsis = ?, plotScript = ?, updatedAt = ? WHERE id = ?').run(polishedSynopsis, plotScript || '', now, id);
    return getProjectById(id);
  };

  const updateProjectBasics = (id: string, input: { title?: string; pseudoSynopsis?: string }) => {
    const now = Date.now();
    const existing = getProjectById(id);
    if (!existing) return null;

    const nextTitle = typeof input.title === 'string' && input.title.trim()
      ? input.title.trim()
      : String(existing.title || '').trim();
    const nextPseudoSynopsis = typeof input.pseudoSynopsis === 'string' && input.pseudoSynopsis.trim()
      ? input.pseudoSynopsis.trim()
      : String(existing.pseudoSynopsis || '').trim();

    db.query('UPDATE projects SET title = ?, pseudoSynopsis = ?, updatedAt = ? WHERE id = ?').run(nextTitle, nextPseudoSynopsis, now, id);
    return getProjectById(id);
  };

  const addStoryNote = (projectId: string, input: { rawText: string; minuteMark?: number; source?: string; transcript?: string }) => {
    const now = Date.now();
    const id = generateId();
    const row = db.query('SELECT COALESCE(MAX(orderIndex), 0) as maxOrder FROM story_notes WHERE projectId = ?').get(projectId) as { maxOrder: number };
    const orderIndex = Number(row?.maxOrder || 0) + 1;
    db.query(`
      INSERT INTO story_notes (id, projectId, source, rawText, transcript, minuteMark, orderIndex, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      projectId,
      input.source || 'typed',
      input.rawText,
      input.transcript || '',
      typeof input.minuteMark === 'number' ? input.minuteMark : null,
      orderIndex,
      now,
      now
    );
    return db.query('SELECT * FROM story_notes WHERE id = ?').get(id) as any;
  };

  const listStoryNotes = (projectId: string) => {
    return db.query('SELECT * FROM story_notes WHERE projectId = ? ORDER BY orderIndex ASC, createdAt ASC').all(projectId) as any[];
  };

  const replaceProjectBeats = (projectId: string, beats: any[]) => {
    const now = Date.now();
    const existingRows = db.query('SELECT * FROM story_beats WHERE projectId = ? ORDER BY orderIndex ASC').all(projectId) as any[];
    const lockByOrder = new Map<number, any>();
    existingRows.forEach(row => {
      if (Number(row.locked || 0) === 1) lockByOrder.set(Number(row.orderIndex), row);
    });

    db.query('DELETE FROM story_beats WHERE projectId = ?').run(projectId);
    beats.forEach((beat, index) => {
      const orderIndex = index + 1;
      const lockedExisting = lockByOrder.get(orderIndex);
      if (lockedExisting) {
        db.query(`
          INSERT INTO story_beats (
            id, projectId, sourceNoteId, orderIndex, minuteStart, minuteEnd,
            pseudoBeat, polishedBeat, objective, conflict, turnText, intensity, tags, locked, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          generateId(),
          projectId,
          lockedExisting.sourceNoteId || null,
          orderIndex,
          Number(lockedExisting.minuteStart || 0),
          Number(lockedExisting.minuteEnd || 1),
          String(lockedExisting.pseudoBeat || ''),
          String(lockedExisting.polishedBeat || ''),
          String(lockedExisting.objective || ''),
          String(lockedExisting.conflict || ''),
          String(lockedExisting.turnText || ''),
          Number(lockedExisting.intensity || 50),
          String(lockedExisting.tags || '[]'),
          1,
          now,
          now
        );
        return;
      }

      db.query(`
        INSERT INTO story_beats (
          id, projectId, sourceNoteId, orderIndex, minuteStart, minuteEnd,
          pseudoBeat, polishedBeat, objective, conflict, turnText, intensity, tags, locked, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateId(),
        projectId,
        beat.sourceNoteId || null,
        orderIndex,
        Number(beat.minuteStart || 0),
        Number(beat.minuteEnd || 1),
        String(beat.pseudoBeat || ''),
        String(beat.polishedBeat || ''),
        String(beat.objective || ''),
        String(beat.conflict || ''),
        String(beat.turn || beat.turnText || ''),
        Number(beat.intensity || 50),
        JSON.stringify(Array.isArray(beat.tags) ? beat.tags : []),
        Number(beat.locked ? 1 : 0),
        now,
        now
      );
    });
    return listStoryBeats(projectId);
  };

  const setBeatLocked = (projectId: string, beatId: string, locked: boolean) => {
    const now = Date.now();
    db.query('UPDATE story_beats SET locked = ?, updatedAt = ? WHERE id = ? AND projectId = ?').run(locked ? 1 : 0, now, beatId, projectId);
    const row = db.query('SELECT * FROM story_beats WHERE id = ? AND projectId = ?').get(beatId, projectId) as any;
    if (!row) return null;
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      turn: row.turnText,
      locked: Number(row.locked || 0) === 1,
    };
  };

  const listStoryBeats = (projectId: string) => {
    const rows = db.query('SELECT * FROM story_beats WHERE projectId = ? ORDER BY orderIndex ASC').all(projectId) as any[];
    return rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      turn: row.turnText,
      locked: Number(row.locked || 0) === 1,
    }));
  };

  const saveProjectPackage = (projectId: string, payload: any, prompt: string) => {
    const now = Date.now();
    const id = generateId();
    const row = db.query('SELECT COALESCE(MAX(version), 0) as maxVersion FROM project_packages WHERE projectId = ?').get(projectId) as { maxVersion: number };
    const version = Number(row?.maxVersion || 0) + 1;
    db.query(`
      INSERT INTO project_packages (id, projectId, payload, prompt, status, version, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectId, JSON.stringify(payload), prompt || '', 'draft', version, now, now);
    return { id, projectId, payload, prompt: prompt || '', status: 'draft', version, createdAt: now, updatedAt: now };
  };

  const getLatestProjectPackage = (projectId: string) => {
    const row = db.query(`
      SELECT id, projectId, payload, prompt, status, version, createdAt, updatedAt
      FROM project_packages
      WHERE projectId = ?
      ORDER BY version DESC
      LIMIT 1
    `).get(projectId) as any;
    if (!row) return null;
    return { ...row, payload: JSON.parse(row.payload) };
  };

  const setStoryboardSceneLocked = (projectId: string, beatId: string, locked: boolean) => {
    const latest = getLatestProjectPackage(projectId);
    if (!latest?.payload?.storyboard || !Array.isArray(latest.payload.storyboard)) return null;
    const now = Date.now();
    const updatedPayload = {
      ...latest.payload,
      storyboard: latest.payload.storyboard.map((scene: any) => (
        String(scene.beatId) === String(beatId)
          ? { ...scene, locked }
          : scene
      )),
    };
    db.query('UPDATE project_packages SET payload = ?, updatedAt = ? WHERE id = ?').run(JSON.stringify(updatedPayload), now, latest.id);
    return { ...latest, payload: updatedPayload, updatedAt: now };
  };

  const createSceneVideoJob = (args: {
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
    const durationSeconds = Number(args.durationSeconds || 5);
    db.query(`
      INSERT INTO scene_videos (
        id, projectId, packageId, beatId, provider, modelKey, prompt, sourceImageUrl,
        continuityScore, continuityThreshold, recommendRegenerate, continuityReason,
        status, jobId, videoUrl, durationSeconds, error, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      args.projectId,
      args.packageId,
      args.beatId,
      args.provider || 'local-ffmpeg',
      args.modelKey || 'seedance',
      args.prompt || '',
      args.sourceImageUrl || '',
      Math.max(0, Math.min(1, Number(args.continuityScore ?? 0.75))),
      Math.max(0, Math.min(1, Number(args.continuityThreshold ?? 0.75))),
      args.recommendRegenerate ? 1 : 0,
      args.continuityReason || '',
      'queued',
      '',
      '',
      durationSeconds,
      '',
      now,
      now
    );
    return db.query('SELECT * FROM scene_videos WHERE id = ?').get(id) as any;
  };

  const updateSceneVideoJob = (id: string, patch: Partial<{
    status: string;
    jobId: string;
    videoUrl: string;
    error: string;
    sourceImageUrl: string;
  }>) => {
    const now = Date.now();
    const row = db.query('SELECT * FROM scene_videos WHERE id = ?').get(id) as any;
    if (!row) return null;
    db.query(`
      UPDATE scene_videos SET
        status = ?,
        jobId = ?,
        videoUrl = ?,
        error = ?,
        sourceImageUrl = ?,
        updatedAt = ?
      WHERE id = ?
    `).run(
      patch.status ?? row.status,
      patch.jobId ?? row.jobId,
      patch.videoUrl ?? row.videoUrl,
      patch.error ?? row.error,
      patch.sourceImageUrl ?? row.sourceImageUrl,
      now,
      id
    );
    return db.query('SELECT * FROM scene_videos WHERE id = ?').get(id) as any;
  };

  const getLatestSceneVideo = (projectId: string, beatId: string) => {
    return db.query(`
      SELECT * FROM scene_videos
      WHERE projectId = ? AND beatId = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(projectId, beatId) as any;
  };

  const listLatestSceneVideos = (projectId: string) => {
    const rows = db.query(`
      SELECT * FROM scene_videos
      WHERE projectId = ?
      ORDER BY createdAt DESC
    `).all(projectId) as any[];
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

  const createProjectFinalFilm = (args: {
    projectId: string;
    sourceCount: number;
  }) => {
    const id = generateId();
    const now = Date.now();
    db.query(`
      INSERT INTO project_final_films (id, projectId, status, sourceCount, videoUrl, error, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, args.projectId, 'processing', Number(args.sourceCount || 0), '', '', now, now);
    return db.query('SELECT * FROM project_final_films WHERE id = ?').get(id) as any;
  };

  const updateProjectFinalFilm = (id: string, patch: Partial<{
    status: string;
    sourceCount: number;
    videoUrl: string;
    error: string;
  }>) => {
    const now = Date.now();
    const row = db.query('SELECT * FROM project_final_films WHERE id = ?').get(id) as any;
    if (!row) return null;
    db.query(`
      UPDATE project_final_films SET
        status = ?,
        sourceCount = ?,
        videoUrl = ?,
        error = ?,
        updatedAt = ?
      WHERE id = ?
    `).run(
      patch.status ?? row.status,
      typeof patch.sourceCount === 'number' ? patch.sourceCount : row.sourceCount,
      patch.videoUrl ?? row.videoUrl,
      patch.error ?? row.error,
      now,
      id
    );
    return db.query('SELECT * FROM project_final_films WHERE id = ?').get(id) as any;
  };

  const getLatestProjectFinalFilm = (projectId: string) => {
    return db.query(`
      SELECT * FROM project_final_films
      WHERE projectId = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(projectId) as any;
  };

  const claimNextQueuedSceneVideo = () => {
    const candidate = db.query(`
      SELECT id
      FROM scene_videos
      WHERE status = 'queued'
      ORDER BY createdAt ASC
      LIMIT 1
    `).get() as { id?: string } | null;

    if (!candidate?.id) return null;

    const now = Date.now();
    const result = db.query(`
      UPDATE scene_videos
      SET status = 'processing', updatedAt = ?
      WHERE id = ? AND status = 'queued'
    `).run(now, candidate.id) as { changes?: number };

    if (!result?.changes) return null;
    return db.query('SELECT * FROM scene_videos WHERE id = ?').get(candidate.id) as any;
  };

  const requeueStaleProcessingSceneVideos = (maxAgeMs: number = 10 * 60 * 1000) => {
    const now = Date.now();
    const staleBefore = now - Math.max(60_000, Number(maxAgeMs || 0));
    const result = db.query(`
      UPDATE scene_videos
      SET status = 'queued', updatedAt = ?
      WHERE status = 'processing' AND updatedAt < ?
    `).run(now, staleBefore) as { changes?: number };
    return Number(result?.changes || 0);
  };

  const createScenePromptLayer = (args: {
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
    const row = db.query('SELECT COALESCE(MAX(version), 0) as maxVersion FROM scene_prompt_layers WHERE projectId = ? AND beatId = ?').get(args.projectId, args.beatId) as { maxVersion: number };
    const version = Number(row?.maxVersion || 0) + 1;
    db.query(`
      INSERT INTO scene_prompt_layers (
        id, projectId, packageId, beatId, directorPrompt, cinematographerPrompt,
        mergedPrompt, filmType, generationModel, continuationMode, anchorBeatId, autoRegenerateThreshold,
        source, version, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      args.projectId,
      args.packageId,
      args.beatId,
      args.directorPrompt || '',
      args.cinematographerPrompt || '',
      args.mergedPrompt || '',
      args.filmType || '',
      args.generationModel || 'seedance',
      args.continuationMode || 'strict',
      args.anchorBeatId || '',
      Number(args.autoRegenerateThreshold || 0.75),
      args.source || 'manual',
      version,
      now,
      now
    );
    return db.query('SELECT * FROM scene_prompt_layers WHERE id = ?').get(id) as any;
  };

  const getLatestScenePromptLayer = (projectId: string, beatId: string) => {
    return db.query(`
      SELECT * FROM scene_prompt_layers
      WHERE projectId = ? AND beatId = ?
      ORDER BY version DESC, createdAt DESC
      LIMIT 1
    `).get(projectId, beatId) as any;
  };

  const listScenePromptLayerHistory = (projectId: string, beatId: string) => {
    return db.query(`
      SELECT * FROM scene_prompt_layers
      WHERE projectId = ? AND beatId = ?
      ORDER BY version DESC, createdAt DESC
    `).all(projectId, beatId) as any[];
  };

  const listLatestScenePromptLayers = (projectId: string) => {
    const rows = db.query(`
      SELECT * FROM scene_prompt_layers
      WHERE projectId = ?
      ORDER BY beatId ASC, version DESC, createdAt DESC
    `).all(projectId) as any[];
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

  const createSceneVideoPromptTrace = (args: {
    traceId: string;
    projectId: string;
    packageId: string;
    beatId: string;
    payload: any;
  }) => {
    const now = Date.now();
    db.query(`
      INSERT INTO scene_video_prompt_traces (
        traceId, projectId, packageId, beatId, payload, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      String(args.traceId || ''),
      String(args.projectId || ''),
      String(args.packageId || ''),
      String(args.beatId || ''),
      JSON.stringify(args.payload || {}),
      now
    );
    const row = db.query('SELECT * FROM scene_video_prompt_traces WHERE traceId = ?').get(String(args.traceId || '')) as any;
    if (!row) return null;
    return {
      ...row,
      payload: (() => {
        try {
          return JSON.parse(String(row.payload || '{}'));
        } catch {
          return {};
        }
      })(),
    };
  };

  const listSceneVideoPromptTraces = (projectId: string, beatId: string, limit: number = 20) => {
    const rows = db.query(`
      SELECT traceId, projectId, packageId, beatId, payload, createdAt
      FROM scene_video_prompt_traces
      WHERE projectId = ? AND beatId = ?
      ORDER BY createdAt DESC, traceId DESC
      LIMIT ?
    `).all(projectId, beatId, Math.max(1, Math.min(100, Number(limit || 20)))) as any[];

    return rows.map(row => ({
      ...row,
      payload: (() => {
        try {
          return JSON.parse(String(row.payload || '{}'));
        } catch {
          return {};
        }
      })(),
    }));
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
