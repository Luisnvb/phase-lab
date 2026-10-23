import { mod } from './math.ts';
import type { ScheduledEvent, VoiceId } from './types.ts';

/**
 * How many steps (real number, in [0, period)) voice B is ahead of voice A.
 * `tA` and `tB` are each voice's elapsed position measured in steps,
 * `period` is the pattern length in steps.
 */
export function phaseOffset(tA: number, tB: number, period: number): number {
  if (!(period > 0)) throw new RangeError(`period must be positive, got ${period}`);
  return mod(tB - tA, period);
}

/**
 * Elapsed position of a voice, in steps, at a given time. It interpolates linearly
 * between the last event at or before `time` and the next one (SPEC §4.3), so the
 * event queue stays the single source of truth. Returns null when `time` is not
 * bracketed by two events of that voice.
 */
export function positionAt(
  events: readonly ScheduledEvent[],
  voice: VoiceId,
  time: number,
  stepsPerCycle: number,
): number | null {
  let previous: ScheduledEvent | undefined;
  let next: ScheduledEvent | undefined;
  for (const event of events) {
    if (event.voice !== voice) continue;
    if (event.time <= time) {
      if (!previous || event.time > previous.time) previous = event;
    } else if (!next || event.time < next.time) {
      next = event;
    }
  }
  if (!previous || !next) return null;

  const fraction = (time - previous.time) / (next.time - previous.time);
  return previous.cycleIndex * stepsPerCycle + previous.stepIndex + fraction;
}
