import type { PulseContext, PulseSource, VoiceId } from './types.ts';

export type PlateauOptions = {
  /** Voice whose grid the follower locks to. */
  readonly leader: VoiceId;
  /** Relative tempo difference while drifting, e.g. 0.01 for 1 %. */
  readonly difference: number;
  /** Cycles of the leader spent locked at each integer offset. */
  readonly plateauCycles: number;
  readonly stepsPerCycle: number;
};

// Offsets this close to an integer count as already locked.
const EPSILON = 1e-6;

/**
 * Pulse source for the "plateau" mode of continuous phasing: the follower
 * stays locked k steps ahead of the leader for a number of cycles, then speeds
 * up until it is exactly k + 1 steps ahead, locks again, and so on.
 *
 * Every interval is computed from the leader's actual event times, so the
 * follower lands exactly on the grid even if the leader's tempo changes.
 * The first call picks up whatever offset the voices currently have.
 */
export function createPlateauSource(options: PlateauOptions): PulseSource {
  const { leader, difference, plateauCycles, stepsPerCycle } = options;
  if (!(difference >= 0)) throw new RangeError(`difference must be >= 0, got ${difference}`);
  if (!(plateauCycles >= 0)) {
    throw new RangeError(`plateauCycles must be >= 0, got ${plateauCycles}`);
  }
  const plateauSteps = Math.round(plateauCycles * stepsPerCycle);

  type State =
    | { kind: 'init' }
    | { kind: 'plateau'; offset: number; stepsLeft: number }
    | { kind: 'drift'; offset: number };
  let state: State = { kind: 'init' };

  /** Interval that puts the follower's next event `offset` steps ahead of the leader. */
  function lockedInterval(ctx: PulseContext, offset: number): number {
    return ctx.timeOf(leader, ctx.index + 1 - offset) - ctx.time;
  }

  function drift(ctx: PulseContext, offset: number): number {
    const natural = ctx.pulseOf(leader) / (1 + difference);
    // The leader event the follower must coincide with to be offset + 1 steps ahead.
    const target = ctx.timeOf(leader, ctx.index - offset);
    if (ctx.time + natural <= target + EPSILON) {
      // The landing interval itself does not count towards the plateau.
      state = { kind: 'plateau', offset: offset + 1, stepsLeft: plateauSteps + 1 };
      return plateau(ctx);
    }
    return natural;
  }

  function plateau(ctx: PulseContext): number {
    if (state.kind !== 'plateau') throw new Error('Not in a plateau');
    if (state.stepsLeft <= 0) {
      const { offset } = state;
      state = { kind: 'drift', offset };
      return drift(ctx, offset);
    }
    state.stepsLeft--;
    return lockedInterval(ctx, state.offset);
  }

  return {
    next(ctx) {
      if (state.kind === 'init') {
        const phase = ctx.index - ctx.indexAt(leader, ctx.time);
        const nearest = Math.round(phase);
        state =
          Math.abs(phase - nearest) < EPSILON
            ? { kind: 'plateau', offset: nearest, stepsLeft: plateauSteps }
            : { kind: 'drift', offset: Math.floor(phase) };
      }
      return state.kind === 'plateau' ? plateau(ctx) : drift(ctx, state.offset);
    },
    reset() {
      state = { kind: 'init' };
    },
  };
}
