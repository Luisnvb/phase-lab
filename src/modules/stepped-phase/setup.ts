import { createSteppedProcess, type SteppedProcess } from '../../core/stepped-process.ts';
import type { AudioRuntime } from '../../engine/audio-runtime.ts';
import { driveSteppedProcess } from './process-driver.ts';
import { voiceConfigs, type SteppedPhaseSettings } from './settings.ts';

/**
 * Prepares a runtime for stepped phasing, with a fresh process attached before
 * the first cycle; used for live playback and for export.
 */
export function setupSteppedPhase(
  runtime: AudioRuntime,
  settings: SteppedPhaseSettings,
  soloResultant: boolean,
): { process: SteppedProcess; detach: () => void } {
  for (const config of voiceConfigs(settings)) runtime.setVoice(config);
  runtime.setSoloResultant(soloResultant);
  const process = createSteppedProcess({
    steps: settings.pattern.steps.length,
    repetitions: settings.repetitions,
    auto: settings.auto,
    loop: settings.loop,
  });
  const detach = driveSteppedProcess(runtime.engine, process, settings.pattern.steps.length);
  return { process, detach };
}
