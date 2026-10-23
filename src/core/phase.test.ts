import { describe, expect, test } from 'vitest';
import { phaseOffset, phaseReadout, positionAt } from './phase.ts';
import type { ScheduledEvent, VoiceId } from './types.ts';

describe('phaseOffset', () => {
  test('B ahead of A', () => {
    expect(phaseOffset(0, 2.37, 12)).toBeCloseTo(2.37);
  });

  test('wraps into [0, period)', () => {
    expect(phaseOffset(100, 112, 12)).toBe(0);
    expect(phaseOffset(5, 3, 12)).toBe(10);
    expect(phaseOffset(0, 25.5, 12)).toBeCloseTo(1.5);
  });

  test('rejects non-positive period', () => {
    expect(() => phaseOffset(0, 1, 0)).toThrow(RangeError);
  });
});

describe('phaseReadout', () => {
  test('lead within the cycle and completed laps', () => {
    expect(phaseReadout(10, 12.37, 12).offset).toBeCloseTo(2.37);
    expect(phaseReadout(10, 12.37, 12).laps).toBe(0);
    expect(phaseReadout(1200, 1213.5, 12)).toEqual({ offset: 1.5, laps: 1 });
  });

  test('a full lap counts once B is exactly one cycle ahead', () => {
    expect(phaseReadout(1200, 1212, 12)).toEqual({ offset: 0, laps: 1 });
    expect(phaseReadout(1200, 1212 - 1e-12, 12)).toEqual({ offset: 0, laps: 1 });
    expect(phaseReadout(1200, 1211.9, 12).laps).toBe(0);
  });
});

describe('positionAt', () => {
  // Voice A: one step every 0.5 s in a 4-step cycle, starting at t = 1.
  const events: ScheduledEvent[] = Array.from({ length: 8 }, (_, n) => ({
    voice: 'A' as VoiceId,
    stepIndex: n % 4,
    cycleIndex: Math.floor(n / 4),
    time: 1 + n * 0.5,
    active: true,
  }));

  test('exactly on an event', () => {
    expect(positionAt(events, 'A', 1, 4)).toBe(0);
    expect(positionAt(events, 'A', 3, 4)).toBe(4);
  });

  test('interpolates between events', () => {
    expect(positionAt(events, 'A', 1.25, 4)).toBeCloseTo(0.5);
    expect(positionAt(events, 'A', 3.4, 4)).toBeCloseTo(4.8);
  });

  test('ignores other voices and event order', () => {
    const mixed = [
      ...[...events].reverse(),
      { voice: 'B' as VoiceId, stepIndex: 0, cycleIndex: 9, time: 1.1, active: true },
    ];
    expect(positionAt(mixed, 'A', 1.25, 4)).toBeCloseTo(0.5);
  });

  test('null outside the known events', () => {
    expect(positionAt(events, 'A', 0.5, 4)).toBeNull();
    expect(positionAt(events, 'A', 10, 4)).toBeNull();
    expect(positionAt(events, 'B', 2, 4)).toBeNull();
  });
});
