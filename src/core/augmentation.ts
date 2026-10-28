import type { Pattern, Step } from './types.ts';

/** A note of the chord: when it starts and how long it rings, in pulses. */
export type ChordNote = {
  readonly pitch: string;
  readonly onset: number;
  readonly length: number;
};

export type AugmentMode = 'factor' | 'pulses';

/** The chord before augmentation: notes enter one pulse apart, in the given order. */
export function initialChord(pitches: readonly string[], length = 1): ChordNote[] {
  return pitches.map((pitch, i) => ({ pitch, onset: i, length }));
}

/**
 * What the chord sounds like in a cycle: notes one after another, notes that
 * overlap their neighbours, or every note ringing together at some moment.
 */
export type ChordTexture = 'separate' | 'overlapping' | 'chord';

export function chordTexture(notes: readonly ChordNote[]): ChordTexture {
  if (notes.length < 2) return 'chord';
  const lastOnset = Math.max(...notes.map((note) => note.onset));
  const firstEnd = Math.min(...notes.map((note) => note.onset + note.length));
  if (firstEnd > lastOnset + 1e-9) return 'chord';
  const sorted = [...notes].sort((a, b) => a.onset - b.onset);
  const overlaps = sorted.some((note, i) => {
    const next = sorted[i + 1];
    return next !== undefined && note.onset + note.length > next.onset + 1e-9;
  });
  return overlaps ? 'overlapping' : 'separate';
}

/** One augmentation step: every note gets longer by a factor or by a number of pulses. */
export function augmentOnce(
  notes: readonly ChordNote[],
  mode: AugmentMode,
  amount: number,
): ChordNote[] {
  return notes.map((note) => ({
    ...note,
    length: mode === 'factor' ? note.length * amount : note.length + amount,
  }));
}

/** Pulses in a cycle: enough to hold the longest note, never fewer than `minimum`. */
export function cycleLength(notes: readonly ChordNote[], minimum: number): number {
  const end = Math.max(0, ...notes.map((note) => note.onset + note.length));
  // Tolerance, so a note ending exactly on a pulse does not add one more.
  return Math.max(minimum, Math.ceil(end - 1e-9));
}

/** The chord as a pattern of `steps` pulses: each note on its onset, with its length. */
export function chordPattern(notes: readonly ChordNote[], steps: number): Pattern {
  const result: Step[] = Array.from({ length: steps }, () => ({ active: false }));
  for (const note of notes) {
    if (note.onset < steps) {
      result[note.onset] = { active: true, pitch: note.pitch, length: note.length };
    }
  }
  return { steps: result };
}

export type AugmentationOptions = {
  /** Chord notes, in order of entry. */
  readonly pitches: readonly string[];
  readonly mode: AugmentMode;
  readonly amount: number;
  /** Shortest cycle, in pulses. */
  readonly minimum: number;
  /** The process ends before a cycle would be longer than this. */
  readonly maximum: number;
};

export type AugmentationCycle = {
  readonly notes: readonly ChordNote[];
  /** Pulses in this cycle. */
  readonly length: number;
  /** Pulses played before this cycle starts. */
  readonly startPulse: number;
};

export type AugmentationProcess = {
  configure(changes: Partial<Pick<AugmentationOptions, 'mode' | 'amount'>>): void;
  /**
   * Decides cycle `cycle + 1` once cycle `cycle` is scheduled: the chord one
   * augmentation longer, or null if it would no longer fit in `maximum`.
   * Calling it again for a decided cycle gives the same answer.
   */
  planNext(cycle: number): AugmentationCycle | null;
  cycleAt(cycle: number): AugmentationCycle | null;
  /** First cycle not played, once the end has been decided. */
  readonly endCycle: number | null;
};

/**
 * Augmentation (module 5): over a steady pulse, the notes of a chord get longer
 * every cycle, and the cycle stretches with them.
 */
export function createAugmentationProcess(initial: AugmentationOptions): AugmentationProcess {
  let options = { ...initial };
  const first = initialChord(options.pitches);
  const cycles: AugmentationCycle[] = [
    { notes: first, length: cycleLength(first, options.minimum), startPulse: 0 },
  ];
  let endCycle: number | null = null;

  return {
    configure(changes) {
      options = { ...options, ...changes };
    },

    planNext(cycle) {
      const next = cycle + 1;
      if (next < cycles.length) return cycles[next]!;
      if (endCycle !== null || next !== cycles.length) return null;

      const last = cycles[cycles.length - 1]!;
      const notes = augmentOnce(last.notes, options.mode, options.amount);
      const length = cycleLength(notes, options.minimum);
      if (length > options.maximum) {
        endCycle = next;
        return null;
      }
      const planned = { notes, length, startPulse: last.startPulse + last.length };
      cycles.push(planned);
      return planned;
    },

    cycleAt(cycle) {
      return cycles[cycle] ?? null;
    },

    get endCycle() {
      return endCycle;
    },
  };
}
