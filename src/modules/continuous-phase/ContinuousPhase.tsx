import { useCallback, useEffect, useRef, useState } from 'react';
import { Choice, Slider } from '../../components/Controls.tsx';
import { PhaseRings } from '../../components/PhaseRings.tsx';
import { Transport } from '../../components/Transport.tsx';
import type { AudioRuntime } from '../../engine/audio-runtime.ts';
import { useAudioRuntime } from '../../state/use-audio-runtime.ts';
import styles from '../../styles/module-layout.module.css';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  patternFor,
  pulseSourceFor,
  voiceConfigs,
  type ContinuousPhaseSettings,
  type Material,
  type PhaseMode,
} from './settings.ts';

const percentFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const MODE_OPTIONS = [
  { value: 'continuous', label: 'Continuo' },
  { value: 'plateau', label: 'Con mesetas' },
] as const satisfies readonly { value: PhaseMode; label: string }[];

const MATERIAL_OPTIONS = [
  { value: 'melody', label: 'Melódico' },
  { value: 'rhythm', label: 'Rítmico' },
] as const satisfies readonly { value: Material; label: string }[];

function applyVoices(runtime: AudioRuntime, settings: ContinuousPhaseSettings): void {
  for (const config of voiceConfigs(settings)) runtime.setVoice(config);
}

export default function ContinuousPhase() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const configure = useCallback((runtime: AudioRuntime) => {
    applyVoices(runtime, settingsRef.current);
    runtime.engine.setPulseSource('B', pulseSourceFor(settingsRef.current));
  }, []);
  const { runtime, status, toggle, restart } = useAudioRuntime(configure);

  // Hot changes: tempo and pattern apply from the next unscheduled step.
  useEffect(() => {
    if (runtime) applyVoices(runtime, settings);
  }, [runtime, settings]);

  const { mode, differencePercent, plateauCycles, material } = settings;
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
        <h2>Desfase continuo</h2>
        <p>
          Dos voces tocan el mismo patrón, pero la voz B va un poco más deprisa. Poco a poco se
          adelanta: el patrón se superpone consigo mismo en posiciones distintas y aparecen
          figuras nuevas, hasta que tras una vuelta completa ambas vuelven al unísono. Con
          «mesetas», B se detiene en cada desfase exacto durante unos ciclos, como suele hacerse
          al tocarlo en directo. Para escuchar: <cite>Piano Phase</cite> (1967).
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.visual}>
          <PhaseRings engine={runtime?.engine ?? null} pattern={patternFor(material)} />
        </div>

        <section className={styles.controls} aria-label="Controles">
          <Slider
            label="Tempo (negras por minuto)"
            value={settings.bpm}
            {...LIMITS.bpm}
            format={(value) => `${value}`}
            onChange={(value) => update('bpm', value)}
          />
          <Slider
            label="Diferencia de tempo de B"
            value={differencePercent}
            {...LIMITS.differencePercent}
            format={(value) => `${percentFormat.format(value)} %`}
            onChange={(value) => update('differencePercent', value)}
          />
          <Choice
            label="Modo"
            value={mode}
            options={MODE_OPTIONS}
            onChange={(value) => update('mode', value)}
          />
          <Slider
            label="Ciclos en cada meseta"
            value={plateauCycles}
            {...LIMITS.plateauCycles}
            format={(value) => `${value}`}
            onChange={(value) => update('plateauCycles', value)}
            disabled={mode !== 'plateau'}
          />
          <Choice
            label="Material"
            value={material}
            options={MATERIAL_OPTIONS}
            onChange={(value) => update('material', value)}
          />
          <button
            type="button"
            className={styles.secondary}
            onClick={() => void restart()}
            disabled={!runtime}
          >
            Reiniciar al unísono
          </button>
        </section>
      </div>

      <Transport status={status} onToggle={() => void toggle()} />
    </article>
  );
}
