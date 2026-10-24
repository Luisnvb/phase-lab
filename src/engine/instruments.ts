import type * as Tone from 'tone';
import type { InstrumentId, Step } from '../core/types.ts';

// Synthesized instruments (SPEC §6), no external samples. Tone.js is only used
// here, for sound generation; timing always comes from the engine.

type ToneModule = typeof Tone;

export type Instrument = {
  /** Plays a step at audio time `time`. */
  play(time: number, step: Step, duration: number): void;
  readonly output: Tone.ToneAudioNode;
  dispose(): void;
};

const DEFAULT_PITCH = 'A4';
const DEFAULT_VELOCITY = 0.8;

export function createInstrument(T: ToneModule, id: InstrumentId): Instrument {
  switch (id) {
    case 'mallet': {
      // Marimba-like: FM with a fast-decaying bright partial.
      const synth = new T.PolySynth(T.FMSynth, {
        harmonicity: 4,
        modulationIndex: 3,
        envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.25 },
        modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 },
      });
      synth.volume.value = -10;
      return {
        output: synth,
        play: (time, step, duration) =>
          synth.triggerAttackRelease(
            step.pitch ?? DEFAULT_PITCH,
            duration,
            time,
            step.velocity ?? DEFAULT_VELOCITY,
          ),
        dispose: () => synth.dispose(),
      };
    }
    case 'click': {
      const filter = new T.Filter({ type: 'bandpass', frequency: 3200, Q: 1.2 });
      const noise = new T.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 },
      }).connect(filter);
      noise.volume.value = -2;
      return {
        output: filter,
        play: (time, step) =>
          noise.triggerAttackRelease(0.03, time, step.velocity ?? DEFAULT_VELOCITY),
        dispose: () => {
          noise.dispose();
          filter.dispose();
        },
      };
    }
    case 'organ': {
      // Sustained: notes hold for their whole length, as augmentation needs.
      const synth = new T.PolySynth(T.Synth, {
        oscillator: { type: 'square4' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.15 },
      });
      synth.volume.value = -16;
      return {
        output: synth,
        play: (time, step, duration) =>
          synth.triggerAttackRelease(
            step.pitch ?? DEFAULT_PITCH,
            duration,
            time,
            step.velocity ?? DEFAULT_VELOCITY,
          ),
        dispose: () => synth.dispose(),
      };
    }
    case 'shaker': {
      // Maraca-like: very short, high-passed noise.
      const filter = new T.Filter({ type: 'highpass', frequency: 6000 });
      const noise = new T.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.002, decay: 0.05, sustain: 0, release: 0.01 },
      }).connect(filter);
      noise.volume.value = -8;
      return {
        output: filter,
        play: (time, step) =>
          noise.triggerAttackRelease(0.04, time, step.velocity ?? DEFAULT_VELOCITY),
        dispose: () => {
          noise.dispose();
          filter.dispose();
        },
      };
    }
    case 'pianoish': {
      const synth = new T.PolySynth(T.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.004, decay: 0.6, sustain: 0.1, release: 0.4 },
      });
      synth.volume.value = -12;
      return {
        output: synth,
        play: (time, step, duration) =>
          synth.triggerAttackRelease(
            step.pitch ?? DEFAULT_PITCH,
            duration,
            time,
            step.velocity ?? DEFAULT_VELOCITY,
          ),
        dispose: () => synth.dispose(),
      };
    }
  }
}
