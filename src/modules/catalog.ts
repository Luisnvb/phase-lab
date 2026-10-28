import type { ComponentType } from 'react';
import type { Messages } from '../i18n/messages.ts';
import Augmentation from './augmentation/Augmentation.tsx';
import ContinuousPhase from './continuous-phase/ContinuousPhase.tsx';
import TapePhase from './continuous-phase/TapePhase.tsx';
import MetricAmbiguity from './metric-ambiguity/MetricAmbiguity.tsx';
import SteppedPhase from './stepped-phase/SteppedPhase.tsx';
import Substitution from './substitution/Substitution.tsx';

export type ModuleId = keyof Messages['modules'];

export type ModuleEntry = {
  /** Key of its title and home-page summary in the interface texts (SPEC §6). */
  id: ModuleId;
  /** Routes stay in Spanish whatever the language, so shared links keep working. */
  route: string;
  /** Missing for modules planned in later versions. */
  Component?: ComponentType;
  /** Variants are reachable from their module and the home page, not the header. */
  variant?: boolean;
};

export const MODULES: readonly ModuleEntry[] = [
  { id: 'continuousPhase', route: 'desfase-continuo', Component: ContinuousPhase },
  { id: 'tapePhase', route: 'desfase-cinta', Component: TapePhase, variant: true },
  { id: 'steppedPhase', route: 'desfase-por-saltos', Component: SteppedPhase },
  { id: 'substitution', route: 'sustitucion', Component: Substitution },
  { id: 'metricAmbiguity', route: 'ambiguedad-metrica', Component: MetricAmbiguity },
  { id: 'augmentation', route: 'aumentacion', Component: Augmentation },
];
