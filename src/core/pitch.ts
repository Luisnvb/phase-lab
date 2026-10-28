// Pitches the melody and chord editors offer, in scientific notation (C4 = middle C).

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Chromatic pitches from C in `lowOctave` up to C in `highOctave`, e.g. C3 … C6. */
export function chromaticRange(lowOctave: number, highOctave: number): string[] {
  const pitches: string[] = [];
  for (let octave = lowOctave; octave < highOctave; octave++) {
    for (const name of NAMES) pitches.push(`${name}${octave}`);
  }
  pitches.push(`C${highOctave}`);
  return pitches;
}

/** C3 to C6: three octaves, enough for the default melody and chord with room around them. */
export const EDITABLE_PITCHES: readonly string[] = chromaticRange(3, 6);

/** A step of an editable melody: a pitch, or null for a rest. */
export type MelodyNote = string | null;
