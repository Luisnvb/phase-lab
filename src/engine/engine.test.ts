import { describe, expect, test } from 'vitest';
import { DEFAULT_PULSE_DURATION, DEFAULT_RHYTHM } from '../core/defaults.ts';
import { parseRhythm, rotate } from '../core/pattern.ts';
import { phaseOffset, positionAt } from '../core/phase.ts';
import { createPlateauSource } from '../core/plateau.ts';
import type { Pattern, ScheduledEvent, VoiceConfig, VoiceId } from '../core/types.ts';
import { createEngine, type Engine, type EngineOptions } from './engine.ts';
import { createFakeClock } from './fake-clock.ts';
import { eventsAround } from './timeline.ts';

function voice(id: VoiceId, pattern: Pattern, pulseDuration: number): VoiceConfig {
  return { id, pattern, pulseDuration, instrument: 'click', gain: 1, pan: 0 };
}

function setup(options: Partial<EngineOptions> = {}) {
  const fake = createFakeClock();
  const played: { event: ScheduledEvent; scheduledAt: number }[] = [];
  const events: ScheduledEvent[] = [];
  const engine = createEngine({
    clock: fake.clock,
    timer: fake.timer,
    play: (event) => played.push({ event, scheduledAt: fake.clock() }),
    ...options,
  });
  engine.on('step', (e) => events.push(e));
  const ofVoice = (id: VoiceId) => events.filter((e) => e.voice === id);
  return { fake, engine, played, events, ofVoice };
}

describe('scheduling', () => {
  test('events follow the pulse duration from the start delay', async () => {
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('A', parseRhythm('x.xx'), 0.1));
    await engine.start();
    fake.advance(1);

    const a = ofVoice('A');
    expect(a.slice(0, 6).map((e) => [e.stepIndex, e.cycleIndex])).toEqual([
      [0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1],
    ]);
    a.forEach((e, n) => expect(e.time).toBeCloseTo(0.05 + n * 0.1, 9));
  });

  test('only active steps reach the sink; all steps reach the queue', async () => {
    const { fake, engine, played, ofVoice } = setup();
    engine.setVoice(voice('A', parseRhythm('x.xx'), 0.1));
    await engine.start();
    fake.advance(0.6);

    expect(ofVoice('A').map((e) => e.active)).toEqual([true, false, true, true, true, false, true]);
    expect(played.map((p) => p.event.stepIndex)).toEqual([0, 2, 3, 0, 2]);
  });

  test('every event is scheduled ahead of time, within the lookahead window', async () => {
    const { fake, engine, played } = setup();
    engine.setVoice(voice('A', DEFAULT_RHYTHM, 0.07));
    engine.setVoice(voice('B', DEFAULT_RHYTHM, 0.069));
    await engine.start();
    fake.advance(20);

    // ~285 steps per voice in 20 s, half of them active.
    expect(played.length).toBeGreaterThan(250);
    for (const { event, scheduledAt } of played) {
      expect(event.time).toBeGreaterThanOrEqual(scheduledAt);
      expect(event.time - scheduledAt).toBeLessThan(0.1);
    }
  });

  test("a 'cycle' event is emitted at step 0 of every cycle", async () => {
    const { fake, engine } = setup();
    const cycles: number[] = [];
    engine.on('cycle', (e) => cycles.push(e.cycleIndex));
    engine.setVoice(voice('A', parseRhythm('xxx'), 0.1));
    await engine.start();
    fake.advance(1);
    expect(cycles).toEqual([0, 1, 2, 3]);
  });

  test('listeners can be removed', async () => {
    const { fake, engine } = setup();
    const seen: ScheduledEvent[] = [];
    const off = engine.on('step', (e) => seen.push(e));
    off();
    engine.setVoice(voice('A', parseRhythm('xxx'), 0.1));
    await engine.start();
    fake.advance(1);
    expect(seen).toEqual([]);
  });
});

