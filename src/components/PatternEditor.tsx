import type { Pattern } from '../core/types.ts';
import styles from './PatternEditor.module.css';

type Props = {
  pattern: Pattern;
  onToggle: (index: number) => void;
  onReset?: () => void;
};

/** One checkbox per step; active steps are filled, rests are hollow. */
export function PatternEditor({ pattern, onToggle, onReset }: Props) {
  return (
    <fieldset className={styles.editor}>
      <legend className={styles.legend}>Patrón</legend>
      <div className={styles.cells}>
        {pattern.steps.map((step, i) => (
          <label key={i} className={styles.cell}>
            <input
              type="checkbox"
              className={styles.input}
              checked={step.active}
              onChange={() => onToggle(i)}
              aria-label={`Paso ${i + 1}`}
            />
            <span className={styles.box} aria-hidden="true">
              {i + 1}
            </span>
          </label>
        ))}
      </div>
      {onReset && (
        <button type="button" className={styles.reset} onClick={onReset}>
          Restaurar el patrón inicial
        </button>
      )}
    </fieldset>
  );
}
