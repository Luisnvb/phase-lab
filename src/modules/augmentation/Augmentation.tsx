import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Choice, Slider } from '../../components/Controls.tsx';
import { PianoRoll } from '../../components/PianoRoll.tsx';
import { movePianoRollCursor } from '../../components/piano-roll-geometry.ts';
import { PitchListEditor } from '../../components/PitchListEditor.tsx';
import { ShareExport } from '../../components/ShareExport.tsx';
import { Transport } from '../../components/Transport.tsx';
import {
  chordTexture,
  cycleLength,
  initialChord,
  type AugmentationCycle,
  type AugmentationProcess,
  type AugmentMode,
} from '../../core/augmentation.ts';
import { stepAt } from '../../core/phase.ts';
import { EDITABLE_PITCHES } from '../../core/pitch.ts';
import { pulseDuration } from '../../core/tempo.ts';
import { renderOffline, type AudioRuntime } from '../../engine/audio-runtime.ts';
import { eventsAround } from '../../engine/timeline.ts';
import { formatDecimal } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/messages.ts';
import { useAnimationFrame } from '../../state/use-animation-frame.ts';
import { useAudioRuntime } from '../../state/use-audio-runtime.ts';
import { useReducedMotion } from '../../state/use-reduced-motion.ts';
import { useUrlSettings } from '../../state/use-url-settings.ts';
import styles from '../../styles/module-layout.module.css';
import {
  amountFor,
  chordPitches,
  DEFAULT_SETTINGS,
  LIMITS,
  MAX_CYCLE,
  MIN_CYCLE,
  URL_SCHEMA,
  type AugmentationSettings,
} from './settings.ts';
import { setupAugmentation } from './setup.ts';

const MODES: readonly AugmentMode[] = ['factor', 'pulses'];

type Shown = { cycle: number; data: AugmentationCycle };

export default function Augmentation() {
  const { t, locale } = useMessages();
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

  const { bpm, size, chord, mode } = settings;
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

  const original = useMemo(() => initialChord(chordPitches({ chord, size })), [chord, size]);
  const running = status === 'playing' || status === 'paused';
  // Once ended, the last cycle stays on screen.
  const current = (running || status === 'ended') && shown ? shown.data : null;
  const notes = current ? current.notes : original;
  const length = current ? current.length : cycleLength(original, MIN_CYCLE);

  let indicator = t.augmentation.cycle(1, length);
  if (status === 'ended') indicator = t.augmentation.ended;
  else if (running && shown) indicator = t.augmentation.cycle(shown.cycle + 1, length);

  return (
    <article className={styles.module}>
      <header className={styles.intro}>
        <h2>{t.modules.augmentation.title}</h2>
        <p>{t.augmentation.intro}</p>
        <details className={styles.guide}>
          <summary>{t.augmentation.guide.summary}</summary>
          {t.augmentation.guide.body}
        </details>
      </header>

      <div className={styles.layout}>
        <div className={styles.visual}>
          <p className={styles.indicator}>{indicator}</p>
          <span className="visually-hidden" role="status">
            {status === 'ended' ? '' : running && shown ? t.augmentation.announce(length) : ''}
          </span>
          <PianoRoll
            notes={notes}
            original={original}
            length={length}
            maximum={MAX_CYCLE}
            cursorRef={cursorRef}
            showCursor={running}
          />
          {/* Changes only twice in a whole process, so it can be announced. */}
          <p className={styles.texture} aria-live="polite">
            {t.augmentation.textures[chordTexture(notes)]}
          </p>
          <p className={styles.legend}>{t.augmentation.legend}</p>
        </div>

        <section className={styles.controls} aria-label={t.controls.region}>
          <Choice
            label={t.augmentation.mode}
            value={mode}
            options={MODES.map((value) => ({ value, label: t.augmentation.modes[value] }))}
            onChange={(value) => update('mode', value)}
          />
          {mode === 'factor' ? (
            <Slider
              label={t.augmentation.factor}
              value={settings.factor}
              {...LIMITS.factor}
              format={(value) => `× ${formatDecimal(locale, value, 2)}`}
              onChange={(value) => update('factor', value)}
            />
          ) : (
            <Slider
              label={t.augmentation.pulses}
              value={settings.pulses}
              {...LIMITS.pulses}
              format={(value) => `+ ${value}`}
              onChange={(value) => update('pulses', value)}
            />
          )}
          <Slider
            label={t.augmentation.size}
            value={size}
            {...LIMITS.size}
            format={(value) => `${value}`}
            onChange={(value) => update('size', value)}
            disabled={running}
          />
          {/* The process is built from the chord at the start, so it is fixed while running. */}
          <PitchListEditor
            legend={t.pitchEditor.chord}
            notes={chord.slice(0, size)}
            pitches={EDITABLE_PITCHES}
            itemLabel={t.pitchEditor.note}
            onChange={(index, note) =>
              note !== null && update('chord', chord.map((current, i) => (i === index ? note : current)))
            }
            onReset={() => update('chord', DEFAULT_SETTINGS.chord)}
            resetLabel={t.pitchEditor.resetChord}
            disabled={running}
            {...(running && { hint: t.pitchEditor.lockedWhilePlaying })}
          />
          <Slider
            label={t.controls.tempo}
            value={bpm}
            {...LIMITS.bpm}
            format={(value) => `${value}`}
            onChange={(value) => update('bpm', value)}
          />
          <ShareExport
            filename={t.augmentation.filename}
            render={(seconds) =>
              renderOffline((runtime) => setupAugmentation(runtime, settings), seconds)
            }
            note={t.share.endsEarly}
          />
        </section>
      </div>

      <Transport status={status} onToggle={() => void toggle()} />
    </article>
  );
}