describe('continuous phase (module 1 criterion)', () => {
  test('with a 1 % difference and N = 12, B is a full cycle ahead after 100 cycles of A', async () => {
    const pulse = DEFAULT_PULSE_DURATION;
    const n = DEFAULT_RHYTHM.steps.length;
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('A', DEFAULT_RHYTHM, pulse));
    engine.setVoice(voice('B', DEFAULT_RHYTHM, pulse / 1.01));
    await engine.start();

    // Sample the phase as a visualization would, once per simulated second.
    const totalSeconds = 100 * n * pulse + 1;
    for (let elapsed = 0; elapsed < totalSeconds; elapsed += 1) {
      fake.advance(1);
      const now = engine.now();
      const recent = eventsAround(engine, now);
      const posA = positionAt(recent, 'A', now, n);
      const posB = positionAt(recent, 'B', now, n);
      expect(posA).not.toBeNull();
      expect(posB).not.toBeNull();
      if (posA === null || posB === null) continue;
      // B gains 1 % of A's progress.
      const expected = phaseOffset(0, posA * 0.01, n);
      const measured = phaseOffset(posA, posB, n);
      const error = Math.min(Math.abs(measured - expected), n - Math.abs(measured - expected));
      expect(error).toBeLessThan(1e-6);
    }

    const a = ofVoice('A');
    const b = ofVoice('B');
    const a100 = a.find((e) => e.cycleIndex === 100 && e.stepIndex === 0)!;
    const b101 = b.find((e) => e.cycleIndex === 101 && e.stepIndex === 0)!;
    expect(a100).toBeDefined();
    expect(b101).toBeDefined();
    // B starts its 102nd cycle exactly when A starts its 101st: back in unison, one cycle ahead.
    expect(Math.abs(b101.time - a100.time)).toBeLessThan(1e-9);
  });

  test('positions do not drift after 5 minutes', async () => {
    const pulse = DEFAULT_PULSE_DURATION;
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('A', DEFAULT_RHYTHM, pulse));
    await engine.start();
    fake.advance(300);

    const a = ofVoice('A');
    const last = a[a.length - 1]!;
    const index = last.cycleIndex * 12 + last.stepIndex;
    expect(Math.abs(last.time - (0.05 + index * pulse))).toBeLessThan(1e-9);
  });
});

describe('plateau phase (module 1 criterion)', () => {
  const n = DEFAULT_RHYTHM.steps.length;
  const K = 8;

  /** Samples the displayed offset every 10 ms, as the visualization would. */
  async function samplePlateaus(
    seconds: number,
    onSample?: (elapsed: number, engine: Engine) => void,
  ) {
    const { fake, engine } = setup();
    engine.setVoice(voice('A', DEFAULT_RHYTHM, DEFAULT_PULSE_DURATION));
    engine.setVoice(voice('B', DEFAULT_RHYTHM, DEFAULT_PULSE_DURATION));
    engine.setPulseSource(
      'B',
      createPlateauSource({ leader: 'A', difference: 0.01, plateauCycles: K, stepsPerCycle: n }),
    );
    await engine.start();

    const samples: { time: number; offset: number }[] = [];
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.01) {
      fake.advance(0.01);
      onSample?.(elapsed, engine);
      const now = engine.now();
      const recent = eventsAround(engine, now);
      const posA = positionAt(recent, 'A', now, n);
      const posB = positionAt(recent, 'B', now, n);
      if (elapsed > 0.1) expect(posA !== null && posB !== null).toBe(true);
      if (posA !== null && posB !== null) samples.push({ time: now, offset: posB - posA });
    }
    return { engine, samples };
  }

  /** Time spans during which the offset stays within `tolerance` of the same integer. */
  function lockedSpans(samples: { time: number; offset: number }[], tolerance: number) {
    const spans: { offset: number; from: number; to: number }[] = [];
    for (const { time, offset } of samples) {
      const nearest = Math.round(offset);
      const locked = Math.abs(offset - nearest) <= tolerance;
      const last = spans[spans.length - 1];
      if (locked && last && last.offset === nearest && last.to >= time - 0.011) last.to = time;
      else if (locked) spans.push({ offset: nearest, from: time, to: time });
    }
    return spans.filter((s) => s.to - s.from > 0.5);
  }

  test('the offset stops on integer values (±0.02) for K cycles, climbing one step each time', async () => {
    const cycleSeconds = n * DEFAULT_PULSE_DURATION;
    // Each round: K cycles locked + ~8.3 cycles drifting at 1 %.
    const { samples } = await samplePlateaus(4 * (K + 9) * cycleSeconds);

    // Within the SPEC tolerance, and in fact exact (the voices' events coincide).
    for (const tolerance of [0.02, 1e-6]) {
      const plateaus = lockedSpans(samples, tolerance);
      expect(plateaus.map((p) => p.offset).slice(0, 4)).toEqual([0, 1, 2, 3]);
      for (const plateau of plateaus.slice(0, -1)) {
        expect(plateau.to - plateau.from).toBeGreaterThanOrEqual(K * cycleSeconds - 0.02);
      }
    }
  });

  test('landing stays exact when the tempo changes during a drift', async () => {
    const cycleSeconds = n * DEFAULT_PULSE_DURATION;
    let changed = false;
    const { samples } = await samplePlateaus(3 * (K + 9) * cycleSeconds, (elapsed, engine) => {
      // Halfway through the first drift, speed both voices up by 10 %.
      if (!changed && elapsed > (K + 4) * cycleSeconds) {
        engine.setPulseDuration('A', DEFAULT_PULSE_DURATION / 1.1);
        engine.setPulseDuration('B', DEFAULT_PULSE_DURATION / 1.1);
        changed = true;
      }
    });
    expect(changed).toBe(true);

    const plateaus = lockedSpans(samples, 1e-6);
    expect(plateaus.map((p) => p.offset).slice(0, 2)).toEqual([0, 1]);
    // The second plateau runs entirely at the new tempo.
    const second = plateaus[1]!;
    expect(second.to - second.from).toBeGreaterThanOrEqual((K * cycleSeconds) / 1.1 - 0.02);
  });
});

