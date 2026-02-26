import { fal } from '@fal-ai/client';
import { basename, extname, join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { resolveVideoModel } from './videoModel';

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || '';

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
  const scene = args.scene || {};

  const line = (label: string, value: unknown) => {
    const text = String(value || '').trim();
    return text ? `${label}: ${text}` : '';
  };
  const listLine = (label: string, value: unknown) => {
    const items = Array.isArray(value) ? value.map(item => String(item || '').trim()).filter(Boolean) : [];
    return items.length ? `${label}: ${items.join(', ')}` : '';
  };

  const sharedScenePacket = [
    line('Project', args.projectTitle),
    line('Synopsis', args.synopsis),
    line('Scene slugline', scene.slugline),
    line('Visual direction', scene.visualDirection),
    line('Camera language', scene.camera),
    line('Audio mood', scene.audio),
    line('Voiceover intent', scene.voiceover),
    line('On-screen text', scene.onScreenText),
    line('Duration seconds', scene.durationSeconds || 5),
    line('Style visual', styleBible.visualStyle),
    line('Style camera grammar', styleBible.cameraGrammar),
    listLine('Style do list', styleBible.doList),
    listLine('Style dont list', styleBible.dontList),
  ].filter(Boolean).join('\n');

  return [
    'ROLE: Film director prompt layer for one coherent cinematic shot.',
    'SHARED SCENE PACKET:',
    sharedScenePacket,
    'DIRECTOR LAYER OVERRIDE:',
    String(args.directorPrompt || '').trim() || '(none)',
    'DIRECTOR GOALS:',
    '- Keep performance and emotional intent crystal clear.',
    '- Preserve spatial continuity and believable action progression.',
    '- Avoid surreal artifacts, random text overlays, and watermarks.',
  ].filter(Boolean).join('\n');
};

export const buildCinematographerPrompt = (args: {
  styleBible: any;
  scene: any;
  scenesBible?: any;
}) => {
  const styleBible = args.styleBible || {};
  const scenesBible = args.scenesBible || {};
  const scene = args.scene || {};

  const line = (label: string, value: unknown) => {
    const text = String(value || '').trim();
    return text ? `${label}: ${text}` : '';
  };
  const listLine = (label: string, value: unknown) => {
    const items = Array.isArray(value) ? value.map(item => String(item || '').trim()).filter(Boolean) : [];
    return items.length ? `${label}: ${items.join(', ')}` : '';
  };

  const sharedScenePacket = [
    line('Scene slugline', scene.slugline),
    line('Visual direction', scene.visualDirection),
    line('Camera language', scene.camera),
    line('Duration seconds', scene.durationSeconds || 5),
    line('Style camera grammar', styleBible.cameraGrammar),
    line('Style visual', styleBible.visualStyle),
    line('Scenes bible location canon', String(scenesBible.locationCanon || '').slice(0, 600)),
    line('Scenes bible cinematic language', scenesBible.cinematicLanguage),
    line('Scenes bible palette', scenesBible.paletteAndTexture),
    listLine('Scenes bible continuity invariants', scenesBible.continuityInvariants),
  ].filter(Boolean).join('\n');

  return [
    'ROLE: Cinematographer prompt layer (camera/lens/lighting continuity owner).',
    'SHARED SCENE PACKET:',
    sharedScenePacket,
    'CINEMATOGRAPHY GOALS:',
    '- Preserve axis consistency and subject scale continuity.',
    '- Keep lens and camera movement choices motivated and coherent.',
    '- Maintain realistic lighting continuity and avoid jumpy visual grammar.',
  ].join('\n');
};

