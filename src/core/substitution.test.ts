import { describe, expect, test } from 'vitest';
import { fillOrder } from './fill-order.ts';
import { activeIndices, parseRhythm } from './pattern.ts';
import {
  completeOrder,
  createBuildProcess,
  partialPattern,
  type BuildProcessOptions,
} from './substitution.ts';

const target = parseRhythm('xx.x..x.xx..');
const toString = (steps: readonly { active: boolean }[]) =>
  steps.map((s) => (s.active ? 'x' : '.')).join('');

describe('partialPattern', () => {
  test('activates the first `count` steps of the order', () => {
    const order = fillOrder(target, 'ltr');
    expect(toString(partialPattern(target, order, 0).steps)).toBe('............');
    expect(toString(partialPattern(target, order, 2).steps)).toBe('xx..........');
    expect(toString(partialPattern(target, order, 6).steps)).toBe('xx.x..x.xx..');
  });

  test('follows a non-sequential order', () => {
    expect(toString(partialPattern(target, [9, 0, 3, 1, 6, 8], 2).steps)).toBe('x........x..');
  });

  test('only ever activates steps of the target', () => {
    const order = fillOrder(target, 'random', { seed: 3 });
    for (let count = 0; count <= 6; count++) {
      const active = activeIndices(partialPattern(target, order, count));
      expect(active).toHaveLength(count);
      active.forEach((i) => expect(target.steps[i]!.active).toBe(true));
    }
  });
});

describe('completeOrder', () => {
  test('keeps the chosen prefix and appends the rest left to right', () => {
    expect(completeOrder(target, [9, 3])).toEqual([9, 3, 0, 1, 6, 8]);
  });

  test('drops rests and repeated indices', () => {
    expect(completeOrder(target, [2, 9, 9, 0])).toEqual([9, 0, 1, 3, 6, 8]);
  });

  test('the result is valid for fillOrder custom', () => {
    const custom = completeOrder(target, [8]);
    expect(fillOrder(target, 'custom', { custom })).toEqual(custom);
  });
});

describe('createBuildProcess', () => {
  const base: BuildProcessOptions = { total: 4, repetitions: 2, direction: 'build', initialCount: 1 };

  function plan(options: BuildProcessOptions, cycles: number) {
    const process = createBuildProcess(options);
    const counts = [process.infoAt(0)!.count];
    for (let c = 0; c < cycles - 1; c++) counts.push(process.planNext(c));
    return { process, counts };
  }

  test('adds one beat every M cycles and holds when complete', () => {
    expect(plan(base, 10).counts).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 4, 4]);
  });

  test('unbuilding removes one beat every M cycles down to silence', () => {
    expect(plan({ ...base, direction: 'unbuild', initialCount: 4 }, 10).counts).toEqual([
      4, 4, 3, 3, 2, 2, 1, 1, 0, 0,
    ]);
  });

  test('changing direction moves on the next undecided cycle', () => {
    const process = createBuildProcess({ ...base, repetitions: 4 });
    expect(process.planNext(0)).toBe(1);
    process.setDirection('unbuild');
    expect(process.planNext(1)).toBe(0);
    process.setDirection('build');
    expect(process.planNext(2)).toBe(1);
    expect(process.planNext(3)).toBe(1);
  });

  test('infoAt reports count and repetition; planning is idempotent', () => {
    const { process } = plan(base, 5);
    expect(process.infoAt(3)).toEqual({ count: 2, repetition: 2 });
    expect(process.planNext(2)).toBe(2);
    expect(process.infoAt(10)).toBeNull();
  });

  test('a smaller target shrinks the count', () => {
    const process = createBuildProcess({ ...base, initialCount: 4 });
    process.configure({ total: 2 });
    expect(process.planNext(0)).toBe(2);
  });
});
