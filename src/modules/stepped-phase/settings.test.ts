import { describe, expect, test } from 'vitest';
import { DEFAULT_SETTINGS, voiceConfigs } from './settings.ts';

describe('stepped phase settings', () => {
  test('both voices share tempo and pattern, panned apart, A first', () => {
    const [a, b] = voiceConfigs(DEFAULT_SETTINGS);
    expect([a.id, b.id]).toEqual(['A', 'B']);
    expect(a.pulseDuration).toBe(b.pulseDuration);
    expect(a.pattern).toBe(b.pattern);
    expect(a.pan).toBe(-b.pan);
  });

  test('defaults: 12 steps, M = 8', () => {
    expect(DEFAULT_SETTINGS.pattern.steps).toHaveLength(12);
    expect(DEFAULT_SETTINGS.repetitions).toBe(8);
  });
});
