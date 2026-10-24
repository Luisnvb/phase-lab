import { useEffect } from 'react';
import type { PlaybackStatus } from '../state/use-audio-runtime.ts';
import styles from './Transport.module.css';

type Props = {
  status: PlaybackStatus;
  onToggle: () => void;
  /** Nothing to play yet (e.g. no recording). */
  disabled?: boolean;
};

const LABELS: Record<PlaybackStatus, string> = {
  idle: 'Empezar',
  loading: 'Cargando…',
  playing: 'Pausar',
  paused: 'Reanudar',
  ended: 'Empezar de nuevo',
};

/** Announced to screen readers when the state changes, e.g. with the space bar. */
const ANNOUNCEMENTS: Record<PlaybackStatus, string> = {
  idle: '',
  loading: 'Cargando el sonido',
  playing: 'Reproduciendo',
  paused: 'En pausa',
  ended: 'Proceso terminado',
};

/** Elements where the space bar already means something. */
function handlesSpace(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement) return target.type !== 'range';
  return target.closest('button, a, select, textarea, summary') !== null;
}

/** Large play/pause button, always visible; the space bar toggles it (SPEC §6). */
export function Transport({ status, onToggle, disabled = false }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || disabled || handlesSpace(event.target)) return;
      event.preventDefault();
      onToggle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onToggle, disabled]);

  const playing = status === 'playing';
  return (
    <div className={styles.transport}>
      <button
        type="button"
        className={styles.button}
        onClick={onToggle}
        disabled={disabled || status === 'loading'}
        aria-keyshortcuts="Space"
      >
        <span className={styles.icon} aria-hidden="true">
          {playing ? '❚❚' : '▶'}
        </span>
        {LABELS[status]}
      </button>
      <span className={styles.hint}>Barra espaciadora: reproducir / pausar</span>
      <span className="visually-hidden" role="status">
        {ANNOUNCEMENTS[status]}
      </span>
    </div>
  );
}
