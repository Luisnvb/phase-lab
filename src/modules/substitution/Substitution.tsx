import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BuildRows } from '../../components/BuildRows.tsx';
import { Checkbox, Choice, Slider } from '../../components/Controls.tsx';
import { PatternEditor } from '../../components/PatternEditor.tsx';
import { ShareExport } from '../../components/ShareExport.tsx';
import { moveColumnCursor } from '../../components/stage-matrix-geometry.ts';
import { Transport } from '../../components/Transport.tsx';
import { twoVoiceMix } from '../../core/mix.ts';
import { activeIndices, toggleStep } from '../../core/pattern.ts';
import { positionAt } from '../../core/phase.ts';
import type { BuildDirection, BuildInfo, BuildProcess } from '../../core/substitution.ts';
import { pulseDuration } from '../../core/tempo.ts';
import type { FillOrderMode } from '../../core/types.ts';
import { renderOffline, type AudioRuntime } from '../../engine/audio-runtime.ts';
import { eventsAround } from '../../engine/timeline.ts';
import { useAnimationFrame } from '../../state/use-animation-frame.ts';
import { useAudioRuntime } from '../../state/use-audio-runtime.ts';
import { useReducedMotion } from '../../state/use-reduced-motion.ts';
import { useUrlSettings } from '../../state/use-url-settings.ts';
import styles from '../../styles/module-layout.module.css';
import {
  buildOrder,
  DEFAULT_SETTINGS,
  LIMITS,
  totalBeats,
  URL_SCHEMA,
  type SubstitutionSettings,
} from './settings.ts';
import { INITIAL_COUNT, setupSubstitution } from './setup.ts';

const ORDER_OPTIONS = [
  { value: 'ltr', label: 'De izquierda a derecha' },
  { value: 'random', label: 'Aleatorio' },
  { value: 'custom', label: 'Personalizado' },
] as const satisfies readonly { value: FillOrderMode; label: string }[];

