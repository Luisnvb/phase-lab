import type { Ref } from 'react';
import type { ChordNote } from '../core/augmentation.ts';
import { PULSE_WIDTH, ROLL_LABEL_WIDTH, ROW_HEIGHT } from './piano-roll-geometry.ts';
import styles from './PianoRoll.module.css';

type Props = {
  notes: readonly ChordNote[];
  /** Lengths before augmentation, drawn dashed for comparison. */
  original: readonly ChordNote[];
  /** Pulses in the current cycle. */
  length: number;
  /** Widest cycle the roll has room for. */
  maximum: number;
  cursorRef: Ref<SVGRectElement>;
  showCursor: boolean;
};

/**
 * Piano roll for augmentation: one row per note, highest on top, with a bar
 * that stretches every cycle; a bottom row for the steady pulse.
 */
export function PianoRoll({ notes, original, length, maximum, cursorRef, showCursor }: Props) {
  const rows = [...notes].reverse();
  const pulseRow = rows.length;
  const width = ROLL_LABEL_WIDTH + maximum * PULSE_WIDTH + 2;
  const height = (rows.length + 1) * ROW_HEIGHT;
  const x = (pulse: number) => ROLL_LABEL_WIDTH + pulse * PULSE_WIDTH;

  return (
    // On narrow screens the roll keeps a readable width and scrolls sideways.
    <div className={styles.scroller} tabIndex={0} role="region" aria-label="Rollo de piano">
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Acorde de ${notes.length} notas en un ciclo de ${length} pulsos.`}
      >
        {/* Pulse grid; every fourth line is stronger. */}
        {Array.from({ length: maximum + 1 }, (_, pulse) => (
          <line
            key={pulse}
            x1={x(pulse)}
            x2={x(pulse)}
            y1={0}
            y2={height}
            className={pulse % 4 === 0 ? styles.gridStrong : styles.grid}
          />
        ))}
        {/* Region beyond the current cycle. */}
        <rect x={x(length)} y={0} width={(maximum - length) * PULSE_WIDTH} height={height} className={styles.outside} />
        <line x1={x(length)} x2={x(length)} y1={0} y2={height} className={styles.cycleEnd} />

        {rows.map((note, r) => {
          const before = original.find((o) => o.pitch === note.pitch);
          const top = r * ROW_HEIGHT + 3;
          const barHeight = ROW_HEIGHT - 6;
          return (
            <g key={note.pitch}>
              <text x={ROLL_LABEL_WIDTH - 6} y={r * ROW_HEIGHT + ROW_HEIGHT / 2} className={styles.label}>
                {note.pitch}
              </text>
              <rect
                x={x(note.onset) + 1}
                y={top}
                width={Math.max(2, note.length * PULSE_WIDTH - 2)}
                height={barHeight}
                rx={3}
                className={styles.bar}
              />
              {before && (
                <rect
                  x={x(before.onset) + 1}
                  y={top}
                  width={Math.max(2, before.length * PULSE_WIDTH - 2)}
                  height={barHeight}
                  rx={3}
                  className={styles.ghost}
                />
              )}
            </g>
          );
        })}

        <text x={ROLL_LABEL_WIDTH - 6} y={pulseRow * ROW_HEIGHT + ROW_HEIGHT / 2} className={styles.label}>
          pulso
        </text>
        {Array.from({ length }, (_, pulse) => (
          <circle
            key={pulse}
            cx={x(pulse) + 3}
            cy={pulseRow * ROW_HEIGHT + ROW_HEIGHT / 2}
            r={2.5}
            className={styles.pulse}
          />
        ))}

        <rect
          ref={cursorRef}
          x={-1}
          y={0}
          width={3}
          height={height}
          className={styles.cursor}
          visibility={showCursor ? 'visible' : 'hidden'}
        />
      </svg>
    </div>
  );
}
