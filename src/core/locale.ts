// Interface languages. English is the default; the choice is remembered per browser.

export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** A stored or requested language, falling back to the default if unknown. */
export function parseLocale(value: string | null | undefined): Locale {
  return LOCALES.find((locale) => locale === value) ?? DEFAULT_LOCALE;
}
