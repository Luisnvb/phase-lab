import { describe, expect, test } from 'vitest';
import { createCycleHistory } from './cycle-history.ts';
import { twoVoiceMix } from './mix.ts';

describe('createCycleHistory', () => {
  test('returns the value in effect at each cycle', () => {
    const history = createCycleHistory(3);
    history.record(4, 4);
    history.record(9, 2);
    expect([0, 3, 4, 8, 9, 20].map((c) => history.valueAt(c))).toEqual([3, 3, 4, 4, 2, 2]);
  });

  test('recording the same value does not add an entry', () => {
    const history = createCycleHistory('a');
    history.record(2, 'a');
    history.record(5, 'b');
    expect(history.valueAt(4)).toBe('a');
    expect(history.valueAt(5)).toBe('b');
  });
});

describe('twoVoiceMix', () => {
  test('one voice: A centred, B silent', () => {
    expect(twoVoiceMix(false, 'A')).toEqual({ gain: 0.8, pan: 0 });
    expect(twoVoiceMix(false, 'B').gain).toBe(0);
  });

  test('two voices: panned to opposite sides', () => {
    expect(twoVoiceMix(true, 'A').pan).toBe(-twoVoiceMix(true, 'B').pan);
    expect(twoVoiceMix(true, 'B').gain).toBeGreaterThan(0);
  });
});
