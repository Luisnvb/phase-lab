import { useMessages } from '../i18n/messages.ts';
import type { ModuleEntry } from '../modules/catalog.ts';
import styles from './Home.module.css';

type Props = {
  modules: readonly ModuleEntry[];
};

export function Home({ modules }: Props) {
  const { t } = useMessages();
  return (
    <div className={styles.home}>
      <p className={styles.lead}>{t.home.lead}</p>

      <ul className={styles.cards}>
        {modules.map((module) => (
          <li key={module.route}>
            {module.Component ? (
              <a href={`#/${module.route}`} className={styles.card}>
                <h2 className={styles.cardTitle}>{t.modules[module.id].title}</h2>
                <p className={styles.summary}>{t.modules[module.id].summary}</p>
                <span className={styles.action} aria-hidden="true">
                  {t.home.open}
                </span>
              </a>
            ) : (
              <div className={`${styles.card} ${styles.upcoming}`}>
                <h2 className={styles.cardTitle}>{t.modules[module.id].title}</h2>
                <p className={styles.summary}>{t.modules[module.id].summary}</p>
                <span className={styles.badge}>{t.home.upcoming}</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className={styles.note}>{t.home.note}</p>
    </div>
  );
}
