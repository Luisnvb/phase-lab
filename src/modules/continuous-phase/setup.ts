import type { AudioRuntime } from '../../engine/audio-runtime.ts';
import { pulseSourceFor, voiceConfigs, type ContinuousPhaseSettings } from './settings.ts';

/** Prepares a runtime for continuous phasing; used for live playback and for export. */
export function setupContinuousPhase(runtime: AudioRuntime, settings: ContinuousPhaseSettings): void {
  for (const config of voiceConfigs(settings)) runtime.setVoice(config);
  runtime.engine.setPulseSource('B', pulseSourceFor(settings));
}
