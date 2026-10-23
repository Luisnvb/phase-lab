/**
 * Values that change on cycle boundaries, remembered by the cycle they start
 * on, so a display can show what is sounding rather than what was last chosen.
 */
export type CycleHistory<T> = {
  /** `value` holds from `cycle` on. Recording the current value again is a no-op. */
  record(cycle: number, value: T): void;
  valueAt(cycle: number): T;
};

export function createCycleHistory<T>(initial: T): CycleHistory<T> {
  const entries: { cycle: number; value: T }[] = [{ cycle: 0, value: initial }];
  return {
    record(cycle, value) {
      const last = entries[entries.length - 1]!;
      if (Object.is(last.value, value)) return;
      if (cycle <= last.cycle) last.value = value;
      else entries.push({ cycle, value });
    },
    valueAt(cycle) {
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i]!.cycle <= cycle) return entries[i]!.value;
      }
      return entries[0]!.value;
    },
  };
}
