import { evaluateSceneContinuation } from '../lib/sceneContinuation';

type ProjectsRouteArgs = {
  req: Request;
  pathname: string;
  method: string;
  corsHeaders: Record<string, string>;
  verifyAccessKey: (req: Request) => boolean;
  getRequestAccountId: (req: Request) => string | null;
  listProjects: (accountId?: string) => any[];
  getProjectById: (id: string, accountId?: string) => any;
  softDeleteProject: (id: string) => boolean;
  createProject: (input: { accountId?: string; title?: string; pseudoSynopsis: string; style?: string; durationMinutes?: number }) => any;
  updateProjectBasics: (id: string, input: { title?: string; pseudoSynopsis?: string }) => any;
  updateProjectSynopsis: (id: string, polishedSynopsis: string, plotScript?: string) => any;
  addStoryNote: (projectId: string, input: { rawText: string; minuteMark?: number; source?: string; transcript?: string }) => any;
  listStoryNotes: (projectId: string) => any[];
  replaceProjectBeats: (projectId: string, beats: any[]) => any[];
  listStoryBeats: (projectId: string) => any[];
  setBeatLocked: (projectId: string, beatId: string, locked: boolean) => any;
  saveProjectPackage: (projectId: string, payload: any, prompt: string) => any;
  getLatestProjectPackage: (projectId: string) => any;
  setStoryboardSceneLocked: (projectId: string, beatId: string, locked: boolean) => any;
  createSceneVideoJob: (args: {
    projectId: string;
    packageId: string;
    beatId: string;
    provider: string;
    prompt: string;
    sourceImageUrl: string;
    continuityScore?: number;
    continuityThreshold?: number;
    recommendRegenerate?: boolean;
    continuityReason?: string;
    durationSeconds?: number;
  }) => any;
  getLatestSceneVideo: (projectId: string, beatId: string) => any;
  listLatestSceneVideos: (projectId: string) => any[];
  createScenePromptLayer: (args: {
    projectId: string;
    packageId: string;
    beatId: string;
    directorPrompt: string;
    cinematographerPrompt: string;
    mergedPrompt: string;
    filmType?: string;
    continuationMode?: string;
    anchorBeatId?: string;
    autoRegenerateThreshold?: number;
    source?: string;
  }) => any;
  getLatestScenePromptLayer: (projectId: string, beatId: string) => any;
  listScenePromptLayerHistory: (projectId: string, beatId: string) => any[];
  listLatestScenePromptLayers: (projectId: string) => any[];
  createProjectFinalFilm: (args: { projectId: string; sourceCount: number }) => any;
  updateProjectFinalFilm: (id: string, patch: { status?: string; sourceCount?: number; videoUrl?: string; error?: string }) => any;
  getLatestProjectFinalFilm: (projectId: string) => any;
  getProjectStyleBible: (projectId: string) => any;
  updateProjectStyleBible: (projectId: string, payload: any) => any;
  getLatestProjectScreenplay: (projectId: string) => any;
  saveProjectScreenplay: (projectId: string, payload: any, status?: string) => any;
  getProjectScenesBible: (projectId: string) => any;
  updateProjectScenesBible: (projectId: string, payload: any) => any;
  refineSynopsisWithLlm: (args: { pseudoSynopsis: string; style?: string; durationMinutes?: number; styleBible?: any }) => Promise<any>;
  generateHybridScreenplayWithLlm: (args: { title: string; synopsis: string; plotScript: string; beats: any[]; style?: string; styleBible?: any; durationMinutes?: number }) => Promise<any>;
  generateScenesBibleWithLlm: (args: { title: string; synopsis: string; plotScript: string; screenplay: string; style?: string; styleBible?: any }) => Promise<any>;
  polishNotesIntoBeatsWithLlm: (args: { synopsis: string; notes: any[]; durationMinutes?: number; style?: string; styleBible?: any }) => Promise<any>;
  generateProjectStoryboardWithLlm: (args: { title: string; synopsis: string; beats: any[]; prompt?: string; style?: string; styleBible?: any; filmType?: string }) => Promise<any>;
  generateStoryboardFrameWithLlm: (prompt: string) => Promise<string>;
  buildDirectorSceneVideoPrompt: (args: { projectTitle: string; synopsis: string; styleBible: any; scene: any; directorPrompt?: string }) => string;
  buildCinematographerPrompt: (args: { styleBible: any; scene: any; scenesBible?: any }) => string;
  buildMergedScenePrompt: (args: { directorPrompt: string; cinematographerPrompt: string; scenesBible?: any }) => string;
  createFinalFilmFromClips: (args: { uploadsDir: string; clipUrls: string[]; outputFilename: string }) => Promise<string>;
  registerUploadOwnership: (args: { filename: string; accountId: string }) => void;
  uploadsDir: string;
};

