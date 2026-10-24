import { describe, expect, test } from 'vitest';
import { createAugmentationProcess } from '../../core/augmentation.ts';
import type { ScheduledEvent, Step } from '../../core/types.ts';
import { createEngine } from '../../engine/engine.ts';
import { createFakeClock } from '../../engine/fake-clock.ts';
import { driveAugmentation } from './process-driver.ts';
import { chordConfig, DEFAULT_SETTINGS, pulseConfig } from './settings.ts';

describe('augmentation (module 5)', () => {
  test('notes get longer each cycle, the pulse never changes, and both stop together', async () => {
    const settings = { ...DEFAULT_SETTINGS, mode: 'pulses' as const, pulses: 3, size: 3 };
    const process = createAugmentationProcess({
      size: settings.size,
      mode: settings.mode,
      amount: settings.pulses,
      minimum: 4,
      maximum: 12,
    });
    const fake = createFakeClock();
    const played: { event: ScheduledEvent; step: Step }[] = [];
    const engine = createEngine({
      clock: fake.clock,
      timer: fake.timer,
      play: (event, step) => played.push({ event, step }),
    });
    engine.setVoice(chordConfig(settings, process.cycleAt(0)!));
    engine.setVoice(pulseConfig(settings));
    driveAugmentation(engine, process, (cycle) => chordConfig(settings, cycle));
    await engine.start();
    fake.advance(10);

    // Lengths 1, 4, 7, 10: cycles of 4, 6, 9, 12 pulses; the next (15) would not fit.
    expect(process.endCycle).toBe(4);
    const chord = played.filter((p) => p.event.voice === 'A');
    for (let cycle = 0; cycle < 4; cycle++) {
      const notes = chord.filter((p) => p.event.cycleIndex === cycle);
      expect(notes.map((p) => p.event.stepIndex)).toEqual([0, 1, 2]);
      expect(notes.map((p) => p.step.length)).toEqual([1, 1, 1].map((l) => l + 3 * cycle));
    }
    expect(chord.some((p) => p.event.cycleIndex >= 4)).toBe(false);

    // The pulse plays every pulse, at the same rate, until the chord's last cycle ends.
    const pulses = played.filter((p) => p.event.voice === 'B');
    expect(pulses).toHaveLength(4 + 6 + 9 + 12);
    const gaps = pulses.slice(1).map((p, i) => p.event.time - pulses[i]!.event.time);
    gaps.forEach((gap) => expect(gap).toBeCloseTo(pulses[1]!.event.time - pulses[0]!.event.time, 9));

    // Each chord cycle starts on a pulse.
    const pulseTimes = new Set(pulses.map((p) => p.event.time.toFixed(9)));
    chord
      .filter((p) => p.event.stepIndex === 0)
      .forEach((p) => expect(pulseTimes.has(p.event.time.toFixed(9))).toBe(true));
  });
});
