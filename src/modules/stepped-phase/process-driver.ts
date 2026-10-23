import type { SteppedProcess } from '../../core/stepped-process.ts';
import type { Engine } from '../../engine/engine.ts';

/**
 * Drives the engine from a stepped process. When the last step of a cycle of B
 * is scheduled, the stage of the following cycle is decided and queued as B's
 * pattern offset, which the engine applies on the cycle boundary. Deciding
 * this late lets a manual "next stage" land on the very next boundary. When
 * the process ends, both voices stop after their last full cycle.
 *
 * Must be attached before the engine starts.
 */
export function driveSteppedProcess(
  engine: Engine,
  process: SteppedProcess,
  stepsPerCycle: number,
): () => void {
  engine.setPatternOffset('B', process.stageAt(0)?.stage ?? 0);
  return engine.on('step', (event) => {
    if (event.voice !== 'B' || event.stepIndex !== stepsPerCycle - 1) return;
    const stage = process.planNext(event.cycleIndex);
    if (stage === null) {
      const end = process.endCycle!;
      engine.setEndCycle('A', end);
      engine.setEndCycle('B', end);
    } else {
      engine.setPatternOffset('B', stage);
    }
  });
}
