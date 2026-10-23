import type { ResultantCell } from '../core/types.ts';
import { CELL } from './stage-matrix-geometry.ts';
import styles from './StageMatrix.module.css';

const INSET = 3;

/**
 * SVG mark for one step of a superposition. Four styles that do not depend on
 * color: both = filled, A only = half, B only = outline, none = dot (SPEC §5).
 */
export function CellMark({ type, x, y }: { type: ResultantCell; x: number; y: number }) {
  const size = CELL - INSET * 2;
  const left = x + INSET;
  const top = y + INSET;
  switch (type) {
    case 'both':
      return <rect x={left} y={top} width={size} height={size} rx={3} className={styles.both} />;
    case 'A':
      return (
        <g>
          <rect x={left} y={top} width={size} height={size} rx={3} className={styles.frame} />
          <rect x={left} y={top} width={size / 2} height={size} rx={2} className={styles.a} />
        </g>
      );
    case 'B':
      return (
        <rect
          x={left + 1}
          y={top + 1}
          width={size - 2}
          height={size - 2}
          rx={3}
          className={styles.b}
        />
      );
    case 'none':
      return <circle cx={x + CELL / 2} cy={y + CELL / 2} r={2.5} className={styles.none} />;
  }
}
