import { describe, expect, test } from 'bun:test';
import { evaluateSceneContinuation } from './sceneContinuation';

describe('scene continuation evaluator', () => {
  test('disables regeneration recommendations when continuation mode is off', () => {
    const result = evaluateSceneContinuation({
      continuationMode: 'off',
      hasAnchor: false,
      directorLayer: '',
      cinematographerLayer: '',
      threshold: 0.9,
    });

    expect(result.score).toBe(1);
    expect(result.recommendRegenerate).toBe(false);
  });

  test('recommends regeneration when strict mode has no anchor and weak prompts', () => {
    const result = evaluateSceneContinuation({
      continuationMode: 'strict',
      hasAnchor: false,
      directorLayer: 'short',
      cinematographerLayer: 'thin',
      threshold: 0.75,
    });

    expect(result.score).toBeLessThan(0.75);
    expect(result.recommendRegenerate).toBe(true);
    expect(result.reason).toContain('Add an anchor scene frame');
  });

  test('does not recommend regeneration when loose mode has anchor and rich prompts', () => {
    const result = evaluateSceneContinuation({
      continuationMode: 'loose',
      hasAnchor: true,
      directorLayer: 'Actor motivation and emotional tempo with clear movement arcs across the whole shot.',
      cinematographerLayer: '50mm lens feel, motivated dolly push, practical key light continuity and soft fill ratio stability.',
      threshold: 0.75,
    });

    expect(result.score).toBeGreaterThanOrEqual(0.75);
    expect(result.recommendRegenerate).toBe(false);
    expect(result.reason).toContain('meets threshold');
  });
});
