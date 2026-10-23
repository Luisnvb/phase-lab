import { describe, expect, test } from 'vitest';
import { parseRhythm, rotate } from './pattern.ts';
import { resultant, stageMatrix } from './resultant.ts';

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

describe('stageMatrix', () => {
  const pattern = parseRhythm('xx.x');

  test('has N + 1 rows of N cells', () => {
    const matrix = stageMatrix(pattern);
    expect(matrix).toHaveLength(5);
    matrix.forEach((row) => expect(row).toHaveLength(4));
  });

  test('row k is the resultant against rotate(pattern, k); first and last rows are unison', () => {
    const matrix = stageMatrix(pattern);
    expect(matrix[1]).toEqual(resultant(pattern, rotate(pattern, 1)));
    expect(matrix[0]).toEqual(['both', 'both', 'none', 'both']);
    expect(matrix[4]).toEqual(matrix[0]);
  });
});
