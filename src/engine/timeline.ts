import type { ScheduledEvent } from '../core/types.ts';
import type { Engine } from './engine.ts';

/**
 * Events needed to place every voice at time `now` (SPEC §4.3): the recent ones
 * from the queue plus each voice's next, already fixed, event.
 */
export function eventsAround(engine: Engine, now: number, windowSeconds = 2): ScheduledEvent[] {
  return [...engine.getRecentEvents(now - windowSeconds), ...engine.getNextEvents()];
}
