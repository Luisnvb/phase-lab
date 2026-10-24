export const PULSE_WIDTH = 12;
export const ROW_HEIGHT = 32;
export const ROLL_LABEL_WIDTH = 34;

/** Moves the piano roll cursor to a (fractional) pulse of the cycle. */
export function movePianoRollCursor(cursor: SVGRectElement | null, pulse: number) {
  cursor?.setAttribute('transform', `translate(${ROLL_LABEL_WIDTH + pulse * PULSE_WIDTH} 0)`);
}
