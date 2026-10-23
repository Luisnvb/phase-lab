export const CELL = 24;
export const LABEL_WIDTH = 30;

/** Moves the matrix cursor to a (fractional) step of a row. */
export function moveStageCursor(cursor: SVGRectElement | null, stage: number, step: number) {
  cursor?.setAttribute('transform', `translate(${LABEL_WIDTH + step * CELL} ${stage * CELL})`);
}

/** Moves a column cursor (e.g. over the voice rows) to a (fractional) step. */
export function moveColumnCursor(cursor: SVGRectElement | null, step: number) {
  cursor?.setAttribute('transform', `translate(${LABEL_WIDTH + step * CELL} 0)`);
}
