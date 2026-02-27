import { describe, expect, test } from 'bun:test';
import { buildQueueRunJobId, sanitizeQueueToken } from './queueIds';

describe('queue id helpers', () => {
  test('sanitizes arbitrary tokens to BullMQ-safe ids', () => {
    expect(sanitizeQueueToken('scene-video:abc/123')).toBe('scene-video-abc-123');
    expect(sanitizeQueueToken('')).toBe('queue');
  });

  test('builds queue run ids without colon characters', () => {
    const sceneJobId = buildQueueRunJobId('scene-video', 'f1a36bd4-7d9f-4845-b42f-fb2a5d4969fc');
    const storyboardJobId = buildQueueRunJobId('storyboard-image', 'job:with:colons');
    const finalFilmJobId = buildQueueRunJobId('final-film', 'startup-drain');

    expect(sceneJobId).toBe('scene-video-f1a36bd4-7d9f-4845-b42f-fb2a5d4969fc');
    expect(storyboardJobId).toBe('storyboard-image-job-with-colons');
    expect(finalFilmJobId).toBe('final-film-startup-drain');
    expect(sceneJobId.includes(':')).toBe(false);
    expect(storyboardJobId.includes(':')).toBe(false);
    expect(finalFilmJobId.includes(':')).toBe(false);
  });
});
