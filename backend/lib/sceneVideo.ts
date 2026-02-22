import { fal } from '@fal-ai/client';
import { basename, join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || '';
const FAL_VIDEO_MODEL = process.env.FAL_VIDEO_MODEL || 'fal-ai/bytedance/seedance/v1/lite/image-to-video';

if (FAL_KEY) {
  fal.config({ credentials: FAL_KEY });
}

export const buildDirectorSceneVideoPrompt = (args: {
  projectTitle: string;
  synopsis: string;
  styleBible: any;
  scene: any;
  directorPrompt?: string;
}) => {
  const styleBible = args.styleBible || {};
  const doList = Array.isArray(styleBible.doList) ? styleBible.doList.join(', ') : '';
  const dontList = Array.isArray(styleBible.dontList) ? styleBible.dontList.join(', ') : '';

  return [
    `You are a world-class film director crafting a cinematic shot for project: ${args.projectTitle}.`,
    `Scene slugline: ${args.scene?.slugline || 'UNKNOWN'}`,
    `Scene visual direction: ${args.scene?.visualDirection || ''}`,
    `Camera language: ${args.scene?.camera || ''}`,
    `Audio mood: ${args.scene?.audio || ''}`,
    `Voiceover intent: ${args.scene?.voiceover || ''}`,
    `On-screen text guidance: ${args.scene?.onScreenText || ''}`,
    `Scene timing: ${args.scene?.durationSeconds || 5} seconds`,
    `Reference synopsis: ${args.synopsis || ''}`,
    `Style bible visual style: ${styleBible.visualStyle || ''}`,
    `Style bible camera grammar: ${styleBible.cameraGrammar || ''}`,
    `Creative do list: ${doList}`,
    `Creative don't list: ${dontList}`,
    `Director override: ${args.directorPrompt || ''}`,
    'Directorial objective: produce one coherent cinematic clip with clear subject focus, motivated camera movement, dramatic but realistic lighting, and emotionally legible action progression.',
    'Aesthetic constraints: premium festival-grade composition, believable motion, no surreal artifacts, no random text overlays, no watermarks.',
  ].join('\n');
};

export const buildCinematographerPrompt = (args: {
  styleBible: any;
  scene: any;
  scenesBible?: any;
}) => {
  const styleBible = args.styleBible || {};
  const scenesBible = args.scenesBible || {};
  return [
    `Cinematographer directives:`,
    `Scene heading: ${args.scene?.slugline || 'UNKNOWN'}`,
    `Shot design: ${args.scene?.camera || ''}`,
    `Visual direction: ${args.scene?.visualDirection || ''}`,
    `Lighting continuity: ${(scenesBible?.locationCanon || '').slice(0, 600)}`,
    `Camera grammar lock: ${styleBible.cameraGrammar || ''}`,
    `Palette and texture lock: ${scenesBible?.paletteAndTexture || ''}`,
    `Cinematic language lock: ${scenesBible?.cinematicLanguage || ''}`,
    `Continuity invariants: ${Array.isArray(scenesBible?.continuityInvariants) ? scenesBible.continuityInvariants.join(', ') : ''}`,
    `Technical constraints: preserve axis consistency, avoid jumpy lens changes, maintain subject scale continuity, realistic motivated movement.`,
  ].join('\n');
};

export const buildMergedScenePrompt = (args: {
  directorPrompt: string;
  cinematographerPrompt: string;
  scenesBible?: any;
}) => {
  const scenesBible = args.scenesBible || {};
  return [
    'SCENES BIBLE (HARD CONSTRAINTS):',
    scenesBible?.overview || '',
    scenesBible?.characterCanon || '',
    scenesBible?.locationCanon || '',
    Array.isArray(scenesBible?.continuityInvariants) ? scenesBible.continuityInvariants.map((item: string) => `- ${item}`).join('\n') : '',
    '',
    'CINEMATOGRAPHER PROMPT (camera/lens/lighting priority):',
    args.cinematographerPrompt,
    '',
    'DIRECTOR PROMPT (performance/emotion priority):',
    args.directorPrompt,
  ].filter(Boolean).join('\n');
};

const resolveFalImageUrl = async (args: {
  uploadsDir: string;
  sourceImageUrl: string;
}) => {
  const source = String(args.sourceImageUrl || '').trim();
  if (!source) throw new Error('source image URL is missing');

  if (source.startsWith('http://') || source.startsWith('https://')) {
    return source;
  }

  if (!source.startsWith('/uploads/')) {
    throw new Error(`unsupported source image URL format: ${source}`);
  }

  const sourcePath = join(args.uploadsDir, basename(source.split('?')[0]));
  if (!existsSync(sourcePath)) {
    throw new Error(`source image not found: ${sourcePath}`);
  }

  const sourceFile = Bun.file(sourcePath);
  const buffer = await sourceFile.arrayBuffer();
  const file = new File([buffer], basename(sourcePath), { type: sourceFile.type || 'image/png' });
  const uploadedUrl = await fal.storage.upload(file);
  return uploadedUrl;
};

export const generateSceneVideoWithFal = async (args: {
  uploadsDir: string;
  sourceImageUrl: string;
  prompt: string;
  durationSeconds?: number;
}) => {
  if (!FAL_KEY) {
    throw new Error('FAL_KEY is not configured');
  }

  const startedAt = Date.now();
  console.log(`[video] FAL scene generation started (model: ${FAL_VIDEO_MODEL})`);
  const duration = Math.max(5, Math.min(10, Number(args.durationSeconds || 5)));
  const imageUrl = await resolveFalImageUrl({
    uploadsDir: args.uploadsDir,
    sourceImageUrl: args.sourceImageUrl,
  });

  const result = await fal.subscribe(FAL_VIDEO_MODEL, {
    input: {
      image_url: imageUrl,
      prompt: args.prompt,
      resolution: '720p',
      duration: String(duration),
    },
    logs: true,
    onQueueUpdate: update => {
      if (update.status === 'IN_PROGRESS') {
        const messages = Array.isArray(update.logs) ? update.logs.map(log => log.message).filter(Boolean) : [];
        if (messages.length > 0) {
          console.log(`[video] ${messages.join(' | ')}`);
        }
      }
    },
  });

  const videoUrl =
    (result as any)?.data?.video?.url
    || (result as any)?.data?.videos?.[0]?.url
    || (result as any)?.video?.url
    || '';

  if (!videoUrl) {
    throw new Error('FAL video generation returned no video URL');
  }

  console.log(`[video] FAL scene generation completed in ${Date.now() - startedAt}ms`);

  return videoUrl;
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
    'ffmpeg',
    '-y',
    '-loglevel', 'error',
    '-i', tempPath,
    '-c', 'copy',
    '-movflags', '+faststart',
    outputPath,
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
    if (!existsSync(localPath)) {
      throw new Error(`clip not found: ${localPath}`);
    }
    const file = Bun.file(localPath);
    await Bun.write(sourcePath, await file.arrayBuffer());
  } else if (args.clipUrl.startsWith('http://') || args.clipUrl.startsWith('https://')) {
    const response = await fetch(args.clipUrl);
    if (!response.ok) {
      throw new Error(`failed to fetch clip ${args.index + 1}: ${response.status}`);
    }
    await Bun.write(sourcePath, await response.arrayBuffer());
  } else {
    throw new Error(`unsupported clip URL: ${args.clipUrl}`);
  }

  const normalize = Bun.spawn([
    'ffmpeg',
    '-y',
    '-loglevel', 'error',
    '-i', sourcePath,
    '-an',
    '-vf', 'fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '22',
    '-movflags', '+faststart',
    normalizedPath,
  ], { stderr: 'pipe' });

  const stderrText = normalize.stderr ? await new Response(normalize.stderr).text() : '';
  const exitCode = await normalize.exited;
  if (exitCode !== 0) {
    throw new Error(`failed to normalize clip ${args.index + 1}: ${stderrText.trim()}`);
  }

  return normalizedPath;
};

export const createFinalFilmFromClips = async (args: {
  uploadsDir: string;
  clipUrls: string[];
  outputFilename: string;
}) => {
  const clipUrls = Array.isArray(args.clipUrls) ? args.clipUrls.filter(Boolean) : [];
  if (clipUrls.length === 0) {
    throw new Error('no clips available to build final film');
  }

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
      'ffmpeg',
      '-y',
      '-loglevel', 'error',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      outputPath,
    ], { stderr: 'pipe' });

    const stderrText = concat.stderr ? await new Response(concat.stderr).text() : '';
    const exitCode = await concat.exited;
    if (exitCode !== 0) {
      throw new Error(`failed to concatenate clips: ${stderrText.trim()}`);
    }

    return `/uploads/${args.outputFilename}`;
  } finally {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
};
