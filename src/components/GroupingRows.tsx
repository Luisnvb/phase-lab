import type { Ref } from 'react';
import { accentsFor } from '../core/accents.ts';
import type { Pattern } from '../core/types.ts';
import { useMessages } from '../i18n/messages.ts';
import { CELL, LABEL_WIDTH } from './stage-matrix-geometry.ts';
import styles from './StageMatrix.module.css';

type Row = {
  label: string;
  pattern: Pattern;
  groupSize: number;
  /** CSS class for the beats (voice color). */
  beatClass: string | undefined;
};

type Props = {
  rows: readonly Row[];
  cursorRef: Ref<SVGRectElement>;
  showCursor: boolean;
};

const BAR_WIDTH = 8;

/**
 * One row per voice: each group framed, accented beats as tall bars and the
 * rest as short ones, so the grouping reads by shape, not only by color.
 */
export function GroupingRows({ rows, cursorRef, showCursor }: Props) {
  const { t } = useMessages();
  const n = rows[0]?.pattern.steps.length ?? 0;
  const width = LABEL_WIDTH + n * CELL + 2;
  const height = rows.length * CELL;

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={rows
        .map((row) => t.groupingRows.voice(row.label, n / row.groupSize, row.groupSize))
        .join('. ')}
    >
      {rows.map((row, r) => {
        const accents = new Set(accentsFor(n, row.groupSize));
        const top = r * CELL;
        return (
          <g key={row.label}>
            <text x={LABEL_WIDTH - 6} y={top + CELL / 2} className={styles.label}>
              {row.label}
            </text>
            {Array.from({ length: n / row.groupSize }, (_, g) => (
              <rect
                key={g}
                x={LABEL_WIDTH + g * row.groupSize * CELL + 1}
                y={top + 1}
                width={row.groupSize * CELL - 2}
                height={CELL - 2}
                rx={5}
                className={styles.groupBox}
              />
            ))}
            {row.pattern.steps.map((step, i) => {
              const cx = LABEL_WIDTH + i * CELL + CELL / 2;
              if (!step.active) {
                return <circle key={i} cx={cx} cy={top + CELL / 2} r={2.5} className={styles.none} />;
              }
              const barHeight = accents.has(i) ? CELL - 8 : 7;
              return (
                <rect
                  key={i}
                  x={cx - BAR_WIDTH / 2}
                  y={top + CELL - 4 - barHeight}
                  width={BAR_WIDTH}
                  height={barHeight}
                  rx={2}
                  className={row.beatClass}
                />
              );
            })}
          </g>
        );
      })}
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
