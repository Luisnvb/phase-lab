import {
  chordPattern,
  type AugmentationCycle,
  type AugmentMode,
} from '../../core/augmentation.ts';
import { pulseDuration } from '../../core/tempo.ts';
import type { VoiceConfig } from '../../core/types.ts';
import type { UrlSchema } from '../../core/url-state.ts';

export type AugmentationSettings = {
  readonly bpm: number;
  /** Notes in the chord (3–5). */
  readonly size: number;
  readonly mode: AugmentMode;
  /** Growth per cycle in 'factor' mode (1.0–1.5). */
  readonly factor: number;
  /** Growth per cycle in 'pulses' mode. */
  readonly pulses: number;
};

export const DEFAULT_SETTINGS: AugmentationSettings = {
  bpm: 132,
  size: 4,
  mode: 'factor',
  factor: 1.1,
  pulses: 1,
};

export const LIMITS = {
  bpm: { min: 60, max: 200, step: 1 },
  size: { min: 3, max: 5, step: 1 },
  factor: { min: 1, max: 1.5, step: 0.05 },
  pulses: { min: 0, max: 4, step: 1 },
} as const;

/** Cycle lengths, in pulses: the shortest one, and the longest before the process ends. */
export const MIN_CYCLE = 8;
export const MAX_CYCLE = 48;

export function amountFor(settings: AugmentationSettings): number {
  return settings.mode === 'factor' ? settings.factor : settings.pulses;
}

/** Voice A: the chord of one cycle. */
export function chordConfig(settings: AugmentationSettings, cycle: AugmentationCycle): VoiceConfig {
  return {
    id: 'A',
    pattern: chordPattern(cycle.notes, cycle.length),
    pulseDuration: pulseDuration(settings.bpm),
    instrument: 'organ',
    gain: 0.7,
    pan: 0,
  };
}

/** Voice B: the steady pulse, one step per cycle. */
export function pulseConfig(settings: AugmentationSettings): VoiceConfig {
  return {
    id: 'B',
    pattern: { steps: [{ active: true, velocity: 0.7 }] },
    pulseDuration: pulseDuration(settings.bpm),
    instrument: 'shaker',
    gain: 0.6,
    pan: 0,
  };
}

/** Settings shared by URL (v0.4). */
export const URL_SCHEMA: UrlSchema<AugmentationSettings> = {
  bpm: { key: 'bpm', type: 'number', ...LIMITS.bpm, integer: true },
  size: { key: 'notas', type: 'number', ...LIMITS.size, integer: true },
  mode: { key: 'modo', type: 'choice', values: ['factor', 'pulses'] },
  factor: { key: 'factor', type: 'number', ...LIMITS.factor },
  pulses: { key: 'pulsos', type: 'number', ...LIMITS.pulses, integer: true },
};
