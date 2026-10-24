// Tape phasing (variant of module 1): two loops of the same recording, one
// slightly faster. Pure helpers; the audio side lives in src/engine/tape.ts.

/**
 * From `time` on, a loop plays at `rate` (seconds of material per second),
 * having played `position` seconds of material by then.
 */
export type TapeSegment = {
  readonly time: number;
  readonly position: number;
  readonly rate: number;
};

/** Seconds of material played by `time` (unwrapped: it keeps growing across loops). */
export function tapePositionAt(segments: readonly TapeSegment[], time: number): number {
  let current = segments[0];
  if (!current) return 0;
  for (const segment of segments) {
    if (segment.time <= time) current = segment;
  }
  return current.position + Math.max(0, time - current.time) * current.rate;
}

/** Segments after a rate change at `time`; the position carries on without a jump. */
export function withRateChange(
  segments: readonly TapeSegment[],
  time: number,
  rate: number,
): TapeSegment[] {
  return [...segments, { time, position: tapePositionAt(segments, time), rate }];
}

/**
 * Peak level (0..1, relative to the loudest bin) of `bins` slices of the
 * samples between `start` and `end` (indices), for drawing a waveform.
 */
export function waveformPeaks(
  samples: ArrayLike<number>,
  start: number,
  end: number,
  bins: number,
): number[] {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(samples.length, Math.ceil(end));
  const peaks = new Array<number>(bins).fill(0);
  if (to <= from || bins <= 0) return peaks;
  const perBin = (to - from) / bins;
  for (let i = from; i < to; i++) {
    const bin = Math.min(bins - 1, Math.floor((i - from) / perBin));
    const value = Math.abs(samples[i]!);
    if (value > peaks[bin]!) peaks[bin] = value;
  }
  const loudest = Math.max(...peaks);
  return loudest > 0 ? peaks.map((peak) => peak / loudest) : peaks;
}

/**
 * A short original phrase to try tape phasing without a microphone: five
 * plucked tones (D minor pentatonic) with decaying envelopes. Mono samples.
 */
export function synthesizeSample(sampleRate: number, seconds = 1.6): Float32Array {
  const notes = [
    { at: 0, frequency: 293.66 },
    { at: 0.28, frequency: 440 },
    { at: 0.5, frequency: 349.23 },
    { at: 0.78, frequency: 392 },
    { at: 1.12, frequency: 523.25 },
  ];
  const samples = new Float32Array(Math.round(sampleRate * seconds));
  for (const { at, frequency } of notes) {
    const first = Math.round(at * sampleRate);
    for (let i = first; i < samples.length; i++) {
      const t = (i - first) / sampleRate;
      const envelope = Math.exp(-7 * t) * Math.min(1, t / 0.004);
      const tone = Math.sin(2 * Math.PI * frequency * t) + 0.3 * Math.sin(4 * Math.PI * frequency * t);
      samples[i]! += 0.35 * envelope * tone;
    }
  }
  return samples;
}
