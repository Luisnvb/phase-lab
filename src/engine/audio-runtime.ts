import type * as Tone from 'tone';
import type { InstrumentId, VoiceConfig, VoiceId } from '../core/types.ts';
import { trimTrailingSilence } from '../core/wav.ts';
import { createEngine, type Engine, type EngineOptions } from './engine.ts';
import { createFakeClock } from './fake-clock.ts';
import { createInstrument, type Instrument } from './instruments.ts';

/** An AudioContext, the engine driving it, and one channel per voice. */
export type AudioRuntime = {
  readonly engine: Engine;
  /** Updates the engine and the voice's instrument, panning and gain. */
  setVoice(config: VoiceConfig): void;
  /** Changes only a voice's gain and panning, leaving its pattern and timing alone. */
  setMix(voice: VoiceId, gain: number, pan: number): void;
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

type ToneModule = typeof Tone;

type Channel = {
  instrumentId: InstrumentId;
  instrument: Instrument;
  panner: Tone.Panner;
  gain: Tone.Gain;
};

type Voices = Pick<AudioRuntime, 'engine' | 'setVoice' | 'setMix' | 'setSoloResultant'> & {
  disposeChannels(): void;
};

/**
 * The engine plus one Tone channel per voice, on Tone's current context. Shared
 * by live playback and offline rendering, so both sound exactly the same.
 */
function createVoices(T: ToneModule, engineOptions: Omit<EngineOptions, 'play'>): Voices {
  const channels = new Map<VoiceId, Channel>();
  let resultantChannel: Channel | null = null;
  let soloResultant = false;

  const engine = createEngine({
    ...engineOptions,
    play: (event, step, voice) => {
      const channel = soloResultant ? resultantChannel : channels.get(voice.id);
      // By default notes ring for most of the step, so fast tempos do not pile up voices.
      channel?.instrument.play(event.time, step, voice.pulseDuration * (step.length ?? 0.9));
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

    setMix(voice, gain, pan) {
      const channel = channels.get(voice);
      channel?.gain.gain.rampTo(gain, 0.05);
      channel?.panner.pan.rampTo(pan, 0.05);
    },

    setSoloResultant(enabled) {
      // Takes effect from the next scheduled note; notes already scheduled keep their channel.
      if (enabled && !resultantChannel) resultantChannel = createChannel('pianoish', 0.7, 0);
      soloResultant = enabled;
    },

    disposeChannels() {
      engine.stop();
      for (const channel of channels.values()) disposeChannel(channel);
      channels.clear();
      if (resultantChannel) disposeChannel(resultantChannel);
      resultantChannel = null;
    },
  };
}

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

  // Set while we suspend the context ourselves, to tell it apart from interruptions.
  let pausedByUser = false;

  const voices = createVoices(T, {
    clock: () => context.currentTime,
    // outputLatency is missing in some browsers (Safari).
    outputLatency: () => context.outputLatency || context.baseLatency || 0,
    resume: () => {
      pausedByUser = false;
      return context.resume();
    },
  });

  return {
    engine: voices.engine,
    setVoice: voices.setVoice,
    setMix: voices.setMix,
    setSoloResultant: voices.setSoloResultant,

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
      voices.disposeChannels();
      // Tone's wrapper closes the AudioContext; dispose() then stops its own ticker.
      await toneContext.close();
      toneContext.dispose();
    },
  };
}

/** Rendered audio: one array of samples per channel. */
export type RenderedAudio = { channels: Float32Array[]; sampleRate: number };

const RENDER_SAMPLE_RATE = 44100;

/**
 * Renders `seconds` of a module offline, faster than real time (v0.4: export
 * audio). `setup` is the same function the module uses before live playback,
 * so the export sounds exactly like what is heard. The engine runs on a
 * simulated clock that is stepped through the whole duration before Tone
 * renders; silence after a process ends is trimmed.
 */
export async function renderOffline(
  setup: (runtime: AudioRuntime) => void,
  seconds: number,
): Promise<RenderedAudio> {
  const T = await import('tone');
  const rendered = await T.Offline(
    async () => {
      const fake = createFakeClock();
      const voices = createVoices(T, { clock: fake.clock, timer: fake.timer });
      setup({
        engine: voices.engine,
        setVoice: voices.setVoice,
        setMix: voices.setMix,
        setSoloResultant: voices.setSoloResultant,
        pause: async () => {},
        resume: async () => {},
        onSystemStateChange: () => () => {},
        dispose: async () => voices.disposeChannels(),
      });
      await voices.engine.start();
      // Schedule every note of the duration now; Tone renders them afterwards.
      fake.advance(seconds);
      voices.engine.stop();
    },
    seconds,
    2,
    RENDER_SAMPLE_RATE,
  );
  const channels = [0, 1].map((c) => rendered.getChannelData(c));
  return {
    channels: trimTrailingSilence(channels, RENDER_SAMPLE_RATE),
    sampleRate: RENDER_SAMPLE_RATE,
  };
}
