import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** Route part of the URL hash: `#/desfase-por-saltos?bpm=90` → `desfase-por-saltos`. */
export function currentRoute(): string {
  return window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';
}

/** Query part of the URL hash: `#/desfase-por-saltos?bpm=90` → `bpm=90`. */
export function currentQuery(): string {
  const hash = window.location.hash;
  const start = hash.indexOf('?');
  return start === -1 ? '' : hash.slice(start + 1);
}

/** Current route from the URL hash, e.g. `#/desfase-por-saltos` → `desfase-por-saltos`. */
export function useHashRoute(): string {
  return useSyncExternalStore(subscribe, currentRoute);
}
