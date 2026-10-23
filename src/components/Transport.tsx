import { useEffect } from 'react';
import type { PlaybackStatus } from '../state/use-audio-runtime.ts';
import styles from './Transport.module.css';

type Props = {
  status: PlaybackStatus;
  onToggle: () => void;
};

const LABELS: Record<PlaybackStatus, string> = {
  idle: 'Empezar',
  loading: 'Cargando…',
  playing: 'Pausar',
  paused: 'Reanudar',
};

/** Elements where the space bar already means something. */
function handlesSpace(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement) return target.type !== 'range';
  return target.closest('button, a, select, textarea, summary') !== null;
}

/** Large play/pause button, always visible; the space bar toggles it (SPEC §6). */
export function Transport({ status, onToggle }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || handlesSpace(event.target)) return;
      event.preventDefault();
      onToggle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onToggle]);

  const playing = status === 'playing';
  return (
    <div className={styles.transport}>
      <button
        type="button"
        className={styles.button}
        onClick={onToggle}
        disabled={status === 'loading'}
        aria-keyshortcuts="Space"
      >
        <span className={styles.icon} aria-hidden="true">
          {playing ? '❚❚' : '▶'}
        </span>
        {LABELS[status]}
      </button>
      <span className={styles.hint}>Barra espaciadora: reproducir / pausar</span>
    </div>
  );
}
