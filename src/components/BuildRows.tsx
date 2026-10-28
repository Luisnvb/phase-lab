import type { Ref } from 'react';
import { mod } from '../core/math.ts';
import { rotate } from '../core/pattern.ts';
import { resultant } from '../core/resultant.ts';
import { partialPattern } from '../core/substitution.ts';
import type { Pattern } from '../core/types.ts';
import { useMessages } from '../i18n/messages.ts';
import { CellMark } from './CellMark.tsx';
import { CELL, LABEL_WIDTH } from './stage-matrix-geometry.ts';
import styles from './StageMatrix.module.css';

type Props = {
  target: Pattern;
  /** Order in which the target's beats are substituted. */
  order: readonly number[];
  /** Beats substituted so far. */
  count: number;
  twoVoices: boolean;
  offset: number;
  showResultant: boolean;
  cursorRef: Ref<SVGRectElement>;
  showCursor: boolean;
};

const INSET = 3;

/**
 * Construction by substitution: the target pattern in grey (dashed, with its
 * turn number) and the beats already substituted, filled. Optional second
 * voice, shifted, and their resultant.
 */
export function BuildRows(props: Props) {
  const { t } = useMessages();
  const { target, order, count, twoVoices, offset, showResultant, cursorRef, showCursor } = props;
  const n = target.steps.length;
  const built = new Set(order.slice(0, count));
  const turn = new Map(order.map((step, i) => [step, i + 1]));

  const voiceRows = [{ label: 'A', shift: 0, fill: styles.a }];
  if (twoVoices) voiceRows.push({ label: 'B', shift: offset, fill: styles.bFill });
  const rowCount = voiceRows.length + (twoVoices && showResultant ? 1 : 0);
  const width = LABEL_WIDTH + n * CELL + 2;
  const height = rowCount * CELL;
  const size = CELL - INSET * 2;

  const partial = partialPattern(target, order, count);

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={t.buildRows.label(order.length, count)}
    >
      {voiceRows.map((row, r) => (
        <g key={row.label}>
          <text x={LABEL_WIDTH - 6} y={r * CELL + CELL / 2} className={styles.label}>
            {row.label}
          </text>
          {Array.from({ length: n }, (_, i) => {
            // What this voice plays at position i, given its shift.
            const step = mod(i + row.shift, n);
            const x = LABEL_WIDTH + i * CELL + INSET;
            const y = r * CELL + INSET;
            if (built.has(step)) {
              return <rect key={i} x={x} y={y} width={size} height={size} rx={3} className={row.fill} />;
            }
            if (target.steps[step]?.active) {
              return (
                <g key={i}>
                  <rect x={x} y={y} width={size} height={size} rx={3} className={styles.pending} />
                  <text x={x + size / 2} y={y + size / 2} className={styles.turn}>
                    {turn.get(step)}
                  </text>
                </g>
              );
            }
            return (
              <circle key={i} cx={x + size / 2} cy={y + size / 2} r={2.5} className={styles.none} />
            );
          })}
        </g>
      ))}
      {twoVoices && showResultant && (
        <g>
          <text x={LABEL_WIDTH - 6} y={2 * CELL + CELL / 2} className={styles.labelCurrent}>
            A+B
          </text>
          {resultant(partial, rotate(partial, offset)).map((cell, i) => (
            <CellMark key={i} type={cell} x={LABEL_WIDTH + i * CELL} y={2 * CELL} />
          ))}
        </g>
      )}
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
