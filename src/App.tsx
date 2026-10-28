import { useEffect } from 'react';
import styles from './App.module.css';
import { Home } from './components/Home.tsx';
import { LanguageSwitch } from './components/LanguageSwitch.tsx';
import { useMessages } from './i18n/messages.ts';
import { MODULES } from './modules/catalog.ts';
import { useHashRoute } from './state/use-hash-route.ts';

const AVAILABLE = MODULES.filter((module) => module.Component);

export default function App() {
  const route = useHashRoute();
  const { t } = useMessages();
  const current = AVAILABLE.find((module) => module.route === route);
  const title = current ? `${t.modules[current.id].title} · ${t.appName}` : t.appName;

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    // On narrow screens the menu scrolls sideways: keep the current module in view.
    document
      .querySelector('nav [aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current]);

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>
            <a href="#/" className={styles.home}>
              {t.appName}
            </a>
          </h1>
          <LanguageSwitch />
        </div>
        <nav aria-label={t.nav} className={styles.menu}>
          <ul className={styles.nav}>
            {AVAILABLE.filter((module) => !module.variant).map((module) => (
              <li key={module.route}>
                <a
                  href={`#/${module.route}`}
                  className={styles.link}
                  aria-current={module === current ? 'page' : undefined}
                >
                  {t.modules[module.id].title}
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
