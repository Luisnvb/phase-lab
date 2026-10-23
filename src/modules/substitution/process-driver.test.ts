import { describe, expect, test } from 'vitest';
import { rotate } from '../../core/pattern.ts';
import { createBuildProcess, partialPattern } from '../../core/substitution.ts';
import type { ScheduledEvent, VoiceId } from '../../core/types.ts';
import { createEngine } from '../../engine/engine.ts';
import { createFakeClock } from '../../engine/fake-clock.ts';
import { driveBuildProcess } from './process-driver.ts';
import { buildOrder, DEFAULT_SETTINGS, totalBeats, voiceConfig, type SubstitutionSettings } from './settings.ts';

const N = 12;
const M = 2;

async function run(settings: SubstitutionSettings, cycles: number, midway?: (p: ReturnType<typeof createBuildProcess>) => void) {
  const fake = createFakeClock();
  const engine = createEngine({ clock: fake.clock, timer: fake.timer });
  const process = createBuildProcess({
    total: totalBeats(settings.target),
    repetitions: M,
    direction: 'build',
    initialCount: 1,
  });
  for (const voice of ['A', 'B'] as const) engine.setVoice(voiceConfig(settings, voice, 1));
  engine.setPatternOffset('B', settings.offset);
  const events: ScheduledEvent[] = [];
  engine.on('step', (e) => events.push(e));
  driveBuildProcess(engine, process, N, (voice, count) => voiceConfig(settings, voice, count));
  await engine.start();

  const cycleSeconds = N * (60 / settings.bpm / 4);
  if (midway) {
    fake.advance((cycles / 2) * cycleSeconds);
    midway(process);
    fake.advance((cycles / 2) * cycleSeconds);
  } else {
    fake.advance(cycles * cycleSeconds);
  }

  const cycleOf = (voice: VoiceId, cycle: number) =>
    events.filter((e) => e.voice === voice && e.cycleIndex === cycle).map((e) => e.active);
  return { process, cycleOf };
}

const expected = (settings: SubstitutionSettings, count: number, shift = 0) =>
  rotate(partialPattern(settings.target, buildOrder(settings), count), shift).steps.map((s) => s.active);

describe('substitution (module 3)', () => {
  test('beats are added one by one every M cycles, in fillOrder order, until complete', async () => {
    const settings = { ...DEFAULT_SETTINGS, orderMode: 'random' as const, seed: 5 };
    const { process, cycleOf } = await run(settings, 16);
    const total = totalBeats(settings.target);
    for (let cycle = 0; cycle < 15; cycle++) {
      const count = Math.min(total, 1 + Math.floor(cycle / M));
      expect(process.infoAt(cycle)?.count).toBe(count);
      expect(cycleOf('A', cycle)).toEqual(expected(settings, count));
    }
  });

  test('unbuilding removes beats in reverse order', async () => {
    const settings = DEFAULT_SETTINGS;
    const { process, cycleOf } = await run(settings, 12, (p) => p.setDirection('unbuild'));
    const counts = Array.from({ length: 11 }, (_, c) => process.infoAt(c)!.count);
    // Builds up to 3-4 beats, then goes back down, one beat per change.
    const peak = Math.max(...counts);
    expect(counts.indexOf(peak)).toBeGreaterThan(0);
    expect(counts[counts.length - 1]).toBeLessThan(peak);
    for (let c = 1; c < counts.length; c++) {
      expect(Math.abs(counts[c]! - counts[c - 1]!)).toBeLessThanOrEqual(1);
      expect(cycleOf('A', c)).toEqual(expected(settings, counts[c]!));
    }
  });

  test('with two voices, B plays the same partial pattern shifted by the offset', async () => {
    const settings = { ...DEFAULT_SETTINGS, twoVoices: true, offset: 3 };
    const { process, cycleOf } = await run(settings, 10);
    for (let cycle = 0; cycle < 9; cycle++) {
      const count = process.infoAt(cycle)!.count;
      expect(cycleOf('B', cycle)).toEqual(expected(settings, count, 3));
      expect(cycleOf('A', cycle)).toEqual(expected(settings, count));
    }
  });
});
