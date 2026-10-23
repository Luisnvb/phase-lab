import { assertInteger } from './math.ts';
import type { Pattern } from './types.ts';

/**
 * Accented step indices of an n-step cycle grouped in `groupSize`:
 * the first step of every group. `accentsFor(12, 3)` → `[0, 3, 6, 9]`.
 */
export function accentsFor(n: number, groupSize: number): number[] {
  assertInteger(n, 'n');
  assertInteger(groupSize, 'groupSize');
  if (n < 0) throw new RangeError(`n must be non-negative, got ${n}`);
  if (groupSize < 1) throw new RangeError(`groupSize must be at least 1, got ${groupSize}`);

  const accents: number[] = [];
  for (let i = 0; i < n; i += groupSize) accents.push(i);
  return accents;
}

export const ACCENT_VELOCITY = 1;
export const UNACCENTED_VELOCITY = 0.35;

/**
 * The same beats with velocities for a grouping: the first step of each group
 * is accented. Only loudness changes, never which steps sound.
 */
export function accentPattern(pattern: Pattern, groupSize: number): Pattern {
  const accents = new Set(accentsFor(pattern.steps.length, groupSize));
  return {
    steps: pattern.steps.map((step, i) => ({
      ...step,
      velocity: accents.has(i) ? ACCENT_VELOCITY : UNACCENTED_VELOCITY,
    })),
  };
}
