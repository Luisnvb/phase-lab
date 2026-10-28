import type { MelodyNote } from '../core/pitch.ts';
import { useMessages } from '../i18n/messages.ts';
import styles from './PitchListEditor.module.css';

type Props = {
  legend: string;
  notes: readonly MelodyNote[];
  /** Pitches offered by every selector. */
  pitches: readonly string[];
  /** Offer a rest (null) as well. */
  rests?: boolean;
  /** Accessible name of each selector, from 1. */
  itemLabel: (n: number) => string;
  onChange: (index: number, note: MelodyNote) => void;
  onReset: () => void;
  resetLabel: string;
  disabled?: boolean;
  /** Shown under the selectors, e.g. why they are disabled. */
  hint?: string;
};

const REST = '';

/** One pitch selector per note; rests are drawn dashed, so they read without color. */
export function PitchListEditor(props: Props) {
  const { legend, notes, pitches, rests = false, itemLabel, onChange, onReset, resetLabel, disabled, hint } =
    props;
  const { t } = useMessages();
  return (
    <fieldset className={styles.editor} disabled={disabled}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.cells}>
        {notes.map((note, i) => (
          <label key={i} className={styles.cell}>
            <span className={styles.number} aria-hidden="true">
              {i + 1}
            </span>
            <select
              className={styles.select}
              value={note ?? REST}
              data-rest={note === null || undefined}
              aria-label={itemLabel(i + 1)}
              onChange={(event) => onChange(i, event.target.value === REST ? null : event.target.value)}
            >
              {rests && <option value={REST}>{t.pitchEditor.rest}</option>}
              {pitches.map((pitch) => (
                <option key={pitch} value={pitch}>
                  {t.pitchName(pitch)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
      <button type="button" className={styles.reset} onClick={onReset}>
        {resetLabel}
      </button>
    </fieldset>
  );
}
