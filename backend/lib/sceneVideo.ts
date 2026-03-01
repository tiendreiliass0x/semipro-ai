import { basename, extname, join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { resolveVideoModel } from './videoModel';

export { generateSceneVideo } from './videoProviders';

const truncate = (value: unknown, max: number) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max)}...`;
};

export const compileSceneVideoPrompt = (args: {
  modelKey: string;
  scene: any;
  styleBible?: any;
  scenesBible?: any;
  filmType?: string;
  userPrompt?: string;
  directorLayer?: string;
  cinematographerLayer?: string;
}) => {
  const modelConfig = resolveVideoModel(args.modelKey);
  const maxLen = modelConfig.charLimit;
  const scene = args.scene || {};
  const styleBible = args.styleBible || {};
  const scenesBible = args.scenesBible || {};

  const duration = Math.round(Math.max(4, Math.min(10, Number(scene.durationSeconds || 5))));

  // --- Camera: merge scene camera + style bible grammar, keep unique ---
  const cameraRaw = [scene.camera, styleBible.cameraGrammar].map(v => String(v || '').trim()).filter(Boolean);
  const camera = cameraRaw.length > 1 ? cameraRaw.join('. ') : cameraRaw[0] || '';

  // --- Look: merge film type + style bible visual ---
  const lookParts = [args.filmType, styleBible.visualStyle].map(v => String(v || '').trim()).filter(Boolean);
  const look = lookParts.join('. ');

  // --- Continuity invariants: top 3, pipe-separated ---
  const invariants = Array.isArray(scenesBible.continuityInvariants)
    ? scenesBible.continuityInvariants
        .map((item: unknown) => String(item || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  // Build fields in priority order (top = most important, bottom = first to cut)
  type Field = { line: string; priority: number };
  const fields: Field[] = [];

  const add = (line: string, priority: number) => {
    if (line) fields.push({ line, priority });
  };

  // P0 – core shot instruction (never cut)
  add('One coherent cinematic shot from the reference image.', 0);
  add(truncate(scene.slugline, 180) ? `Scene: ${truncate(scene.slugline, 180)}` : '', 0);
  add(truncate(scene.visualDirection, 260) ? `Action: ${truncate(scene.visualDirection, 260)}` : '', 0);
  add(truncate(camera, 220) ? `Camera: ${truncate(camera, 220)}` : '', 1);
  add(truncate(look, 160) ? `Look: ${truncate(look, 160)}` : '', 1);
  add(truncate(scene.audio, 140) ? `Mood: ${truncate(scene.audio, 140)}` : '', 2);
  add(`Duration: ${duration}s`, 0);

  // P1 – scenes bible constraints (compact)
  add(truncate(scenesBible.locationCanon, 180) ? `Setting: ${truncate(scenesBible.locationCanon, 180)}` : '', 3);
  add(truncate(scenesBible.characterCanon, 180) ? `Character: ${truncate(scenesBible.characterCanon, 180)}` : '', 3);
  add(truncate(scenesBible.paletteAndTexture, 140) ? `Palette: ${truncate(scenesBible.paletteAndTexture, 140)}` : '', 4);
  add(invariants.length ? `Invariants: ${invariants.map(i => truncate(i, 80)).join(' | ')}` : '', 4);

  // P2 – user prompt (high importance, separate from director/cinematographer)
  const usr = String(args.userPrompt || '').trim();
  add(usr ? `Intent: ${truncate(usr, 300)}` : '', 1);

  // P3 – director & cinematographer layers
  const dir = String(args.directorLayer || '').trim();
  const cin = String(args.cinematographerLayer || '').trim();
  add(dir ? `Director: ${truncate(dir, 300)}` : '', 5);
  add(cin ? `Cinematography: ${truncate(cin, 300)}` : '', 5);

  // P3 – guardrails (always present, but last to survive truncation)
  add('No text overlays. No watermarks. Preserve subject identity and lighting continuity.', 6);

  // Filter empties and sort by priority
  const populated = fields.filter(f => f.line);
  populated.sort((a, b) => a.priority - b.priority);

  // Assemble and truncate from bottom (highest priority number = least important)
  let lines = populated.map(f => f.line);
  let result = lines.join(' ');

  // If over budget, drop lowest-priority fields one at a time
  while (result.length > maxLen && lines.length > 1) {
    const maxPriority = Math.max(...populated.filter((_, i) => i < lines.length).map(f => f.priority));
    for (let i = lines.length - 1; i >= 0; i--) {
      if (populated[i].priority === maxPriority) {
        lines.splice(i, 1);
        populated.splice(i, 1);
        break;
      }
    }
    result = lines.join(' ');
  }

  return result.length <= maxLen ? result : result.slice(0, maxLen);
};

export const cacheRemoteVideoToLocal = async (args: {
  uploadsDir: string;
  remoteVideoUrl: string;
  outputFilename: string;
}) => {
  const response = await fetch(args.remoteVideoUrl);
  if (!response.ok) {
    throw new Error(`failed to download remote video: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const tempFilename = `${args.outputFilename}.tmp.mp4`;
  const tempPath = join(args.uploadsDir, tempFilename);
  const outputPath = join(args.uploadsDir, args.outputFilename);

  await Bun.write(tempPath, buffer);

  const remux = Bun.spawn([
    'ffmpeg', '-y', '-loglevel', 'error',
    '-i', tempPath, '-c', 'copy', '-movflags', '+faststart', outputPath,
  ], { stderr: 'pipe' });

  const stderrText = remux.stderr ? await new Response(remux.stderr).text() : '';
  const exitCode = await remux.exited;

  if (exitCode !== 0) {
    const fallbackPath = join(args.uploadsDir, args.outputFilename);
    await Bun.write(fallbackPath, buffer);
    console.warn(`[video] faststart remux failed, using direct copy: ${stderrText.trim()}`);
  }

  const tempFile = Bun.file(tempPath);
  await tempFile.delete();

  return `/uploads/${args.outputFilename}`;
};