const jsonHeaders = (corsHeaders: Record<string, string>) => ({ ...corsHeaders, 'Content-Type': 'application/json' });

export const handleProjectsRoutes = async (args: ProjectsRouteArgs): Promise<Response | null> => {
  const {
    req,
    pathname,
    method,
    corsHeaders,
    verifyAccessKey,
    getRequestAccountId,
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
    getLatestSceneVideo,
    listLatestSceneVideos,
    createScenePromptLayer,
    getLatestScenePromptLayer,
    listScenePromptLayerHistory,
    listLatestScenePromptLayers,
    createProjectFinalFilm,
    updateProjectFinalFilm,
    getLatestProjectFinalFilm,
    getProjectStyleBible,
    updateProjectStyleBible,
    getLatestProjectScreenplay,
    saveProjectScreenplay,
    getProjectScenesBible,
    updateProjectScenesBible,
    refineSynopsisWithLlm,
    generateHybridScreenplayWithLlm,
    generateScenesBibleWithLlm,
    polishNotesIntoBeatsWithLlm,
    generateProjectStoryboardWithLlm,
    generateStoryboardFrameWithLlm,
    buildDirectorSceneVideoPrompt,
    buildCinematographerPrompt,
    buildMergedScenePrompt,
    createFinalFilmFromClips,
    registerUploadOwnership,
    uploadsDir,
  } = args;

  const requestAccountId = getRequestAccountId(req);
  const scopeAccountId = requestAccountId || undefined;
  const canWrite = Boolean(requestAccountId) && verifyAccessKey(req);
  const getScopedProject = (projectId: string) => getProjectById(projectId, scopeAccountId);

  if (pathname.startsWith('/api/projects') && !requestAccountId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
  }

  const buildContinuityIssues = (beats: any[]) => {
    const issues: any[] = [];
    if (!beats.length) return issues;

    const normalized = [...beats].sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
    if (Number(normalized[0].minuteStart || 0) > 0.5) {
      issues.push({
        code: 'LATE_START',
        severity: 'warning',
        message: 'Timeline starts late. Consider opening at minute 0.',
        suggestion: 'Set first beat minuteStart to 0.',
      });
    }

    for (let index = 0; index < normalized.length; index++) {
      const beat = normalized[index];
      if (!String(beat.objective || '').trim()) {
        issues.push({ code: 'MISSING_OBJECTIVE', severity: 'warning', beatId: beat.id, message: 'Beat objective is empty.', suggestion: 'Add a clear objective for this beat.' });
      }
      if (!String(beat.conflict || '').trim()) {
        issues.push({ code: 'MISSING_CONFLICT', severity: 'warning', beatId: beat.id, message: 'Beat conflict is empty.', suggestion: 'Add a concrete obstacle or tension.' });
      }

      if (index > 0) {
        const previous = normalized[index - 1];
        const previousEnd = Number(previous.minuteEnd || 0);
        const currentStart = Number(beat.minuteStart || 0);
        if (currentStart > previousEnd + 0.6) {
          issues.push({ code: 'TIMELINE_GAP', severity: 'warning', beatId: beat.id, message: 'Gap detected between consecutive beats.', suggestion: 'Fill the gap or merge adjacent beats.' });
        }
        if (currentStart < previousEnd - 0.2) {
          issues.push({ code: 'TIMELINE_OVERLAP', severity: 'error', beatId: beat.id, message: 'Beat timing overlaps previous beat.', suggestion: 'Adjust minuteStart/minuteEnd sequencing.' });
        }

        const jump = Math.abs(Number(beat.intensity || 50) - Number(previous.intensity || 50));
        if (jump >= 45) {
          issues.push({ code: 'INTENSITY_JUMP', severity: 'warning', beatId: beat.id, message: 'Large intensity jump may feel abrupt.', suggestion: 'Add transition beat or smooth intensity progression.' });
        }
      }
    }

    const seen = new Set<string>();
    normalized.forEach(beat => {
      const key = String(beat.polishedBeat || '').trim().toLowerCase().slice(0, 90);
      if (!key) return;
      if (seen.has(key)) {
        issues.push({ code: 'DUPLICATE_BEAT', severity: 'warning', beatId: beat.id, message: 'Potential duplicate beat text.', suggestion: 'Differentiate actions or emotional turns.' });
      } else {
        seen.add(key);
      }
    });

    return issues;
  };

  const autoFixContinuity = (beats: any[], mode: 'timeline' | 'intensity' | 'all') => {
    const normalized = [...beats].sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0));
    if (!normalized.length) return normalized;

    const shouldFixTimeline = mode === 'timeline' || mode === 'all';
    const shouldFixIntensity = mode === 'intensity' || mode === 'all';

    const fixed = normalized.map(beat => ({ ...beat }));

    if (shouldFixTimeline) {
      for (let index = 0; index < fixed.length; index++) {
        const beat = fixed[index];
        if (beat.locked) continue;

        if (index === 0) {
          beat.minuteStart = 0;
          if (Number(beat.minuteEnd || 0) <= Number(beat.minuteStart || 0)) {
            beat.minuteEnd = Number(beat.minuteStart || 0) + 0.8;
          }
          continue;
        }

        const previous = fixed[index - 1];
        const previousEnd = Number(previous.minuteEnd || 0);
        beat.minuteStart = previousEnd;
        if (Number(beat.minuteEnd || 0) <= Number(beat.minuteStart || 0)) {
          beat.minuteEnd = Number(beat.minuteStart || 0) + 0.8;
        }
      }
    }

    if (shouldFixIntensity) {
      for (let index = 1; index < fixed.length; index++) {
        const beat = fixed[index];
        if (beat.locked) continue;

        const previous = fixed[index - 1];
        const previousIntensity = Number(previous.intensity || 50);
        const current = Number(beat.intensity || 50);
        const delta = current - previousIntensity;
        const maxJump = 25;

        if (Math.abs(delta) > maxJump) {
          beat.intensity = Math.max(0, Math.min(100, previousIntensity + (delta > 0 ? maxJump : -maxJump)));
        }
      }
    }

    return fixed;
  };

  if (pathname === '/api/projects' && method === 'GET') {
    return new Response(JSON.stringify(listProjects(scopeAccountId)), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname === '/api/projects' && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const body = await req.json();
    if (!body?.pseudoSynopsis || !String(body.pseudoSynopsis).trim()) {
      return new Response(JSON.stringify({ error: 'pseudoSynopsis is required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }
    const project = createProject({
      accountId: scopeAccountId,
      title: body.title ? String(body.title) : '',
      pseudoSynopsis: String(body.pseudoSynopsis),
      style: body.style || 'cinematic',
      durationMinutes: Number(body.durationMinutes || 1),
    });
    return new Response(JSON.stringify(project), { status: 201, headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const item = getProjectById(projectId, scopeAccountId);
    if (!item) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify(item), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+$/) && method === 'DELETE') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const item = getProjectById(projectId, scopeAccountId);
    if (!item) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const success = softDeleteProject(projectId);
    return new Response(JSON.stringify({ success }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+$/) && method === 'PATCH') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const existing = getProjectById(projectId, scopeAccountId);
    if (!existing) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const body = await req.json().catch(() => ({}));
    const item = updateProjectBasics(projectId, {
      title: typeof body?.title === 'string' ? body.title : undefined,
      pseudoSynopsis: typeof body?.pseudoSynopsis === 'string' ? body.pseudoSynopsis : undefined,
    });
    if (!item) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/style-bible$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ item: getProjectStyleBible(projectId) }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/style-bible$/) && method === 'PUT') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const body = await req.json();
    const item = updateProjectStyleBible(projectId, body?.payload || body || {});
    return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/screenplay$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ item: getLatestProjectScreenplay(projectId) }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/screenplay$/) && method === 'PUT') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const body = await req.json().catch(() => ({}));
    const payload = body?.payload || body || null;
    if (!payload) return new Response(JSON.stringify({ error: 'payload is required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    const item = saveProjectScreenplay(projectId, payload, 'manual');
    return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/screenplay\/generate$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const beats = listStoryBeats(projectId);
    try {
      const payload = await generateHybridScreenplayWithLlm({
        title: project.title,
        synopsis: project.polishedSynopsis || project.pseudoSynopsis,
        plotScript: project.plotScript || '',
        beats,
        style: project.style || 'cinematic',
        styleBible: getProjectStyleBible(projectId),
        durationMinutes: project.durationMinutes || 1,
      });
      const item = saveProjectScreenplay(projectId, payload, 'generated');
      return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate screenplay';
      return new Response(JSON.stringify({ error: message }), { status: 502, headers: jsonHeaders(corsHeaders) });
    }
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/scenes-bible$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ item: getProjectScenesBible(projectId) }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/scenes-bible$/) && method === 'PUT') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const body = await req.json().catch(() => ({}));
    const payload = body?.payload || body || null;
    if (!payload) return new Response(JSON.stringify({ error: 'payload is required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    const item = updateProjectScenesBible(projectId, payload);
    return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/scenes-bible\/generate$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const screenplay = getLatestProjectScreenplay(projectId);
    try {
      const payload = await generateScenesBibleWithLlm({
        title: project.title,
        synopsis: project.polishedSynopsis || project.pseudoSynopsis,
        plotScript: project.plotScript || '',
        screenplay: screenplay?.payload?.screenplay || '',
        style: project.style || 'cinematic',
        styleBible: getProjectStyleBible(projectId),
      });
      const item = updateProjectScenesBible(projectId, payload);
      return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate scenes bible';
      return new Response(JSON.stringify({ error: message }), { status: 502, headers: jsonHeaders(corsHeaders) });
    }
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/synopsis\/refine$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });

    try {
      const refined = await refineSynopsisWithLlm({
        pseudoSynopsis: project.pseudoSynopsis,
        style: project.style || 'cinematic',
        durationMinutes: project.durationMinutes || 1,
        styleBible: getProjectStyleBible(projectId),
      });
      const synopsis = String(refined?.synopsis || '').trim();
      const plotScript = String(refined?.plotScript || '').trim();
      const updated = updateProjectSynopsis(projectId, synopsis, plotScript);
      return new Response(JSON.stringify({ success: true, refined, project: updated }), { headers: jsonHeaders(corsHeaders) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refine synopsis';
      return new Response(JSON.stringify({ error: message }), { status: 502, headers: jsonHeaders(corsHeaders) });
    }
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/notes$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ items: listStoryNotes(projectId) }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/notes$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const body = await req.json();
    if (!body?.rawText && !body?.transcript) {
      return new Response(JSON.stringify({ error: 'rawText or transcript is required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }
    const item = addStoryNote(projectId, {
      rawText: String(body.rawText || body.transcript || ''),
      transcript: String(body.transcript || ''),
      source: String(body.source || 'typed'),
      minuteMark: typeof body.minuteMark === 'number' ? body.minuteMark : undefined,
    });
    return new Response(JSON.stringify({ success: true, item }), { status: 201, headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/beats$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ items: listStoryBeats(projectId) }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/beats\/[^/]+\/lock$/) && method === 'PATCH') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const beatId = pathname.split('/')[5];
    const body = await req.json().catch(() => ({}));
    const locked = Boolean(body?.locked);
    const item = setBeatLocked(projectId, beatId, locked);
    return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/beats\/polish$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const notes = listStoryNotes(projectId);
    if (!notes.length) {
      return new Response(JSON.stringify({ error: 'Add notes first' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    try {
      const polished = await polishNotesIntoBeatsWithLlm({
        synopsis: project.polishedSynopsis || project.pseudoSynopsis,
        notes: notes.map((note, index) => ({
          sourceNoteId: note.id,
          order: index + 1,
          text: note.transcript || note.rawText,
          minuteMark: note.minuteMark,
        })),
        durationMinutes: project.durationMinutes || 1,
        style: project.style || 'cinematic',
        styleBible: getProjectStyleBible(projectId),
      });
      const beats = replaceProjectBeats(projectId, polished?.beats || []);
      return new Response(JSON.stringify({ success: true, items: beats }), { headers: jsonHeaders(corsHeaders) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to polish beats';
      return new Response(JSON.stringify({ error: message }), { status: 502, headers: jsonHeaders(corsHeaders) });
    }
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/generate$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const beats = listStoryBeats(projectId);
    if (!beats.length) return new Response(JSON.stringify({ error: 'No polished beats found' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    const body = await req.json().catch(() => ({}));

    try {
      const filmType = typeof body?.filmType === 'string' ? body.filmType.trim() : '';
      const result = await generateProjectStoryboardWithLlm({
        title: project.title,
        synopsis: project.polishedSynopsis || project.pseudoSynopsis,
        beats,
        prompt: typeof body?.prompt === 'string' ? body.prompt : '',
        style: project.style || 'cinematic',
        styleBible: getProjectStyleBible(projectId),
        filmType,
      });

      if (Array.isArray(result?.storyboard)) {
        for (const scene of result.storyboard) {
          try {
            const prompt = [filmType ? `Film type: ${filmType}` : '', scene.imagePrompt || `${scene.slugline}. ${scene.visualDirection}`]
              .filter(Boolean)
              .join('. ');
            const imageUrl = await generateStoryboardFrameWithLlm(prompt);
            scene.imageUrl = imageUrl;
          } catch {
            scene.imageUrl = '';
          }
        }
      }

      const saved = saveProjectPackage(projectId, result, typeof body?.prompt === 'string' ? body.prompt : '');
      return new Response(JSON.stringify({ success: true, result, package: saved }), { headers: jsonHeaders(corsHeaders) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate storyboard';
      return new Response(JSON.stringify({ error: message }), { status: 502, headers: jsonHeaders(corsHeaders) });
    }
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const item = getLatestProjectPackage(projectId);
    return new Response(JSON.stringify({ item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/videos$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ items: listLatestSceneVideos(projectId) }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/prompt-layers$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ items: listLatestScenePromptLayers(projectId) }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/[^/]+\/prompt-layers$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const beatId = pathname.split('/')[5];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ items: listScenePromptLayerHistory(projectId, beatId) }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/[^/]+\/prompt-layers$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const beatId = pathname.split('/')[5];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const latestPackage = getLatestProjectPackage(projectId);
    if (!latestPackage?.payload?.storyboard || !Array.isArray(latestPackage.payload.storyboard)) {
      return new Response(JSON.stringify({ error: 'No storyboard package found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    }
    const scene = latestPackage.payload.storyboard.find((item: any) => String(item.beatId) === String(beatId));
    if (!scene) return new Response(JSON.stringify({ error: 'Scene not found for beat' }), { status: 404, headers: jsonHeaders(corsHeaders) });

    const body = await req.json().catch(() => ({}));
    const directorLayer = typeof body?.directorPrompt === 'string' ? body.directorPrompt.trim() : '';
    const cinematographerLayer = typeof body?.cinematographerPrompt === 'string' ? body.cinematographerPrompt.trim() : '';
    const activeFilmType = typeof body?.filmType === 'string' ? body.filmType.trim() : '';
    const continuationMode = ['strict', 'balanced', 'loose'].includes(String(body?.continuationMode || '').trim())
      ? String(body.continuationMode).trim()
      : 'strict';
    const anchorBeatId = typeof body?.anchorBeatId === 'string' ? body.anchorBeatId.trim() : '';
    const autoRegenerateThreshold = Math.max(0, Math.min(1, Number(body?.autoRegenerateThreshold ?? 0.75)));
    const source = typeof body?.source === 'string' ? body.source.trim() : 'manual';

    const styleBible = getProjectStyleBible(projectId);
    const scenesBible = getProjectScenesBible(projectId) || null;
    const resolvedDirectorPrompt = buildDirectorSceneVideoPrompt({
      projectTitle: project.title,
      synopsis: project.polishedSynopsis || project.pseudoSynopsis,
      styleBible,
      scene,
      directorPrompt: [
        activeFilmType ? `Film type: ${activeFilmType}` : '',
        `Continuation mode: ${continuationMode}`,
        anchorBeatId ? `Anchor beat: ${anchorBeatId}` : '',
        `Auto-regenerate threshold: ${autoRegenerateThreshold}`,
        directorLayer,
      ].filter(Boolean).join('\n'),
    });
    const resolvedCinematographerPrompt = cinematographerLayer || buildCinematographerPrompt({ styleBible, scene, scenesBible });
    const mergedPrompt = buildMergedScenePrompt({
      directorPrompt: resolvedDirectorPrompt,
      cinematographerPrompt: resolvedCinematographerPrompt,
      scenesBible,
    });

    const item = createScenePromptLayer({
      projectId,
      packageId: latestPackage.id,
      beatId,
      directorPrompt: directorLayer,
      cinematographerPrompt: cinematographerLayer,
      mergedPrompt,
      filmType: activeFilmType,
      continuationMode,
      anchorBeatId,
      autoRegenerateThreshold,
      source,
    });

    return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/final-film$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ item: getLatestProjectFinalFilm(projectId) }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/final-film\/generate$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });

    const latestPackage = getLatestProjectPackage(projectId);
    const storyboard = Array.isArray(latestPackage?.payload?.storyboard) ? latestPackage.payload.storyboard : [];
    if (!storyboard.length) {
      return new Response(JSON.stringify({ error: 'No storyboard found. Generate scenes first.' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    const sceneVideos = listLatestSceneVideos(projectId);
    const completedByBeatId = new Map<string, any>();
    sceneVideos.forEach(item => {
      if (String(item?.status) === 'completed' && String(item?.videoUrl || '').trim()) {
        completedByBeatId.set(String(item.beatId), item);
      }
    });

    const clipUrls = storyboard
      .map((scene: any) => completedByBeatId.get(String(scene.beatId))?.videoUrl)
      .filter((url: any) => typeof url === 'string' && url.trim().length > 0);

    if (!clipUrls.length) {
      return new Response(JSON.stringify({ error: 'No completed scene videos found to compile.' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    const film = createProjectFinalFilm({ projectId, sourceCount: clipUrls.length });
    try {
      const outputFilename = `final-film-${projectId}-${Date.now()}.mp4`;
      const videoUrl = await createFinalFilmFromClips({
        uploadsDir,
        clipUrls,
        outputFilename,
      });
      registerUploadOwnership({ filename: outputFilename, accountId: String(requestAccountId) });

      const item = updateProjectFinalFilm(film.id, {
        status: 'completed',
        sourceCount: clipUrls.length,
        videoUrl,
        error: '',
      });
      return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to build final film';
      const item = updateProjectFinalFilm(film.id, { status: 'failed', error: message });
      return new Response(JSON.stringify({ error: message, item }), { status: 502, headers: jsonHeaders(corsHeaders) });
    }
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/[^/]+\/video$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const beatId = pathname.split('/')[5];
    const item = getLatestSceneVideo(projectId, beatId);
    return new Response(JSON.stringify({ item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/[^/]+\/video$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const beatId = pathname.split('/')[5];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const latestPackage = getLatestProjectPackage(projectId);
    if (!latestPackage?.payload?.storyboard || !Array.isArray(latestPackage.payload.storyboard)) {
      return new Response(JSON.stringify({ error: 'No storyboard package found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    }

    const scene = latestPackage.payload.storyboard.find((item: any) => String(item.beatId) === String(beatId));
    if (!scene) return new Response(JSON.stringify({ error: 'Scene not found for beat' }), { status: 404, headers: jsonHeaders(corsHeaders) });

    const body = await req.json().catch(() => ({}));
    const promptOverride = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const filmType = typeof body?.filmType === 'string' ? body.filmType.trim() : '';
    const directorLayerInput = typeof body?.directorPrompt === 'string' ? body.directorPrompt.trim() : '';
    const cinematographerLayerInput = typeof body?.cinematographerPrompt === 'string' ? body.cinematographerPrompt.trim() : '';
    const continuationModeInput = ['strict', 'balanced', 'loose'].includes(String(body?.continuationMode || '').trim())
      ? String(body.continuationMode).trim()
      : '';
    const anchorBeatIdInput = typeof body?.anchorBeatId === 'string' ? body.anchorBeatId.trim() : '';
    const autoRegenerateThresholdInput = Number(body?.autoRegenerateThreshold);

    if (!scene.imageUrl || promptOverride) {
      try {
        const imagePrompt = [
          filmType ? `Film type: ${filmType}` : '',
          scene.imagePrompt || `${scene.slugline}. ${scene.visualDirection}`,
          promptOverride,
        ].filter(Boolean).join('. ');
        const imageUrl = await generateStoryboardFrameWithLlm(imagePrompt);
        scene.imageUrl = imageUrl;
        latestPackage.payload.storyboard = latestPackage.payload.storyboard.map((item: any) => (
          String(item.beatId) === String(beatId) ? { ...item, imageUrl: scene.imageUrl } : item
        ));
        saveProjectPackage(projectId, latestPackage.payload, latestPackage.prompt || 'image-seed-for-video');
      } catch {
        return new Response(JSON.stringify({ error: 'Unable to generate source image for video' }), { status: 502, headers: jsonHeaders(corsHeaders) });
      }
    }

    const styleBible = getProjectStyleBible(projectId);
    const scenesBible = getProjectScenesBible(projectId) || null;
    const latestLayer = getLatestScenePromptLayer(projectId, beatId);
    const directorLayer = directorLayerInput || promptOverride || String(latestLayer?.directorPrompt || '').trim();
    const cinematographerLayer = cinematographerLayerInput || String(latestLayer?.cinematographerPrompt || '').trim();
    const activeFilmType = filmType || String(latestLayer?.filmType || '').trim();
    const activeContinuationMode = continuationModeInput || String(latestLayer?.continuationMode || 'strict').trim() || 'strict';
    const activeAnchorBeatId = anchorBeatIdInput || String(latestLayer?.anchorBeatId || '').trim();
    const activeAutoRegenerateThreshold = Number.isFinite(autoRegenerateThresholdInput)
      ? Math.max(0, Math.min(1, autoRegenerateThresholdInput))
      : Math.max(0, Math.min(1, Number(latestLayer?.autoRegenerateThreshold ?? 0.75)));

    const orderedStoryboard = latestPackage.payload.storyboard || [];
    const currentSceneIndex = orderedStoryboard.findIndex((item: any) => String(item.beatId) === String(beatId));
    const previousScene = currentSceneIndex > 0 ? orderedStoryboard[currentSceneIndex - 1] : null;
    const anchorScene = activeAnchorBeatId
      ? orderedStoryboard.find((item: any) => String(item.beatId) === String(activeAnchorBeatId))
      : null;
    const resolvedAnchorScene = anchorScene || (activeContinuationMode === 'strict' ? previousScene : null);
    const resolvedSourceImageUrl = String(resolvedAnchorScene?.imageUrl || scene.imageUrl || '').trim();

    const directorPrompt = buildDirectorSceneVideoPrompt({
      projectTitle: project.title,
      synopsis: project.polishedSynopsis || project.pseudoSynopsis,
      styleBible,
      scene,
      directorPrompt: [
        activeFilmType ? `Film type: ${activeFilmType}` : '',
        `Continuation mode: ${activeContinuationMode}`,
        resolvedAnchorScene?.beatId ? `Anchor beat: ${resolvedAnchorScene.beatId}` : 'Anchor beat: current scene frame',
        `Auto-regenerate threshold: ${activeAutoRegenerateThreshold}`,
        directorLayer,
      ].filter(Boolean).join('\n'),
    });
    const cinematographerPrompt = cinematographerLayer || buildCinematographerPrompt({ styleBible, scene, scenesBible });
    const videoPrompt = buildMergedScenePrompt({
      directorPrompt,
      cinematographerPrompt,
      scenesBible,
    });

    const promptLayer = createScenePromptLayer({
      projectId,
      packageId: latestPackage.id,
      beatId,
      directorPrompt: directorLayer,
      cinematographerPrompt: cinematographerLayer,
      mergedPrompt: videoPrompt,
      filmType: activeFilmType,
      continuationMode: activeContinuationMode,
      anchorBeatId: String(resolvedAnchorScene?.beatId || ''),
      autoRegenerateThreshold: activeAutoRegenerateThreshold,
      source: 'video-generate',
    });

    const continuationEvaluation = evaluateSceneContinuation({
      continuationMode: activeContinuationMode as 'strict' | 'balanced' | 'loose',
      hasAnchor: Boolean(resolvedAnchorScene?.beatId),
      directorLayer,
      cinematographerLayer,
      threshold: activeAutoRegenerateThreshold,
    });

    const job = createSceneVideoJob({
      projectId,
      packageId: latestPackage.id,
      beatId,
      provider: 'fal-seedance',
      prompt: videoPrompt,
      sourceImageUrl: resolvedSourceImageUrl,
      continuityScore: continuationEvaluation.score,
      continuityThreshold: activeAutoRegenerateThreshold,
      recommendRegenerate: continuationEvaluation.recommendRegenerate,
      continuityReason: continuationEvaluation.reason,
      durationSeconds: Number(scene.durationSeconds || 5),
    });

    console.log(`[queue] Enqueued scene video job ${job.id} for project ${projectId}, beat ${beatId}`);

    return new Response(JSON.stringify({ success: true, item: job, promptLayer }), { status: 202, headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/scene-lock$/) && method === 'PATCH') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const body = await req.json().catch(() => ({}));
    if (!body?.beatId) return new Response(JSON.stringify({ error: 'beatId is required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    const item = setStoryboardSceneLocked(projectId, String(body.beatId), Boolean(body.locked));
    if (!item) return new Response(JSON.stringify({ error: 'No storyboard package found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/continuity\/check$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const beats = listStoryBeats(projectId);
    const issues = buildContinuityIssues(beats);
    return new Response(JSON.stringify({ success: true, issues }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/continuity\/fix$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === 'timeline' || body?.mode === 'intensity' || body?.mode === 'all' ? body.mode : 'all';
    const dryRun = Boolean(body?.dryRun);

    const beats = listStoryBeats(projectId);
    if (!beats.length) return new Response(JSON.stringify({ error: 'No beats to fix' }), { status: 400, headers: jsonHeaders(corsHeaders) });

    const fixed = autoFixContinuity(beats, mode);
    if (dryRun) {
      const issues = buildContinuityIssues(fixed);
      return new Response(JSON.stringify({ success: true, items: fixed, issues, mode, dryRun: true }), { headers: jsonHeaders(corsHeaders) });
    }

    const items = replaceProjectBeats(projectId, fixed);
    const issues = buildContinuityIssues(items);
    return new Response(JSON.stringify({ success: true, items, issues, mode }), { headers: jsonHeaders(corsHeaders) });
  }

  return null;
};