export default function Substitution() {
  const [settings, setSettings] = useUrlSettings(DEFAULT_SETTINGS, URL_SCHEMA);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [direction, setDirection] = useState<BuildDirection>('build');
  const directionRef = useRef(direction);
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const [showResultant, setShowResultant] = useState(false);
  const processRef = useRef<BuildProcess | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const [info, setInfo] = useState<BuildInfo | null>(null);
  const infoRef = useRef<BuildInfo | null>(null);
  const cursorRef = useRef<SVGRectElement>(null);
  const reducedMotion = useReducedMotion();

  const showInfo = useCallback((next: BuildInfo | null) => {
    const shown = infoRef.current;
    if (shown?.count === next?.count && shown?.repetition === next?.repetition) return;
    infoRef.current = next;
    setInfo(next);
  }, []);

  // Runs before every start: a fresh process, attached before the first cycle.
  const configure = useCallback(
    (runtime: AudioRuntime) => {
      detachRef.current?.();
      const { process, detach } = setupSubstitution(
        runtime,
        settingsRef.current,
        directionRef.current,
        () => settingsRef.current,
      );
      processRef.current = process;
      detachRef.current = detach;
      showInfo(null);
    },
    [showInfo],
  );
  const { runtime, status, toggle } = useAudioRuntime(configure);

  // Patterns change at cycle boundaries (driver); here only what can change at once.
  const { bpm, repetitions, target, twoVoices, offset } = settings;
  useEffect(() => {
    runtime?.engine.setPulseDuration('A', pulseDuration(bpm));
    runtime?.engine.setPulseDuration('B', pulseDuration(bpm));
  }, [runtime, bpm]);
  useEffect(() => {
    processRef.current?.configure({ repetitions, total: totalBeats(target) });
  }, [repetitions, target]);
  useEffect(() => {
    if (!runtime) return;
    for (const voice of ['A', 'B'] as const) {
      const { gain, pan } = twoVoiceMix(twoVoices, voice);
      runtime.setMix(voice, gain, pan);
    }
  }, [runtime, twoVoices]);
  useEffect(() => {
    runtime?.engine.setPatternOffset('B', offset);
  }, [runtime, offset]);

  const order = useMemo(() => buildOrder(settings), [settings]);
  const n = target.steps.length;
  const total = totalBeats(target);

  useAnimationFrame(() => {
    const engine = runtime?.engine;
    const process = processRef.current;
    if (!engine || !process) return;
    const now = engine.now();
    const position = positionAt(eventsAround(engine, now), 'A', now, n);
    if (position === null) return;
    const cycle = Math.floor(position / n + 1e-9);
    const current = process.infoAt(cycle);
    if (!current) return;
    const step = position - cycle * n;
    moveColumnCursor(cursorRef.current, reducedMotion ? Math.floor(step) : step);
    showInfo(current);
  });

  const update = <K extends keyof SubstitutionSettings>(key: K, value: SubstitutionSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const changeDirection = (next: BuildDirection) => {
    setDirection(next);
    processRef.current?.setDirection(next);
  };

  const running = status === 'playing' || status === 'paused';
  const count = running && info ? info.count : direction === 'build' ? INITIAL_COUNT : total;
  let indicator = `Golpes: ${count} de ${total}`;
  if (running && info) {
    // Full and empty patterns hold indefinitely, so repetitions are not counted there.
    if (info.count === total) indicator += ' · patrón completo';
    else if (info.count === 0) indicator = 'Silencio: todos los golpes retirados';
    else indicator += ` · repetición ${info.repetition} de ${repetitions}`;
  }

  return (
    <article className={styles.module}>
      <header className={styles.intro}>
        <h2>Construcción por sustitución</h2>
        <p>
          Un ciclo vacío se va llenando: cada pocas repeticiones, un silencio se cambia por un
          golpe del patrón objetivo, hasta completarlo. El oído reinterpreta el ciclo con cada
          golpe nuevo. También puede hacerse al revés, retirando golpes. Con dos voces desfasadas,
          la combinación crece de forma más compleja. Para escuchar: <cite>Drumming</cite> (1971).
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.visual}>
          <p className={styles.indicator}>{indicator}</p>
          <BuildRows
            target={target}
            order={order}
            count={count}
            twoVoices={twoVoices}
            offset={offset}
            showResultant={showResultant}
            cursorRef={cursorRef}
            showCursor={running}
          />
          <p className={styles.legend}>
            Contorno discontinuo: golpe pendiente, con su turno. Relleno: golpe ya sustituido.
          </p>
        </div>

        <section className={styles.controls} aria-label="Controles">
          <div className={styles.buttons} role="group" aria-label="Dirección del proceso">
            <button
              type="button"
              className={styles.secondary}
              aria-pressed={direction === 'build'}
              onClick={() => changeDirection('build')}
            >
              Construir
            </button>
            <button
              type="button"
              className={styles.secondary}
              aria-pressed={direction === 'unbuild'}
              onClick={() => changeDirection('unbuild')}
            >
              Deshacer
            </button>
          </div>
          <PatternEditor
            pattern={target}
            onToggle={(index) => update('target', toggleStep(target, index))}
            onReset={() => update('target', DEFAULT_SETTINGS.target)}
          />
          <Choice
            label="Orden de sustitución"
            value={settings.orderMode}
            options={ORDER_OPTIONS}
            onChange={(value) => update('orderMode', value)}
          />
          {settings.orderMode === 'random' && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => update('seed', settings.seed + 1)}
            >
              Otro orden aleatorio
            </button>
          )}
          {settings.orderMode === 'custom' && (
            <fieldset className={styles.picker}>
              <legend>Pulsa los pasos en el orden deseado</legend>
              <div className={styles.buttons}>
                {activeIndices(target).map((step) => {
                  const chosen = settings.customPrefix.includes(step);
                  return (
                    <button
                      key={step}
                      type="button"
                      className={styles.secondary}
                      aria-pressed={chosen}
                      disabled={chosen}
                      onClick={() => update('customPrefix', [...settings.customPrefix, step])}
                    >
                      {step + 1}
                    </button>
                  );
                })}
              </div>
              <p className={styles.legend}>Orden: {order.map((step) => step + 1).join(' → ')}</p>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => update('customPrefix', [])}
                disabled={settings.customPrefix.length === 0}
              >
                Borrar orden
              </button>
            </fieldset>
          )}
          <Slider
            label="Repeticiones entre sustituciones"
            value={repetitions}
            {...LIMITS.repetitions}
            format={(value) => `${value}`}
            onChange={(value) => update('repetitions', value)}
          />
          <Slider
            label="Tempo (negras por minuto)"
            value={bpm}
            {...LIMITS.bpm}
            format={(value) => `${value}`}
            onChange={(value) => update('bpm', value)}
          />
          <Checkbox
            label="Dos voces"
            checked={twoVoices}
            onChange={(value) => update('twoVoices', value)}
          />
          <Slider
            label="Desfase de B (pasos)"
            value={offset}
            {...LIMITS.offset}
            format={(value) => `${value}`}
            onChange={(value) => update('offset', value)}
            disabled={!twoVoices}
          />
          {twoVoices && (
            <Checkbox
              label="Mostrar resultante"
              checked={showResultant}
              onChange={setShowResultant}
            />
          )}
          <ShareExport
            filename="sustitucion"
            render={(seconds) =>
              renderOffline((runtime) => setupSubstitution(runtime, settings, direction), seconds)
            }
          />
        </section>
      </div>

      <Transport status={status} onToggle={() => void toggle()} />
    </article>
  );
}
