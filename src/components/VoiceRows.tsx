import type { Ref } from 'react';
import { rotate } from '../core/pattern.ts';
import { resultant } from '../core/resultant.ts';
import type { Pattern, ResultantCell } from '../core/types.ts';
import { useMessages } from '../i18n/messages.ts';
import { CellMark } from './CellMark.tsx';
import { CELL, LABEL_WIDTH } from './stage-matrix-geometry.ts';
import styles from './StageMatrix.module.css';

type Props = {
  pattern: Pattern;
  /** B's current offset in steps. */
  stage: number;
  /** Adds a third row with resultant(A, B). */
  showResultant: boolean;
  /** Step cursor, moved by the caller with `moveColumnCursor` (stage-matrix-geometry). */
  cursorRef: Ref<SVGRectElement>;
  showCursor: boolean;
};

/** What each voice plays at the current stage, step by step, aligned with A. */
export function VoiceRows({ pattern, stage, showResultant, cursorRef, showCursor }: Props) {
  const { t } = useMessages();
  const shifted = rotate(pattern, stage);
  const rows: { label: string; cells: ResultantCell[] }[] = [
    { label: 'A', cells: pattern.steps.map((s) => (s.active ? 'A' : 'none')) },
    { label: 'B', cells: shifted.steps.map((s) => (s.active ? 'B' : 'none')) },
  ];
  if (showResultant) rows.push({ label: 'A+B', cells: resultant(pattern, shifted) });

  const n = pattern.steps.length;
  const width = LABEL_WIDTH + n * CELL + 2;
  const height = rows.length * CELL;

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={t.voiceRows.label(stage, showResultant)}
    >
      {rows.map((row, r) => (
        <g key={row.label}>
          <text
            x={LABEL_WIDTH - 6}
            y={r * CELL + CELL / 2}
            className={row.label === 'A+B' ? styles.labelCurrent : styles.label}
          >
            {row.label}
          </text>
          {row.cells.map((cell, step) => (
            <CellMark key={step} type={cell} x={LABEL_WIDTH + step * CELL} y={r * CELL} />
          ))}
        </g>
      ))}
      <rect
        ref={cursorRef}
        x={0}
        y={0}
        width={CELL}
        height={height}
        rx={4}
        className={styles.cursor}
        visibility={showCursor ? 'visible' : 'hidden'}
      />
    </svg>
  );
}
