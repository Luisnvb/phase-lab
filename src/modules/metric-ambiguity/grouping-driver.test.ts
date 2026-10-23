import { describe, expect, test } from 'vitest';
import { accentsFor } from '../../core/accents.ts';
import { createCycleHistory } from '../../core/cycle-history.ts';
import type { ScheduledEvent, Step, VoiceId } from '../../core/types.ts';
import { createEngine } from '../../engine/engine.ts';
import { createFakeClock } from '../../engine/fake-clock.ts';
import { driveGroupings } from './grouping-driver.ts';
import { DEFAULT_SETTINGS, groupFor, voiceConfig, type MetricSettings } from './settings.ts';

const N = 12;

async function run(changes: { atCycle: number; settings: Partial<MetricSettings> }[], cycles: number) {
  let settings: MetricSettings = { ...DEFAULT_SETTINGS, twoVoices: true };
  const fake = createFakeClock();
  const played: { event: ScheduledEvent; step: Step }[] = [];
  const engine = createEngine({
    clock: fake.clock,
    timer: fake.timer,
    play: (event, step) => played.push({ event, step }),
  });
  const histories = {
    A: createCycleHistory(groupFor(settings, 'A')),
    B: createCycleHistory(groupFor(settings, 'B')),
  };
  for (const voice of ['A', 'B'] as const) engine.setVoice(voiceConfig(settings, voice));
  driveGroupings(
    engine,
    N,
    (voice) => ({ config: voiceConfig(settings, voice), grouping: groupFor(settings, voice) }),
    histories,
  );
  await engine.start();

  const cycleSeconds = N * (60 / settings.bpm / 4);
  let elapsed = 0;
  for (const change of changes) {
    // Halfway through the cycle, to check nothing changes mid-cycle.
    const at = (change.atCycle + 0.5) * cycleSeconds;
    fake.advance(at - elapsed);
    elapsed = at;
    settings = { ...settings, ...change.settings };
  }
  fake.advance(cycles * cycleSeconds - elapsed);

  const accentedIn = (voice: VoiceId, cycle: number) =>
    played
      .filter((p) => p.event.voice === voice && p.event.cycleIndex === cycle && p.step.velocity === 1)
      .map((p) => p.event.stepIndex);
  const beatsIn = (voice: VoiceId, cycle: number) =>
    played.filter((p) => p.event.voice === voice && p.event.cycleIndex === cycle).length;
  return { histories, accentedIn, beatsIn };
}

describe('metric ambiguity (module 4)', () => {
  test('changing the grouping only moves the accents, from the next cycle', async () => {
    const { histories, accentedIn, beatsIn } = await run(
      [{ atCycle: 1, settings: { groupA: 4 } }],
      4,
    );
    expect(accentedIn('A', 0)).toEqual(accentsFor(N, 3));
    expect(accentedIn('A', 1)).toEqual(accentsFor(N, 3));
    expect(accentedIn('A', 2)).toEqual(accentsFor(N, 4));
    for (let cycle = 0; cycle < 3; cycle++) expect(beatsIn('A', cycle)).toBe(N);
    expect([0, 1, 2, 3].map((c) => histories.A.valueAt(c))).toEqual([3, 3, 4, 4]);
  });

  test('two voices keep their own groupings over the same beats', async () => {
    const { accentedIn, beatsIn } = await run([{ atCycle: 0, settings: { groupB: 2 } }], 3);
    expect(accentedIn('A', 1)).toEqual(accentsFor(N, 3));
    expect(accentedIn('B', 0)).toEqual(accentsFor(N, 4));
    expect(accentedIn('B', 1)).toEqual(accentsFor(N, 2));
    expect(beatsIn('B', 1)).toBe(beatsIn('A', 1));
  });
});
