import { describe, expect, test } from 'vitest';
import { mod } from './math.ts';

describe('mod', () => {
  test('positive and negative values', () => {
    expect(mod(7, 12)).toBe(7);
    expect(mod(12, 12)).toBe(0);
    expect(mod(-1, 12)).toBe(11);
    expect(mod(-13, 12)).toBe(11);
  });

  test('fractional values', () => {
    expect(mod(-0.5, 12)).toBeCloseTo(11.5);
  });

  test('never returns -0', () => {
    expect(Object.is(mod(-12, 12), 0)).toBe(true);
  });
});
