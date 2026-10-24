import { describe, expect, test } from 'vitest';
import {
  augmentOnce,
  chordPattern,
  createAugmentationProcess,
  cycleLength,
  initialChord,
  type AugmentationOptions,
} from './augmentation.ts';

describe('augmentation helpers', () => {
  test('the chord enters one note per pulse', () => {
    expect(initialChord(3)).toEqual([
      { pitch: 'D4', onset: 0, length: 1 },
      { pitch: 'A4', onset: 1, length: 1 },
      { pitch: 'E5', onset: 2, length: 1 },
    ]);
  });

  test('augmentOnce multiplies or adds, without moving onsets', () => {
    const notes = initialChord(2, 2);
    expect(augmentOnce(notes, 'factor', 1.5).map((n) => [n.onset, n.length])).toEqual([
      [0, 3],
      [1, 3],
    ]);
    expect(augmentOnce(notes, 'pulses', 1).map((n) => n.length)).toEqual([3, 3]);
  });

  test('cycleLength holds the longest note, with a minimum', () => {
    expect(cycleLength(initialChord(4), 8)).toBe(8);
    expect(cycleLength(initialChord(4, 6), 8)).toBe(9);
    expect(cycleLength(initialChord(4, 6.2), 8)).toBe(10);
    // Float noise right at a pulse does not add another pulse.
    expect(cycleLength([{ pitch: 'D4', onset: 0, length: 9 + 1e-12 }], 1)).toBe(9);
  });

  test('chordPattern places each note on its onset, with its length', () => {
    const pattern = chordPattern(initialChord(3, 2.5), 6);
    expect(pattern.steps.map((s) => s.active)).toEqual([true, true, true, false, false, false]);
    expect(pattern.steps[1]).toEqual({ active: true, pitch: 'A4', length: 2.5 });
  });
});

describe('createAugmentationProcess', () => {
  const base: AugmentationOptions = { size: 3, mode: 'pulses', amount: 2, minimum: 4, maximum: 10 };

  test('each cycle the notes get longer and the cycle stretches with them', () => {
    const process = createAugmentationProcess(base);
    const lengths = [process.cycleAt(0)!.length];
    for (let c = 0; c < 3; c++) lengths.push(process.planNext(c)!.length);
    // Last note starts at pulse 2: 2 + 1, 2 + 3, 2 + 5, 2 + 7 (minimum 4).
    expect(lengths).toEqual([4, 5, 7, 9]);
    expect(process.cycleAt(3)!.notes.map((n) => n.length)).toEqual([7, 7, 7]);
  });

  test('startPulse accumulates the length of the previous cycles', () => {
    const process = createAugmentationProcess(base);
    process.planNext(0);
    process.planNext(1);
    expect([0, 1, 2].map((c) => process.cycleAt(c)!.startPulse)).toEqual([0, 4, 9]);
  });

  test('ends before a cycle would exceed the maximum', () => {
    const process = createAugmentationProcess(base);
    for (let c = 0; c < 3; c++) process.planNext(c);
    expect(process.planNext(3)).toBeNull();
    expect(process.endCycle).toBe(4);
    expect(process.planNext(4)).toBeNull();
  });

  test('factor mode grows geometrically; a factor of 1 never changes', () => {
    const growing = createAugmentationProcess({ ...base, mode: 'factor', amount: 2, maximum: 100 });
    expect([0, 1, 2].map((c) => growing.planNext(c)!.notes[0]!.length)).toEqual([2, 4, 8]);
    const steady = createAugmentationProcess({ ...base, mode: 'factor', amount: 1 });
    expect(steady.planNext(0)!.length).toBe(steady.cycleAt(0)!.length);
  });

  test('planning is idempotent and picks up new settings for the next cycle', () => {
    const process = createAugmentationProcess(base);
    const first = process.planNext(0);
    expect(process.planNext(0)).toBe(first);
    process.configure({ amount: 0 });
    expect(process.planNext(1)!.notes[0]!.length).toBe(first!.notes[0]!.length);
  });
});
