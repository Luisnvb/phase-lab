import { createCycleHistory, type CycleHistory } from '../../core/cycle-history.ts';
import type { VoiceId } from '../../core/types.ts';
import type { AudioRuntime } from '../../engine/audio-runtime.ts';
import { driveGroupings } from './grouping-driver.ts';
import {
  basePattern,
  groupFor,
  voiceConfig,
  type GroupSize,
  type MetricSettings,
} from './settings.ts';

/**
 * Prepares a runtime for the 3-against-2 module; used for live playback and
 * for export. `current` gives the latest settings, read at every cycle boundary.
 */
export function setupMetricAmbiguity(
  runtime: AudioRuntime,
  settings: MetricSettings,
  current: () => MetricSettings = () => settings,
): { histories: Record<VoiceId, CycleHistory<GroupSize>>; detach: () => void } {
  const histories = {
    A: createCycleHistory(groupFor(settings, 'A')),
    B: createCycleHistory(groupFor(settings, 'B')),
  };
  for (const voice of ['A', 'B'] as const) runtime.setVoice(voiceConfig(settings, voice));
  const detach = driveGroupings(
    runtime.engine,
    basePattern(settings.material).steps.length,
    (voice) => ({ config: voiceConfig(current(), voice), grouping: groupFor(current(), voice) }),
    histories,
  );
  return { histories, detach };
}
