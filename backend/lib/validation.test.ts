import { describe, expect, test } from 'bun:test';
import { validateStorylinesPayload } from './validation';

describe('validateStorylinesPayload', () => {
  const validStoryline = {
    id: 'line-1',
    title: 'Test',
    description: 'A test storyline',
    style: 'cinematic',
    tone: 'dramatic',
    openingLine: 'Once upon a time',
    closingLine: 'The end',
    tags: ['drama'],
    timeframe: { start: '2020', end: '2024', years: [2020, 2021] },
    beats: [
      {
        id: 'beat-1',
        summary: 'Something happens',
        voiceover: 'Narration text',
        intensity: 75,
      },
    ],
  };

  test('returns no errors for valid payload', () => {
    expect(validateStorylinesPayload([validStoryline])).toEqual([]);
  });

  test('rejects non-array input', () => {
    const errors = validateStorylinesPayload('not an array');
    expect(errors).toContain('storylines must be an array');
  });

  test('reports missing required string fields', () => {
    const errors = validateStorylinesPayload([{ beats: [], tags: [], timeframe: { start: '2020', end: '2024', years: [] } }]);
    expect(errors.some(e => e.includes('.id'))).toBe(true);
    expect(errors.some(e => e.includes('.title'))).toBe(true);
  });

  test('reports invalid timeframe', () => {
    const errors = validateStorylinesPayload([{ ...validStoryline, timeframe: 'bad' }]);
    expect(errors.some(e => e.includes('timeframe'))).toBe(true);
  });

  test('validates beat fields', () => {
    const errors = validateStorylinesPayload([{
      ...validStoryline,
      beats: [{ id: 123, summary: null, voiceover: 'ok', intensity: 'not a number' }],
    }]);
    expect(errors.some(e => e.includes('beats[0].id'))).toBe(true);
    expect(errors.some(e => e.includes('beats[0].summary'))).toBe(true);
    expect(errors.some(e => e.includes('beats[0].intensity'))).toBe(true);
  });

  test('validates connection fields when present', () => {
    const errors = validateStorylinesPayload([{
      ...validStoryline,
      beats: [{ ...validStoryline.beats[0], connection: { type: 123, label: null } }],
    }]);
    expect(errors.some(e => e.includes('connection.type'))).toBe(true);
    expect(errors.some(e => e.includes('connection.label'))).toBe(true);
  });
});
