import { useEffect, useRef } from 'react';
import { phaseReadout } from '../core/phase.ts';
import type { TapeSession } from '../engine/tape.ts';
import { useReducedMotion } from '../state/use-reduced-motion.ts';
import type { RingColors } from './phase-rings-draw.ts';
import styles from './PhaseRings.module.css';
import { drawTapeRings } from './tape-rings-draw.ts';

type Props = {
  session: TapeSession | null;
  peaks: readonly number[];
  /** Loop length in seconds. */
  loop: number;
};

const secondsFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percentFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

function readColors(element: Element): RingColors {
  const style = getComputedStyle(element);
  const get = (name: string) => style.getPropertyValue(name).trim();
  return {
    voiceA: get('--color-voice-a'),
    voiceB: get('--color-voice-b'),
    text: get('--color-text'),
    muted: get('--color-text-muted'),
    border: get('--color-border'),
  };
}

/**
 * Tape rings. Every frame, both playheads come from the session's playback
 * model at its visual time; nothing is timed here.
 */
export function TapeRings({ session, peaks, loop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef<HTMLSpanElement>(null);
  const lapsRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let colors = readColors(canvas);
    let size = 0;
    let lastOffset = '';
    let lastLaps = '';

    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onSchemeChange = () => {
      colors = readColors(canvas);
    };
    scheme.addEventListener('change', onSchemeChange);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      size = canvas.clientWidth;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let frameId = 0;
    const render = () => {
      frameId = requestAnimationFrame(render);
      const positions = session?.positions(session.now()) ?? { a: 0, b: 0 };
      const { offset, laps } = loop > 0 ? phaseReadout(positions.a, positions.b, loop) : { offset: 0, laps: 0 };
      const offsetText = `${secondsFormat.format(offset)} s`;

      drawTapeRings(ctx, size, {
        peaks,
        posA: positions.a,
        posB: positions.b,
        loop,
        offsetText,
        discrete: reducedMotion,
        colors,
      });

      const percent = loop > 0 ? percentFormat.format((offset / loop) * 100) : '0';
      const readout = `${offsetText} (${percent} % del bucle)`;
      if (readout !== lastOffset && offsetRef.current) {
        offsetRef.current.textContent = readout;
        lastOffset = readout;
      }
      if (String(laps) !== lastLaps && lapsRef.current) {
        lapsRef.current.textContent = String(laps);
        lastLaps = String(laps);
      }
    };
    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      scheme.removeEventListener('change', onSchemeChange);
    };
  }, [session, peaks, loop, reducedMotion]);

  return (
    <figure className={styles.figure}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="Dos anillos con la forma de onda de la grabación: la copia A por fuera y la B por dentro, cada una con su cabezal de reproducción."
      />
      <figcaption className={styles.readout}>
        <span>
          Desfase: <span ref={offsetRef} className={styles.number} />
        </span>
        <span>
          Vueltas completas: <span ref={lapsRef} className={styles.number} />
        </span>
      </figcaption>
    </figure>
  );
}
