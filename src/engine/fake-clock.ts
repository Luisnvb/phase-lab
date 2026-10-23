import type { Clock, Timer } from './engine.ts';

export type FakeClock = {
  clock: Clock;
  timer: Timer;
  /** Moves time forward, firing the timer every `tickSeconds` like setInterval would. */
  advance(seconds: number): void;
  /** Moves time forward without firing the timer (e.g. a throttled background tab). */
  jump(seconds: number): void;
  readonly timerActive: boolean;
};

/** Simulated audio clock and timer, to test the engine without an AudioContext. */
export function createFakeClock(tickSeconds = 0.025): FakeClock {
  let time = 0;
  let callback: (() => void) | null = null;
  let nextTick = 0;

  return {
    clock: () => time,
    timer: (cb) => {
      callback = cb;
      nextTick = time + tickSeconds;
      return () => {
        if (callback === cb) callback = null;
      };
    },
    advance(seconds) {
      const end = time + seconds;
      // Ticks keep their own schedule, independent of how time is advanced.
      while (callback && nextTick <= end + 1e-9) {
        time = nextTick;
        nextTick += tickSeconds;
        callback();
      }
      time = end;
    },
    jump(seconds) {
      time += seconds;
      nextTick = time + tickSeconds;
    },
    get timerActive() {
      return callback !== null;
    },
  };
}