export const buildMergedScenePrompt = (args: {
  directorPrompt: string;
  cinematographerPrompt: string;
  scenesBible?: any;
}) => {
  const scenesBible = args.scenesBible || {};
  const line = (label: string, value: unknown) => {
    const text = String(value || '').trim();
    return text ? `${label}: ${text}` : '';
  };
  const listLine = (label: string, value: unknown) => {
    const items = Array.isArray(value) ? value.map(item => String(item || '').trim()).filter(Boolean) : [];
    return items.length ? `${label}: ${items.map(item => `- ${item}`).join('\n')}` : '';
  };

  const scenesBibleBlock = [
    line('Overview', scenesBible.overview),
    line('Character canon', scenesBible.characterCanon),
    line('Location canon', scenesBible.locationCanon),
    line('Cinematic language', scenesBible.cinematicLanguage),
    line('Palette and texture', scenesBible.paletteAndTexture),
    listLine('Continuity invariants', scenesBible.continuityInvariants),
  ].filter(Boolean).join('\n');

  return [
    'PROMPT MERGE CONTRACT:',
    '- Scenes Bible is a hard constraint layer.',
    '- Cinematographer layer controls camera/lens/lighting continuity.',
    '- Director layer controls performance, tone, and emotional intent.',
    'SCENES BIBLE HARD CONSTRAINTS:',
    scenesBibleBlock || '(none)',
    'CINEMATOGRAPHER LAYER:',
    args.cinematographerPrompt,
    'DIRECTOR LAYER:',
    args.directorPrompt,
  ].filter(Boolean).join('\n');
};

