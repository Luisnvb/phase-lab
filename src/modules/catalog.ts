import type { ComponentType } from 'react';
import ContinuousPhase from './continuous-phase/ContinuousPhase.tsx';
import MetricAmbiguity from './metric-ambiguity/MetricAmbiguity.tsx';
import SteppedPhase from './stepped-phase/SteppedPhase.tsx';
import Substitution from './substitution/Substitution.tsx';

export type ModuleEntry = {
  route: string;
  title: string;
  /** One sentence for the home page card (SPEC §6). */
  summary: string;
  /** Missing for modules planned in later versions. */
  Component?: ComponentType;
};

export const MODULES: readonly ModuleEntry[] = [
  {
    route: 'desfase-continuo',
    title: 'Desfase continuo',
    summary:
      'Dos voces con el mismo patrón: una va un poco más deprisa, se separa poco a poco y acaba volviendo al unísono.',
    Component: ContinuousPhase,
  },
  {
    route: 'desfase-por-saltos',
    title: 'Desfase por saltos',
    summary:
      'La segunda voz se adelanta un paso cada pocas repeticiones y recorre todas las combinaciones del patrón consigo mismo.',
    Component: SteppedPhase,
  },
  {
    route: 'sustitucion',
    title: 'Construcción por sustitución',
    summary: 'Un patrón aparece golpe a golpe, cambiando silencios por notas.',
    Component: Substitution,
  },
  {
    route: 'ambiguedad-metrica',
    title: 'Ambigüedad 3 contra 2',
    summary: 'El mismo ciclo de 12 pulsos se oye en grupos de tres o de dos según dónde caen los acentos.',
    Component: MetricAmbiguity,
  },
  {
    route: 'aumentacion',
    title: 'Aumentación',
    summary: 'Las notas de un acorde se alargan ciclo a ciclo sobre un pulso que no cambia.',
  },
];
