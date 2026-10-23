import { useId } from 'react';
import styles from './Controls.module.css';

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function Slider({ label, value, min, max, step, format, onChange, disabled }: SliderProps) {
  const id = useId();
  const text = format(value);
  return (
    <div className={styles.field}>
      <div className={styles.row}>
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className={styles.value}>
          {text}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={text}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className={styles.option}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

type ChoiceProps<T extends string> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function Choice<T extends string>({ label, value, options, onChange }: ChoiceProps<T>) {
  const name = useId();
  return (
    <fieldset className={styles.field}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
