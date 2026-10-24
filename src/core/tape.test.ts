import { describe, expect, test } from 'vitest';
import { phaseReadout } from './phase.ts';
import { synthesizeSample, tapePositionAt, waveformPeaks, withRateChange } from './tape.ts';

describe('tapePositionAt', () => {
  test('advances at the loop rate from its start', () => {
    const segments = [{ time: 10, position: 0, rate: 1.02 }];
    expect(tapePositionAt(segments, 10)).toBe(0);
    expect(tapePositionAt(segments, 15)).toBeCloseTo(5.1);
    // Before it starts, nothing has been played.
    expect(tapePositionAt(segments, 9)).toBe(0);
  });

  test('a rate change keeps the position continuous', () => {
    let segments = [{ time: 0, position: 0, rate: 1 }];
    segments = withRateChange(segments, 4, 1.5);
    expect(tapePositionAt(segments, 4)).toBeCloseTo(4);
    expect(tapePositionAt(segments, 6)).toBeCloseTo(7);
  });

  test('with 1 % faster playback, B is one whole loop ahead after 100 loops of A', () => {
    const loop = 1.6;
    const a = [{ time: 0, position: 0, rate: 1 }];
    const b = [{ time: 0, position: 0, rate: 1.01 }];
    const time = 100 * loop;
    const readout = phaseReadout(tapePositionAt(a, time), tapePositionAt(b, time), loop);
    expect(readout.laps).toBe(1);
    expect(readout.offset).toBeCloseTo(0, 6);
  });
});

describe('waveformPeaks', () => {
  test('peak of each slice, relative to the loudest', () => {
    const samples = [0, 0.5, -0.25, 0.1, 0, -1, 0.2, 0];
    expect(waveformPeaks(samples, 0, 8, 4)).toEqual([0.5, 0.25, 1, 0.2]);
  });

  test('only the region between start and end', () => {
    expect(waveformPeaks([1, 0.5, 0.25, 0.5], 1, 3, 2)).toEqual([1, 0.5]);
  });

  test('silence and empty regions give zeros', () => {
    expect(waveformPeaks([0, 0, 0], 0, 3, 3)).toEqual([0, 0, 0]);
    expect(waveformPeaks([1, 1], 2, 2, 2)).toEqual([0, 0]);
  });
});

describe('synthesizeSample', () => {
  test('has the requested length and stays within [-1, 1]', () => {
    const samples = synthesizeSample(8000, 1.6);
    expect(samples).toHaveLength(12800);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1);
    expect(Math.max(...samples.map(Math.abs))).toBeGreaterThan(0.1);
  });
});
