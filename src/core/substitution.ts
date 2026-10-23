import { activeIndices } from './pattern.ts';
import type { Pattern } from './types.ts';

/**
 * The target pattern with only the first `count` steps of `order` active:
 * what sounds after `count` substitutions of rests by beats.
 */
export function partialPattern(target: Pattern, order: readonly number[], count: number): Pattern {
  const active = new Set(order.slice(0, Math.max(0, count)));
  return { steps: target.steps.map((step, i) => ({ ...step, active: active.has(i) })) };
}

/**
 * A full order from a custom prefix: the steps chosen so far, then the
 * remaining active steps of the target from left to right. Indices that are
 * not active in the target, or repeated, are dropped.
 */
export function completeOrder(target: Pattern, prefix: readonly number[]): number[] {
  const active = activeIndices(target);
  const allowed = new Set(active);
  const chosen: number[] = [];
  for (const index of prefix) {
    if (allowed.delete(index)) chosen.push(index);
  }
  return [...chosen, ...active.filter((index) => allowed.has(index))];
}

export type BuildDirection = 'build' | 'unbuild';

export type BuildProcessOptions = {
  /** Beats in the full target pattern. */
  readonly total: number;
  /** Cycles between two substitutions (M). */
  readonly repetitions: number;
  readonly direction: BuildDirection;
  /** Beats in the first cycle. */
  readonly initialCount: number;
};

export type BuildInfo = {
  /** Beats sounding in that cycle. */
  readonly count: number;
  /** 1-based count of cycles played with that many beats. */
  readonly repetition: number;
};

export type BuildProcess = {
  configure(options: Partial<Pick<BuildProcessOptions, 'total' | 'repetitions'>>): void;
  /** Changes direction; the next undecided cycle already moves one beat that way. */
  setDirection(direction: BuildDirection): void;
  readonly direction: BuildDirection;
  /**
   * Number of beats for cycle `cycle + 1`, to be called once cycle `cycle` is
   * (being) scheduled. Calling it again for a decided cycle gives the same answer.
   */
  planNext(cycle: number): number;
  infoAt(cycle: number): BuildInfo | null;
};

/**
 * Construction by substitution (module 3): every M cycles one more rest of an
 * empty cycle is replaced by a beat of the target pattern, until it is complete;
 * unbuilding removes them in reverse order. It holds at the full pattern and at
 * silence until the direction changes.
 */
export function createBuildProcess(initial: BuildProcessOptions): BuildProcess {
  let options = { ...initial };
  const clamp = (count: number) => Math.min(options.total, Math.max(0, count));
  const segments: { count: number; startCycle: number }[] = [
    { count: clamp(initial.initialCount), startCycle: 0 },
  ];
  let decidedUpTo = 0;
  let moveNow = false;

  function infoAt(cycle: number): BuildInfo | null {
    if (cycle < 0 || cycle > decidedUpTo) return null;
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i]!;
      if (segment.startCycle <= cycle) {
        return { count: segment.count, repetition: cycle - segment.startCycle + 1 };
      }
    }
    return null;
  }

  return {
    configure(changes) {
      options = { ...options, ...changes };
    },

    setDirection(direction) {
      if (direction !== options.direction) moveNow = true;
      options = { ...options, direction };
    },

    get direction() {
      return options.direction;
    },

    planNext(cycle) {
      const next = cycle + 1;
      if (next <= decidedUpTo) return infoAt(next)!.count;
      decidedUpTo = next;

      const current = segments[segments.length - 1]!;
      const step = options.direction === 'build' ? 1 : -1;
      const target = clamp(current.count + step);
      const due = moveNow || next - current.startCycle >= options.repetitions;
      // A target edited to fewer beats also shrinks what sounds.
      const count = due ? target : clamp(current.count);
      moveNow = false;
      if (count !== current.count) segments.push({ count, startCycle: next });
      return count;
    },

    infoAt,
  };
}
