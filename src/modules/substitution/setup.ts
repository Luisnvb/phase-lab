import {
  createBuildProcess,
  type BuildDirection,
  type BuildProcess,
} from '../../core/substitution.ts';
import type { AudioRuntime } from '../../engine/audio-runtime.ts';
import { driveBuildProcess } from './process-driver.ts';
import { totalBeats, voiceConfig, type SubstitutionSettings } from './settings.ts';

/** Beats the construction starts from. */
export const INITIAL_COUNT = 1;

/**
 * Prepares a runtime for construction by substitution, with a fresh process
 * attached before the first cycle; used for live playback and for export.
 * `current` gives the latest settings, read at every cycle boundary.
 */
export function setupSubstitution(
  runtime: AudioRuntime,
  settings: SubstitutionSettings,
  direction: BuildDirection,
  current: () => SubstitutionSettings = () => settings,
): { process: BuildProcess; detach: () => void } {
  const total = totalBeats(settings.target);
  const process = createBuildProcess({
    total,
    repetitions: settings.repetitions,
    direction,
    initialCount: direction === 'build' ? INITIAL_COUNT : total,
  });
  const count = process.infoAt(0)!.count;
  runtime.setVoice(voiceConfig(settings, 'A', count));
  runtime.setVoice(voiceConfig(settings, 'B', count));
  runtime.engine.setPatternOffset('B', settings.offset);
  const detach = driveBuildProcess(
    runtime.engine,
    process,
    settings.target.steps.length,
    (voice, beats) => voiceConfig(current(), voice, beats),
  );
  return { process, detach };
}
