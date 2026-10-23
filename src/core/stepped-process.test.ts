import { describe, expect, test } from 'vitest';
import { createSteppedProcess, type SteppedProcessOptions } from './stepped-process.ts';

const base: SteppedProcessOptions = { steps: 4, repetitions: 2, auto: true, loop: false };

/** Plans cycles one by one, as the engine would, and returns the stage of each. */
function run(options: SteppedProcessOptions, cycles: number) {
  const process = createSteppedProcess(options);
  const stages: (number | null)[] = [0];
  for (let cycle = 0; cycle < cycles - 1; cycle++) stages.push(process.planNext(cycle));
  return { process, stages };
}

describe('createSteppedProcess', () => {
  test('automatic: each stage lasts M cycles, from 0 to N, then ends', () => {
    const { process, stages } = run(base, 12);
    expect(stages).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, null, null]);
    expect(process.endCycle).toBe(10);
  });

  test('stageAt reports stage and repetition', () => {
    const { process } = run(base, 12);
    expect(process.stageAt(0)).toEqual({ stage: 0, repetition: 1 });
    expect(process.stageAt(3)).toEqual({ stage: 1, repetition: 2 });
    expect(process.stageAt(9)).toEqual({ stage: 4, repetition: 2 });
    expect(process.stageAt(10)).toBeNull();
  });

  test('loop: after stage N it goes on from stage 1', () => {
    const { process, stages } = run({ ...base, loop: true }, 14);
    expect(stages).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 1, 1, 2, 2]);
    expect(process.endCycle).toBeNull();
  });

  test('manual: the stage only changes when requested, on the next cycle', () => {
    const process = createSteppedProcess({ ...base, auto: false });
    expect([0, 1, 2].map((c) => process.planNext(c))).toEqual([0, 0, 0]);
    process.requestAdvance();
    expect(process.planNext(3)).toBe(1);
    expect(process.planNext(4)).toBe(1);
    expect(process.stageAt(4)).toEqual({ stage: 1, repetition: 1 });
  });

  test('manual: advancing past stage N ends the process', () => {
    const process = createSteppedProcess({ ...base, steps: 1, auto: false });
    process.requestAdvance();
    expect(process.planNext(0)).toBe(1);
    process.requestAdvance();
    expect(process.planNext(1)).toBeNull();
    expect(process.endCycle).toBe(2);
  });

  test('a request in automatic mode advances early', () => {
    const process = createSteppedProcess({ ...base, repetitions: 8 });
    process.requestAdvance();
    expect(process.planNext(0)).toBe(1);
    expect(process.planNext(1)).toBe(1);
  });

  test('planning the same cycle twice gives the same answer', () => {
    const process = createSteppedProcess({ ...base, repetitions: 1 });
    expect(process.planNext(0)).toBe(1);
    expect(process.planNext(0)).toBe(1);
    expect(process.planNext(1)).toBe(2);
  });

  test('changing M takes effect for the current stage', () => {
    const process = createSteppedProcess({ ...base, repetitions: 8 });
    expect(process.planNext(0)).toBe(0);
    process.configure({ repetitions: 2 });
    expect(process.planNext(1)).toBe(1);
  });
});
