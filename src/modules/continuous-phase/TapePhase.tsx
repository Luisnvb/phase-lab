import { useEffect, useMemo, useRef, useState } from 'react';
import { Slider } from '../../components/Controls.tsx';
import { TapeRings } from '../../components/TapeRings.tsx';
import { Transport } from '../../components/Transport.tsx';
import { waveformPeaks } from '../../core/tape.ts';
import { createTapeSession, type TapeRegion, type TapeSession } from '../../engine/tape.ts';
import type { PlaybackStatus } from '../../state/use-audio-runtime.ts';
import styles from '../../styles/module-layout.module.css';
import { LIMITS } from './settings.ts';

/** SPEC §5: up to 3 s of recording. */
const MAX_SECONDS = 3;
/** Shortest loop the trim sliders allow. */
const MIN_LOOP = 0.1;
const PEAK_BINS = 160;

const secondsFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percentFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Tape variant of module 1 (SPEC §5): the same phasing, with a short recording
 * of the user's own voice played as two loops, B slightly faster.
 */
export default function TapePhase() {
  const sessionRef = useRef<TapeSession | null>(null);
  const [session, setSession] = useState<TapeSession | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [region, setRegion] = useState<TapeRegion>({ start: 0, end: 0 });
  const [differencePercent, setDifferencePercent] = useState(1);
  const [playback, setPlayback] = useState<PlaybackStatus>('idle');
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      void sessionRef.current?.dispose();
      sessionRef.current = null;
    },
    [],
  );

  /** Creates the AudioContext; call it synchronously inside a user gesture. */
  const ensureSession = (): TapeSession => {
    if (!sessionRef.current) {
      sessionRef.current = createTapeSession();
      setSession(sessionRef.current);
    }
    return sessionRef.current;
  };

  const load = (next: AudioBuffer) => {
    sessionRef.current?.stop();
    setPlayback('idle');
    setBuffer(next);
    setRegion({ start: 0, end: Math.min(next.duration, MAX_SECONDS) });
  };

  const record = async () => {
    const current = ensureSession();
    current.stop();
    setPlayback('idle');
    setError(null);
    setRecording(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      load(await current.record(MAX_SECONDS, controller.signal));
    } catch (failure) {
      console.error(failure);
      setError(
        'No se ha podido usar el micrófono. Revisa el permiso del navegador o prueba con el sonido de ejemplo.',
      );
    } finally {
      setRecording(false);
      abortRef.current = null;
    }
  };

  const rateB = 1 + differencePercent / 100;

  const start = () => {
    if (!buffer) return;
    ensureSession().play(buffer, region, rateB);
    setPlayback('playing');
  };

  const toggle = async () => {
    const current = ensureSession();
    if (playback === 'idle' || playback === 'ended') start();
    else if (playback === 'playing') {
      setPlayback('paused');
      await current.pause();
    } else if (playback === 'paused') {
      setPlayback('playing');
      await current.resume();
    }
  };

  // B's speed changes on the audio clock, from where it is now.
  useEffect(() => {
    sessionRef.current?.setRateB(rateB);
  }, [rateB]);

  // A new trim restarts both loops together. Playback state and rate are read
  // from refs: only a new region (or recording) should restart.
  const playingRef = useRef(playback);
  const rateRef = useRef(rateB);
  useEffect(() => {
    playingRef.current = playback;
    rateRef.current = rateB;
  }, [playback, rateB]);
  useEffect(() => {
    if (buffer && playingRef.current !== 'idle') {
      sessionRef.current?.play(buffer, region, rateRef.current);
      if (playingRef.current === 'paused') void sessionRef.current?.resume();
      setPlayback('playing');
    }
  }, [buffer, region]);

  const peaks = useMemo(() => {
    if (!buffer) return [];
    const rate = buffer.sampleRate;
    return waveformPeaks(buffer.getChannelData(0), region.start * rate, region.end * rate, PEAK_BINS);
  }, [buffer, region]);

  const loop = region.end - region.start;
  const duration = buffer ? Math.min(buffer.duration, MAX_SECONDS) : 0;

  return (
    <article className={styles.module}>
      <header className={styles.intro}>
        <h2>Desfase con cinta</h2>
        <p>
          La misma técnica que el desfase continuo, pero con tu propia grabación: dos copias de un
          fragmento corto suenan en bucle, una a cada lado, y la segunda va un poco más deprisa.
          Las palabras se separan, se superponen y aparecen ritmos y sonidos que no estaban en la
          grabación. Para escuchar: <cite>It&apos;s Gonna Rain</cite> (1965).{' '}
          <a href="#/desfase-continuo">Volver al desfase con patrones</a>.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.visual}>
          {buffer ? (
            <TapeRings session={session} peaks={peaks} loop={loop} />
          ) : (
            <p className={styles.placeholder}>
              Graba una frase corta (hasta {MAX_SECONDS} segundos) o usa el sonido de ejemplo.
            </p>
          )}
        </div>

        <section className={styles.controls} aria-label="Controles">
          <div className={styles.buttons}>
            {recording ? (
              <button
                type="button"
                className={styles.secondary}
                aria-pressed="true"
                onClick={() => abortRef.current?.abort()}
              >
                Detener la grabación
              </button>
            ) : (
              <button type="button" className={styles.secondary} onClick={() => void record()}>
                {buffer ? 'Grabar de nuevo' : `Grabar (máx. ${MAX_SECONDS} s)`}
              </button>
            )}
            <button
              type="button"
              className={styles.secondary}
              onClick={() => load(ensureSession().sample())}
              disabled={recording}
            >
              Usar el sonido de ejemplo
            </button>
          </div>
          <span className="visually-hidden" role="status">
            {recording ? 'Grabando' : ''}
          </span>
          {recording && <p className={styles.notice}>Grabando… habla cerca del micrófono.</p>}
          {error && (
            <p className={styles.notice} role="alert">
              {error}
            </p>
          )}
          <p className={styles.hint}>
            La grabación se queda en tu navegador: no se envía a ningún sitio ni se guarda.
          </p>

          {buffer && (
            <>
              <Slider
                label="Inicio del bucle"
                value={region.start}
                min={0}
                max={duration}
                step={0.01}
                format={(value) => `${secondsFormat.format(value)} s`}
                onChange={(value) =>
                  setRegion((current) => ({ ...current, start: Math.min(value, current.end - MIN_LOOP) }))
                }
              />
              <Slider
                label="Final del bucle"
                value={region.end}
                min={0}
                max={duration}
                step={0.01}
                format={(value) => `${secondsFormat.format(value)} s`}
                onChange={(value) =>
                  setRegion((current) => ({ ...current, end: Math.max(value, current.start + MIN_LOOP) }))
                }
              />
            </>
          )}
          <Slider
            label="Velocidad extra de B"
            value={differencePercent}
            {...LIMITS.differencePercent}
            format={(value) => `${percentFormat.format(value)} %`}
            onChange={setDifferencePercent}
          />
          <button
            type="button"
            className={styles.secondary}
            onClick={start}
            disabled={!buffer || playback === 'idle'}
          >
            Reiniciar al unísono
          </button>
        </section>
      </div>

      <Transport status={playback} onToggle={() => void toggle()} disabled={!buffer || recording} />
    </article>
  );
}
