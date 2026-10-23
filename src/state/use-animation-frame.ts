import { useEffect, useRef } from 'react';

/** Calls `callback` on every animation frame while mounted. For drawing only, never for sound. */
export function useAnimationFrame(callback: () => void): void {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let frameId = 0;
    const loop = () => {
      frameId = requestAnimationFrame(loop);
      callbackRef.current();
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);
}
