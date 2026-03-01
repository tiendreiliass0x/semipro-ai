import { serve } from 'bun';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createDatabase } from './data/database';
import { generateId, createAuthHelpers, createUploadOwnershipHelpers, getUploadFilenameFromUrl } from './lib/auth';
import { buildCorsHeaders } from './lib/cors';
import { validateStorylinesPayload } from './lib/validation';
import { buildStorylineContext, createStorylineGenerators } from './lib/storylineContext';
import { getDbStats } from './lib/dbStats';
import { createAnecdotesDb } from './db/anecdotes';
import { createAuthDb } from './db/auth';
import { createProjectsDb } from './db/projects';
import { createStorylinesDb } from './db/storylines';
import { createSubscribersDb } from './db/subscribers';
import { generateHybridScreenplayWithLlm, generateProjectStoryboardWithLlm, generateScenesBibleWithLlm, generateStoryboardFrameWithLlm, generateStoryPackageWithLlm, polishNotesIntoBeatsWithLlm, refineSynopsisWithLlm, regenerateStoryboardSceneWithLlm } from './lib/storylineLlm';
import { compileSceneVideoPrompt, createFinalFilmFromClips, extractLastFrameFromVideo } from './lib/sceneVideo';
import { generateSceneVideo } from './lib/videoProviders';
import { resolveVideoModel, VIDEO_MODEL_OPTIONS } from './lib/videoModel';
import { handleAnecdotesRoutes } from './routes/anecdotes';
import { handleAccountRoutes } from './routes/account';
import { handleAuthRoutes } from './routes/auth';
import { handleProjectsRoutes } from './routes/projects';
import { handleStorylinesRoutes } from './routes/storylines';
import { handleSubscribersRoutes } from './routes/subscribers';
import { handleUploadsRoutes } from './routes/uploads';

const PORT = parseInt(process.env.PORT || '3001');
const ADMIN_ACCESS_KEY = process.env.ADMIN_ACCESS_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://yenengalabs:yenengalabs@localhost:5432/yenengalabs';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-4.1-mini';

