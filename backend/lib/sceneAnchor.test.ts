import { describe, expect, test } from 'bun:test';
import { resolveSceneAnchor } from './sceneAnchor';

describe('scene anchor resolver', () => {
  test('uses current scene frame when continuation is off', () => {
    const result = resolveSceneAnchor({
      continuationMode: 'off',
      currentSceneImageUrl: '/uploads/current.png',
      previousSceneBeatId: 'beat-1',
      previousClipLastFrameUrl: '/uploads/prev-last-frame.jpg',
    });

    expect(result.anchorSource).toBe('continuation-off-current-scene-frame');
    expect(result.anchorBeatId).toBe('');
    expect(result.sourceImageUrl).toBe('/uploads/current.png');
  });

  test('uses previous clip last frame for non-first scene', () => {
    const result = resolveSceneAnchor({
      continuationMode: 'strict',
      currentSceneImageUrl: '/uploads/current.png',
      previousSceneBeatId: 'beat-1',
      previousSceneImageUrl: '/uploads/prev-storyboard.png',
      previousClipLastFrameUrl: '/uploads/prev-last-frame.jpg',
    });

    expect(result.anchorSource).toBe('previous-clip-last-frame');
    expect(result.anchorBeatId).toBe('beat-1');
    expect(result.sourceImageUrl).toBe('/uploads/prev-last-frame.jpg');
  });

  test('manual anchor overrides previous clip frame', () => {
    const result = resolveSceneAnchor({
      continuationMode: 'strict',
      currentSceneImageUrl: '/uploads/current.png',
      previousSceneBeatId: 'beat-1',
      previousClipLastFrameUrl: '/uploads/prev-last-frame.jpg',
      manualAnchorBeatId: 'beat-2',
      manualAnchorImageUrl: '/uploads/manual-anchor.png',
    });

    expect(result.anchorSource).toBe('manual-anchor-scene');
    expect(result.anchorBeatId).toBe('beat-2');
    expect(result.sourceImageUrl).toBe('/uploads/manual-anchor.png');
  });

  test('first scene falls back to current scene frame', () => {
    const result = resolveSceneAnchor({
      continuationMode: 'strict',
      currentSceneImageUrl: '/uploads/current.png',
    });

    expect(result.anchorSource).toBe('current-scene-frame');
    expect(result.anchorBeatId).toBe('');
    expect(result.sourceImageUrl).toBe('/uploads/current.png');
  });
});
