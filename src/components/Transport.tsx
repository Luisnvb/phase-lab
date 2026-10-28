import { useEffect } from 'react';
import { useMessages } from '../i18n/messages.ts';
import type { PlaybackStatus } from '../state/use-audio-runtime.ts';
import styles from './Transport.module.css';

type Props = {
  status: PlaybackStatus;
  onToggle: () => void;
  /** Nothing to play yet (e.g. no recording). */
  disabled?: boolean;
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
  const { t } = useMessages();
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
        {t.transport.labels[status]}
      </button>
      <span className={styles.hint}>{t.transport.hint}</span>
      {/* Announced to screen readers when the state changes, e.g. with the space bar. */}
      <span className="visually-hidden" role="status">
        {t.transport.announcements[status]}
      </span>
    </div>
  );
}
