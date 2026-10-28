import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, Choice, Slider } from '../../components/Controls.tsx';
import { PhaseRings } from '../../components/PhaseRings.tsx';
import { PitchListEditor } from '../../components/PitchListEditor.tsx';
import { ShareExport } from '../../components/ShareExport.tsx';
import { Transport } from '../../components/Transport.tsx';
import { EDITABLE_PITCHES } from '../../core/pitch.ts';
import { renderOffline, type AudioRuntime } from '../../engine/audio-runtime.ts';
import { formatDecimal } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/messages.ts';
import { useAudioRuntime } from '../../state/use-audio-runtime.ts';
import { useUrlSettings } from '../../state/use-url-settings.ts';
import styles from '../../styles/module-layout.module.css';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  patternFor,
  pulseSourceFor,
  URL_SCHEMA,
  voiceConfigs,
  type ContinuousPhaseSettings,
  type Material,
  type PhaseMode,
} from './settings.ts';
import { setupContinuousPhase } from './setup.ts';

const MODES: readonly PhaseMode[] = ['continuous', 'plateau'];
const MATERIALS: readonly Material[] = ['melody', 'rhythm'];

function applyVoices(runtime: AudioRuntime, settings: ContinuousPhaseSettings): void {
  for (const config of voiceConfigs(settings)) runtime.setVoice(config);
}

export default function ContinuousPhase() {
  const { t, locale } = useMessages();
  const [settings, setSettings] = useUrlSettings(DEFAULT_SETTINGS, URL_SCHEMA);
  const [showResultant, setShowResultant] = useState(false);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const configure = useCallback((runtime: AudioRuntime) => {
    setupContinuousPhase(runtime, settingsRef.current);
  }, []);
  const { runtime, status, toggle, restart } = useAudioRuntime(configure);

  // Hot changes: tempo and pattern apply from the next unscheduled step.
  useEffect(() => {
    if (runtime) applyVoices(runtime, settings);
  }, [runtime, settings]);

  const { mode, differencePercent, plateauCycles, material, melody } = settings;
  const pattern = useMemo(() => patternFor({ material, melody }), [material, melody]);
  useEffect(() => {
    // A new plateau source picks up the current offset, so switching modes is seamless.
    runtime?.engine.setPulseSource(
      'B',
      pulseSourceFor({ mode, differencePercent, plateauCycles, material }),
    );
  }, [runtime, mode, differencePercent, plateauCycles, material]);

  const update = <K extends keyof ContinuousPhaseSettings>(
    key: K,
    value: ContinuousPhaseSettings[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  return (
    <article className={styles.module}>
      <header className={styles.intro}>
        <h2>{t.modules.continuousPhase.title}</h2>
        <p>{t.continuousPhase.intro}</p>
      </header>

      <div className={styles.layout}>
        <div className={styles.visual}>
          <PhaseRings
            engine={runtime?.engine ?? null}
            pattern={pattern}
            showResultant={showResultant}
          />
        </div>

        <section className={styles.controls} aria-label={t.controls.region}>
          <Slider
            label={t.controls.tempo}
            value={settings.bpm}
            {...LIMITS.bpm}
            format={(value) => `${value}`}
            onChange={(value) => update('bpm', value)}
          />
          <Slider
            label={t.continuousPhase.difference}
            value={differencePercent}
            {...LIMITS.differencePercent}
            format={(value) => t.units.percent(formatDecimal(locale, value, 1))}
            onChange={(value) => update('differencePercent', value)}
          />
          <Choice
            label={t.continuousPhase.mode}
            value={mode}
            options={MODES.map((value) => ({ value, label: t.continuousPhase.modes[value] }))}
            onChange={(value) => update('mode', value)}
          />
          <Slider
            label={t.continuousPhase.plateauCycles}
            value={plateauCycles}
            {...LIMITS.plateauCycles}
            format={(value) => `${value}`}
            onChange={(value) => update('plateauCycles', value)}
            disabled={mode !== 'plateau'}
          />
          <Choice
            label={t.continuousPhase.material}
            value={material}
            options={MATERIALS.map((value) => ({ value, label: t.continuousPhase.materials[value] }))}
            onChange={(value) => update('material', value)}
          />
          {material === 'melody' && (
            <PitchListEditor
              legend={t.pitchEditor.melody}
              notes={melody}
              pitches={EDITABLE_PITCHES}
              rests
              itemLabel={t.patternEditor.step}
              onChange={(index, note) =>
                update(
                  'melody',
                  melody.map((current, i) => (i === index ? note : current)),
                )
              }
              onReset={() => update('melody', DEFAULT_SETTINGS.melody)}
              resetLabel={t.pitchEditor.resetMelody}
            />
          )}
          <Checkbox
            label={t.controls.showResultant}
            checked={showResultant}
            onChange={setShowResultant}
          />
          <button
            type="button"
            className={styles.secondary}
            onClick={() => void restart()}
            disabled={!runtime}
          >
            {t.controls.restartUnison}
          </button>
          <ShareExport
            filename={t.continuousPhase.filename}
            render={(seconds) =>
              renderOffline((runtime) => setupContinuousPhase(runtime, settings), seconds)
            }
          />
        </section>
      </div>

      <Transport status={status} onToggle={() => void toggle()} />
    </article>
  );
}
