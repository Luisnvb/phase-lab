import { LOCALES } from '../core/locale.ts';
import { useMessages } from '../i18n/messages.ts';
import { setLocale } from '../state/use-locale.ts';
import styles from './LanguageSwitch.module.css';

/** Each language is named in itself, so it can be found whatever is on screen. */
const NATIVE_NAMES = { en: 'English', es: 'Español' } as const;

export function LanguageSwitch() {
  const { t, locale } = useMessages();
  return (
    <div className={styles.switch} role="group" aria-label={t.language}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          className={styles.button}
          aria-pressed={option === locale}
          onClick={() => setLocale(option)}
        >
          {NATIVE_NAMES[option]}
        </button>
      ))}
    </div>
  );
}
