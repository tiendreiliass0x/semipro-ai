export type VideoProvider = 'fal' | 'runway';
export type VideoModelKey = 'seedance' | 'kling' | 'veo3' | 'gen4_turbo';

type DurationConstraint = {
  min: number;
  max: number;
  snap?: number[];
  format: 'string' | 'integer';
};

export type VideoModelConfig = {
  key: VideoModelKey;
  label: string;
  provider: VideoProvider;
  modelId: string;
  charLimit: number;
  duration: DurationConstraint;
  aspectRatio: string;
  needsImageNormalization: boolean;
  buildProviderInput: (args: { prompt: string; imageUrl: string; duration: number | string }) => Record<string, unknown>;
  errorRetry?: (error: any) => { shouldRetry: boolean; patchInput?: Record<string, unknown> };
};

const MODEL_CONFIG: Record<VideoModelKey, VideoModelConfig> = {
  seedance: {
    key: 'seedance',
    label: 'Seedance',
    provider: 'fal',
    modelId: process.env.FAL_VIDEO_MODEL_SEEDANCE || process.env.FAL_VIDEO_MODEL || 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
    charLimit: 1500,
    duration: { min: 4, max: 10, format: 'string' },
    aspectRatio: '16:9',
    needsImageNormalization: false,
    buildProviderInput: ({ prompt, imageUrl, duration }) => ({
      prompt,
      image_url: imageUrl,
      resolution: '720p',
      duration: String(duration),
    }),
  },

  kling: {
    key: 'kling',
    label: 'Kling',
    provider: 'fal',
    modelId: process.env.FAL_VIDEO_MODEL_KLING || 'fal-ai/kling-video/o3/pro/image-to-video',
    charLimit: 1300,
    duration: { min: 4, max: 10, format: 'integer' },
    aspectRatio: '16:9',
    needsImageNormalization: true,
    buildProviderInput: ({ prompt, imageUrl, duration }) => {
      const id = process.env.FAL_VIDEO_MODEL_KLING || 'fal-ai/kling-video/o3/pro/image-to-video';
      const imageKey = id.includes('/v3/') ? 'start_image_url' : 'image_url';
      return {
        prompt,
        [imageKey]: imageUrl,
        duration: Number(duration),
        aspect_ratio: '16:9',
        negative_prompt: 'blur, distort, and low quality',
        cfg_scale: 0.5,
      };
    },
  },

  veo3: {
    key: 'veo3',
    label: 'Veo 3',
    provider: 'fal',
    modelId: process.env.FAL_VIDEO_MODEL_VEO3 || '',
    charLimit: 1000,
    duration: { min: 4, max: 8, snap: [4, 6, 8], format: 'string' },
    aspectRatio: '16:9',
    needsImageNormalization: false,
    buildProviderInput: ({ prompt, imageUrl, duration }) => ({
      prompt,
      image_url: imageUrl,
      duration: `${duration}s`,
      aspect_ratio: '16:9',
      auto_fix: true,
    }),
    errorRetry: (error: any) => {
      const body = error?.body || error?.response?.body || null;
      const errorType = Array.isArray(body?.detail) ? body.detail[0]?.type : '';
      if (errorType === 'no_media_generated') {
        return { shouldRetry: true, patchInput: { safety_tolerance: 5 } };
      }
      return { shouldRetry: false };
    },
  },

  gen4_turbo: {
    key: 'gen4_turbo',
    label: 'Runway Gen-4 Turbo',
    provider: 'runway',
    modelId: 'gen4_turbo',
    charLimit: 1000,
    duration: { min: 2, max: 10, format: 'integer' },
    aspectRatio: '1280:720',
    needsImageNormalization: false,
    buildProviderInput: ({ prompt, imageUrl, duration }) => ({
      model: 'gen4_turbo',
      promptText: prompt,
      promptImage: imageUrl,
      ratio: '1280:720',
      duration: Number(duration),
    }),
  },
};

export const VIDEO_MODEL_OPTIONS = Object.values(MODEL_CONFIG).map(m => ({
  key: m.key,
  label: m.label,
}));

export const resolveVideoModel = (inputKey?: string): VideoModelConfig => {
  const normalized = String(inputKey || 'seedance').trim().toLowerCase() as VideoModelKey;
  const entry = MODEL_CONFIG[normalized] || MODEL_CONFIG.seedance;
  if (!entry.modelId) {
    throw new Error(`${entry.label} model is not configured on server`);
  }
  return entry;
};

export const resolveModelDuration = (config: VideoModelConfig, rawSeconds: number): number | string => {
  const clamped = Math.round(Math.max(config.duration.min, Math.min(config.duration.max, rawSeconds)));
  if (config.duration.snap) {
    const snapped = config.duration.snap.reduce((prev, curr) =>
      Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev
    );
    return config.duration.format === 'string' ? String(snapped) : snapped;
  }
  return config.duration.format === 'string' ? String(clamped) : clamped;
};