const resolveFalImageUrl = async (args: {
  uploadsDir: string;
  sourceImageUrl: string;
  modelKey?: string;
}) => {
  const source = String(args.sourceImageUrl || '').trim();
  if (!source) throw new Error('source image URL is missing');

  const isKling = String(args.modelKey || '').trim().toLowerCase() === 'kling';

  const uploadFileToFal = async (localPath: string) => {
    const sourceFile = Bun.file(localPath);
    const buffer = await sourceFile.arrayBuffer();
    const file = new File([buffer], basename(localPath), { type: sourceFile.type || 'image/jpeg' });
    const uploadedUrl = await fal.storage.upload(file);
    return uploadedUrl;
  };

  const normalizeToKlingFrame = async (inputPath: string) => {
    const outputPath = join(args.uploadsDir, `kling-anchor-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    const process = Bun.spawn([
      'ffmpeg',
      '-y',
      '-loglevel', 'error',
      '-i', inputPath,
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
      '-frames:v', '1',
      outputPath,
    ], { stderr: 'pipe' });

    const stderrText = process.stderr ? await new Response(process.stderr).text() : '';
    const exitCode = await process.exited;
    if (exitCode !== 0) {
      throw new Error(`failed to normalize Kling source frame: ${stderrText.trim()}`);
    }

    return outputPath;
  };

  const downloadRemoteImage = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`failed to download source image (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const extension = extname(url.split('?')[0] || '') || '.jpg';
    const localPath = join(args.uploadsDir, `remote-source-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
    await Bun.write(localPath, Buffer.from(arrayBuffer));
    return localPath;
  };

  if (!isKling && (source.startsWith('http://') || source.startsWith('https://'))) {
    return source;
  }

  if (!source.startsWith('/uploads/') && !source.startsWith('http://') && !source.startsWith('https://')) {
    throw new Error(`unsupported source image URL format: ${source}`);
  }

  const tempPaths: string[] = [];
  try {
    const sourcePath = source.startsWith('/uploads/')
      ? join(args.uploadsDir, basename(source.split('?')[0]))
      : await downloadRemoteImage(source);

    if (!existsSync(sourcePath)) {
      throw new Error(`source image not found: ${sourcePath}`);
    }

    if (source.startsWith('http://') || source.startsWith('https://')) {
      tempPaths.push(sourcePath);
    }

    if (isKling) {
      const normalizedPath = await normalizeToKlingFrame(sourcePath);
      tempPaths.push(normalizedPath);
      const uploadedUrl = await uploadFileToFal(normalizedPath);
      return uploadedUrl;
    }

    const uploadedUrl = await uploadFileToFal(sourcePath);
    return uploadedUrl;
  } finally {
    tempPaths.forEach(path => {
      try {
        if (existsSync(path)) rmSync(path, { force: true });
      } catch {
        // ignore cleanup errors
      }
    });
  }
};

export const generateSceneVideoWithFal = async (args: {
  uploadsDir: string;
  sourceImageUrl: string;
  prompt: string;
  modelKey?: string;
  durationSeconds?: number;
}) => {
  if (!FAL_KEY) {
    throw new Error('FAL_KEY is not configured');
  }

  const model = resolveVideoModel(args.modelKey);
  const startedAt = Date.now();
  console.log(`[video] FAL scene generation started (model: ${model.key} -> ${model.modelId})`);
  const duration = Math.max(5, Math.min(10, Number(args.durationSeconds || 5)));
  const imageUrl = await resolveFalImageUrl({
    uploadsDir: args.uploadsDir,
    sourceImageUrl: args.sourceImageUrl,
    modelKey: model.key,
  });

  const baseInput: Record<string, unknown> = {
    prompt: args.prompt,
  };

  const klingUsesStartImage = model.key === 'kling' && model.modelId.includes('/v3/');
  if (klingUsesStartImage) {
    baseInput.start_image_url = imageUrl;
  } else {
    baseInput.image_url = imageUrl;
  }

  const modelInput: Record<string, unknown> = {
    ...baseInput,
    ...(model.key === 'seedance' ? { resolution: '720p', duration: String(duration) } : {}),
    ...(model.key === 'kling' ? { duration: String(duration), aspect_ratio: '16:9', negative_prompt: 'blur, distort, and low quality', cfg_scale: 0.5 } : {}),
    ...(model.key === 'veo3' ? { duration: String(duration) } : {}),
  };

  const queueUpdateLogger = (update: any) => {
    if (update.status === 'IN_PROGRESS') {
      const messages = Array.isArray(update.logs) ? update.logs.map((log: any) => log.message).filter(Boolean) : [];
      if (messages.length > 0) {
        console.log(`[video] ${messages.join(' | ')}`);
      }
    }
  };

  let result: any;
  try {
    result = await fal.subscribe(model.modelId, {
      input: modelInput,
      logs: true,
      onQueueUpdate: queueUpdateLogger,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown FAL error');
    const isUnprocessable = message.toLowerCase().includes('unprocessable');
    if (isUnprocessable && model.key !== 'seedance') {
      console.warn(`[video] ${model.key} rejected model-specific payload. Retrying with minimal input.`);
      result = await fal.subscribe(model.modelId, {
        input: baseInput,
        logs: true,
        onQueueUpdate: queueUpdateLogger,
      });
    } else {
      throw new Error(`${model.label} generation failed: ${message}`);
    }
  }

  const videoUrl =
    (result as any)?.data?.video?.url
    || (result as any)?.data?.videos?.[0]?.url
    || (result as any)?.video?.url
    || '';

  if (!videoUrl) {
    throw new Error(`${model.label} generation returned no video URL`);
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

export const extractLastFrameFromVideo = async (args: {
  uploadsDir: string;
  videoUrl: string;
  outputFilename: string;
}) => {
  const source = String(args.videoUrl || '').trim();
  if (!source) {
    throw new Error('video URL is required for last-frame extraction');
  }

  const outputPath = join(args.uploadsDir, args.outputFilename);
  const inputSource = source.startsWith('/uploads/')
    ? join(args.uploadsDir, basename(source.split('?')[0]))
    : source;

  if (source.startsWith('/uploads/') && !existsSync(inputSource)) {
    throw new Error(`video source not found: ${inputSource}`);
  }

  const extract = Bun.spawn([
    'ffmpeg',
    '-y',
    '-loglevel', 'error',
    '-sseof', '-0.05',
    '-i', inputSource,
    '-frames:v', '1',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
    outputPath,
  ], { stderr: 'pipe' });

  const stderrText = extract.stderr ? await new Response(extract.stderr).text() : '';
  const exitCode = await extract.exited;
  if (exitCode !== 0) {
    throw new Error(`failed to extract last frame: ${stderrText.trim()}`);
  }

  return `/uploads/${args.outputFilename}`;
};
