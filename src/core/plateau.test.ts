import { describe, expect, test } from 'vitest';
import { createPlateauSource, type PlateauOptions } from './plateau.ts';
import type { PulseContext } from './types.ts';

const N = 12;
const PULSE = 0.1;

/**
 * Runs a follower against a leader with a constant pulse, both starting at t = 0.
 * Returns the follower's phase (steps ahead of the leader) at each of its events.
 */
function simulate(options: Partial<PlateauOptions>, steps: number, startIndex = 0): number[] {
  const source = createPlateauSource({
    leader: 'A',
    difference: 0.01,
    plateauCycles: 8,
    stepsPerCycle: N,
    ...options,
  });
  const leaderTime = (index: number) => index * PULSE;
  let time = leaderTime(0);
  const phases: number[] = [];
  for (let index = startIndex; index < startIndex + steps; index++) {
    phases.push(index - time / PULSE);
    const ctx: PulseContext = {
      time,
      index,
      timeOf: (_, i) => leaderTime(i),
      indexAt: (_, t) => t / PULSE,
      pulseOf: () => PULSE,
    };
    const interval = source.next(ctx);
    expect(interval).toBeGreaterThan(0);
    time += interval;
  }
  return phases;
}

/** Lengths (in follower events) of the runs spent exactly on each integer offset. */
function plateaus(phases: number[]): { offset: number; length: number }[] {
  const runs: { offset: number; length: number }[] = [];
  for (const phase of phases) {
    const nearest = Math.round(phase);
    const locked = Math.abs(phase - nearest) < 1e-9;
    const last = runs[runs.length - 1];
    if (locked && last && last.offset === nearest) last.length++;
    else if (locked) runs.push({ offset: nearest, length: 1 });
  }
  return runs;
}

describe('createPlateauSource', () => {
  test('starts locked in unison, then climbs one step at a time', () => {
    const phases = simulate({ plateauCycles: 2 }, 1000);
    const runs = plateaus(phases);
    expect(runs.map((r) => r.offset)).toEqual(runs.map((_, i) => i));
    expect(runs.length).toBeGreaterThanOrEqual(5);
  });

  test('each plateau lasts exactly K cycles of the leader', () => {
    const phases = simulate({ plateauCycles: 3 }, 2000);
    const runs = plateaus(phases);
    // Last run may be cut short by the end of the simulation.
    for (const run of runs.slice(0, -1)) {
      // K cycles of intervals means K·N + 1 events on the same offset.
      expect(run.length).toBe(3 * N + 1);
    }
  });

  test('phase never decreases and never overshoots the next integer', () => {
    const phases = simulate({ difference: 0.05, plateauCycles: 1 }, 1000);
    for (let i = 1; i < phases.length; i++) {
      const previous = phases[i - 1]!;
      expect(phases[i]!).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(phases[i]!).toBeLessThanOrEqual(Math.floor(previous + 1e-9) + 1 + 1e-9);
    }
  });

  test('drift speed matches the tempo difference', () => {
    // With 1 % the follower needs ~100 leader steps to gain one step.
    const phases = simulate({ difference: 0.01, plateauCycles: 1 }, 400);
    const lastInUnison = phases.findLastIndex((p) => Math.abs(p) < 1e-9);
    const firstAtOne = phases.findIndex((p) => Math.abs(p - 1) < 1e-9);
    const driftEvents = firstAtOne - lastInUnison;
    expect(driftEvents).toBeGreaterThanOrEqual(100);
    expect(driftEvents).toBeLessThanOrEqual(102);
  });

  test('with zero difference it stays in unison', () => {
    const phases = simulate({ difference: 0, plateauCycles: 1 }, 300);
    phases.forEach((phase) => expect(phase).toBeCloseTo(0, 9));
  });

  test('picks up an existing fractional offset and drifts to the next integer', () => {
    // The follower's event index 5 happens at the leader's time for index 2.6.
    const source = createPlateauSource({
      leader: 'A',
      difference: 0.02,
      plateauCycles: 1,
      stepsPerCycle: N,
    });
    let time = 2.6 * PULSE;
    let index = 5;
    let phase = index - time / PULSE;
    for (let n = 0; n < 200 && Math.abs(phase - Math.round(phase)) > 1e-9; n++) {
      time += source.next({
        time,
        index,
        timeOf: (_, i) => i * PULSE,
        indexAt: (_, t) => t / PULSE,
        pulseOf: () => PULSE,
      });
      index++;
      phase = index - time / PULSE;
    }
    expect(phase).toBeCloseTo(3, 9);
  });

  test('rejects negative parameters', () => {
    const base = { leader: 'A' as const, stepsPerCycle: N };
    expect(() => createPlateauSource({ ...base, difference: -0.01, plateauCycles: 8 })).toThrow();
    expect(() => createPlateauSource({ ...base, difference: 0.01, plateauCycles: -1 })).toThrow();
  });
});