describe('hot changes', () => {
  test('a tempo change affects only events not yet scheduled', async () => {
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('A', parseRhythm('xxxx'), 0.1));
    await engine.start();
    fake.advance(0.3);
    const scheduledBefore = ofVoice('A').length;
    engine.setPulseDuration('A', 0.2);
    fake.advance(1);

    const a = ofVoice('A');
    const gaps = a.slice(1).map((e, i) => e.time - a[i]!.time);
    gaps.slice(0, scheduledBefore - 1).forEach((gap) => expect(gap).toBeCloseTo(0.1, 9));
    gaps.slice(scheduledBefore).forEach((gap) => expect(gap).toBeCloseTo(0.2, 9));
  });

  test('a pattern offset is applied at the next cycle boundary, never mid-cycle', async () => {
    const pattern = parseRhythm('xx.x..');
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('B', pattern, 0.1));
    await engine.start();
    fake.advance(0.2); // in the middle of cycle 0
    engine.setPatternOffset('B', 2);
    fake.advance(1.5);

    const b = ofVoice('B');
    const activeOf = (cycle: number) =>
      b.filter((e) => e.cycleIndex === cycle).map((e) => e.active);
    const expectedRotated = rotate(pattern, 2).steps.map((s) => s.active);
    expect(activeOf(0)).toEqual(pattern.steps.map((s) => s.active));
    expect(activeOf(1)).toEqual(expectedRotated);
    expect(activeOf(2)).toEqual(expectedRotated);
  });

  test('an offset set before start applies from the first event', async () => {
    const pattern = parseRhythm('xx.x..');
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('B', pattern, 0.1));
    engine.setPatternOffset('B', -1);
    await engine.start();
    fake.advance(0.5);
    expect(ofVoice('B').map((e) => e.active)).toEqual(rotate(pattern, -1).steps.map((s) => s.active));
  });

  test('replacing the pattern takes effect from the next unscheduled step', async () => {
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('A', parseRhythm('xxxx'), 0.1));
    await engine.start();
    fake.advance(0.15);
    const before = ofVoice('A').length;
    engine.setVoice(voice('A', parseRhythm('....'), 0.1));
    fake.advance(0.5);
    const a = ofVoice('A');
    expect(a.slice(0, before).every((e) => e.active)).toBe(true);
    expect(a.slice(before).every((e) => !e.active)).toBe(true);
  });
});

describe('setEndCycle', () => {
  test('the voice plays no cycle from the end cycle on', async () => {
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('A', parseRhythm('xxx'), 0.1));
    engine.setEndCycle('A', 2);
    await engine.start();
    fake.advance(2);
    expect(ofVoice('A').map((e) => e.cycleIndex)).toEqual([0, 0, 0, 1, 1, 1]);
  });

  test('a cycle already started is not cut short', async () => {
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('A', parseRhythm('xxx'), 0.1));
    await engine.start();
    fake.advance(0.45); // in cycle 1
    engine.setEndCycle('A', 1);
    fake.advance(2);
    const a = ofVoice('A');
    expect(a.map((e) => e.cycleIndex)).toEqual([0, 0, 0, 1, 1, 1]);
  });

  test('stop() clears it', async () => {
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('A', parseRhythm('xxx'), 0.1));
    engine.setEndCycle('A', 1);
    await engine.start();
    fake.advance(1);
    engine.stop();
    const before = ofVoice('A').length;
    await engine.start();
    fake.advance(1);
    expect(ofVoice('A').length - before).toBeGreaterThan(3);
  });
});

