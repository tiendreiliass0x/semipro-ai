import { fal } from '@fal-ai/client';
import { basename, extname, join } from 'path';
import { existsSync, rmSync } from 'fs';
import type { VideoModelConfig } from './videoModel';
import { resolveModelDuration } from './videoModel';

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || '';
if (FAL_KEY) {
  fal.config({ credentials: FAL_KEY });
}

export type GenerateVideoArgs = {
  model: VideoModelConfig;
  uploadsDir: string;
  sourceImageUrl: string;
  prompt: string;
  durationSeconds: number;
};

// ---------------------------------------------------------------------------
// Image URL resolution
// ---------------------------------------------------------------------------

const uploadFileToFal = async (localPath: string) => {
  const sourceFile = Bun.file(localPath);
  const buffer = await sourceFile.arrayBuffer();
  const file = new File([buffer], basename(localPath), { type: sourceFile.type || 'image/jpeg' });
  return await fal.storage.upload(file);
};

const normalizeImageFrame = async (uploadsDir: string, inputPath: string) => {
  const outputPath = join(uploadsDir, `normalized-frame-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  const proc = Bun.spawn([
    'ffmpeg', '-y', '-loglevel', 'error', '-i', inputPath,
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
    '-frames:v', '1', outputPath,
  ], { stderr: 'pipe' });

  const stderrText = proc.stderr ? await new Response(proc.stderr).text() : '';
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`failed to normalize source frame: ${stderrText.trim()}`);
  }
  return outputPath;
};

const downloadRemoteImage = async (uploadsDir: string, url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`failed to download source image (${response.status})`);
  const arrayBuffer = await response.arrayBuffer();
  const extension = extname(url.split('?')[0] || '') || '.jpg';
  const localPath = join(uploadsDir, `remote-source-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
  await Bun.write(localPath, Buffer.from(arrayBuffer));
  return localPath;
};

const resolveImageUrl = async (args: {
  uploadsDir: string;
  sourceImageUrl: string;
  needsNormalization: boolean;
  uploadToFal: boolean;
}): Promise<string> => {
  const source = String(args.sourceImageUrl || '').trim();
  if (!source) throw new Error('source image URL is missing');

  // Remote URL that doesn't need normalization or FAL upload → use directly
  if (!args.needsNormalization && !args.uploadToFal && (source.startsWith('http://') || source.startsWith('https://'))) {
    return source;
  }

  // FAL models that don't need normalization can use remote URLs directly
  if (!args.needsNormalization && args.uploadToFal && (source.startsWith('http://') || source.startsWith('https://'))) {
    return source;
  }

  if (!source.startsWith('/uploads/') && !source.startsWith('http://') && !source.startsWith('https://')) {
    throw new Error(`unsupported source image URL format: ${source}`);
  }

  const tempPaths: string[] = [];
  try {
    const sourcePath = source.startsWith('/uploads/')
      ? join(args.uploadsDir, basename(source.split('?')[0]))
      : await downloadRemoteImage(args.uploadsDir, source);

    if (!existsSync(sourcePath)) throw new Error(`source image not found: ${sourcePath}`);
    if (source.startsWith('http://') || source.startsWith('https://')) tempPaths.push(sourcePath);

    if (args.needsNormalization) {
      const normalizedPath = await normalizeImageFrame(args.uploadsDir, sourcePath);
      tempPaths.push(normalizedPath);
      return args.uploadToFal ? await uploadFileToFal(normalizedPath) : normalizedPath;
    }

    return args.uploadToFal ? await uploadFileToFal(sourcePath) : sourcePath;
  } finally {
    tempPaths.forEach(path => {
      try { if (existsSync(path)) rmSync(path, { force: true }); } catch { /* ignore */ }
    });
  }
};

// ---------------------------------------------------------------------------
// FAL adapter
// ---------------------------------------------------------------------------

const extractFalVideoUrl = (result: any, label: string): string => {
  const videoUrl =
    result?.data?.video?.url
    || result?.data?.videos?.[0]?.url
    || result?.video?.url
    || '';
  if (!videoUrl) throw new Error(`${label} generation returned no video URL`);
  return videoUrl;
};

const formatFalError = (model: VideoModelConfig, error: any): Error => {
  const body = error?.body || error?.response?.body || null;
  const detail = body ? ` | body: ${JSON.stringify(body).slice(0, 500)}` : '';
  const message = (error instanceof Error ? error.message : String(error || 'Unknown FAL error')) + detail;
  return new Error(`${model.label} generation failed: ${message}`);
};

const generateWithFal = async (args: GenerateVideoArgs): Promise<string> => {
  if (!FAL_KEY) throw new Error('FAL_KEY is not configured');

  const duration = resolveModelDuration(args.model, args.durationSeconds);
  const imageUrl = await resolveImageUrl({
    uploadsDir: args.uploadsDir,
    sourceImageUrl: args.sourceImageUrl,
    needsNormalization: args.model.needsImageNormalization,
    uploadToFal: true,
  });

  const prompt = String(args.prompt || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const input = args.model.buildProviderInput({ prompt, imageUrl, duration });

  const queueUpdateLogger = (update: any) => {
    if (update.status === 'IN_PROGRESS') {
      const messages = Array.isArray(update.logs) ? update.logs.map((log: any) => log.message).filter(Boolean) : [];
      if (messages.length > 0) console.log(`[video] ${messages.join(' | ')}`);
    }
  };

  let result: any;
  try {
    result = await fal.subscribe(args.model.modelId, { input, logs: true, onQueueUpdate: queueUpdateLogger });
  } catch (error: any) {
    if (args.model.errorRetry) {
      const retry = args.model.errorRetry(error);
      if (retry.shouldRetry) {
        console.warn(`[video] ${args.model.key} error retry triggered`);
        try {
          result = await fal.subscribe(args.model.modelId, {
            input: { ...input, ...retry.patchInput },
            logs: true,
            onQueueUpdate: queueUpdateLogger,
          });
        } catch (retryError: any) {
          throw formatFalError(args.model, retryError);
        }
      } else {
        throw formatFalError(args.model, error);
      }
    } else {
      throw formatFalError(args.model, error);
    }
  }

  return extractFalVideoUrl(result, args.model.label);
};

// ---------------------------------------------------------------------------
// Runway adapter
// ---------------------------------------------------------------------------

const generateWithRunway = async (args: GenerateVideoArgs): Promise<string> => {
  const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY || '';
  if (!RUNWAY_API_KEY) throw new Error('RUNWAY_API_KEY is not configured');

  const duration = resolveModelDuration(args.model, args.durationSeconds);
  const imageUrl = await resolveImageUrl({
    uploadsDir: args.uploadsDir,
    sourceImageUrl: args.sourceImageUrl,
    needsNormalization: args.model.needsImageNormalization,
    uploadToFal: false,
  });

  const prompt = String(args.prompt || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const body = args.model.buildProviderInput({ prompt, imageUrl, duration });

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${RUNWAY_API_KEY}`,
    'X-Runway-Version': '2024-11-06',
    'Content-Type': 'application/json',
  };

  // Create task
  const createRes = await fetch('https://api.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Runway task creation failed (${createRes.status}): ${errText.slice(0, 500)}`);
  }
  const { id: taskId } = (await createRes.json()) as { id: string };
  console.log(`[video] Runway task created: ${taskId}`);

  // Poll for completion
  const maxPollMs = 10 * 60 * 1000;
  const pollIntervalMs = 5000;
  const deadline = Date.now() + maxPollMs;

  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    const pollRes = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, { headers });
    if (!pollRes.ok) throw new Error(`Runway poll failed (${pollRes.status})`);

    const task = (await pollRes.json()) as { status: string; output?: string[]; failure?: string };

    if (task.status === 'SUCCEEDED') {
      const videoUrl = task.output?.[0];
      if (!videoUrl) throw new Error('Runway task succeeded but returned no output URL');
      return videoUrl;
    }

    if (task.status === 'FAILED') {
      throw new Error(`Runway generation failed: ${task.failure || 'unknown error'}`);
    }

    console.log(`[video] Runway task ${taskId} status: ${task.status}`);
  }

  throw new Error(`Runway generation timed out after ${maxPollMs / 1000}s`);
};

// ---------------------------------------------------------------------------
// Provider registry & entry point
// ---------------------------------------------------------------------------

const PROVIDERS: Record<string, (args: GenerateVideoArgs) => Promise<string>> = {
  fal: generateWithFal,
  runway: generateWithRunway,
};

export const generateSceneVideo = async (args: GenerateVideoArgs): Promise<string> => {
  const adapter = PROVIDERS[args.model.provider];
  if (!adapter) throw new Error(`Unknown video provider: ${args.model.provider}`);

  const startedAt = Date.now();
  console.log(`[video] ${args.model.provider} scene generation started (model: ${args.model.key} -> ${args.model.modelId})`);

  const videoUrl = await adapter(args);

  console.log(`[video] ${args.model.provider} scene generation completed in ${Date.now() - startedAt}ms`);
  return videoUrl;
};
