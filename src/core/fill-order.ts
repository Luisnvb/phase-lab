import { activeIndices } from './pattern.ts';
import { seededRandom, shuffle } from './random.ts';
import type { FillOrderMode, Pattern } from './types.ts';

export type FillOrderOptions = {
  /** Seed for `'random'`. Without it a random seed is drawn. */
  readonly seed?: number;
  /** Order for `'custom'`: a permutation of the pattern's active indices. */
  readonly custom?: readonly number[];
};

/**
 * Order in which the rests of an empty cycle are replaced by the target
 * pattern's beats (module 3). Returns the active step indices of `pattern`.
 */
export function fillOrder(
  pattern: Pattern,
  mode: FillOrderMode,
  options: FillOrderOptions = {},
): number[] {
  const active = activeIndices(pattern);
  switch (mode) {
    case 'ltr':
      return active;
    case 'random': {
      const seed = options.seed ?? Math.floor(Math.random() * 2 ** 32);
      return shuffle(active, seededRandom(seed));
    }
    case 'custom': {
      const custom = options.custom;
      if (!custom) throw new TypeError("Mode 'custom' requires options.custom");
      const sorted = [...custom].sort((x, y) => x - y);
      const isPermutation =
        sorted.length === active.length && sorted.every((value, i) => value === active[i]);
      if (!isPermutation) {
        throw new RangeError(
          `Custom order [${custom.join(', ')}] is not a permutation of the active steps [${active.join(', ')}]`,
        );
      }
      return [...custom];
    }
  }
}
