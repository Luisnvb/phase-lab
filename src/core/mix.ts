import type { VoiceId } from './types.ts';

const PAN = 0.4;
const GAIN = 0.8;

/**
 * Gain and panning for modules with an optional second voice: with one voice,
 * A is centred and B silent (it keeps running, in time with A, so it can be
 * switched on at any moment); with two, they are panned apart (SPEC §6).
 */
export function twoVoiceMix(twoVoices: boolean, voice: VoiceId): { gain: number; pan: number } {
  if (!twoVoices) return { gain: voice === 'A' ? GAIN : 0, pan: 0 };
  return { gain: GAIN, pan: voice === 'A' ? -PAN : PAN };
}
