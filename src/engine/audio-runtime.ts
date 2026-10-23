import type * as Tone from 'tone';
import type { InstrumentId, VoiceConfig, VoiceId } from '../core/types.ts';
import { createEngine, type Engine } from './engine.ts';
import { createInstrument, type Instrument } from './instruments.ts';

/** An AudioContext, the engine driving it, and one channel per voice. */
export type AudioRuntime = {
  readonly engine: Engine;
  /** Updates the engine and the voice's instrument, panning and gain. */
  setVoice(config: VoiceConfig): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  /** Stops the engine, frees the audio nodes and closes the context (SPEC §4.4). */
  dispose(): Promise<void>;
};

type Channel = {
  instrumentId: InstrumentId;
  instrument: Instrument;
  panner: Tone.Panner;
  gain: Tone.Gain;
};

/**
 * Must be called from a user gesture handler (SPEC §4.4): the AudioContext is
 * created and resumed synchronously, before the first `await`, so that
 * browsers with strict autoplay rules (iOS Safari) accept it.
 */
export async function createAudioRuntime(): Promise<AudioRuntime> {
  const context = new AudioContext({ latencyHint: 'interactive' });
  const resumed = context.resume();

  // Loaded lazily: Tone is only needed once there is sound.
  const T = await import('tone');
  const toneContext = new T.Context(context);
  T.setContext(toneContext);
  await resumed;

  const channels = new Map<VoiceId, Channel>();

  const engine = createEngine({
    clock: () => context.currentTime,
    // outputLatency is missing in some browsers (Safari).
    outputLatency: () => context.outputLatency || context.baseLatency || 0,
    resume: () => context.resume(),
    play: (event, step, voice) => {
      // Notes ring for most of the step, so fast tempos do not pile up voices.
      channels.get(voice.id)?.instrument.play(event.time, step, voice.pulseDuration * 0.9);
    },
  });

  function createChannel(config: VoiceConfig): Channel {
    const gain = new T.Gain(config.gain).toDestination();
    const panner = new T.Panner(config.pan).connect(gain);
    const instrument = createInstrument(T, config.instrument);
    instrument.output.connect(panner);
    return { instrumentId: config.instrument, instrument, panner, gain };
  }

  function disposeChannel(channel: Channel): void {
    channel.instrument.dispose();
    channel.panner.dispose();
    channel.gain.dispose();
  }

  return {
    engine,

    setVoice(config) {
      engine.setVoice(config);
      const channel = channels.get(config.id);
      if (!channel) {
        channels.set(config.id, createChannel(config));
        return;
      }
      if (channel.instrumentId !== config.instrument) {
        channel.instrument.dispose();
        channel.instrument = createInstrument(T, config.instrument);
        channel.instrument.output.connect(channel.panner);
        channel.instrumentId = config.instrument;
      }
      channel.panner.pan.rampTo(config.pan, 0.05);
      channel.gain.gain.rampTo(config.gain, 0.05);
    },

    pause: () => context.suspend(),
    resume: () => context.resume(),

    async dispose() {
      engine.stop();
      for (const channel of channels.values()) disposeChannel(channel);
      channels.clear();
      // Tone's wrapper closes the AudioContext; dispose() then stops its own ticker.
      await toneContext.close();
      toneContext.dispose();
    },
  };
}
