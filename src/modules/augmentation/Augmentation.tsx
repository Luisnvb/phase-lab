import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Choice, Slider } from '../../components/Controls.tsx';
import { PianoRoll } from '../../components/PianoRoll.tsx';
import { movePianoRollCursor } from '../../components/piano-roll-geometry.ts';
import { ShareExport } from '../../components/ShareExport.tsx';
import { Transport } from '../../components/Transport.tsx';
import {
  cycleLength,
  initialChord,
  type AugmentationCycle,
  type AugmentationProcess,
  type AugmentMode,
} from '../../core/augmentation.ts';
import { stepAt } from '../../core/phase.ts';
import { pulseDuration } from '../../core/tempo.ts';
import { renderOffline, type AudioRuntime } from '../../engine/audio-runtime.ts';
import { eventsAround } from '../../engine/timeline.ts';
import { useAnimationFrame } from '../../state/use-animation-frame.ts';
import { useAudioRuntime } from '../../state/use-audio-runtime.ts';
import { useReducedMotion } from '../../state/use-reduced-motion.ts';
import { useUrlSettings } from '../../state/use-url-settings.ts';
import styles from '../../styles/module-layout.module.css';
import {
  amountFor,
  DEFAULT_SETTINGS,
  LIMITS,
  MAX_CYCLE,
  MIN_CYCLE,
  URL_SCHEMA,
  type AugmentationSettings,
} from './settings.ts';
import { setupAugmentation } from './setup.ts';

const MODE_OPTIONS = [
  { value: 'factor', label: 'Por un factor' },
  { value: 'pulses', label: 'Por pulsos' },
] as const satisfies readonly { value: AugmentMode; label: string }[];

const factorFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Shown = { cycle: number; data: AugmentationCycle };

export default function Augmentation() {
  const [settings, setSettings] = useUrlSettings(DEFAULT_SETTINGS, URL_SCHEMA);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const processRef = useRef<AugmentationProcess | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const shownRef = useRef<Shown | null>(null);
  const cursorRef = useRef<SVGRectElement>(null);
  const reducedMotion = useReducedMotion();

  const show = useCallback((next: Shown | null) => {
    if (shownRef.current?.cycle === next?.cycle && shownRef.current?.data === next?.data) return;
    shownRef.current = next;
    setShown(next);
  }, []);

  // Runs before every start: a fresh process from the original chord.
  const configure = useCallback(
    (runtime: AudioRuntime) => {
      detachRef.current?.();
      const { process, detach } = setupAugmentation(
        runtime,
        settingsRef.current,
        () => settingsRef.current,
      );
      processRef.current = process;
      detachRef.current = detach;
      show(null);
    },
    [show],
  );
  const { runtime, status, toggle, finish } = useAudioRuntime(configure);

  const { bpm, size, mode } = settings;
  const amount = amountFor(settings);
  useEffect(() => {
    runtime?.engine.setPulseDuration('A', pulseDuration(bpm));
    runtime?.engine.setPulseDuration('B', pulseDuration(bpm));
  }, [runtime, bpm]);
  useEffect(() => {
    processRef.current?.configure({ mode, amount });
  }, [mode, amount]);

  useAnimationFrame(() => {
    const engine = runtime?.engine;
    const process = processRef.current;
    if (!engine || !process || status === 'ended') return;
    const now = engine.now();

    const end = process.endCycle;
    if (end !== null) {
      const nextA = engine.getNextEvents().find((e) => e.voice === 'A');
      if (nextA && nextA.cycleIndex >= end && now >= nextA.time) {
        finish();
        return;
      }
    }

    const at = stepAt(eventsAround(engine, now), 'A', now);
    if (!at) return;
    const data = process.cycleAt(at.cycleIndex);
    if (!data) return;
    const pulse = reducedMotion ? at.stepIndex : at.stepIndex + at.fraction;
    movePianoRollCursor(cursorRef.current, pulse);
    show({ cycle: at.cycleIndex, data });
  });

  const update = <K extends keyof AugmentationSettings>(key: K, value: AugmentationSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const original = useMemo(() => initialChord(size), [size]);
  const running = status === 'playing' || status === 'paused';
  // Once ended, the last cycle stays on screen.
  const current = (running || status === 'ended') && shown ? shown.data : null;
  const notes = current ? current.notes : original;
  const length = current ? current.length : cycleLength(original, MIN_CYCLE);

  let indicator = `Ciclo 1 · ${length} pulsos`;
  if (status === 'ended') indicator = 'Proceso terminado: el acorde ya no cabe en el ciclo más largo';
  else if (running && shown) indicator = `Ciclo ${shown.cycle + 1} · ${length} pulsos`;

  return (
    <article className={styles.module}>
      <header className={styles.intro}>
        <h2>Aumentación</h2>
        <p>
          Sobre un pulso que no cambia, las notas de un acorde se alargan un poco en cada ciclo.
          Al principio suenan como golpes cortos, uno tras otro; poco a poco se solapan y se
          convierten en un acorde sostenido, y el ciclo se estira con ellas. Para escuchar:{' '}
          <cite>Four Organs</cite> (1970).
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.visual}>
          <p className={styles.indicator}>{indicator}</p>
          <span className="visually-hidden" role="status">
            {status === 'ended' ? '' : running && shown ? `Ciclo de ${length} pulsos` : ''}
          </span>
          <PianoRoll
            notes={notes}
            original={original}
            length={length}
            maximum={MAX_CYCLE}
            cursorRef={cursorRef}
            showCursor={running}
          />
          <p className={styles.legend}>
            Barra: duración actual de cada nota. Contorno discontinuo: duración inicial. Línea
            discontinua gruesa: final del ciclo.
          </p>
        </div>

        <section className={styles.controls} aria-label="Controles">
          <Choice
            label="Alargar las notas"
            value={mode}
            options={MODE_OPTIONS}
            onChange={(value) => update('mode', value)}
          />
          {mode === 'factor' ? (
            <Slider
              label="Factor por ciclo"
              value={settings.factor}
              {...LIMITS.factor}
              format={(value) => `× ${factorFormat.format(value)}`}
              onChange={(value) => update('factor', value)}
            />
          ) : (
            <Slider
              label="Pulsos más por ciclo"
              value={settings.pulses}
              {...LIMITS.pulses}
              format={(value) => `+ ${value}`}
              onChange={(value) => update('pulses', value)}
            />
          )}
          <Slider
            label="Notas del acorde"
            value={size}
            {...LIMITS.size}
            format={(value) => `${value}`}
            onChange={(value) => update('size', value)}
            disabled={running}
          />
          <Slider
            label="Tempo (negras por minuto)"
            value={bpm}
            {...LIMITS.bpm}
            format={(value) => `${value}`}
            onChange={(value) => update('bpm', value)}
          />
          <ShareExport
            filename="aumentacion"
            render={(seconds) =>
              renderOffline((runtime) => setupAugmentation(runtime, settings), seconds)
            }
            note="Si el proceso termina antes, el audio acaba con él."
          />
        </section>
      </div>

      <Transport status={status} onToggle={() => void toggle()} />
    </article>
  );
}
