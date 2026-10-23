import { assertInteger, mod } from '../core/math.ts';
import type { ScheduledEvent, Step, VoiceConfig, VoiceId } from '../core/types.ts';
import { EventQueue } from './event-queue.ts';

// Lookahead scheduler (SPEC §4). Each voice keeps its own clock position and
// period; events are placed on the audio clock, never fired from the timer itself.

/** Current audio time in seconds (AudioContext.currentTime, or a fake in tests). */
export type Clock = () => number;

/** Calls `callback` every `intervalMs` until the returned function is called. */
export type Timer = (callback: () => void, intervalMs: number) => () => void;

/** Receives every active event that is still in the future, to be played at `event.time`. */
export type NoteSink = (event: ScheduledEvent, step: Step, voice: VoiceConfig) => void;

export type EngineEventName = 'cycle' | 'step';

export interface Engine {
  start(): Promise<void>;
  stop(): void;
  setVoice(config: VoiceConfig): void;
  setPulseDuration(voice: VoiceId, seconds: number): void;
  /** Applied at the start of the voice's next cycle, never mid-cycle. */
  setPatternOffset(voice: VoiceId, steps: number): void;
  getRecentEvents(sinceTime: number): ScheduledEvent[];
  /** Visual time: audio clock minus output latency (SPEC §4.3). */
  now(): number;
  /**
   * Listeners run when an event is scheduled, up to `lookahead` seconds before
   * it sounds; compare `event.time` with `now()` to know when it is heard.
   */
  on(event: EngineEventName, callback: (e: ScheduledEvent) => void): () => void;
}

export type EngineOptions = {
  clock: Clock;
  play?: NoteSink;
  /** Output latency in seconds; subtracted from the clock in `now()`. */
  outputLatency?: () => number;
  /** Called by `start()` before scheduling, e.g. to resume the AudioContext. */
  resume?: () => Promise<void>;
  timer?: Timer;
  /** Seconds ahead of the clock that events are scheduled. */
  lookahead?: number;
  intervalMs?: number;
  /** Delay between `start()` and the first event, so it is not scheduled late. */
  startDelay?: number;
  queueCapacity?: number;
};

type VoiceState = {
  config: VoiceConfig;
  nextTime: number;
  stepIndex: number;
  cycleIndex: number;
  patternOffset: number;
  pendingOffset: number | null;
};

const intervalTimer: Timer = (callback, intervalMs) => {
  const id = setInterval(callback, intervalMs);
  return () => clearInterval(id);
};

function validateConfig(config: VoiceConfig): void {
  validatePulseDuration(config.pulseDuration);
  if (config.pattern.steps.length === 0) {
    throw new RangeError(`Voice ${config.id} has an empty pattern`);
  }
}

function validatePulseDuration(seconds: number): void {
  // A zero or invalid period would make the scheduling loop never end.
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new RangeError(`pulseDuration must be a positive number of seconds, got ${seconds}`);
  }
}

export function createEngine(options: EngineOptions): Engine {
  const {
    clock,
    play,
    outputLatency,
    resume,
    timer = intervalTimer,
    lookahead = 0.1,
    intervalMs = 25,
    startDelay = 0.05,
    queueCapacity = 1024,
  } = options;

  const voices = new Map<VoiceId, VoiceState>();
  const queue = new EventQueue<ScheduledEvent>(queueCapacity);
  const listeners: Record<EngineEventName, Set<(e: ScheduledEvent) => void>> = {
    cycle: new Set(),
    step: new Set(),
  };

  let running = false;
  let cancelTimer: (() => void) | null = null;
  // Incremented by stop() so that a pending start() can tell it was cancelled.
  let generation = 0;

  function getVoice(id: VoiceId): VoiceState {
    const voice = voices.get(id);
    if (!voice) throw new Error(`Unknown voice ${id}`);
    return voice;
  }

  function emit(name: EngineEventName, event: ScheduledEvent): void {
    for (const callback of listeners[name]) callback(event);
  }

  function scheduleNext(voice: VoiceState, currentTime: number): void {
    if (voice.stepIndex === 0 && voice.pendingOffset !== null) {
      voice.patternOffset = voice.pendingOffset;
      voice.pendingOffset = null;
    }

    const { steps } = voice.config.pattern;
    const step = steps[mod(voice.stepIndex + voice.patternOffset, steps.length)]!;
    const event: ScheduledEvent = {
      voice: voice.config.id,
      stepIndex: voice.stepIndex,
      cycleIndex: voice.cycleIndex,
      time: voice.nextTime,
      active: step.active,
    };

    queue.push(event);
    // An event that is already late (e.g. the timer was throttled in a background
    // tab) is skipped by the audio but kept in the timeline.
    if (event.active && event.time >= currentTime) play?.(event, step, voice.config);
    if (event.stepIndex === 0) emit('cycle', event);
    emit('step', event);

    // Always advance from nextTime, so tempo changes never accumulate drift (SPEC §10).
    voice.nextTime += voice.config.pulseDuration;
    voice.stepIndex++;
    if (voice.stepIndex >= voice.config.pattern.steps.length) {
      voice.stepIndex = 0;
      voice.cycleIndex++;
    }
  }

  function tick(): void {
    const currentTime = clock();
    const horizon = currentTime + lookahead;
    for (const voice of voices.values()) {
      while (voice.nextTime < horizon) scheduleNext(voice, currentTime);
    }
  }

  function resetTimeline(voice: VoiceState): void {
    voice.stepIndex = 0;
    voice.cycleIndex = 0;
    voice.nextTime = 0;
    if (voice.pendingOffset !== null) {
      voice.patternOffset = voice.pendingOffset;
      voice.pendingOffset = null;
    }
  }

  return {
    async start() {
      if (running) return;
      const startGeneration = ++generation;
      await resume?.();
      if (startGeneration !== generation || running) return;

      running = true;
      const firstTime = clock() + startDelay;
      for (const voice of voices.values()) voice.nextTime = firstTime;
      tick();
      cancelTimer = timer(tick, intervalMs);
    },

    stop() {
      generation++;
      running = false;
      cancelTimer?.();
      cancelTimer = null;
      queue.clear();
      for (const voice of voices.values()) resetTimeline(voice);
    },

    setVoice(config) {
      validateConfig(config);
      const existing = voices.get(config.id);
      if (existing) {
        existing.config = config;
        if (existing.stepIndex >= config.pattern.steps.length) {
          existing.stepIndex = 0;
          existing.cycleIndex++;
        }
        return;
      }
      voices.set(config.id, {
        config,
        nextTime: running ? clock() + startDelay : 0,
        stepIndex: 0,
        cycleIndex: 0,
        patternOffset: 0,
        pendingOffset: null,
      });
    },

    setPulseDuration(id, seconds) {
      validatePulseDuration(seconds);
      const voice = getVoice(id);
      voice.config = { ...voice.config, pulseDuration: seconds };
    },

    setPatternOffset(id, steps) {
      assertInteger(steps, 'steps');
      const voice = getVoice(id);
      if (!running) {
        // Nothing of the current cycle has been scheduled yet.
        voice.patternOffset = steps;
        voice.pendingOffset = null;
      } else {
        voice.pendingOffset = steps;
      }
    },

    getRecentEvents(sinceTime) {
      return queue
        .toArray()
        .filter((event) => event.time >= sinceTime)
        .sort((a, b) => a.time - b.time);
    },

    now() {
      return clock() - (outputLatency?.() ?? 0);
    },

    on(name, callback) {
      listeners[name].add(callback);
      return () => {
        listeners[name].delete(callback);
      };
    },
  };
}
