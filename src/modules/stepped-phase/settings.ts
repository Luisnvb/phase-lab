import { DEFAULT_RHYTHM } from '../../core/defaults.ts';
import { pulseDuration } from '../../core/tempo.ts';
import type { Pattern, VoiceConfig } from '../../core/types.ts';

export type SteppedPhaseSettings = {
  /** Quarter notes per minute, the same for both voices. */
  readonly bpm: number;
  /** Cycles per stage (M). */
  readonly repetitions: number;
  readonly auto: boolean;
  readonly loop: boolean;
  readonly pattern: Pattern;
};

export const DEFAULT_SETTINGS: SteppedPhaseSettings = {
  bpm: 132,
  repetitions: 8,
  auto: true,
  loop: false,
  pattern: DEFAULT_RHYTHM,
};

export const LIMITS = {
  bpm: { min: 60, max: 200, step: 1 },
  repetitions: { min: 1, max: 16, step: 1 },
} as const;

const PAN = 0.4;

/** Voices A and B, in that order (A must be added to the engine first). */
export function voiceConfigs(settings: SteppedPhaseSettings): [VoiceConfig, VoiceConfig] {
  const pulse = pulseDuration(settings.bpm);
  const { pattern } = settings;
  return [
    { id: 'A', pattern, pulseDuration: pulse, instrument: 'click', gain: 0.8, pan: -PAN },
    { id: 'B', pattern, pulseDuration: pulse, instrument: 'click', gain: 0.8, pan: PAN },
  ];
}
