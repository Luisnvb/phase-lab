import { useEffect } from 'react';
import styles from './App.module.css';
import { Home } from './components/Home.tsx';
import { MODULES } from './modules/catalog.ts';
import { useHashRoute } from './state/use-hash-route.ts';

const AVAILABLE = MODULES.filter((module) => module.Component);

export default function App() {
  const route = useHashRoute();
  const current = AVAILABLE.find((module) => module.route === route);

  useEffect(() => {
    document.title = current ? `${current.title} · Procesos` : 'Procesos';
  }, [current]);

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <a href="#/" className={styles.home}>
            Procesos
          </a>
        </h1>
        <nav aria-label="Módulos">
          <ul className={styles.nav}>
            {AVAILABLE.filter((module) => !module.variant).map((module) => (
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
      {current?.Component ? (
        // The key remounts on change: the previous module stops and frees its audio.
        <current.Component key={current.route} />
      ) : (
        <Home modules={MODULES} />
      )}
    </main>
  );
}
