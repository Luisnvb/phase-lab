import styles from './App.module.css';
import ContinuousPhase from './modules/continuous-phase/ContinuousPhase.tsx';

export default function App() {
  return (
    <main className={styles.app}>
      <h1 className={styles.title}>Procesos</h1>
      <ContinuousPhase />
    </main>
  );
}
