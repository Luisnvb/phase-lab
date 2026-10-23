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
 * What the phase display shows: B's lead within the cycle and how many full
 * cycles it has gained (each one a return to unison).
 */
export function phaseReadout(
  posA: number,
  posB: number,
  period: number,
): { offset: number; laps: number } {
  const lead = posB - posA;
  // Values a hair below an integer are float noise around an exact landing.
  const laps = Math.floor(lead / period + 1e-9);
  const offset = Math.max(0, lead - laps * period);
  return { offset: offset >= period - 1e-9 ? 0 : offset, laps };
}

/**
 * Nearest whole-step offset (0..period-1) to a fractional one, and how far it
 * is (0..0.5). With continuous phasing the resultant is only exact when the
 * distance is 0; in between, the nearest stage is the closest approximation.
 */
export function nearestStage(offset: number, period: number): { stage: number; distance: number } {
  const rounded = Math.round(offset);
  return { stage: mod(rounded, period), distance: Math.abs(offset - rounded) };
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
