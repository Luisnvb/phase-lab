import { describe, expect, test } from 'vitest';
import { parseRhythm, rotate } from './pattern.ts';
import { resultant } from './resultant.ts';

describe('resultant', () => {
  test('classifies each step', () => {
    const a = parseRhythm('xx..');
    const b = parseRhythm('x.x.');
    expect(resultant(a, b)).toEqual(['both', 'A', 'B', 'none']);
  });

  test('unison: every active step is "both"', () => {
    const a = parseRhythm('x.xx');
    expect(resultant(a, a)).toEqual(['both', 'none', 'both', 'both']);
  });

  test('works with a rotated copy', () => {
    const a = parseRhythm('xx.x..');
    expect(resultant(a, rotate(a, 1))).toEqual(['both', 'A', 'B', 'A', 'none', 'B']);
  });

  test('rejects patterns of different lengths', () => {
    expect(() => resultant(parseRhythm('xx'), parseRhythm('xxx'))).toThrow(RangeError);
  });
});
