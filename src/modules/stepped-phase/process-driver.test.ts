import { describe, expect, test } from 'vitest';
import { DEFAULT_RHYTHM } from '../../core/defaults.ts';
import { rotate } from '../../core/pattern.ts';
import {
  createSteppedProcess,
  type SteppedProcess,
  type SteppedProcessOptions,
} from '../../core/stepped-process.ts';
import type { ScheduledEvent, VoiceId } from '../../core/types.ts';
import { createEngine } from '../../engine/engine.ts';
import { createFakeClock } from '../../engine/fake-clock.ts';
import { driveSteppedProcess } from './process-driver.ts';

const N = DEFAULT_RHYTHM.steps.length;
const PULSE = 0.1;

async function runProcess(
  options: Partial<SteppedProcessOptions>,
  seconds: number,
  midway?: { at: number; action: (process: SteppedProcess) => void },
) {
  const fake = createFakeClock();
  const engine = createEngine({ clock: fake.clock, timer: fake.timer });
  for (const id of ['A', 'B'] as const) {
    engine.setVoice({
      id,
      pattern: DEFAULT_RHYTHM,
      pulseDuration: PULSE,
      instrument: 'click',
      gain: 1,
      pan: 0,
    });
  }
  const process = createSteppedProcess({ steps: N, repetitions: 2, auto: true, loop: false, ...options });
  const events: ScheduledEvent[] = [];
  engine.on('step', (e) => events.push(e));
  driveSteppedProcess(engine, process, N);
  await engine.start();
  if (midway) {
    fake.advance(midway.at);
    midway.action(process);
    fake.advance(seconds - midway.at);
  } else {
    fake.advance(seconds);
  }

  /** Active flags of a voice's cycle, as played. */
  const cycleOf = (voice: VoiceId, cycle: number) =>
    events.filter((e) => e.voice === voice && e.cycleIndex === cycle).map((e) => e.active);
  const cycles = (voice: VoiceId) =>
    new Set(events.filter((e) => e.voice === voice).map((e) => e.cycleIndex)).size;
  return { process, events, cycleOf, cycles };
}

const activeOf = (k: number) => rotate(DEFAULT_RHYTHM, k).steps.map((s) => s.active);
const totalCycles = (N + 1) * 2;
const enough = (totalCycles + 3) * N * PULSE;

describe('stepped phase (module 2 criteria)', () => {
  test('in stage k, B plays exactly rotate(A, k), and every cycle is whole', async () => {
    const { process, cycleOf } = await runProcess({}, enough);
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const stage = process.stageAt(cycle)!.stage;
      expect(stage).toBe(Math.floor(cycle / 2));
      // A whole cycle with a single rotation: the change happens on the boundary.
      expect(cycleOf('B', cycle)).toEqual(activeOf(stage));
      expect(cycleOf('A', cycle)).toEqual(activeOf(0));
    }
  });

  test('after stage N both voices are in unison and the process ends', async () => {
    const { process, cycleOf, cycles } = await runProcess({}, enough);
    expect(process.endCycle).toBe(totalCycles);
    expect(cycleOf('B', totalCycles - 1)).toEqual(cycleOf('A', totalCycles - 1));
    // Nothing is scheduled after the end, and no cycle is cut.
    expect(cycles('A')).toBe(totalCycles);
    expect(cycles('B')).toBe(totalCycles);
    expect(cycleOf('A', totalCycles - 1)).toHaveLength(N);
    expect(cycleOf('B', totalCycles - 1)).toHaveLength(N);
  });

  test('with loop it goes on from stage 1 after stage N', async () => {
    const { process, cycleOf } = await runProcess({ loop: true }, enough);
    expect(process.endCycle).toBeNull();
    expect(cycleOf('B', totalCycles)).toEqual(activeOf(1));
  });

  test('manual advance waits for the request and changes on the next boundary', async () => {
    const cycleSeconds = N * PULSE;
    // Requested in the middle of cycle 2.
    const { process, cycleOf } = await runProcess({ auto: false }, 5 * cycleSeconds, {
      at: 2.5 * cycleSeconds,
      action: (p) => p.requestAdvance(),
    });
    expect(cycleOf('B', 2)).toEqual(activeOf(0));
    expect(process.stageAt(3)?.stage).toBe(1);
    expect(cycleOf('B', 3)).toEqual(activeOf(1));
    expect(cycleOf('B', 4)).toEqual(activeOf(1));
  });
});
