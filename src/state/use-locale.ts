import { useSyncExternalStore } from 'react';
import { parseLocale, type Locale } from '../core/locale.ts';

const STORAGE_KEY = 'phase-lab:locale';
const listeners = new Set<() => void>();

/** Storage can be missing or throw (private windows, blocked site data). */
function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

let current: Locale = parseLocale(readStored());
document.documentElement.lang = current;

export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  document.documentElement.lang = locale;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Not remembered, but the page still switches.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Interface language: English by default, then whatever the user last chose. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, () => current);
}
