// Original default material (SPEC §8). Nothing here is transcribed from existing works.
import { melodicPattern, parseRhythm } from './pattern.ts';

export const DEFAULT_STEP_COUNT = 12;

/** No rotational symmetry: all 12 stages of stepped phasing are different. */
export const DEFAULT_RHYTHM = parseRhythm('x x . x . . x . x x . .');

/** 12 notes in D Dorian. */
export const DEFAULT_MELODY_PITCHES: readonly string[] = [
  'D4', 'A4', 'E5', 'A4', 'F5', 'E5', 'D5', 'A4', 'C5', 'E5', 'G4', 'A4',
];
export const DEFAULT_MELODY = melodicPattern(DEFAULT_MELODY_PITCHES);

/** Augmentation chord on D; the first 3–5 notes are used. */
export const DEFAULT_CHORD: readonly string[] = ['D4', 'A4', 'E5', 'G5', 'C6'];

/** 132 quarter notes per minute, one step per sixteenth note ≈ 0.114 s. */
export const DEFAULT_PULSE_DURATION = 60 / 132 / 4;
