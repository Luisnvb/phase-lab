import type { CycleHistory } from '../../core/cycle-history.ts';
import type { VoiceConfig, VoiceId } from '../../core/types.ts';
import { onCycleBoundary } from '../../engine/cycle-boundary.ts';
import type { Engine } from '../../engine/engine.ts';

/**
 * Applies each voice's current grouping at its next cycle boundary, so accents
 * never change mid-cycle, and records which grouping sounds from which cycle.
 */
export function driveGroupings<T>(
  engine: Engine,
  stepsPerCycle: number,
  current: (voice: VoiceId) => { config: VoiceConfig; grouping: T },
  histories: Record<VoiceId, CycleHistory<T>>,
): () => void {
  return onCycleBoundary(engine, stepsPerCycle, (voice, nextCycle) => {
    const { config, grouping } = current(voice);
    engine.setVoice(config);
    histories[voice].record(nextCycle, grouping);
  });
}
