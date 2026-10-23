import { describe, expect, test } from 'vitest';
import { accentsFor } from './accents.ts';

describe('accentsFor', () => {
  test.each([
    [3, [0, 3, 6, 9]],
    [4, [0, 4, 8]],
    [2, [0, 2, 4, 6, 8, 10]],
    [6, [0, 6]],
  ])('12 steps in groups of %i', (groupSize, expected) => {
    expect(accentsFor(12, groupSize)).toEqual(expected);
  });

  test('group size that does not divide n', () => {
    expect(accentsFor(12, 5)).toEqual([0, 5, 10]);
  });

  test('empty cycle', () => {
    expect(accentsFor(0, 3)).toEqual([]);
  });

  test('rejects invalid arguments', () => {
    expect(() => accentsFor(12, 0)).toThrow(RangeError);
    expect(() => accentsFor(12, 1.5)).toThrow(RangeError);
    expect(() => accentsFor(-1, 3)).toThrow(RangeError);
  });
});
