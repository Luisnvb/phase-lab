import type { VoiceId } from '../core/types.ts';
import type { Engine } from './engine.ts';

/**
 * Calls `callback` when the last step of each cycle of each voice has just
 * been scheduled. `stepsPerCycle` may depend on the voice, and change from one
 * cycle to the next (it is read for the cycle being scheduled). A `setVoice`
 * for that voice made inside the callback takes effect exactly from the next
 * cycle: never mid-cycle, and as late as possible so user changes are heard on
 * the very next boundary.
 *
 * Each voice gets its own call, so voices that start cycles at the same time
 * are never changed one cycle apart.
 */
export function onCycleBoundary(
  engine: Engine,
  stepsPerCycle: number | ((voice: VoiceId) => number),
  callback: (voice: VoiceId, nextCycle: number) => void,
): () => void {
  const lengthOf = typeof stepsPerCycle === 'number' ? () => stepsPerCycle : stepsPerCycle;
  return engine.on('step', (event) => {
    if (event.stepIndex === lengthOf(event.voice) - 1) callback(event.voice, event.cycleIndex + 1);
  });
}
