import type { BuildProcess } from '../../core/substitution.ts';
import type { VoiceConfig, VoiceId } from '../../core/types.ts';
import { onCycleBoundary } from '../../engine/cycle-boundary.ts';
import type { Engine } from '../../engine/engine.ts';

/**
 * Drives the engine from a build process: at each voice's cycle boundary, the
 * number of beats of the next cycle is decided (the same for both voices) and
 * that voice gets the matching pattern. `configFor` reads the current settings,
 * so target, order and tempo edits are picked up at the next boundary too.
 *
 * Must be attached before the engine starts.
 */
export function driveBuildProcess(
  engine: Engine,
  process: BuildProcess,
  stepsPerCycle: number,
  configFor: (voice: VoiceId, count: number) => VoiceConfig,
): () => void {
  return onCycleBoundary(engine, stepsPerCycle, (voice, nextCycle) => {
    const count = process.planNext(nextCycle - 1);
    engine.setVoice(configFor(voice, count));
  });
}
