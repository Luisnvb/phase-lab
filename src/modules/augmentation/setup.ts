import {
  createAugmentationProcess,
  type AugmentationProcess,
} from '../../core/augmentation.ts';
import type { AudioRuntime } from '../../engine/audio-runtime.ts';
import { driveAugmentation } from './process-driver.ts';
import {
  amountFor,
  chordConfig,
  chordPitches,
  MAX_CYCLE,
  MIN_CYCLE,
  pulseConfig,
  type AugmentationSettings,
} from './settings.ts';

/**
 * Prepares a runtime for augmentation, with a fresh process attached before the
 * first cycle; used for live playback and for export. `current` gives the
 * latest settings, read at every cycle boundary.
 */
export function setupAugmentation(
  runtime: AudioRuntime,
  settings: AugmentationSettings,
  current: () => AugmentationSettings = () => settings,
): { process: AugmentationProcess; detach: () => void } {
  const process = createAugmentationProcess({
    pitches: chordPitches(settings),
    mode: settings.mode,
    amount: amountFor(settings),
    minimum: MIN_CYCLE,
    maximum: MAX_CYCLE,
  });
  runtime.setVoice(chordConfig(settings, process.cycleAt(0)!));
  runtime.setVoice(pulseConfig(settings));
  const detach = driveAugmentation(runtime.engine, process, (cycle) => chordConfig(current(), cycle));
  return { process, detach };
}
