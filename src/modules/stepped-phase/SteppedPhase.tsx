import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, Choice, Slider } from '../../components/Controls.tsx';
import { PatternEditor } from '../../components/PatternEditor.tsx';
import { moveColumnCursor, moveStageCursor } from '../../components/stage-matrix-geometry.ts';
import { ShareExport } from '../../components/ShareExport.tsx';
import { StageMatrix } from '../../components/StageMatrix.tsx';
import { Transport } from '../../components/Transport.tsx';
import { VoiceRows } from '../../components/VoiceRows.tsx';
import { toggleStep } from '../../core/pattern.ts';
import { positionAt } from '../../core/phase.ts';
import { stageMatrix } from '../../core/resultant.ts';
import type { StageInfo, SteppedProcess } from '../../core/stepped-process.ts';
import { renderOffline, type AudioRuntime } from '../../engine/audio-runtime.ts';
import { useMessages } from '../../i18n/messages.ts';
import { eventsAround } from '../../engine/timeline.ts';
import { useAnimationFrame } from '../../state/use-animation-frame.ts';
import { useAudioRuntime } from '../../state/use-audio-runtime.ts';
import { useReducedMotion } from '../../state/use-reduced-motion.ts';
import { useUrlSettings } from '../../state/use-url-settings.ts';
import styles from '../../styles/module-layout.module.css';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  URL_SCHEMA,
  voiceConfigs,
  type SteppedPhaseSettings,
} from './settings.ts';
import { setupSteppedPhase } from './setup.ts';

type Advance = 'auto' | 'manual';

const ADVANCES: readonly Advance[] = ['auto', 'manual'];

function applyVoices(runtime: AudioRuntime, settings: SteppedPhaseSettings): void {
  for (const config of voiceConfigs(settings)) runtime.setVoice(config);
}

