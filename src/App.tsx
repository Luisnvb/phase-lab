import type { ComponentType } from 'react';
import styles from './App.module.css';
import ContinuousPhase from './modules/continuous-phase/ContinuousPhase.tsx';
import SteppedPhase from './modules/stepped-phase/SteppedPhase.tsx';
import { useHashRoute } from './state/use-hash-route.ts';

const MODULES: readonly { route: string; title: string; Component: ComponentType }[] = [
  { route: 'desfase-continuo', title: 'Desfase continuo', Component: ContinuousPhase },
  { route: 'desfase-por-saltos', title: 'Desfase por saltos', Component: SteppedPhase },
];

export default function App() {
  const route = useHashRoute();
  const current = MODULES.find((module) => module.route === route) ?? MODULES[0]!;

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Procesos</h1>
        <nav aria-label="Módulos">
          <ul className={styles.nav}>
            {MODULES.map((module) => (
              <li key={module.route}>
                <a
                  href={`#/${module.route}`}
                  className={styles.link}
                  aria-current={module === current ? 'page' : undefined}
                >
                  {module.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      {/* The key remounts on change: the previous module stops and frees its audio. */}
      <current.Component key={current.route} />
    </main>
  );
}
