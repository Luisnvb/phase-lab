import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioRuntime, type AudioRuntime } from '../engine/audio-runtime.ts';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended';

/**
 * Owns a module's audio: the runtime is created on the first play (a user
 * gesture) and disposed when the module unmounts (SPEC §4.4). `configure` sets
 * up the voices before the engine starts.
 */
export function useAudioRuntime(configure: (runtime: AudioRuntime) => void) {
  const [runtime, setRuntime] = useState<AudioRuntime | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const runtimeRef = useRef<AudioRuntime | null>(null);
  const statusRef = useRef<PlaybackStatus>('idle');
  const configureRef = useRef(configure);
  const mountedRef = useRef(false);

  useEffect(() => {
    configureRef.current = configure;
  }, [configure]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  const updateStatus = useCallback((next: PlaybackStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  /** Stops and starts again from the beginning (both voices in unison). */
  const restart = useCallback(async () => {
    const current = runtimeRef.current;
    if (!current) return;
    current.engine.stop();
    configureRef.current(current);
    await current.engine.start();
    updateStatus('playing');
  }, [updateStatus]);

  /** For processes with an end: stops the engine once the last cycle has sounded. */
  const finish = useCallback(() => {
    runtimeRef.current?.engine.stop();
    updateStatus('ended');
  }, [updateStatus]);

  const toggle = useCallback(async () => {
    const current = runtimeRef.current;
    switch (statusRef.current) {
      case 'idle': {
        updateStatus('loading');
        let created: AudioRuntime;
        try {
          created = await createAudioRuntime();
        } catch (error) {
          console.error(error);
          updateStatus('idle');
          return;
        }
        if (!mountedRef.current) {
          await created.dispose();
          return;
        }
        runtimeRef.current = created;
        configureRef.current(created);
        await created.engine.start();
        setRuntime(created);
        updateStatus('playing');
        return;
      }
      case 'playing':
        updateStatus('paused');
        await current?.pause();
        return;
      case 'paused':
        updateStatus('playing');
        await current?.resume();
        return;
      case 'ended':
        await restart();
        return;
      case 'loading':
        return;
    }
  }, [updateStatus, restart]);

  return { runtime, status, toggle, restart, finish };
}
