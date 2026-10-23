import type * as Tone from 'tone';
import type { InstrumentId, VoiceConfig, VoiceId } from '../core/types.ts';
import { createEngine, type Engine } from './engine.ts';
import { createInstrument, type Instrument } from './instruments.ts';

/** An AudioContext, the engine driving it, and one channel per voice. */
export type AudioRuntime = {
  readonly engine: Engine;
  /** Updates the engine and the voice's instrument, panning and gain. */
  setVoice(config: VoiceConfig): void;
  /**
   * Routes every note of A and B to a single centred instrument with its own
   * timbre, so only the combination is heard. Coinciding notes add up (accent).
   */
  setSoloResultant(enabled: boolean): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  /**
   * Called when the system stops or restarts the audio on its own (iOS: a call,
   * another app, the page going to the background), so the UI can follow.
   */
  onSystemStateChange(callback: (running: boolean) => void): () => void;
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
  // iOS: play through the ring/silent switch, like a media app (Safari 16.4+).
  const audioSession = (navigator as { audioSession?: { type: string } }).audioSession;
  if (audioSession) audioSession.type = 'playback';

  const context = new AudioContext({ latencyHint: 'interactive' });
  const resumed = context.resume();

  // Loaded lazily: Tone is only needed once there is sound.
  const T = await import('tone');
  const toneContext = new T.Context(context);
  T.setContext(toneContext);
  await resumed;

  const channels = new Map<VoiceId, Channel>();
  let resultantChannel: Channel | null = null;
  let soloResultant = false;
  // Set while we suspend the context ourselves, to tell it apart from interruptions.
  let pausedByUser = false;

  const engine = createEngine({
    clock: () => context.currentTime,
    // outputLatency is missing in some browsers (Safari).
    outputLatency: () => context.outputLatency || context.baseLatency || 0,
    resume: () => {
      pausedByUser = false;
      return context.resume();
    },
    play: (event, step, voice) => {
      const channel = soloResultant ? resultantChannel : channels.get(voice.id);
      // Notes ring for most of the step, so fast tempos do not pile up voices.
      channel?.instrument.play(event.time, step, voice.pulseDuration * 0.9);
    },
  });

  function createChannel(instrumentId: InstrumentId, gainValue: number, pan: number): Channel {
    const gain = new T.Gain(gainValue).toDestination();
    const panner = new T.Panner(pan).connect(gain);
    const instrument = createInstrument(T, instrumentId);
    instrument.output.connect(panner);
    return { instrumentId, instrument, panner, gain };
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
        channels.set(config.id, createChannel(config.instrument, config.gain, config.pan));
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

    setSoloResultant(enabled) {
      // Takes effect from the next scheduled note; notes already scheduled keep their channel.
      if (enabled && !resultantChannel) resultantChannel = createChannel('pianoish', 0.7, 0);
      soloResultant = enabled;
    },

    pause() {
      pausedByUser = true;
      return context.suspend();
    },

    resume() {
      pausedByUser = false;
      return context.resume();
    },

    onSystemStateChange(callback) {
      // Besides 'suspended', Safari uses an 'interrupted' state.
      const onStateChange = () => {
        if (context.state === 'closed' || pausedByUser) return;
        callback(context.state === 'running');
      };
      context.addEventListener('statechange', onStateChange);
      return () => context.removeEventListener('statechange', onStateChange);
    },

    async dispose() {
      engine.stop();
      for (const channel of channels.values()) disposeChannel(channel);
      channels.clear();
      if (resultantChannel) disposeChannel(resultantChannel);
      resultantChannel = null;
      // Tone's wrapper closes the AudioContext; dispose() then stops its own ticker.
      await toneContext.close();
      toneContext.dispose();
    },
  };
}
