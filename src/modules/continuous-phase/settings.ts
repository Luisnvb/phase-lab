import { DEFAULT_MELODY_PITCHES, DEFAULT_RHYTHM, DEFAULT_STEP_COUNT } from '../../core/defaults.ts';
import { melodicPattern } from '../../core/pattern.ts';
import { EDITABLE_PITCHES, type MelodyNote } from '../../core/pitch.ts';
import { createPlateauSource } from '../../core/plateau.ts';
import { pulseDuration } from '../../core/tempo.ts';
import type { Pattern, PulseSource, VoiceConfig } from '../../core/types.ts';
import type { UrlSchema } from '../../core/url-state.ts';

export type PhaseMode = 'continuous' | 'plateau';
export type Material = 'melody' | 'rhythm';

export type ContinuousPhaseSettings = {
  /** Quarter notes per minute; one step is a sixteenth note. */
  readonly bpm: number;
  /** How much faster B is, in percent (0–5). */
  readonly differencePercent: number;
  readonly mode: PhaseMode;
  /** Cycles B stays on each integer offset in plateau mode. */
  readonly plateauCycles: number;
  readonly material: Material;
  /** The melodic material, one pitch (or rest) per step; editable. */
  readonly melody: readonly MelodyNote[];
};

export const DEFAULT_SETTINGS: ContinuousPhaseSettings = {
  bpm: 132,
  differencePercent: 1,
  mode: 'continuous',
  plateauCycles: 8,
  material: 'melody',
  melody: DEFAULT_MELODY_PITCHES,
};

export const LIMITS = {
  bpm: { min: 60, max: 200, step: 1 },
  differencePercent: { min: 0, max: 5, step: 0.1 },
  plateauCycles: { min: 1, max: 32, step: 1 },
} as const;

/** Voices pan to opposite sides so the phasing can be heard in space (SPEC §6). */
const PAN = 0.4;

export function patternFor(settings: Pick<ContinuousPhaseSettings, 'material' | 'melody'>): Pattern {
  return settings.material === 'melody' ? melodicPattern(settings.melody) : DEFAULT_RHYTHM;
}

/**
 * Configs for voices A and B, in that order: A must be added to the engine
 * first so it is scheduled before B when their events coincide.
 */
export function voiceConfigs(settings: ContinuousPhaseSettings): [VoiceConfig, VoiceConfig] {
  const pulse = pulseDuration(settings.bpm);
  const pattern = patternFor(settings);
  const instrument = settings.material === 'melody' ? 'mallet' : 'click';
  // In plateau mode B's timing comes from its pulse source; its own pulse is the base one.
  const pulseB = settings.mode === 'continuous' ? pulse / (1 + settings.differencePercent / 100) : pulse;
  return [
    { id: 'A', pattern, pulseDuration: pulse, instrument, gain: 0.8, pan: -PAN },
    { id: 'B', pattern, pulseDuration: pulseB, instrument, gain: 0.8, pan: PAN },
  ];
}

export type PulseSourceSettings = Pick<
  ContinuousPhaseSettings,
  'mode' | 'differencePercent' | 'plateauCycles' | 'material'
>;

/**
 * B's pulse source: a plateau planner in plateau mode, none in continuous mode.
 * It does not depend on the tempo, so tempo changes keep the current plateau.
 */
export function pulseSourceFor(settings: PulseSourceSettings): PulseSource | null {
  if (settings.mode === 'continuous') return null;
  return createPlateauSource({
    leader: 'A',
    difference: settings.differencePercent / 100,
    plateauCycles: settings.plateauCycles,
    // Both materials have 12 steps; editing the melody never changes its length.
    stepsPerCycle: DEFAULT_STEP_COUNT,
  });
}

/** Settings shared by URL (v0.4). */
export const URL_SCHEMA: UrlSchema<ContinuousPhaseSettings> = {
  bpm: { key: 'bpm', type: 'number', ...LIMITS.bpm, integer: true },
  differencePercent: { key: 'd', type: 'number', ...LIMITS.differencePercent },
  mode: { key: 'modo', type: 'choice', values: ['continuous', 'plateau'] },
  plateauCycles: { key: 'k', type: 'number', ...LIMITS.plateauCycles, integer: true },
  material: { key: 'material', type: 'choice', values: ['melody', 'rhythm'] },
  melody: {
    key: 'melodia',
    type: 'pitches',
    length: DEFAULT_MELODY_PITCHES.length,
    values: EDITABLE_PITCHES,
    rests: true,
  },
};
