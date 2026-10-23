import { useEffect, useRef } from 'react';
import { nearestStage, phaseReadout, positionAt } from '../core/phase.ts';
import { stageMatrix } from '../core/resultant.ts';
import type { Pattern } from '../core/types.ts';
import type { Engine } from '../engine/engine.ts';
import { eventsAround } from '../engine/timeline.ts';
import { useReducedMotion } from '../state/use-reduced-motion.ts';
import { drawPhaseRings, type RingColors } from './phase-rings-draw.ts';
import styles from './PhaseRings.module.css';

type Props = {
  engine: Engine | null;
  pattern: Pattern;
  /** Adds an outer ring with the resultant at the nearest whole-step offset. */
  showResultant?: boolean;
};

const stepsFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
 * Phase rings for two voices. Every frame, positions come from the engine's
 * event queue at `engine.now()` (SPEC §4.3); nothing is timed here.
 */
export function PhaseRings({ engine, pattern, showResultant = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef<HTMLSpanElement>(null);
  const lapsRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const n = pattern.steps.length;
    // Resultant for every whole-step offset, computed once per pattern.
    const resultants = showResultant ? stageMatrix(pattern) : null;
    let colors = readColors(canvas);
    let size = 0;
    let lastOffsetText = '';
    let lastLapsText = '';

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
      let posA = 0;
      let posB = 0;
      if (engine) {
        const now = engine.now();
        const events = eventsAround(engine, now);
        posA = positionAt(events, 'A', now, n) ?? 0;
        posB = positionAt(events, 'B', now, n) ?? 0;
      }
      const { offset, laps } = phaseReadout(posA, posB, n);
      const offsetText = stepsFormat.format(offset);

      let resultant;
      if (resultants) {
        const { stage, distance } = nearestStage(posB - posA, n);
        resultant = { cells: resultants[stage]!, clarity: 1 - distance / 0.5 };
      }

      drawPhaseRings(ctx, size, {
        steps: pattern.steps,
        posA,
        posB,
        offsetText,
        discrete: reducedMotion,
        colors,
        ...(resultant && { resultant }),
      });

      if (offsetText !== lastOffsetText && offsetRef.current) {
        offsetRef.current.textContent = `${offsetText} ${offsetText === '1,00' ? 'paso' : 'pasos'}`;
        lastOffsetText = offsetText;
      }
      const lapsText = String(laps);
      if (lapsText !== lastLapsText && lapsRef.current) {
        lapsRef.current.textContent = lapsText;
        lastLapsText = lapsText;
      }
    };
    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      scheme.removeEventListener('change', onSchemeChange);
    };
  }, [engine, pattern, reducedMotion, showResultant]);

  return (
    <figure className={styles.figure}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="Dos anillos concéntricos: la voz A por fuera y la B por dentro, cada uno con un cursor que recorre los pasos del patrón."
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
