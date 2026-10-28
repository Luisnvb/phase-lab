import type { Locale } from '../core/locale.ts';
import { useLocale } from '../state/use-locale.ts';
import { en, type Messages } from './en.tsx';
import { es } from './es.tsx';

export type { Messages };

export const MESSAGES: Record<Locale, Messages> = { en, es };

/** Interface texts in the current language, and the language itself (for number formats). */
export function useMessages(): { t: Messages; locale: Locale } {
  const locale = useLocale();
  return { t: MESSAGES[locale], locale };
}
