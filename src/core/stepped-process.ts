export type SteppedProcessOptions = {
  /** Pattern length N: stages run from 0 to N. */
  readonly steps: number;
  /** Cycles per stage in automatic mode (M). */
  readonly repetitions: number;
  /** Automatic advance every M cycles; otherwise only on `requestAdvance()`. */
  readonly auto: boolean;
  /** After stage N, start again from stage 1 instead of ending. */
  readonly loop: boolean;
};

export type StageInfo = {
  /** Offset of B in steps (0..N). */
  readonly stage: number;
  /** 1-based count of cycles played in this stage. */
  readonly repetition: number;
};

export type SteppedProcess = {
  configure(options: Partial<SteppedProcessOptions>): void;
  /** Move to the next stage at the next cycle not yet decided. */
  requestAdvance(): void;
  /**
   * Decides the stage of cycle `cycle + 1`, to be called when cycle `cycle`
   * starts being scheduled. Returns the stage, or null if the process ends there.
   * Calling it again for an already decided cycle returns the same answer.
   */
  planNext(cycle: number): number | null;
  /** Stage and repetition of a cycle already decided, or null once the process has ended. */
  stageAt(cycle: number): StageInfo | null;
  /** First cycle that is not played, once the end has been decided. */
  readonly endCycle: number | null;
};

/**
 * Stepped phasing (module 2): B plays the pattern shifted by `stage` steps, and
 * the stage grows by one every M cycles (or on demand) until it comes back to
 * unison at stage N. Stages always change on a cycle boundary.
 */
export function createSteppedProcess(initial: SteppedProcessOptions): SteppedProcess {
  let options = { ...initial };
  // Stage changes, in order: `stage` holds from `startCycle` on.
  const segments: { stage: number; startCycle: number }[] = [{ stage: 0, startCycle: 0 }];
  let endCycle: number | null = null;
  let decidedUpTo = 0;
  let advanceRequested = false;

  function stageAt(cycle: number): StageInfo | null {
    if (cycle < 0 || (endCycle !== null && cycle >= endCycle)) return null;
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i]!;
      if (segment.startCycle <= cycle) {
        return { stage: segment.stage, repetition: cycle - segment.startCycle + 1 };
      }
    }
    return null;
  }

  return {
    configure(changes) {
      options = { ...options, ...changes };
    },

    requestAdvance() {
      advanceRequested = true;
    },

    planNext(cycle) {
      const next = cycle + 1;
      if (next <= decidedUpTo || endCycle !== null) return stageAt(next)?.stage ?? null;
      decidedUpTo = next;

      const current = segments[segments.length - 1]!;
      const done = options.auto
        ? next - current.startCycle >= options.repetitions || advanceRequested
        : advanceRequested;
      if (!done) return current.stage;

      advanceRequested = false;
      if (current.stage < options.steps) {
        segments.push({ stage: current.stage + 1, startCycle: next });
        return current.stage + 1;
      }
      if (options.loop) {
        // Stage N is already unison again, so the next round starts at stage 1.
        segments.push({ stage: 1, startCycle: next });
        return 1;
      }
      endCycle = next;
      return null;
    },

    stageAt,

    get endCycle() {
      return endCycle;
    },
  };
}
