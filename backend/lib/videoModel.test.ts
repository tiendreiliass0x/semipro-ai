import { describe, expect, test } from 'bun:test';
import { resolveVideoModel } from './videoModel';

describe('video model resolver', () => {
  test('falls back to seedance when model key is unknown', () => {
    const result = resolveVideoModel('unknown-model');
    expect(result.key).toBe('seedance');
    expect(result.modelId.length).toBeGreaterThan(0);
  });

  test('returns seedance for empty key', () => {
    const result = resolveVideoModel('');
    expect(result.key).toBe('seedance');
  });
});
