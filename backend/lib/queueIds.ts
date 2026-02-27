export const sanitizeQueueToken = (value: string) => {
  const normalized = String(value || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'queue';
};

export const buildQueueRunJobId = (queueType: 'scene-video' | 'storyboard-image' | 'final-film', jobId: string) => {
  return `${queueType}-${sanitizeQueueToken(jobId)}`;
};
