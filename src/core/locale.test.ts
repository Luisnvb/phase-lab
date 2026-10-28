import { describe, expect, test } from 'vitest';
import { DEFAULT_LOCALE, parseLocale } from './locale.ts';

describe('locale', () => {
  test('English is the default', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(parseLocale(null)).toBe('en');
  });

  test('known languages are kept, anything else falls back', () => {
    expect(parseLocale('es')).toBe('es');
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('fr')).toBe('en');
    expect(parseLocale('ES')).toBe('en');
  });
});
