import { useEffect, useState } from 'react';
import { decodeState, encodeState, type UrlSchema } from '../core/url-state.ts';
import { currentQuery, currentRoute } from './use-hash-route.ts';

/**
 * Settings state kept in sync with the URL (v0.4: share configurations), so
 * the address bar always holds a link to what is on screen. Read once on
 * mount; written with replaceState, which neither reloads nor adds history.
 * `defaults` and `schema` must be stable (module-level constants).
 */
export function useUrlSettings<T extends object>(defaults: T, schema: UrlSchema<T>) {
  const [settings, setSettings] = useState(() => decodeState(currentQuery(), defaults, schema));

  useEffect(() => {
    const query = encodeState(settings, defaults, schema);
    const hash = `#/${currentRoute()}${query ? `?${query}` : ''}`;
    if (hash !== window.location.hash) window.history.replaceState(window.history.state, '', hash);
  }, [settings, defaults, schema]);

  return [settings, setSettings] as const;
}
