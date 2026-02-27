import { evaluateSceneContinuation } from '../lib/sceneContinuation';
import { resolveSceneAnchor } from '../lib/sceneAnchor';

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
  createProject: (input: { accountId?: string; title?: string; pseudoSynopsis: string; style?: string; filmType?: string; durationMinutes?: number }) => any;
  updateProjectBasics: (id: string, input: { title?: string; pseudoSynopsis?: string; filmType?: string }) => any;
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
    modelKey?: string;
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
    generationModel?: string;
    continuationMode?: string;
    anchorBeatId?: string;
    autoRegenerateThreshold?: number;
    source?: string;
  }) => any;
  getLatestScenePromptLayer: (projectId: string, beatId: string) => any;
  listScenePromptLayerHistory: (projectId: string, beatId: string) => any[];
  listLatestScenePromptLayers: (projectId: string) => any[];
  createSceneVideoPromptTrace: (args: { traceId: string; projectId: string; packageId: string; beatId: string; payload: any }) => any;
  listSceneVideoPromptTraces: (projectId: string, beatId: string, limit?: number) => any[];
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
  generateStoryboardFrameWithLlm: (prompt: string, imageModelKey?: string) => Promise<string>;
  buildDirectorSceneVideoPrompt: (args: { projectTitle: string; synopsis: string; styleBible: any; scene: any; directorPrompt?: string }) => string;
  buildCinematographerPrompt: (args: { styleBible: any; scene: any; scenesBible?: any }) => string;
  buildMergedScenePrompt: (args: { directorPrompt: string; cinematographerPrompt: string; scenesBible?: any }) => string;
  createFinalFilmFromClips: (args: { uploadsDir: string; clipUrls: string[]; outputFilename: string }) => Promise<string>;
  extractLastFrameFromVideo: (args: { uploadsDir: string; videoUrl: string; outputFilename: string }) => Promise<string>;
  registerUploadOwnership: (args: { filename: string; accountId: string }) => void;
  uploadsDir: string;
};

const jsonHeaders = (corsHeaders: Record<string, string>) => ({ ...corsHeaders, 'Content-Type': 'application/json' });

const previewText = (value: unknown, max: number = 420) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
};

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '[unserializable-trace]';
  }
};

const buildStoryboardImagePrompt = (args: {
  scene: any;
  filmType?: string;
  projectTitle?: string;
  synopsis?: string;
}) => {
  const parts = [
    args.filmType ? `Film type: ${String(args.filmType).trim()}` : '',
    String(args.scene?.imagePrompt || '').trim(),
    String(args.scene?.slugline || '').trim(),
    String(args.scene?.visualDirection || '').trim(),
    String(args.scene?.camera || '').trim(),
    String(args.scene?.audio || '').trim() ? `Audio mood: ${String(args.scene?.audio).trim()}` : '',
  ].filter(Boolean);

  if (!parts.length) {
    return [
      `Cinematic storyboard frame for ${String(args.projectTitle || 'film project').trim() || 'film project'}`,
      String(args.synopsis || '').trim(),
      'High-quality, coherent composition, realistic lighting, no text overlay, no watermark.',
    ].filter(Boolean).join('. ');
  }

  return parts.join('. ');
};

