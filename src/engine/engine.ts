import { assertInteger, mod } from '../core/math.ts';
import type {
  PulseContext,
  PulseSource,
  ScheduledEvent,
  Step,
  VoiceConfig,
  VoiceId,
} from '../core/types.ts';
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
  /**
   * Lets `source` decide each interval of the voice instead of its pulse
   * duration (e.g. plateau phasing). `null` goes back to the pulse duration.
   */
  setPulseSource(voice: VoiceId, source: PulseSource | null): void;
  /** Applied at the start of the voice's next cycle, never mid-cycle. */
  setPatternOffset(voice: VoiceId, steps: number): void;
  /**
   * The voice plays no cycle from `cycle` on (`null`: no end). A cycle already
   * started is never cut short. Cleared by `stop()`.
   */
  setEndCycle(voice: VoiceId, cycle: number | null): void;
  getRecentEvents(sinceTime: number): ScheduledEvent[];
  /**
   * The next event of each voice: its time is already fixed but it is not in the
   * queue yet. Needed to interpolate when the pulse is longer than the lookahead.
   */
  getNextEvents(): ScheduledEvent[];
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

// Event times kept per voice for `timeOf` / `indexAt`.
const HISTORY_SIZE = 256;

type VoiceState = {
  config: VoiceConfig;
  source: PulseSource | null;
  nextTime: number;
  /** Absolute index of the next event to schedule. */
  index: number;
  stepIndex: number;
  cycleIndex: number;
  patternOffset: number;
  pendingOffset: number | null;
  endCycle: number | null;
  /** Times of past events, at `index % HISTORY_SIZE`. */
  history: Float64Array;
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

  function timeOf(id: VoiceId, index: number): number {
    const voice = getVoice(id);
    const oldest = Math.max(0, voice.index - HISTORY_SIZE);
    if (index >= oldest && index < voice.index) return voice.history[index % HISTORY_SIZE]!;
    // Not scheduled yet (or forgotten): extrapolate from the next event.
    return voice.nextTime + (index - voice.index) * voice.config.pulseDuration;
  }

  function indexAt(id: VoiceId, time: number): number {
    const voice = getVoice(id);
    const pulse = voice.config.pulseDuration;
    let afterIndex = voice.index;
    let afterTime = voice.nextTime;
    if (time < afterTime) {
      const oldest = Math.max(0, voice.index - HISTORY_SIZE);
      for (let i = voice.index - 1; i >= oldest; i--) {
        const t = voice.history[i % HISTORY_SIZE]!;
        if (t <= time) return i + (time - t) / (afterTime - t);
        afterIndex = i;
        afterTime = t;
      }
    }
    return afterIndex + (time - afterTime) / pulse;
  }

  const pulseContext = (time: number, index: number): PulseContext => ({
    time,
    index,
    timeOf,
    indexAt,
    pulseOf: (id) => getVoice(id).config.pulseDuration,
  });

  function emit(name: EngineEventName, event: ScheduledEvent): void {
    for (const callback of listeners[name]) callback(event);
  }

  function currentStep(voice: VoiceState, offset: number): Step {
    const { steps } = voice.config.pattern;
    return steps[mod(voice.stepIndex + offset, steps.length)]!;
  }

  function eventFor(voice: VoiceState, step: Step): ScheduledEvent {
    return {
      voice: voice.config.id,
      stepIndex: voice.stepIndex,
      cycleIndex: voice.cycleIndex,
      time: voice.nextTime,
      active: step.active,
    };
  }

  function scheduleNext(voice: VoiceState, currentTime: number): void {
    if (voice.stepIndex === 0 && voice.pendingOffset !== null) {
      voice.patternOffset = voice.pendingOffset;
      voice.pendingOffset = null;
    }

    const step = currentStep(voice, voice.patternOffset);
    // A listener may replace the pattern; this cycle still ends at the length it was played with.
    const cycleLength = voice.config.pattern.steps.length;
    const event = eventFor(voice, step);

    queue.push(event);
    voice.history[voice.index % HISTORY_SIZE] = event.time;
    // An event that is already late (e.g. the timer was throttled in a background
    // tab) is skipped by the audio but kept in the timeline.
    if (event.active && event.time >= currentTime) play?.(event, step, voice.config);
    if (event.stepIndex === 0) emit('cycle', event);
    emit('step', event);

    const interval = voice.source
      ? voice.source.next(pulseContext(event.time, voice.index))
      : voice.config.pulseDuration;
    validatePulseDuration(interval);

    // Always advance from nextTime, so tempo changes never accumulate drift (SPEC §10).
    voice.nextTime += interval;
    voice.index++;
    voice.stepIndex++;
    if (voice.stepIndex >= cycleLength) {
      voice.stepIndex = 0;
      voice.cycleIndex++;
    }
  }

  function tick(): void {
    const currentTime = clock();
    const horizon = currentTime + lookahead;
    // Schedule all voices in chronological order, so a pulse source always sees
    // the other voices scheduled up to its own time. Ties go to the voice added first.
    for (;;) {
      let earliest: VoiceState | null = null;
      for (const voice of voices.values()) {
        // A voice only ends on a cycle boundary.
        const finished =
          voice.endCycle !== null && voice.stepIndex === 0 && voice.cycleIndex >= voice.endCycle;
        if (finished || voice.nextTime >= horizon) continue;
        if (!earliest || voice.nextTime < earliest.nextTime) {
          earliest = voice;
        }
      }
      if (!earliest) return;
      scheduleNext(earliest, currentTime);
    }
  }

  function resetTimeline(voice: VoiceState): void {
    voice.index = 0;
    voice.stepIndex = 0;
    voice.cycleIndex = 0;
    voice.nextTime = 0;
    voice.endCycle = null;
    voice.source?.reset?.();
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
        source: null,
        nextTime: running ? clock() + startDelay : 0,
        index: 0,
        stepIndex: 0,
        cycleIndex: 0,
        patternOffset: 0,
        pendingOffset: null,
        endCycle: null,
        history: new Float64Array(HISTORY_SIZE),
      });
    },

    setPulseDuration(id, seconds) {
      validatePulseDuration(seconds);
      const voice = getVoice(id);
      voice.config = { ...voice.config, pulseDuration: seconds };
    },

    setPulseSource(id, source) {
      getVoice(id).source = source;
    },

    setEndCycle(id, cycle) {
      if (cycle !== null) assertInteger(cycle, 'cycle');
      getVoice(id).endCycle = cycle;
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

    getNextEvents() {
      if (!running) return [];
      return [...voices.values()].map((voice) => {
        const offset =
          voice.stepIndex === 0 && voice.pendingOffset !== null
            ? voice.pendingOffset
            : voice.patternOffset;
        return eventFor(voice, currentStep(voice, offset));
      });
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
