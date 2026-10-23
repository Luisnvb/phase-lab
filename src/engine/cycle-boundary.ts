import type { VoiceId } from '../core/types.ts';
import type { Engine } from './engine.ts';

/**
 * Calls `callback` when the last step of each cycle of each voice has just
 * been scheduled. A `setVoice` for that voice made inside the callback takes
 * effect exactly from the next cycle: never mid-cycle, and as late as possible
 * so user changes are heard on the very next boundary.
 *
 * Each voice gets its own call, so voices that start cycles at the same time
 * are never changed one cycle apart.
 */
export function onCycleBoundary(
  engine: Engine,
  stepsPerCycle: number,
  callback: (voice: VoiceId, nextCycle: number) => void,
): () => void {
  return engine.on('step', (event) => {
    if (event.stepIndex === stepsPerCycle - 1) callback(event.voice, event.cycleIndex + 1);
  });
}
