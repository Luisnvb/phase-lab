import type { ModuleEntry } from '../modules/catalog.ts';
import styles from './Home.module.css';

type Props = {
  modules: readonly ModuleEntry[];
};

export function Home({ modules }: Props) {
  return (
    <div className={styles.home}>
      <p className={styles.lead}>
        Técnicas para organizar el tiempo en la música de proceso: voces que se desfasan,
        patrones que se construyen paso a paso y figuras que surgen de su superposición. Cada
        módulo suena y se ve a la vez, mientras el proceso ocurre.
      </p>

      <ul className={styles.cards}>
        {modules.map((module) => (
          <li key={module.route}>
            {module.Component ? (
              <a href={`#/${module.route}`} className={styles.card}>
                <h2 className={styles.cardTitle}>{module.title}</h2>
                <p className={styles.summary}>{module.summary}</p>
                <span className={styles.action} aria-hidden="true">
                  Abrir →
                </span>
              </a>
            ) : (
              <div className={`${styles.card} ${styles.upcoming}`}>
                <h2 className={styles.cardTitle}>{module.title}</h2>
                <p className={styles.summary}>{module.summary}</p>
                <span className={styles.badge}>Próximamente</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className={styles.note}>
        Usa auriculares o altavoces estéreo: las dos voces suenan a cada lado. Con auriculares
        inalámbricos el sonido puede llegar con algo de retraso respecto a la imagen.
      </p>
    </div>
  );
}
