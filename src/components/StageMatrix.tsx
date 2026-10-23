import type { Ref } from 'react';
import type { ResultantCell } from '../core/types.ts';
import { CellMark } from './CellMark.tsx';
import { CELL, LABEL_WIDTH } from './stage-matrix-geometry.ts';
import styles from './StageMatrix.module.css';

type Props = {
  /** Rows 0..N: superposition at each stage. */
  matrix: ResultantCell[][];
  /** Row being played, or null before starting. */
  currentStage: number | null;
  /** Step cursor, moved by the caller every frame with `moveStageCursor` (stage-matrix-geometry). */
  cursorRef: Ref<SVGRectElement>;
};

const CELL_NAMES: Record<ResultantCell, string> = {
  none: 'ninguna',
  A: 'solo A',
  B: 'solo B',
  both: 'ambas',
};

export function StageMatrix({ matrix, currentStage, cursorRef }: Props) {
  const n = matrix[0]?.length ?? 0;
  const width = LABEL_WIDTH + n * CELL + 2;
  const height = matrix.length * CELL;

  return (
    <figure className={styles.figure}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Matriz de ${matrix.length} etapas por ${n} pasos: en cada etapa, qué voces suenan en cada paso.`}
      >
        {currentStage !== null && (
          <rect
            x={LABEL_WIDTH - 2}
            y={currentStage * CELL}
            width={n * CELL + 4}
            height={CELL}
            rx={4}
            className={styles.currentRow}
          />
        )}
        {matrix.map((row, stage) => (
          <g key={stage}>
            <text
              x={LABEL_WIDTH - 8}
              y={stage * CELL + CELL / 2}
              className={stage === currentStage ? styles.labelCurrent : styles.label}
            >
              {stage}
            </text>
            {row.map((cell, step) => (
              <CellMark key={step} type={cell} x={LABEL_WIDTH + step * CELL} y={stage * CELL} />
            ))}
          </g>
        ))}
        <rect
          ref={cursorRef}
          x={0}
          y={0}
          width={CELL}
          height={CELL}
          rx={4}
          className={styles.cursor}
          visibility={currentStage === null ? 'hidden' : 'visible'}
        />
      </svg>
      <figcaption>
        <ul className={styles.legend}>
          {(['both', 'A', 'B', 'none'] as const).map((type) => (
            <li key={type}>
              <svg width={CELL} height={CELL} aria-hidden="true">
                <CellMark type={type} x={0} y={0} />
              </svg>
              {CELL_NAMES[type]}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
