import { DEFAULT_RHYTHM } from '../../core/defaults.ts';
import { fillOrder } from '../../core/fill-order.ts';
import { twoVoiceMix } from '../../core/mix.ts';
import { activeIndices } from '../../core/pattern.ts';
import { completeOrder, partialPattern } from '../../core/substitution.ts';
import { pulseDuration } from '../../core/tempo.ts';
import type { FillOrderMode, Pattern, VoiceConfig, VoiceId } from '../../core/types.ts';
import type { UrlSchema } from '../../core/url-state.ts';

export type SubstitutionSettings = {
  readonly bpm: number;
  /** Cycles between two substitutions (M). */
  readonly repetitions: number;
  readonly target: Pattern;
  readonly orderMode: FillOrderMode;
  readonly seed: number;
  /** Steps chosen so far in custom mode; the rest follow left to right. */
  readonly customPrefix: readonly number[];
  /** B builds the same pattern, shifted by `offset` steps. */
  readonly twoVoices: boolean;
  readonly offset: number;
};

export const DEFAULT_SETTINGS: SubstitutionSettings = {
  bpm: 132,
  repetitions: 4,
  target: DEFAULT_RHYTHM,
  orderMode: 'ltr',
  seed: 1,
  customPrefix: [],
  twoVoices: false,
  offset: 3,
};

export const LIMITS = {
  bpm: { min: 60, max: 200, step: 1 },
  repetitions: { min: 1, max: 16, step: 1 },
  offset: { min: 0, max: 11, step: 1 },
} as const;

export function buildOrder(settings: SubstitutionSettings): number[] {
  const { target, orderMode } = settings;
  if (orderMode === 'custom') {
    return fillOrder(target, 'custom', { custom: completeOrder(target, settings.customPrefix) });
  }
  return fillOrder(target, orderMode, { seed: settings.seed });
}

export function totalBeats(target: Pattern): number {
  return activeIndices(target).length;
}

/** Config of a voice when `count` beats of the target have been substituted. */
export function voiceConfig(
  settings: SubstitutionSettings,
  voice: VoiceId,
  count: number,
): VoiceConfig {
  return {
    id: voice,
    pattern: partialPattern(settings.target, buildOrder(settings), count),
    pulseDuration: pulseDuration(settings.bpm),
    instrument: 'click',
    ...twoVoiceMix(settings.twoVoices, voice),
  };
}

/** Settings shared by URL (v0.4). */
export const URL_SCHEMA: UrlSchema<SubstitutionSettings> = {
  bpm: { key: 'bpm', type: 'number', ...LIMITS.bpm, integer: true },
  repetitions: { key: 'm', type: 'number', ...LIMITS.repetitions, integer: true },
  target: { key: 'patron', type: 'rhythm', length: 12 },
  orderMode: { key: 'orden', type: 'choice', values: ['ltr', 'random', 'custom'] },
  seed: { key: 'semilla', type: 'number', min: 0, max: 2 ** 31, integer: true },
  customPrefix: { key: 'pasos', type: 'indices', max: 11 },
  twoVoices: { key: 'dos', type: 'boolean' },
  offset: { key: 'desfase', type: 'number', ...LIMITS.offset, integer: true },
};
