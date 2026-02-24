import { describe, expect, test } from 'bun:test';
import { resolveImageModel } from './imageModel';

describe('image model resolver', () => {
  test('falls back to fal for unknown key', () => {
    const model = resolveImageModel('unknown');
    expect(model.key).toBe('fal');
    expect(model.provider).toBe('fal');
  });

  test('resolves grok image key', () => {
    const model = resolveImageModel('grok');
    expect(model.key).toBe('grok');
    expect(model.provider).toBe('xai');
  });
});
