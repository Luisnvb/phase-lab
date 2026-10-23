import { DEFAULT_MELODY, DEFAULT_RHYTHM } from '../../core/defaults.ts';
import { createPlateauSource } from '../../core/plateau.ts';
import { pulseDuration } from '../../core/tempo.ts';
import type { Pattern, PulseSource, VoiceConfig } from '../../core/types.ts';

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
};

export const DEFAULT_SETTINGS: ContinuousPhaseSettings = {
  bpm: 132,
  differencePercent: 1,
  mode: 'continuous',
  plateauCycles: 8,
  material: 'melody',
};

export const LIMITS = {
  bpm: { min: 60, max: 200, step: 1 },
  differencePercent: { min: 0, max: 5, step: 0.1 },
  plateauCycles: { min: 1, max: 32, step: 1 },
} as const;

/** Voices pan to opposite sides so the phasing can be heard in space (SPEC §6). */
const PAN = 0.4;

export function patternFor(material: Material): Pattern {
  return material === 'melody' ? DEFAULT_MELODY : DEFAULT_RHYTHM;
}

/**
 * Configs for voices A and B, in that order: A must be added to the engine
 * first so it is scheduled before B when their events coincide.
 */
export function voiceConfigs(settings: ContinuousPhaseSettings): [VoiceConfig, VoiceConfig] {
  const pulse = pulseDuration(settings.bpm);
  const pattern = patternFor(settings.material);
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
    stepsPerCycle: patternFor(settings.material).steps.length,
  });
}
