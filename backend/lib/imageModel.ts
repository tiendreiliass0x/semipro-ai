export type ImageModelKey = 'fal' | 'flux' | 'grok';

type ImageModelEntry = {
  key: ImageModelKey;
  label: string;
  provider: 'fal' | 'xai';
  modelId: string;
};

const MODELS: Record<ImageModelKey, ImageModelEntry> = {
  fal: {
    key: 'fal',
    label: 'Nano Banana Pro',
    provider: 'fal',
    modelId: process.env.FAL_IMAGE_MODEL || 'fal-ai/nano-banana-pro',
  },
  flux: {
    key: 'flux',
    label: 'FAL Flux',
    provider: 'fal',
    modelId: process.env.FAL_IMAGE_MODEL_FLUX || 'fal-ai/flux-pro/kontext/text-to-image',
  },
  grok: {
    key: 'grok',
    label: 'Grok Image',
    provider: 'xai',
    modelId: process.env.XAI_IMAGE_MODEL || 'grok-2-image',
  },
};

export const IMAGE_MODEL_OPTIONS = [
  { key: 'fal', label: 'Nano Banana Pro' },
  { key: 'flux', label: 'FAL Flux' },
  { key: 'grok', label: 'Grok Image' },
] as const;

export const resolveImageModel = (inputKey?: string): ImageModelEntry => {
  const normalized = String(inputKey || 'fal').trim().toLowerCase() as ImageModelKey;
  return MODELS[normalized] || MODELS.fal;
};