const normalizeClipToLocalMp4 = async (args: {
  uploadsDir: string;
  tempDir: string;
  clipUrl: string;
  index: number;
}) => {
  const clipName = `clip-${String(args.index + 1).padStart(3, '0')}`;
  const sourcePath = join(args.tempDir, `${clipName}-source.mp4`);
  const normalizedPath = join(args.tempDir, `${clipName}.mp4`);

  if (args.clipUrl.startsWith('/uploads/')) {
    const localPath = join(args.uploadsDir, basename(args.clipUrl.split('?')[0]));
    if (!existsSync(localPath)) throw new Error(`clip not found: ${localPath}`);
    const file = Bun.file(localPath);
    await Bun.write(sourcePath, await file.arrayBuffer());
  } else if (args.clipUrl.startsWith('http://') || args.clipUrl.startsWith('https://')) {
    const response = await fetch(args.clipUrl);
    if (!response.ok) throw new Error(`failed to fetch clip ${args.index + 1}: ${response.status}`);
    await Bun.write(sourcePath, await response.arrayBuffer());
  } else {
    throw new Error(`unsupported clip URL: ${args.clipUrl}`);
  }

  const normalize = Bun.spawn([
    'ffmpeg', '-y', '-loglevel', 'error', '-i', sourcePath, '-an',
    '-vf', 'fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-movflags', '+faststart',
    normalizedPath,
  ], { stderr: 'pipe' });

  const stderrText = normalize.stderr ? await new Response(normalize.stderr).text() : '';
  const exitCode = await normalize.exited;
  if (exitCode !== 0) throw new Error(`failed to normalize clip ${args.index + 1}: ${stderrText.trim()}`);

  return normalizedPath;
};

export const createFinalFilmFromClips = async (args: {
  uploadsDir: string;
  clipUrls: string[];
  outputFilename: string;
}) => {
  const clipUrls = Array.isArray(args.clipUrls) ? args.clipUrls.filter(Boolean) : [];
  if (clipUrls.length === 0) throw new Error('no clips available to build final film');

  const tempDir = join(args.uploadsDir, `.tmp-final-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    const normalizedPaths: string[] = [];
    for (let index = 0; index < clipUrls.length; index++) {
      const normalizedPath = await normalizeClipToLocalMp4({
        uploadsDir: args.uploadsDir,
        tempDir,
        clipUrl: clipUrls[index],
        index,
      });
      normalizedPaths.push(normalizedPath);
    }

    const concatListPath = join(tempDir, 'concat-list.txt');
    const concatListContent = normalizedPaths
      .map(filePath => `file '${filePath.replace(/'/g, "'\\''")}'`)
      .join('\n');
    await Bun.write(concatListPath, concatListContent);

    const outputPath = join(args.uploadsDir, args.outputFilename);
    const concat = Bun.spawn([
      'ffmpeg', '-y', '-loglevel', 'error',
      '-f', 'concat', '-safe', '0', '-i', concatListPath,
      '-c', 'copy', '-movflags', '+faststart', outputPath,
    ], { stderr: 'pipe' });

    const stderrText = concat.stderr ? await new Response(concat.stderr).text() : '';
    const exitCode = await concat.exited;
    if (exitCode !== 0) throw new Error(`failed to concatenate clips: ${stderrText.trim()}`);

    return `/uploads/${args.outputFilename}`;
  } finally {
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
  }
};

export const extractLastFrameFromVideo = async (args: {
  uploadsDir: string;
  videoUrl: string;
  outputFilename: string;
}) => {
  const source = String(args.videoUrl || '').trim();
  if (!source) throw new Error('video URL is required for last-frame extraction');

  const outputPath = join(args.uploadsDir, args.outputFilename);
  const inputSource = source.startsWith('/uploads/')
    ? join(args.uploadsDir, basename(source.split('?')[0]))
    : source;

  if (source.startsWith('/uploads/') && !existsSync(inputSource)) {
    throw new Error(`video source not found: ${inputSource}`);
  }

  const extract = Bun.spawn([
    'ffmpeg', '-y', '-loglevel', 'error', '-sseof', '-0.05',
    '-i', inputSource, '-frames:v', '1',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
    outputPath,
  ], { stderr: 'pipe' });

  const stderrText = extract.stderr ? await new Response(extract.stderr).text() : '';
  const exitCode = await extract.exited;
  if (exitCode !== 0) throw new Error(`failed to extract last frame: ${stderrText.trim()}`);

  return `/uploads/${args.outputFilename}`;
};
