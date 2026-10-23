import { accentPattern } from '../../core/accents.ts';
import { DEFAULT_MELODY } from '../../core/defaults.ts';
import { twoVoiceMix } from '../../core/mix.ts';
import { parseRhythm } from '../../core/pattern.ts';
import { pulseDuration } from '../../core/tempo.ts';
import type { Pattern, VoiceConfig, VoiceId } from '../../core/types.ts';

export type Material = 'pulse' | 'melody';

/** Group sizes for a 12-step cycle: 4×3, 3×4, 6×2 and 2×6 (SPEC §5). */
export const GROUP_SIZES = [3, 4, 2, 6] as const;
export type GroupSize = (typeof GROUP_SIZES)[number];

export type MetricSettings = {
  readonly bpm: number;
  readonly material: Material;
  readonly groupA: GroupSize;
  /** A second voice with its own grouping over the same beats. */
  readonly twoVoices: boolean;
  readonly groupB: GroupSize;
};

export const DEFAULT_SETTINGS: MetricSettings = {
  bpm: 132,
  material: 'pulse',
  groupA: 3,
  twoVoices: false,
  groupB: 4,
};

export const BPM_LIMITS = { min: 60, max: 200, step: 1 } as const;

const STEPS = 12;

/** "4×3": four groups of three steps. */
export function groupingLabel(groupSize: number, steps = STEPS): string {
  return `${steps / groupSize}×${groupSize}`;
}

/** Every step sounds, so each grouping's accents always fall on a beat. */
const PULSE = parseRhythm('x'.repeat(STEPS));

export function basePattern(material: Material): Pattern {
  return material === 'pulse' ? PULSE : DEFAULT_MELODY;
}

export function groupFor(settings: MetricSettings, voice: VoiceId): GroupSize {
  return voice === 'A' ? settings.groupA : settings.groupB;
}

export function voiceConfig(settings: MetricSettings, voice: VoiceId): VoiceConfig {
  return {
    id: voice,
    pattern: accentPattern(basePattern(settings.material), groupFor(settings, voice)),
    pulseDuration: pulseDuration(settings.bpm),
    instrument: settings.material === 'pulse' ? 'click' : 'mallet',
    ...twoVoiceMix(settings.twoVoices, voice),
  };
}
