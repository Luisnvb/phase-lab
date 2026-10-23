import { describe, expect, test } from 'vitest';
import { fillOrder } from './fill-order.ts';
import { parseRhythm } from './pattern.ts';

const target = parseRhythm('xx.x..xx.x..');
const active = [0, 1, 3, 6, 7, 9];

describe('fillOrder', () => {
  test("'ltr' returns active steps left to right", () => {
    expect(fillOrder(target, 'ltr')).toEqual(active);
  });

  test("'random' is a permutation of the active steps", () => {
    const order = fillOrder(target, 'random', { seed: 42 });
    expect([...order].sort((a, b) => a - b)).toEqual(active);
  });

  test("'random' is deterministic for a given seed", () => {
    expect(fillOrder(target, 'random', { seed: 7 })).toEqual(
      fillOrder(target, 'random', { seed: 7 }),
    );
  });

  test("'random' changes with the seed", () => {
    const orders = new Set(
      [1, 2, 3, 4, 5].map((seed) => fillOrder(target, 'random', { seed }).join(',')),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  test("'custom' returns the given order", () => {
    const custom = [9, 0, 6, 3, 1, 7];
    expect(fillOrder(target, 'custom', { custom })).toEqual(custom);
  });

  test("'custom' rejects orders that are not a permutation of active steps", () => {
    expect(() => fillOrder(target, 'custom', { custom: [0, 1, 3] })).toThrow(RangeError);
    expect(() => fillOrder(target, 'custom', { custom: [0, 1, 2, 3, 6, 7] })).toThrow(RangeError);
    expect(() => fillOrder(target, 'custom', { custom: [0, 0, 3, 6, 7, 9] })).toThrow(RangeError);
  });

  test("'custom' without an order throws", () => {
    expect(() => fillOrder(target, 'custom')).toThrow(TypeError);
  });

  test('empty pattern yields an empty order', () => {
    expect(fillOrder(parseRhythm('....'), 'random', { seed: 1 })).toEqual([]);
  });
});
