import { describe, expect, test } from 'vitest';
import { parseRhythm } from '../core/pattern.ts';
import type { Pattern, ScheduledEvent, VoiceConfig, VoiceId } from '../core/types.ts';
import { onCycleBoundary } from './cycle-boundary.ts';
import { createEngine } from './engine.ts';
import { createFakeClock } from './fake-clock.ts';

const config = (id: VoiceId, pattern: Pattern): VoiceConfig => ({
  id,
  pattern,
  pulseDuration: 0.1,
  instrument: 'click',
  gain: 1,
  pan: 0,
});

describe('onCycleBoundary', () => {
  test('a pattern set in the callback applies from the next cycle, for each voice', async () => {
    const fake = createFakeClock();
    const engine = createEngine({ clock: fake.clock, timer: fake.timer });
    engine.setVoice(config('A', parseRhythm('xxxx')));
    engine.setVoice(config('B', parseRhythm('xxxx')));
    const events: ScheduledEvent[] = [];
    engine.on('step', (e) => events.push(e));

    // Silence from cycle 2 on, decided at each voice's own boundary.
    const calls: [VoiceId, number][] = [];
    onCycleBoundary(engine, 4, (voice, nextCycle) => {
      calls.push([voice, nextCycle]);
      if (nextCycle === 2) engine.setVoice(config(voice, parseRhythm('....')));
    });
    await engine.start();
    fake.advance(1.3);

    for (const voice of ['A', 'B'] as const) {
      const active = (cycle: number) =>
        events.filter((e) => e.voice === voice && e.cycleIndex === cycle).map((e) => e.active);
      expect(active(1)).toEqual([true, true, true, true]);
      expect(active(2)).toEqual([false, false, false, false]);
    }
    expect(calls.slice(0, 4)).toEqual([
      ['A', 1],
      ['B', 1],
      ['A', 2],
      ['B', 2],
    ]);
  });

  test('a longer pattern set at the boundary starts a new cycle, not the rest of the old one', async () => {
    const fake = createFakeClock();
    const engine = createEngine({ clock: fake.clock, timer: fake.timer });
    let length = 2;
    engine.setVoice(config('A', parseRhythm('x.')));
    const events: ScheduledEvent[] = [];
    engine.on('step', (e) => events.push(e));
    onCycleBoundary(
      engine,
      () => length,
      () => {
        length++;
        engine.setVoice(config('A', parseRhythm('x' + '.'.repeat(length - 1))));
      },
    );
    await engine.start();
    fake.advance(1.5);

    const lengths = [0, 1, 2, 3].map((c) => events.filter((e) => e.cycleIndex === c).length);
    expect(lengths).toEqual([2, 3, 4, 5]);
    // Each cycle opens with its active first step.
    expect(events.filter((e) => e.stepIndex === 0).every((e) => e.active)).toBe(true);
  });
});
