import { useCallback, useEffect, useRef, useState } from 'react';
import { Checkbox, Choice, Slider } from '../../components/Controls.tsx';
import { GroupingRows } from '../../components/GroupingRows.tsx';
import { moveColumnCursor } from '../../components/stage-matrix-geometry.ts';
import { ShareExport } from '../../components/ShareExport.tsx';
import matrixStyles from '../../components/StageMatrix.module.css';
import { Transport } from '../../components/Transport.tsx';
import type { CycleHistory } from '../../core/cycle-history.ts';
import { twoVoiceMix } from '../../core/mix.ts';
import { positionAt } from '../../core/phase.ts';
import { pulseDuration } from '../../core/tempo.ts';
import type { VoiceId } from '../../core/types.ts';
import { renderOffline, type AudioRuntime } from '../../engine/audio-runtime.ts';
import { eventsAround } from '../../engine/timeline.ts';
import { useAnimationFrame } from '../../state/use-animation-frame.ts';
import { useAudioRuntime } from '../../state/use-audio-runtime.ts';
import { useReducedMotion } from '../../state/use-reduced-motion.ts';
import { useUrlSettings } from '../../state/use-url-settings.ts';
import styles from '../../styles/module-layout.module.css';
import {
  basePattern,
  BPM_LIMITS,
  DEFAULT_SETTINGS,
  GROUP_SIZES,
  groupingLabel,
  URL_SCHEMA,
  voiceConfig,
  type GroupSize,
  type Material,
  type MetricSettings,
} from './settings.ts';
import { setupMetricAmbiguity } from './setup.ts';

const MATERIAL_OPTIONS = [
  { value: 'pulse', label: 'Pulso' },
  { value: 'melody', label: 'Melodía' },
] as const satisfies readonly { value: Material; label: string }[];

const GROUPING_OPTIONS = GROUP_SIZES.map((size) => ({
  value: String(size),
  label: groupingLabel(size),
}));

type Sounding = Record<VoiceId, GroupSize>;

export default function MetricAmbiguity() {
  const [settings, setSettings] = useUrlSettings(DEFAULT_SETTINGS, URL_SCHEMA);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const historiesRef = useRef<Record<VoiceId, CycleHistory<GroupSize>> | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  // Groupings actually sounding, which lag the controls by up to one cycle.
  const [sounding, setSounding] = useState<Sounding | null>(null);
  const soundingRef = useRef<Sounding | null>(null);
  const cursorRef = useRef<SVGRectElement>(null);
  const reducedMotion = useReducedMotion();

  const showSounding = useCallback((next: Sounding | null) => {
    const shown = soundingRef.current;
    if (shown?.A === next?.A && shown?.B === next?.B) return;
    soundingRef.current = next;
    setSounding(next);
  }, []);

  const configure = useCallback(
    (runtime: AudioRuntime) => {
      detachRef.current?.();
      const { histories, detach } = setupMetricAmbiguity(
        runtime,
        settingsRef.current,
        () => settingsRef.current,
      );
      historiesRef.current = histories;
      detachRef.current = detach;
      showSounding(null);
    },
    [showSounding],
  );
  const { runtime, status, toggle } = useAudioRuntime(configure);

  // Groupings change at cycle boundaries (driver); the rest applies at once.
  const { bpm, material, twoVoices } = settings;
  useEffect(() => {
    runtime?.engine.setPulseDuration('A', pulseDuration(bpm));
    runtime?.engine.setPulseDuration('B', pulseDuration(bpm));
  }, [runtime, bpm]);
  useEffect(() => {
    // A new material swaps the instrument, so it cannot wait for the boundary.
    if (!runtime) return;
    for (const voice of ['A', 'B'] as const) {
      runtime.setVoice(voiceConfig({ ...settingsRef.current, material }, voice));
    }
  }, [runtime, material]);
  useEffect(() => {
    if (!runtime) return;
    for (const voice of ['A', 'B'] as const) {
      const { gain, pan } = twoVoiceMix(twoVoices, voice);
      runtime.setMix(voice, gain, pan);
    }
  }, [runtime, twoVoices]);

  const pattern = basePattern(material);
  const n = pattern.steps.length;

  useAnimationFrame(() => {
    const engine = runtime?.engine;
    const histories = historiesRef.current;
    if (!engine || !histories) return;
    const now = engine.now();
    const position = positionAt(eventsAround(engine, now), 'A', now, n);
    if (position === null) return;
    const cycle = Math.floor(position / n + 1e-9);
    const step = position - cycle * n;
    moveColumnCursor(cursorRef.current, reducedMotion ? Math.floor(step) : step);
    showSounding({ A: histories.A.valueAt(cycle), B: histories.B.valueAt(cycle) });
  });

  const update = <K extends keyof MetricSettings>(key: K, value: MetricSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const running = status === 'playing' || status === 'paused';
  const shownA = running && sounding ? sounding.A : settings.groupA;
  const shownB = running && sounding ? sounding.B : settings.groupB;
  const rows = [
    { label: 'A', pattern, groupSize: shownA, beatClass: matrixStyles.a },
    ...(twoVoices ? [{ label: 'B', pattern, groupSize: shownB, beatClass: matrixStyles.bFill }] : []),
  ];
  const indicator = twoVoices
    ? `A: ${groupingLabel(shownA)} · B: ${groupingLabel(shownB)}`
    : `Agrupación: ${groupingLabel(shownA)}`;

  return (
    <article className={styles.module}>
      <header className={styles.intro}>
        <h2>Ambigüedad 3 contra 2</h2>
        <p>
          Un ciclo de doce pulsos puede oírse como cuatro grupos de tres o como tres grupos de
          cuatro: basta con mover los acentos. Aquí los golpes no cambian nunca, solo cuáles
          suenan más fuerte. Con dos voces, cada una acentúa una agrupación distinta a la vez, y el
          oído puede saltar de una a otra.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.visual}>
          <p className={styles.indicator}>{indicator}</p>
          <GroupingRows rows={rows} cursorRef={cursorRef} showCursor={running} />
          <p className={styles.legend}>
            Barra alta: golpe acentuado. Barra baja: golpe sin acento. Cada recuadro es un grupo.
          </p>
        </div>

        <section className={styles.controls} aria-label="Controles">
          <Choice
            label={twoVoices ? 'Agrupación de A' : 'Agrupación'}
            value={String(settings.groupA)}
            options={GROUPING_OPTIONS}
            onChange={(value) => update('groupA', Number(value) as GroupSize)}
          />
          <Checkbox
            label="Dos voces con agrupaciones distintas"
            checked={twoVoices}
            onChange={(value) => update('twoVoices', value)}
          />
          {twoVoices && (
            <Choice
              label="Agrupación de B"
              value={String(settings.groupB)}
              options={GROUPING_OPTIONS}
              onChange={(value) => update('groupB', Number(value) as GroupSize)}
            />
          )}
          <Choice
            label="Material"
            value={material}
            options={MATERIAL_OPTIONS}
            onChange={(value) => update('material', value)}
          />
          <Slider
            label="Tempo (negras por minuto)"
            value={bpm}
            {...BPM_LIMITS}
            format={(value) => `${value}`}
            onChange={(value) => update('bpm', value)}
          />
          <ShareExport
            filename="ambiguedad-3-contra-2"
            render={(seconds) =>
              renderOffline((runtime) => setupMetricAmbiguity(runtime, settings), seconds)
            }
          />
        </section>
      </div>

      <Transport status={status} onToggle={() => void toggle()} />
    </article>
  );
}
