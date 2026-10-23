import { assertInteger, mod } from './math.ts';
import type { Pattern, Step } from './types.ts';

/**
 * Shifts a pattern k steps: `rotate(p, k).steps[i] === p.steps[(i + k) mod N]`.
 * A positive k makes the result run k steps ahead of the original.
 */
export function rotate(pattern: Pattern, k: number): Pattern {
  assertInteger(k, 'k');
  const n = pattern.steps.length;
  if (n === 0) return { steps: [] };
  const shift = mod(k, n);
  return { steps: [...pattern.steps.slice(shift), ...pattern.steps.slice(0, shift)] };
}

/**
 * Parses rhythmic notation where `x` is an active step and `.` a rest,
 * e.g. `'x x . x . . x x . x . .'`. Whitespace is ignored.
 */
export function parseRhythm(notation: string): Pattern {
  const steps: Step[] = [];
  for (const char of notation.replace(/\s+/g, '')) {
    if (char === 'x') steps.push({ active: true });
    else if (char === '.') steps.push({ active: false });
    else throw new SyntaxError(`Unexpected character "${char}" in rhythm "${notation}"`);
  }
  return { steps };
}

/** Builds a pattern where every step is active and carries a pitch, e.g. `['D4', 'A4']`. */
export function melodicPattern(pitches: readonly string[]): Pattern {
  return { steps: pitches.map((pitch) => ({ active: true, pitch })) };
}

/** Active step indices in ascending order. */
export function activeIndices(pattern: Pattern): number[] {
  const indices: number[] = [];
  pattern.steps.forEach((step, i) => {
    if (step.active) indices.push(i);
  });
  return indices;
}