describe('lifecycle', () => {
  test('start waits for resume() before scheduling', async () => {
    let resolveResume = () => {};
    const { fake, engine, events } = setup({
      resume: () => new Promise<void>((resolve) => (resolveResume = resolve)),
    });
    engine.setVoice(voice('A', parseRhythm('xxx'), 0.1));
    const starting = engine.start();
    expect(events).toEqual([]);
    resolveResume();
    await starting;
    fake.advance(0.2);
    expect(events.length).toBeGreaterThan(0);
  });

  test('stop() during a pending start cancels it', async () => {
    let resolveResume = () => {};
    const { fake, engine, events } = setup({
      resume: () => new Promise<void>((resolve) => (resolveResume = resolve)),
    });
    engine.setVoice(voice('A', parseRhythm('xxx'), 0.1));
    const starting = engine.start();
    engine.stop();
    resolveResume();
    await starting;
    fake.advance(1);
    expect(events).toEqual([]);
    expect(fake.timerActive).toBe(false);
  });

  test('stop() clears the queue, resets indices and stops the timer', async () => {
    const { fake, engine, ofVoice } = setup();
    engine.setVoice(voice('A', parseRhythm('xxx'), 0.1));
    await engine.start();
    fake.advance(1);
    engine.stop();

    expect(engine.getRecentEvents(-Infinity)).toEqual([]);
    expect(fake.timerActive).toBe(false);

    const countAfterStop = ofVoice('A').length;
    await engine.start();
    fake.advance(0.1);
    const restarted = ofVoice('A').slice(countAfterStop);
    expect(restarted[0]).toMatchObject({ stepIndex: 0, cycleIndex: 0 });
    expect(restarted[0]!.time).toBeCloseTo(fake.clock() - 0.1 + 0.05, 9);
  });

  test('late events after a timer stall are kept in the timeline but not played', async () => {
    const { fake, engine, played, ofVoice } = setup();
    engine.setVoice(voice('A', parseRhythm('xxxx'), 0.1));
    await engine.start();
    fake.advance(0.5);
    const playedBefore = played.length;
    fake.jump(1); // the timer did not fire for a whole second
    fake.advance(0.025);

    const now = fake.clock();
    const newlyPlayed = played.slice(playedBefore);
    expect(newlyPlayed.every((p) => p.event.time >= now)).toBe(true);
    // The timeline has no gaps: indices keep counting through the stall.
    const a = ofVoice('A');
    a.slice(1).forEach((e, i) => expect(e.time - a[i]!.time).toBeCloseTo(0.1, 9));
  });

  test('getNextEvents returns the fixed but unscheduled event of each voice', async () => {
    const { fake, engine, ofVoice } = setup();
    expect(engine.getNextEvents()).toEqual([]);
    engine.setVoice(voice('A', parseRhythm('x.x'), 0.3));
    await engine.start();
    fake.advance(0.4);

    const scheduled = ofVoice('A');
    const last = scheduled[scheduled.length - 1]!;
    const [next] = engine.getNextEvents();
    expect(next).toMatchObject({ voice: 'A', stepIndex: last.stepIndex + 1, active: true });
    expect(next!.time).toBeCloseTo(last.time + 0.3, 9);
    expect(next!.time).toBeGreaterThan(fake.clock() + 0.1);

    engine.stop();
    expect(engine.getNextEvents()).toEqual([]);
  });

  test('now() subtracts the output latency', () => {
    const { engine } = setup({ clock: () => 10, outputLatency: () => 0.04 });
    expect(engine.now()).toBeCloseTo(9.96);
  });

  test('getRecentEvents filters by time and sorts across voices', async () => {
    const { fake, engine } = setup();
    engine.setVoice(voice('A', parseRhythm('xxx'), 0.1));
    engine.setVoice(voice('B', parseRhythm('xxx'), 0.15));
    await engine.start();
    fake.advance(1);
    const recent = engine.getRecentEvents(0.5);
    expect(recent.every((e) => e.time >= 0.5)).toBe(true);
    expect(recent.map((e) => e.time)).toEqual([...recent.map((e) => e.time)].sort((x, y) => x - y));
    expect(new Set(recent.map((e) => e.voice))).toEqual(new Set(['A', 'B']));
  });
});

describe('validation', () => {
  test('rejects non-positive pulse durations', () => {
    const { engine } = setup();
    expect(() => engine.setVoice(voice('A', parseRhythm('x'), 0))).toThrow(RangeError);
    engine.setVoice(voice('A', parseRhythm('x'), 0.1));
    expect(() => engine.setPulseDuration('A', -1)).toThrow(RangeError);
    expect(() => engine.setPulseDuration('A', Number.NaN)).toThrow(RangeError);
  });

  test('rejects empty patterns, unknown voices and fractional offsets', () => {
    const { engine } = setup();
    expect(() => engine.setVoice(voice('A', { steps: [] }, 0.1))).toThrow(RangeError);
    expect(() => engine.setPulseDuration('B', 0.1)).toThrow(/Unknown voice/);
    engine.setVoice(voice('B', parseRhythm('xx'), 0.1));
    expect(() => engine.setPatternOffset('B', 0.5)).toThrow(RangeError);
  });
});