export default function SteppedPhase() {
  const { t } = useMessages();
  const [settings, setSettings] = useUrlSettings(DEFAULT_SETTINGS, URL_SCHEMA);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const processRef = useRef<SteppedProcess | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const [stageInfo, setStageInfo] = useState<StageInfo | null>(null);
  const stageInfoRef = useRef<StageInfo | null>(null);
  const cursorRef = useRef<SVGRectElement>(null);
  const rowsCursorRef = useRef<SVGRectElement>(null);
  const reducedMotion = useReducedMotion();

  const [showResultant, setShowResultant] = useState(false);
  const [soloResultant, setSoloResultant] = useState(false);
  const soloResultantRef = useRef(soloResultant);
  useEffect(() => {
    soloResultantRef.current = soloResultant;
  }, [soloResultant]);

  const showStage = useCallback((info: StageInfo | null) => {
    const shown = stageInfoRef.current;
    if (shown?.stage === info?.stage && shown?.repetition === info?.repetition) return;
    stageInfoRef.current = info;
    setStageInfo(info);
  }, []);

  // Runs before every start: fresh process, attached before the first cycle is scheduled.
  const configure = useCallback(
    (runtime: AudioRuntime) => {
      detachRef.current?.();
      const { process, detach } = setupSteppedPhase(
        runtime,
        settingsRef.current,
        soloResultantRef.current,
      );
      processRef.current = process;
      detachRef.current = detach;
      showStage(null);
    },
    [showStage],
  );
  const { runtime, status, toggle, finish } = useAudioRuntime(configure);

  useEffect(() => {
    if (runtime) applyVoices(runtime, settings);
  }, [runtime, settings]);

  useEffect(() => {
    runtime?.setSoloResultant(soloResultant);
  }, [runtime, soloResultant]);

  const { repetitions, auto, loop, pattern } = settings;
  useEffect(() => {
    processRef.current?.configure({ repetitions, auto, loop });
  }, [repetitions, auto, loop]);

  const matrix = useMemo(() => stageMatrix(pattern), [pattern]);
  const n = pattern.steps.length;

  // Stage, repetition and cursor follow what is sounding, read from the engine.
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

    const position = positionAt(eventsAround(engine, now), 'A', now, n);
    if (position === null) return;
    const cycle = Math.floor(position / n + 1e-9);
    const info = process.stageAt(cycle);
    if (!info) return;
    const step = reducedMotion ? Math.floor(position - cycle * n) : position - cycle * n;
    moveStageCursor(cursorRef.current, info.stage, step);
    moveColumnCursor(rowsCursorRef.current, step);
    showStage(info);
  });

  const update = <K extends keyof SteppedPhaseSettings>(key: K, value: SteppedPhaseSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const running = status === 'playing' || status === 'paused';
  let indicator = t.steppedPhase.initial(n);
  if (status === 'ended') {
    indicator = t.steppedPhase.ended;
  } else if (stageInfo) {
    indicator = t.steppedPhase.stage(stageInfo.stage, n, stageInfo.repetition, auto ? repetitions : null);
  }

  return (
    <article className={styles.module}>
      <header className={styles.intro}>
        <h2>{t.modules.steppedPhase.title}</h2>
        <p>{t.steppedPhase.intro}</p>
      </header>

      <div className={styles.layout}>
        <div className={styles.visual}>
          <p className={styles.indicator}>{indicator}</p>
          {/* Only the stage is announced: repetitions would be too frequent. */}
          <span className="visually-hidden" role="status">
            {status === 'ended' ? '' : stageInfo ? t.steppedPhase.announce(stageInfo.stage) : ''}
          </span>
          <VoiceRows
            pattern={pattern}
            stage={stageInfo?.stage ?? 0}
            showResultant={showResultant}
            cursorRef={rowsCursorRef}
            showCursor={running}
          />
          <StageMatrix
            matrix={matrix}
            currentStage={running || status === 'ended' ? (stageInfo?.stage ?? 0) : null}
            cursorRef={cursorRef}
          />
        </div>

        <section className={styles.controls} aria-label={t.controls.region}>
          <PatternEditor
            pattern={pattern}
            onToggle={(index) => update('pattern', toggleStep(pattern, index))}
            onReset={() => update('pattern', DEFAULT_SETTINGS.pattern)}
          />
          <Slider
            label={t.controls.tempo}
            value={settings.bpm}
            {...LIMITS.bpm}
            format={(value) => `${value}`}
            onChange={(value) => update('bpm', value)}
          />
          <Choice
            label={t.steppedPhase.advance}
            value={auto ? 'auto' : 'manual'}
            options={ADVANCES.map((value) => ({ value, label: t.steppedPhase.advances[value] }))}
            onChange={(value) => update('auto', value === 'auto')}
          />
          <Slider
            label={t.steppedPhase.repetitions}
            value={repetitions}
            {...LIMITS.repetitions}
            format={(value) => `${value}`}
            onChange={(value) => update('repetitions', value)}
            disabled={!auto}
          />
          <Checkbox
            label={t.steppedPhase.loop}
            checked={loop}
            onChange={(value) => update('loop', value)}
          />
          <button
            type="button"
            className={styles.secondary}
            onClick={() => processRef.current?.requestAdvance()}
            disabled={!running}
          >
            {t.steppedPhase.nextStage}
          </button>
          <Checkbox
            label={t.controls.showResultant}
            checked={showResultant}
            onChange={setShowResultant}
          />
          <button
            type="button"
            className={styles.secondary}
            aria-pressed={soloResultant}
            onClick={() => setSoloResultant((value) => !value)}
          >
            {soloResultant ? t.steppedPhase.backToVoices : t.steppedPhase.soloResultant}
          </button>
          <ShareExport
            filename={t.steppedPhase.filename}
            render={(seconds) =>
              // The export always advances on its own: nobody presses "next stage" offline.
              renderOffline(
                (runtime) => setupSteppedPhase(runtime, { ...settings, auto: true }, soloResultant),
                seconds,
              )
            }
            note={t.steppedPhase.exportNote}
          />
        </section>
      </div>

      <Transport status={status} onToggle={() => void toggle()} />
    </article>
  );
}
