import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** Current route from the URL hash, e.g. `#/desfase-por-saltos` → `desfase-por-saltos`. */
export function useHashRoute(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash.replace(/^#\/?/, ''));
}
