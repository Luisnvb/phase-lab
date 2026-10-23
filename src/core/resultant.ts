import type { Pattern, ResultantCell } from './types.ts';

/** For each step, which voices sound there. Both patterns must have the same length. */
export function resultant(a: Pattern, b: Pattern): ResultantCell[] {
  if (a.steps.length !== b.steps.length) {
    throw new RangeError(
      `Patterns must have the same length (${a.steps.length} vs ${b.steps.length})`,
    );
  }
  return a.steps.map((stepA, i) => {
    const activeA = stepA.active;
    const activeB = b.steps[i]?.active ?? false;
    if (activeA && activeB) return 'both';
    if (activeA) return 'A';
    if (activeB) return 'B';
    return 'none';
  });
}
