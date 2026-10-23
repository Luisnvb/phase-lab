import { describe, expect, test } from 'vitest';
import { pulseDuration } from '../../core/tempo.ts';
import { DEFAULT_SETTINGS, pulseSourceFor, voiceConfigs } from './settings.ts';

describe('continuous phase settings', () => {
  test('default tempo gives sixteenth-note steps of ≈ 0.114 s', () => {
    expect(pulseDuration(DEFAULT_SETTINGS.bpm)).toBeCloseTo(0.1136, 4);
  });

  test('continuous mode: B is faster by the given percentage', () => {
    const [a, b] = voiceConfigs({ ...DEFAULT_SETTINGS, differencePercent: 2 });
    expect(a.pulseDuration / b.pulseDuration).toBeCloseTo(1.02, 9);
  });

  test('plateau mode: both voices share the base pulse and B gets a pulse source', () => {
    const settings = { ...DEFAULT_SETTINGS, mode: 'plateau' as const };
    const [a, b] = voiceConfigs(settings);
    expect(b.pulseDuration).toBe(a.pulseDuration);
    expect(pulseSourceFor(settings)).not.toBeNull();
    expect(pulseSourceFor(DEFAULT_SETTINGS)).toBeNull();
  });

  test('A comes first, voices are panned to opposite sides', () => {
    const [a, b] = voiceConfigs(DEFAULT_SETTINGS);
    expect([a.id, b.id]).toEqual(['A', 'B']);
    expect(a.pan).toBe(-b.pan);
  });

  test('material picks pattern and instrument', () => {
    const [melody] = voiceConfigs(DEFAULT_SETTINGS);
    const [rhythm] = voiceConfigs({ ...DEFAULT_SETTINGS, material: 'rhythm' });
    expect(melody.instrument).toBe('mallet');
    expect(melody.pattern.steps.every((s) => s.pitch)).toBe(true);
    expect(rhythm.instrument).toBe('click');
    expect(rhythm.pattern.steps.some((s) => !s.active)).toBe(true);
  });
});
