import type { Locale } from '../core/locale.ts';

const NUMBER_LOCALES: Record<Locale, string> = { en: 'en-US', es: 'es-ES' };

// Formatters are reused: some readouts update every animation frame.
const cache = new Map<string, Intl.NumberFormat>();

/** A number with exactly `digits` decimals, in the interface language (1.25 / 1,25). */
export function formatDecimal(locale: Locale, value: number, digits: number): string {
  const key = `${locale}:${digits}`;
  let format = cache.get(key);
  if (!format) {
    format = new Intl.NumberFormat(NUMBER_LOCALES[locale], {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    cache.set(key, format);
  }
  return format.format(value);
}
