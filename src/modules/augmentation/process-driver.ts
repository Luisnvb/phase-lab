import type { AugmentationCycle, AugmentationProcess } from '../../core/augmentation.ts';
import type { VoiceConfig } from '../../core/types.ts';
import { onCycleBoundary } from '../../engine/cycle-boundary.ts';
import type { Engine } from '../../engine/engine.ts';

/**
 * Drives the engine from an augmentation process. Voice A plays the chord, one
 * cycle per augmentation, each cycle as long as its longest note; voice B is
 * the steady pulse (one-step cycles). When the chord no longer fits, both stop
 * after A's last full cycle.
 *
 * Must be attached before the engine starts, with A already set to cycle 0.
 */
export function driveAugmentation(
  engine: Engine,
  process: AugmentationProcess,
  chordConfigFor: (cycle: AugmentationCycle) => VoiceConfig,
): () => void {
  let length = process.cycleAt(0)!.length;
  return onCycleBoundary(
    engine,
    (voice) => (voice === 'A' ? length : 1),
    (voice, nextCycle) => {
      if (voice !== 'A') return;
      const planned = process.planNext(nextCycle - 1);
      if (!planned) {
        const last = process.cycleAt(nextCycle - 1)!;
        engine.setEndCycle('A', nextCycle);
        // B's cycles are single pulses, so its cycle index counts pulses.
        engine.setEndCycle('B', last.startPulse + last.length);
        return;
      }
      length = planned.length;
      engine.setVoice(chordConfigFor(planned));
    },
  );
}
