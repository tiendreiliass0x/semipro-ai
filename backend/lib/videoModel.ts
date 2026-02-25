export type VideoModelKey = 'seedance' | 'kling' | 'veo3';

type ModelEntry = {
  key: VideoModelKey;
  label: string;
  modelId: string;
};

const MODEL_CONFIG: Record<VideoModelKey, ModelEntry> = {
  seedance: {
    key: 'seedance',
    label: 'Seedance',
    modelId: process.env.FAL_VIDEO_MODEL_SEEDANCE || process.env.FAL_VIDEO_MODEL || 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
  },
  kling: {
    key: 'kling',
    label: 'Kling',
    modelId: process.env.FAL_VIDEO_MODEL_KLING || 'fal-ai/kling-video/o3/pro/image-to-video',
  },
  veo3: {
    key: 'veo3',
    label: 'Veo 3',
    modelId: process.env.FAL_VIDEO_MODEL_VEO3 || '',
  },
};

export const VIDEO_MODEL_OPTIONS = [
  { key: 'seedance', label: 'Seedance' },
  { key: 'kling', label: 'Kling' },
  { key: 'veo3', label: 'Veo 3' },
] as const;

export const resolveVideoModel = (inputKey?: string): ModelEntry => {
  const normalized = String(inputKey || 'seedance').trim().toLowerCase() as VideoModelKey;
  const entry = MODEL_CONFIG[normalized] || MODEL_CONFIG.seedance;
  if (!entry.modelId) {
    throw new Error(`${entry.label} model is not configured on server`);
  }
  return entry;
};
