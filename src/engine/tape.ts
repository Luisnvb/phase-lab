import {
  synthesizeSample,
  tapePositionAt,
  withRateChange,
  type TapeSegment,
} from '../core/tape.ts';

/** Part of the recording that loops, in seconds. */
export type TapeRegion = { readonly start: number; readonly end: number };

/**
 * Tape phasing (variant of module 1): two looping copies of a recording,
 * panned apart; B plays slightly faster. Both start on the same audio-clock
 * time, and rate changes are scheduled on that clock too. The recording stays
 * in memory: it is never uploaded or stored.
 */
export type TapeSession = {
  /** Visual time: audio clock minus output latency (SPEC §4.3). */
  now(): number;
  /** Records from the microphone for up to `maxSeconds`, or until `signal` aborts. */
  record(maxSeconds: number, signal?: AbortSignal): Promise<AudioBuffer>;
  /** A synthesized sample, for trying it without a microphone. */
  sample(): AudioBuffer;
  /** Starts (or restarts) both loops in unison. */
  play(buffer: AudioBuffer, region: TapeRegion, rateB: number): void;
  setRateB(rate: number): void;
  stop(): void;
  /** Seconds of material each loop has played by `time` (unwrapped), or null if stopped. */
  positions(time: number): { a: number; b: number } | null;
  pause(): Promise<void>;
  resume(): Promise<void>;
  dispose(): Promise<void>;
};

type Loop = { source: AudioBufferSourceNode; segments: TapeSegment[] };

const PAN = 0.4;
const START_DELAY = 0.05;

function setAudioSession(type: string) {
  // iOS: recording needs 'play-and-record'; playback should ignore the silent switch.
  const audioSession = (navigator as { audioSession?: { type: string } }).audioSession;
  if (audioSession) audioSession.type = type;
}

/** Must be called from a user gesture handler (SPEC §4.4). */
export function createTapeSession(): TapeSession {
  setAudioSession('playback');
  const context = new AudioContext({ latencyHint: 'interactive' });
  void context.resume();

  const output = context.createGain();
  output.gain.value = 0.8;
  output.connect(context.destination);
  const panners = [-PAN, PAN].map((pan) => {
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(output);
    return panner;
  });

  let loops: [Loop, Loop] | null = null;

  function stop() {
    for (const loop of loops ?? []) {
      loop.source.stop();
      loop.source.disconnect();
    }
    loops = null;
  }

  return {
    now() {
      // outputLatency is missing in some browsers (Safari).
      return context.currentTime - (context.outputLatency || context.baseLatency || 0);
    },

    async record(maxSeconds, signal) {
      setAudioSession('play-and-record');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      try {
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        recorder.addEventListener('dataavailable', (event) => chunks.push(event.data));
        const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve));
        const finish = () => {
          if (recorder.state !== 'inactive') recorder.stop();
        };
        recorder.start();
        // Only ends the recording; no sound is ever triggered from a timer.
        const limit = setTimeout(finish, maxSeconds * 1000);
        signal?.addEventListener('abort', finish, { once: true });
        await stopped;
        clearTimeout(limit);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        return await context.decodeAudioData(await blob.arrayBuffer());
      } finally {
        for (const track of stream.getTracks()) track.stop();
        setAudioSession('playback');
      }
    },

    sample() {
      const samples = synthesizeSample(context.sampleRate);
      const buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.copyToChannel(samples, 0);
      return buffer;
    },

    play(buffer, region, rateB) {
      stop();
      void context.resume();
      const at = context.currentTime + START_DELAY;
      const make = (rate: number, panner: StereoPannerNode): Loop => {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = region.start;
        source.loopEnd = region.end;
        source.playbackRate.value = rate;
        source.connect(panner);
        source.start(at, region.start);
        return { source, segments: [{ time: at, position: 0, rate }] };
      };
      loops = [make(1, panners[0]!), make(rateB, panners[1]!)];
    },

    setRateB(rate) {
      const b = loops?.[1];
      if (!b) return;
      const at = context.currentTime;
      b.source.playbackRate.setValueAtTime(rate, at);
      b.segments = withRateChange(b.segments, at, rate);
    },

    stop,

    positions(time) {
      if (!loops) return null;
      return { a: tapePositionAt(loops[0].segments, time), b: tapePositionAt(loops[1].segments, time) };
    },

    pause: () => context.suspend(),
    resume: () => context.resume(),

    async dispose() {
      stop();
      await context.close();
    },
  };
}