const compactPromptLine = (value: unknown, max: number) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max)}...`;
};

const buildEffectiveSceneVideoPrompt = (args: {
  modelKey: string;
  scene: any;
  directorLayer: string;
  cinematographerLayer: string;
  scenesBible?: any;
  filmType?: string;
  continuationMode: string;
  anchorBeatId?: string;
  autoRegenerateThreshold: number;
}) => {
  const modelKey = String(args.modelKey || 'seedance').trim().toLowerCase();
  const scenesBible = args.scenesBible || {};

  const duration = Math.max(5, Math.min(10, Number(args.scene?.durationSeconds || 5)));
  const stylePriority = args.filmType || args.directorLayer
    ? 'Aesthetic priority: film type + director intent.'
    : 'Aesthetic priority: scenes bible cinematic language.';
  const realismGuardrail = compactPromptLine(scenesBible?.cinematicLanguage, 160)
    ? `Realism guardrail: ${compactPromptLine(scenesBible?.cinematicLanguage, 160)}`
    : 'Realism guardrail: preserve grounded motion and physically plausible lighting.';
  const continuityInvariants = Array.isArray(scenesBible?.continuityInvariants)
    ? scenesBible.continuityInvariants.map((item: unknown) => compactPromptLine(item, 120)).filter(Boolean).slice(0, 5)
    : [];

  const promptParts = [
    'Generate one coherent cinematic shot from the reference image.',
    stylePriority,
    realismGuardrail,
    continuityInvariants.length ? `Continuity invariants: ${continuityInvariants.join(' | ')}` : '',
    compactPromptLine(scenesBible?.locationCanon, 180) ? `Location canon: ${compactPromptLine(scenesBible?.locationCanon, 180)}` : '',
    compactPromptLine(scenesBible?.characterCanon, 180) ? `Character canon: ${compactPromptLine(scenesBible?.characterCanon, 180)}` : '',
    args.filmType ? `Film type: ${compactPromptLine(args.filmType, 90)}` : '',
    compactPromptLine(args.scene?.slugline, 180) ? `Scene slugline: ${compactPromptLine(args.scene?.slugline, 180)}` : '',
    compactPromptLine(args.scene?.visualDirection, 260) ? `Visual direction: ${compactPromptLine(args.scene?.visualDirection, 260)}` : '',
    compactPromptLine(args.scene?.camera, 200) ? `Camera language: ${compactPromptLine(args.scene?.camera, 200)}` : '',
    compactPromptLine(args.scene?.audio, 180) ? `Audio mood: ${compactPromptLine(args.scene?.audio, 180)}` : '',
    `Duration seconds: ${duration}`,
    `Continuation mode: ${compactPromptLine(args.continuationMode, 30) || 'strict'}`,
    args.anchorBeatId ? `Anchor beat: ${compactPromptLine(args.anchorBeatId, 40)}` : 'Anchor beat: current scene frame',
    `Auto-regenerate threshold: ${args.autoRegenerateThreshold}`,
    compactPromptLine(args.directorLayer, 420) ? `Director intent: ${compactPromptLine(args.directorLayer, 420)}` : '',
    compactPromptLine(args.cinematographerLayer, 420) ? `Cinematography intent: ${compactPromptLine(args.cinematographerLayer, 420)}` : '',
    'Constraints: realistic motion, coherent subject identity, natural lighting continuity, no text overlays, no watermark.',
    'Conflict rule: if style and realism conflict, keep the requested style while preserving continuity, identity, and physically plausible motion.',
  ].filter(Boolean);

  const compactPrompt = promptParts.join('\n');
  const maxLength = modelKey === 'veo3' ? 1200 : modelKey === 'kling' ? 1300 : 1500;
  return compactPrompt.length <= maxLength ? compactPrompt : `${compactPrompt.slice(0, maxLength)}...`;
};

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
    createSceneVideoPromptTrace,
    listSceneVideoPromptTraces,
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
    extractLastFrameFromVideo,
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
      filmType: typeof body?.filmType === 'string' ? body.filmType : 'cinematic live-action',
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
      filmType: typeof body?.filmType === 'string' ? body.filmType : undefined,
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
      const imageModelKey = ['fal', 'grok'].includes(String(body?.imageModelKey || '').trim().toLowerCase())
        ? String(body.imageModelKey).trim().toLowerCase()
        : 'fal';
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
            const prompt = buildStoryboardImagePrompt({
              scene,
              filmType,
              projectTitle: project.title,
              synopsis: project.polishedSynopsis || project.pseudoSynopsis,
            });
            const imageUrl = await generateStoryboardFrameWithLlm(prompt, imageModelKey);
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
    const modelKey = ['seedance', 'kling', 'veo3'].includes(String(body?.modelKey || '').trim().toLowerCase())
      ? String(body.modelKey).trim().toLowerCase()
      : 'seedance';
    const continuationMode = ['off', 'strict', 'balanced', 'loose'].includes(String(body?.continuationMode || '').trim())
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
      generationModel: modelKey,
      continuationMode,
      anchorBeatId,
      autoRegenerateThreshold,
      source,
    });

    return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/[^/]+\/video-traces$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const beatId = pathname.split('/')[5];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') || 20);
    const items = listSceneVideoPromptTraces(projectId, beatId, limit);
    return new Response(JSON.stringify({ items }), { headers: jsonHeaders(corsHeaders) });
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

    const latestFinalFilm = getLatestProjectFinalFilm(projectId);
    if (latestFinalFilm && (latestFinalFilm.status === 'queued' || latestFinalFilm.status === 'processing')) {
      return new Response(JSON.stringify({ success: true, item: latestFinalFilm, message: 'Final film job already running.' }), { status: 202, headers: jsonHeaders(corsHeaders) });
    }

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
    return new Response(JSON.stringify({ success: true, item: film, message: 'Final film job queued.' }), { status: 202, headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/[^/]+\/video$/) && method === 'GET') {
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    const beatId = pathname.split('/')[5];
    const item = getLatestSceneVideo(projectId, beatId);
    return new Response(JSON.stringify({ item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/[^/]+\/image\/regenerate$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const beatId = pathname.split('/')[5];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });

    const latestPackage = getLatestProjectPackage(projectId);
    if (!latestPackage?.payload?.storyboard || !Array.isArray(latestPackage.payload.storyboard)) {
      return new Response(JSON.stringify({ error: 'No storyboard package found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    }

    const body = await req.json().catch(() => ({}));
    const imageModelKey = ['fal', 'grok'].includes(String(body?.imageModelKey || '').trim().toLowerCase())
      ? String(body.imageModelKey).trim().toLowerCase()
      : 'fal';
    const filmType = typeof body?.filmType === 'string' ? body.filmType.trim() : '';

    const targetScene = latestPackage.payload.storyboard.find((item: any) => String(item.beatId) === String(beatId));
    if (!targetScene) {
      return new Response(JSON.stringify({ error: 'Scene not found for beat' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    }

    try {
      const imagePrompt = buildStoryboardImagePrompt({
        scene: targetScene,
        filmType,
        projectTitle: project.title,
        synopsis: project.polishedSynopsis || project.pseudoSynopsis,
      });
      const imageUrl = await generateStoryboardFrameWithLlm(imagePrompt, imageModelKey);
      const updatedPayload = {
        ...latestPackage.payload,
        storyboard: latestPackage.payload.storyboard.map((scene: any) => (
          String(scene.beatId) === String(beatId)
            ? { ...scene, imageUrl }
            : scene
        )),
      };

      const item = saveProjectPackage(projectId, updatedPayload, latestPackage.prompt || 'regenerate-storyboard-image');
      return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to regenerate storyboard image';
      return new Response(JSON.stringify({ error: message }), { status: 502, headers: jsonHeaders(corsHeaders) });
    }
  }

  if (pathname.match(/^\/api\/projects\/[^/]+\/storyboard\/images\/regenerate-all$/) && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const projectId = pathname.split('/')[3];
    const project = getScopedProject(projectId);
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });

    const latestPackage = getLatestProjectPackage(projectId);
    if (!latestPackage?.payload?.storyboard || !Array.isArray(latestPackage.payload.storyboard)) {
      return new Response(JSON.stringify({ error: 'No storyboard package found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    }

    const body = await req.json().catch(() => ({}));
    const imageModelKey = ['fal', 'grok'].includes(String(body?.imageModelKey || '').trim().toLowerCase())
      ? String(body.imageModelKey).trim().toLowerCase()
      : 'fal';
    const filmType = typeof body?.filmType === 'string' ? body.filmType.trim() : '';

    const storyboard = latestPackage.payload.storyboard as any[];
    const refreshedStoryboard: any[] = [];
    let refreshedCount = 0;
    let failedCount = 0;

    for (const scene of storyboard) {
      try {
        const imagePrompt = buildStoryboardImagePrompt({
          scene,
          filmType,
          projectTitle: project.title,
          synopsis: project.polishedSynopsis || project.pseudoSynopsis,
        });
        const imageUrl = await generateStoryboardFrameWithLlm(imagePrompt, imageModelKey);
        refreshedStoryboard.push({ ...scene, imageUrl });
        refreshedCount += 1;
      } catch {
        refreshedStoryboard.push({ ...scene });
        failedCount += 1;
      }
    }

    const updatedPayload = {
      ...latestPackage.payload,
      storyboard: refreshedStoryboard,
    };
    const item = saveProjectPackage(projectId, updatedPayload, latestPackage.prompt || 'regenerate-all-storyboard-images');
    return new Response(JSON.stringify({ success: true, item, refreshedCount, failedCount }), { headers: jsonHeaders(corsHeaders) });
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
    const imageModelKey = ['fal', 'grok'].includes(String(body?.imageModelKey || '').trim().toLowerCase())
      ? String(body.imageModelKey).trim().toLowerCase()
      : 'fal';
    const modelKeyInput = typeof body?.modelKey === 'string' ? body.modelKey.trim().toLowerCase() : '';
    const directorLayerInput = typeof body?.directorPrompt === 'string' ? body.directorPrompt.trim() : '';
    const cinematographerLayerInput = typeof body?.cinematographerPrompt === 'string' ? body.cinematographerPrompt.trim() : '';
    const continuationModeInput = ['off', 'strict', 'balanced', 'loose'].includes(String(body?.continuationMode || '').trim())
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
            const imageUrl = await generateStoryboardFrameWithLlm(imagePrompt, imageModelKey);
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
    const activeModelKey = (['seedance', 'kling', 'veo3'].includes(modelKeyInput)
      ? modelKeyInput
      : String(latestLayer?.generationModel || 'seedance').trim().toLowerCase()) || 'seedance';
    const activeContinuationMode = continuationModeInput || String(latestLayer?.continuationMode || 'strict').trim() || 'strict';
    const activeAnchorBeatId = anchorBeatIdInput || String(latestLayer?.anchorBeatId || '').trim();
    const activeAutoRegenerateThreshold = Number.isFinite(autoRegenerateThresholdInput)
      ? Math.max(0, Math.min(1, autoRegenerateThresholdInput))
      : Math.max(0, Math.min(1, Number(latestLayer?.autoRegenerateThreshold ?? 0.75)));

    const orderedStoryboard = latestPackage.payload.storyboard || [];
    const currentSceneIndex = orderedStoryboard.findIndex((item: any) => String(item.beatId) === String(beatId));
    const previousScene = currentSceneIndex > 0 ? orderedStoryboard[currentSceneIndex - 1] : null;
    const manualAnchorScene = activeAnchorBeatId
      ? orderedStoryboard.find((item: any) => String(item.beatId) === String(activeAnchorBeatId))
      : null;

    let previousClipLastFrameUrl = '';
    if (!manualAnchorScene?.beatId && previousScene?.beatId) {
      const previousClip = getLatestSceneVideo(projectId, String(previousScene.beatId));
      const previousClipUrl = String(previousClip?.videoUrl || '').trim();
      const previousClipIsReady = String(previousClip?.status || '') === 'completed';
      if (previousClipIsReady && previousClipUrl) {
        try {
          const outputFilename = `anchor-last-frame-${projectId}-${beatId}-${Date.now()}.jpg`;
          const extractedUrl = await extractLastFrameFromVideo({
            uploadsDir,
            videoUrl: previousClipUrl,
            outputFilename,
          });
          previousClipLastFrameUrl = extractedUrl;
          if (requestAccountId) {
            registerUploadOwnership({ filename: outputFilename, accountId: String(requestAccountId) });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown extraction error';
          console.warn(`[anchor] Failed to extract previous clip last frame for beat ${beatId}: ${message}`);
        }
      }
    }

    const anchorResolution = resolveSceneAnchor({
      continuationMode: activeContinuationMode as 'off' | 'strict' | 'balanced' | 'loose',
      currentSceneImageUrl: String(scene.imageUrl || '').trim(),
      previousSceneBeatId: String(previousScene?.beatId || ''),
      previousSceneImageUrl: String(previousScene?.imageUrl || '').trim(),
      previousClipLastFrameUrl,
      manualAnchorBeatId: String(manualAnchorScene?.beatId || ''),
      manualAnchorImageUrl: String(manualAnchorScene?.imageUrl || '').trim(),
    });
    const resolvedAnchorBeatId = String(anchorResolution.anchorBeatId || '').trim();
    const resolvedSourceImageUrl = String(anchorResolution.sourceImageUrl || '').trim();

    const directorPrompt = buildDirectorSceneVideoPrompt({
      projectTitle: project.title,
      synopsis: project.polishedSynopsis || project.pseudoSynopsis,
      styleBible,
      scene,
      directorPrompt: [
        activeFilmType ? `Film type: ${activeFilmType}` : '',
        `Continuation mode: ${activeContinuationMode}`,
        resolvedAnchorBeatId ? `Anchor beat: ${resolvedAnchorBeatId}` : 'Anchor beat: current scene frame',
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
    const effectiveVideoPrompt = buildEffectiveSceneVideoPrompt({
      modelKey: activeModelKey,
      scene,
      directorLayer,
      cinematographerLayer,
      scenesBible,
      filmType: activeFilmType,
      continuationMode: activeContinuationMode,
      anchorBeatId: resolvedAnchorBeatId,
      autoRegenerateThreshold: activeAutoRegenerateThreshold,
    });

    const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const promptTrace = {
      traceId,
      projectId,
      beatId,
      packageId: latestPackage.id,
      scene: {
        sceneNumber: Number(scene.sceneNumber || 0),
        slugline: previewText(scene.slugline, 140),
        visualDirection: previewText(scene.visualDirection, 240),
        imagePrompt: previewText(scene.imagePrompt, 240),
        hasImageUrl: Boolean(scene.imageUrl),
      },
      input: {
        promptOverride: previewText(promptOverride, 240),
        directorPrompt: previewText(directorLayerInput, 240),
        cinematographerPrompt: previewText(cinematographerLayerInput, 240),
        filmType,
        imageModelKey,
        modelKey: modelKeyInput || null,
        continuationMode: continuationModeInput || null,
        anchorBeatId: anchorBeatIdInput || null,
        autoRegenerateThreshold: Number.isFinite(autoRegenerateThresholdInput) ? autoRegenerateThresholdInput : null,
      },
      resolved: {
        directorLayerSource: directorLayerInput ? 'request.directorPrompt' : promptOverride ? 'request.prompt' : 'latestPromptLayer.directorPrompt',
        cinematographerLayerSource: cinematographerLayerInput ? 'request.cinematographerPrompt' : 'latestPromptLayer.cinematographerPrompt|auto-build',
        activeFilmType,
        imageModelKey,
        modelKey: activeModelKey,
        promptStrategy: `compact-scene-prompt:${activeModelKey}`,
        continuationMode: activeContinuationMode,
        anchorBeatId: resolvedAnchorBeatId,
        anchorSource: anchorResolution.anchorSource,
        hasPreviousClipLastFrame: Boolean(previousClipLastFrameUrl),
        sourceImageUrl: previewText(resolvedSourceImageUrl, 220),
        autoRegenerateThreshold: activeAutoRegenerateThreshold,
      },
      components: {
        styleBible: {
          visualStyle: previewText(styleBible?.visualStyle, 180),
          cameraGrammar: previewText(styleBible?.cameraGrammar, 180),
          doCount: Array.isArray(styleBible?.doList) ? styleBible.doList.length : 0,
          dontCount: Array.isArray(styleBible?.dontList) ? styleBible.dontList.length : 0,
        },
        scenesBible: {
          hasScenesBible: Boolean(scenesBible),
          overview: previewText(scenesBible?.overview, 160),
          continuityInvariantsCount: Array.isArray(scenesBible?.continuityInvariants) ? scenesBible.continuityInvariants.length : 0,
        },
        directorPrompt: previewText(directorPrompt, 900),
        cinematographerPrompt: previewText(cinematographerPrompt, 900),
        mergedPrompt: previewText(videoPrompt, 1200),
        effectivePrompt: previewText(effectiveVideoPrompt, 1200),
      },
      lengths: {
        directorLayer: directorLayer.length,
        cinematographerLayer: cinematographerLayer.length,
        directorPrompt: directorPrompt.length,
        cinematographerPrompt: cinematographerPrompt.length,
        mergedPrompt: videoPrompt.length,
        effectivePrompt: effectiveVideoPrompt.length,
      },
    };
    console.log(`[trace] scene-video-prompt\n${safeJson(promptTrace)}`);
    createSceneVideoPromptTrace({
      traceId,
      projectId,
      packageId: latestPackage.id,
      beatId,
      payload: promptTrace,
    });

    const promptLayer = createScenePromptLayer({
      projectId,
      packageId: latestPackage.id,
      beatId,
      directorPrompt: directorLayer,
      cinematographerPrompt: cinematographerLayer,
      mergedPrompt: videoPrompt,
      filmType: activeFilmType,
      generationModel: activeModelKey,
      continuationMode: activeContinuationMode,
      anchorBeatId: resolvedAnchorBeatId,
      autoRegenerateThreshold: activeAutoRegenerateThreshold,
      source: 'video-generate',
    });

    const continuationEvaluation = evaluateSceneContinuation({
      continuationMode: activeContinuationMode as 'off' | 'strict' | 'balanced' | 'loose',
      hasAnchor: Boolean(resolvedAnchorBeatId),
      directorLayer,
      cinematographerLayer,
      threshold: activeAutoRegenerateThreshold,
    });

    const job = createSceneVideoJob({
      projectId,
      packageId: latestPackage.id,
      beatId,
      provider: `fal-${activeModelKey}`,
      modelKey: activeModelKey,
      prompt: effectiveVideoPrompt,
      sourceImageUrl: resolvedSourceImageUrl,
      continuityScore: continuationEvaluation.score,
      continuityThreshold: activeAutoRegenerateThreshold,
      recommendRegenerate: continuationEvaluation.recommendRegenerate,
      continuityReason: continuationEvaluation.reason,
      durationSeconds: Number(scene.durationSeconds || 5),
    });

    console.log(`[queue] Enqueued scene video job ${job.id} for project ${projectId}, beat ${beatId}`);

    return new Response(JSON.stringify({ success: true, item: job, promptLayer, traceId }), { status: 202, headers: jsonHeaders(corsHeaders) });
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
