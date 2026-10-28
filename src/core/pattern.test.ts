import { describe, expect, test } from 'vitest';
import { DEFAULT_MELODY, DEFAULT_RHYTHM, DEFAULT_STEP_COUNT } from './defaults.ts';
import { activeIndices, melodicPattern, parseRhythm, rotate, toggleStep } from './pattern.ts';
import type { Pattern } from './types.ts';

const toString = (p: Pattern) => p.steps.map((s) => (s.active ? 'x' : '.')).join('');

describe('rotate', () => {
  const p = parseRhythm('xx.x..');

  test('k = 0 returns the same sequence', () => {
    expect(toString(rotate(p, 0))).toBe('xx.x..');
  });

  test('positive k: step i of the result is step i + k of the original', () => {
    expect(toString(rotate(p, 1))).toBe('x.x..x');
    expect(toString(rotate(p, 2))).toBe('.x..xx');
  });

  test('negative k is normalized mod N', () => {
    expect(toString(rotate(p, -1))).toBe(toString(rotate(p, 5)));
    expect(toString(rotate(p, -7))).toBe(toString(rotate(p, 5)));
  });

  test('k = N and multiples return the original', () => {
    expect(toString(rotate(p, 6))).toBe('xx.x..');
    expect(toString(rotate(p, 18))).toBe('xx.x..');
  });

  test('melodicPattern turns null into a rest', () => {
    const m = melodicPattern(['C4', null, 'E4']);
    expect(m.steps).toEqual([{ active: true, pitch: 'C4' }, { active: false }, { active: true, pitch: 'E4' }]);
  });

  test('keeps pitches attached to their steps', () => {
    const m = melodicPattern(['C4', 'D4', 'E4']);
    expect(rotate(m, 1).steps.map((s) => s.pitch)).toEqual(['D4', 'E4', 'C4']);
  });

  test('does not mutate the input', () => {
    rotate(p, 3);
    expect(toString(p)).toBe('xx.x..');
  });

  test('empty pattern', () => {
    expect(rotate({ steps: [] }, 3).steps).toEqual([]);
  });

  test('rejects fractional k', () => {
    expect(() => rotate(p, 1.5)).toThrow(RangeError);
  });
});

describe('parseRhythm', () => {
  test('ignores whitespace', () => {
    expect(toString(parseRhythm('x x . x'))).toBe('xx.x');
  });

  test('rejects unknown characters', () => {
    expect(() => parseRhythm('x o x')).toThrow(SyntaxError);
  });
});

describe('toggleStep', () => {
  test('flips one step without mutating the pattern', () => {
    const pattern = parseRhythm('x..x');
    const toggled = toggleStep(pattern, 1);
    expect(toString(toggled)).toBe('xx.x');
    expect(toString(pattern)).toBe('x..x');
  });
});

describe('activeIndices', () => {
  test('lists active steps in order', () => {
    expect(activeIndices(parseRhythm('x.xx..x'))).toEqual([0, 2, 3, 6]);
  });
});

describe('defaults', () => {
  test('default patterns have 12 steps', () => {
    expect(DEFAULT_RHYTHM.steps).toHaveLength(DEFAULT_STEP_COUNT);
    expect(DEFAULT_MELODY.steps).toHaveLength(DEFAULT_STEP_COUNT);
  });

  test('default rhythm matches SPEC §8', () => {
    expect(toString(DEFAULT_RHYTHM)).toBe('xx.x..x.xx..');
  });

  test('default rhythm has no rotational symmetry', () => {
    const rotations = new Set(
      Array.from({ length: DEFAULT_STEP_COUNT }, (_, k) => toString(rotate(DEFAULT_RHYTHM, k))),
    );
    expect(rotations.size).toBe(DEFAULT_STEP_COUNT);
  });
});