// Ensure directories
const uploadsDir = join(import.meta.dir, 'uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

// Database
const db = createDatabase(DATABASE_URL);

// Database modules
const {
  getAllAnecdotes, getAnecdoteById, getAnecdotesByYear,
  createAnecdote, updateAnecdote, deleteAnecdote,
} = createAnecdotesDb({ db, uploadsDir, generateId });

const {
  loadStorylines, saveStorylines,
  listStorylinePackages, getLatestStorylinePackage, saveStorylinePackage,
} = createStorylinesDb({ db, generateId });

const { addSubscriber, listSubscribers, exportSubscribersCsv } = createSubscribersDb({ db, generateId });

const {
  getUserByEmail, getUserById, createUser,
  getAccountById, getAccountBySlug, createAccount, updateAccount,
  addMembership, listUserMemberships,
  createSession, getSessionByTokenHash, touchSession,
  revokeSessionByTokenHash, revokeExpiredSessions,
} = createAuthDb({ db, generateId });

const {
  listProjects, getProjectById, softDeleteProject,
  createProject, updateProjectBasics, updateProjectSynopsis,
  addStoryNote, listStoryNotes,
  replaceProjectBeats, listStoryBeats, setBeatLocked,
  saveProjectPackage, getLatestProjectPackage, setStoryboardSceneLocked,
  createSceneVideoJob, updateSceneVideoJob, getLatestSceneVideo, listLatestSceneVideos,
  createProjectFinalFilm, updateProjectFinalFilm, getLatestProjectFinalFilm,
  claimNextQueuedProjectFinalFilm, requeueStaleProcessingProjectFinalFilms,
  claimNextQueuedSceneVideo, requeueStaleProcessingSceneVideos,
  createScenePromptLayer, getLatestScenePromptLayer,
  listScenePromptLayerHistory, listLatestScenePromptLayers,
  createSceneVideoPromptTrace, listSceneVideoPromptTraces,
  getProjectStyleBible, updateProjectStyleBible,
  getLatestProjectScreenplay, saveProjectScreenplay,
  getProjectScenesBible, updateProjectScenesBible,
} = createProjectsDb({ db, generateId });

// Auth & upload helpers
const { getAuthContext, verifyAccessKey, verifyAdminKey, getRequestAccountId } =
  createAuthHelpers({ adminAccessKey: ADMIN_ACCESS_KEY, getSessionByTokenHash, revokeSessionByTokenHash, touchSession });

const { registerUploadOwnership, getUploadOwnerAccountId } =
  createUploadOwnershipHelpers(db);

// Storyline generators
const { generateStoryPackage, generateStoryboardScene } =
  createStorylineGenerators({ generateStoryPackageWithLlm, regenerateStoryboardSceneWithLlm });

// Queue workers
let sceneVideoWorkerActive = false;
const processSceneVideoQueue = async () => {
  if (sceneVideoWorkerActive) return;
  sceneVideoWorkerActive = true;
  try {
    while (true) {
      const job = await claimNextQueuedSceneVideo();
      if (!job) break;
      try {
        console.log(`[queue] Processing scene video job ${job.id} (project: ${job.projectId}, beat: ${job.beatId})`);
        const model = resolveVideoModel(String(job.modelKey || 'seedance'));
        const videoUrl = await generateSceneVideo({
          model,
          uploadsDir,
          sourceImageUrl: String(job.sourceImageUrl || ''),
          prompt: String(job.prompt || ''),
          durationSeconds: Number(job.durationSeconds || 5),
        });
        const project = await getProjectById(String(job.projectId || ''));
        if (project?.accountId) {
          const filename = getUploadFilenameFromUrl(String(videoUrl || ''));
          if (filename) await registerUploadOwnership({ filename, accountId: String(project.accountId) });
        }
        await updateSceneVideoJob(job.id, { status: 'completed', videoUrl, error: '' });
        console.log(`[queue] Completed scene video job ${job.id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate scene video';
        await updateSceneVideoJob(job.id, { status: 'failed', error: message });
        console.error(`[queue] Failed scene video job ${job.id}: ${message}`);
      }
    }
  } finally {
    sceneVideoWorkerActive = false;
  }
};

let finalFilmWorkerActive = false;
const processFinalFilmQueue = async () => {
  if (finalFilmWorkerActive) return;
  finalFilmWorkerActive = true;
  try {
    while (true) {
      const filmJob = await claimNextQueuedProjectFinalFilm();
      if (!filmJob) break;
      try {
        const projectId = String(filmJob.projectId || '');
        console.log(`[queue] Processing final film job ${filmJob.id} (project: ${projectId})`);
        const project = await getProjectById(projectId);
        if (!project) { await updateProjectFinalFilm(filmJob.id, { status: 'failed', error: 'Project not found' }); continue; }
        const latestPackage = await getLatestProjectPackage(projectId);
        const storyboard = Array.isArray(latestPackage?.payload?.storyboard) ? latestPackage.payload.storyboard : [];
        if (!storyboard.length) { await updateProjectFinalFilm(filmJob.id, { status: 'failed', error: 'No storyboard found. Generate scenes first.' }); continue; }
        const sceneVideoList = await listLatestSceneVideos(projectId);
        const completedByBeatId = new Map<string, any>();
        sceneVideoList.forEach(item => {
          if (String(item?.status) === 'completed' && String(item?.videoUrl || '').trim()) completedByBeatId.set(String(item.beatId), item);
        });
        const clipUrls = storyboard
          .map((scene: any) => completedByBeatId.get(String(scene.beatId))?.videoUrl)
          .filter((url: any) => typeof url === 'string' && url.trim().length > 0);
        if (!clipUrls.length) { await updateProjectFinalFilm(filmJob.id, { status: 'failed', error: 'No completed scene videos found to compile.' }); continue; }
        const outputFilename = `final-film-${projectId}-${Date.now()}.mp4`;
        const videoUrl = await createFinalFilmFromClips({ uploadsDir, clipUrls, outputFilename });
        if (project?.accountId) await registerUploadOwnership({ filename: outputFilename, accountId: String(project.accountId) });
        await updateProjectFinalFilm(filmJob.id, { status: 'completed', sourceCount: clipUrls.length, videoUrl, error: '' });
        console.log(`[queue] Completed final film job ${filmJob.id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to build final film';
        await updateProjectFinalFilm(filmJob.id, { status: 'failed', error: message });
        console.error(`[queue] Failed final film job ${filmJob.id}: ${message}`);
      }
    }
  } finally {
    finalFilmWorkerActive = false;
  }
};

// Periodic tasks
setInterval(() => { processSceneVideoQueue().catch(() => null); }, 2500);
setInterval(() => { processFinalFilmQueue().catch(() => null); }, 2500);
setInterval(async () => {
  const removed = await revokeExpiredSessions();
  if (removed > 0) console.log(`[auth] Removed ${removed} expired session(s)`);
}, 5 * 60 * 1000);

(async () => {
  const requeuedCount = await requeueStaleProcessingSceneVideos();
  if (requeuedCount > 0) console.log(`[queue] Re-queued ${requeuedCount} stale processing scene video job(s)`);
  const requeuedFinalFilmCount = await requeueStaleProcessingProjectFinalFilms();
  if (requeuedFinalFilmCount > 0) console.log(`[queue] Re-queued ${requeuedFinalFilmCount} stale processing final film job(s)`);
  processSceneVideoQueue().catch(() => null);
  processFinalFilmQueue().catch(() => null);
})();

// HTTP server
serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;
    const corsHeaders = buildCorsHeaders(req.headers.get('origin'));

    if (method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 204 });

    const uploadsResponse = await handleUploadsRoutes({ req, pathname, method, uploadsDir, corsHeaders, verifyAccessKey, getRequestAccountId, getUploadOwnerAccountId, registerUploadOwnership });
    if (uploadsResponse) return uploadsResponse;

    if (pathname === '/api/health' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (pathname === '/api/admin/db-stats' && method === 'GET') {
      if (!verifyAdminKey(req)) return new Response(JSON.stringify({ error: 'Admin key required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify(await getDbStats(db)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authResponse = await handleAuthRoutes({ req, pathname, method, corsHeaders, getUserByEmail, createUser, getAccountBySlug, createAccount, addMembership, listUserMemberships, createSession, revokeSessionByTokenHash, getAuthContext });
    if (authResponse) return authResponse;

    const accountResponse = await handleAccountRoutes({ req, pathname, method, corsHeaders, getAuthContext, getAccountById, getAccountBySlug, updateAccount });
    if (accountResponse) return accountResponse;

    const projectsResponse = await handleProjectsRoutes({
      req, pathname, method, corsHeaders, verifyAccessKey, getRequestAccountId,
      listProjects, getProjectById, softDeleteProject, createProject, updateProjectBasics, updateProjectSynopsis,
      addStoryNote, listStoryNotes, replaceProjectBeats, listStoryBeats, setBeatLocked,
      saveProjectPackage, getLatestProjectPackage, setStoryboardSceneLocked,
      createSceneVideoJob, getLatestSceneVideo, listLatestSceneVideos,
      createScenePromptLayer, getLatestScenePromptLayer, listScenePromptLayerHistory, listLatestScenePromptLayers,
      createSceneVideoPromptTrace, listSceneVideoPromptTraces,
      createProjectFinalFilm, updateProjectFinalFilm, getLatestProjectFinalFilm,
      getProjectStyleBible, updateProjectStyleBible, getLatestProjectScreenplay, saveProjectScreenplay,
      getProjectScenesBible, updateProjectScenesBible,
      refineSynopsisWithLlm, generateHybridScreenplayWithLlm, generateScenesBibleWithLlm,
      polishNotesIntoBeatsWithLlm, generateProjectStoryboardWithLlm, generateStoryboardFrameWithLlm,
      compileSceneVideoPrompt,
      createFinalFilmFromClips, extractLastFrameFromVideo, registerUploadOwnership, uploadsDir,
    });
    if (projectsResponse) return projectsResponse;

    const storylinesResponse = await handleStorylinesRoutes({
      req, pathname, method, url, corsHeaders, verifyAccessKey, getRequestAccountId,
      loadStorylines, saveStorylines, validateStorylinesPayload,
      generateStoryPackage, generateStoryboardScene,
      listStorylinePackages, getLatestStorylinePackage, saveStorylinePackage,
    });
    if (storylinesResponse) return storylinesResponse;

    const anecdotesResponse = await handleAnecdotesRoutes({ req, pathname, method, corsHeaders, verifyAccessKey, getAllAnecdotes, getAnecdoteById, getAnecdotesByYear, createAnecdote, updateAnecdote, deleteAnecdote });
    if (anecdotesResponse) return anecdotesResponse;

    const subscribersResponse = await handleSubscribersRoutes({ req, pathname, method, corsHeaders, verifyAccessKey, addSubscriber, listSubscribers, exportSubscribersCsv });
    if (subscribersResponse) return subscribersResponse;

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  },
});

// Startup logging
console.log(`Server running on port ${PORT}`);
console.log(`Admin key configured: ${ADMIN_ACCESS_KEY ? 'yes' : 'no'}`);
console.log(`LLM model: ${OPENAI_MODEL}`);
console.log(`Image model: ${OPENAI_IMAGE_MODEL}`);
const resolveVideoModelLog = (key: 'seedance' | 'kling' | 'veo3') => {
  try {
    const model = resolveVideoModel(key);
    return `${model.key} -> ${model.modelId}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'not configured';
    return `${key} -> unavailable (${message})`;
  }
};
console.log(`Video models: ${resolveVideoModelLog('seedance')} | ${resolveVideoModelLog('kling')} | ${resolveVideoModelLog('veo3')}`);
console.log(`Database: PostgreSQL (${DATABASE_URL.replace(/\/\/[^@]*@/, '//***@')})`);
