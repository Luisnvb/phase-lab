import { useState } from 'react';
import { encodeWav } from '../core/wav.ts';
import type { RenderedAudio } from '../engine/audio-runtime.ts';
import { useMessages } from '../i18n/messages.ts';
import { Choice } from './Controls.tsx';
import styles from './ShareExport.module.css';

const DURATIONS = [
  { value: '30', label: '30 s' },
  { value: '60', label: '1 min' },
  { value: '120', label: '2 min' },
] as const;

type Props = {
  /** Renders the current configuration offline; omit to hide the export. */
  render?: (seconds: number) => Promise<RenderedAudio>;
  /** File name without extension. */
  filename: string;
  /** Hide the link (e.g. a recording cannot travel in a URL). */
  shareable?: boolean;
  note?: string;
};

type ExportState = 'idle' | 'rendering' | 'done' | 'error';

function download(audio: RenderedAudio, filename: string) {
  const blob = new Blob([encodeWav(audio.channels, audio.sampleRate)], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.wav`;
  link.click();
  // Give the browser time to start the download before freeing the file.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Copy a link to the current settings, and export the process as a WAV file (v0.4). */
export function ShareExport({ render, filename, shareable = true, note }: Props) {
  const { t } = useMessages();
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [seconds, setSeconds] = useState('60');
  const [exportState, setExportState] = useState<ExportState>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  };

  const exportAudio = async () => {
    if (!render) return;
    setExportState('rendering');
    try {
      download(await render(Number(seconds)), filename);
      setExportState('done');
    } catch (error) {
      console.error(error);
      setExportState('error');
    }
  };

  const exportMessage: Record<ExportState, string> = {
    idle: '',
    rendering: t.share.rendering,
    done: t.share.done,
    error: t.share.failed,
  };

  return (
    <section className={styles.panel} aria-label={t.share.panel}>
      {shareable && (
        <div className={styles.group}>
          <button type="button" className={styles.button} onClick={() => void copy()}>
            {t.share.copy}
          </button>
          <span role="status" className={styles.status}>
            {copied === 'copied' && t.share.copied}
            {copied === 'failed' && t.share.copyFailed}
          </span>
        </div>
      )}
      {render && (
        <div className={styles.group}>
          <Choice label={t.share.duration} value={seconds} options={DURATIONS} onChange={setSeconds} />
          <button
            type="button"
            className={styles.button}
            onClick={() => void exportAudio()}
            disabled={exportState === 'rendering'}
          >
            {t.share.export}
          </button>
          <span role="status" className={styles.status}>
            {exportMessage[exportState]}
          </span>
        </div>
      )}
      {note && <p className={styles.note}>{note}</p>}
    </section>
  );
}
