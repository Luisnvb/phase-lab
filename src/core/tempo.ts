/** Seconds per step for a tempo in quarter notes per minute, one step per sixteenth note. */
export function pulseDuration(bpm: number): number {
  return 60 / bpm / 4;
}
