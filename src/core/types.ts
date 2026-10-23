// Data model (SPEC §3).

/** One step of a pattern; it either sounds or not. */
export type Step = {
  readonly active: boolean;
  readonly pitch?: string;
  readonly velocity?: number;
};

/** A cycle of steps. Default length: 12. */
export type Pattern = { readonly steps: readonly Step[] };

export type VoiceId = 'A' | 'B';

export type InstrumentId = 'mallet' | 'click' | 'pianoish';

export type VoiceConfig = {
  readonly id: VoiceId;
  readonly pattern: Pattern;
  /** Seconds per step. */
  readonly pulseDuration: number;
  readonly instrument: InstrumentId;
  /** 0..1 */
  readonly gain: number;
  /** -1..1 */
  readonly pan: number;
};

/** An event already scheduled on the audio clock. */
export type ScheduledEvent = {
  readonly voice: VoiceId;
  /** Position within the cycle (0..N-1). */
  readonly stepIndex: number;
  /** Number of the pattern repetition. */
  readonly cycleIndex: number;
  /** AudioContext time at which it sounds. */
  readonly time: number;
  readonly active: boolean;
};

/** Superposition of two voices at one step. */
export type ResultantCell = 'none' | 'A' | 'B' | 'both';

export type FillOrderMode = 'ltr' | 'random' | 'custom';
