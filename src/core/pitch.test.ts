import { describe, expect, test } from 'vitest';
import { DEFAULT_CHORD, DEFAULT_MELODY_PITCHES } from './defaults.ts';
import { chromaticRange, EDITABLE_PITCHES } from './pitch.ts';

describe('pitches', () => {
  test('chromaticRange covers whole octaves and the top C', () => {
    const range = chromaticRange(4, 5);
    expect(range).toHaveLength(13);
    expect(range[0]).toBe('C4');
    expect(range[1]).toBe('C#4');
    expect(range.at(-1)).toBe('C5');
  });

  test('the editors can show the default melody and chord', () => {
    for (const pitch of [...DEFAULT_MELODY_PITCHES, ...DEFAULT_CHORD]) {
      expect(EDITABLE_PITCHES).toContain(pitch);
    }
  });
});
