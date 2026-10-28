# Procesos — especificación funcional y técnica

*[English](SPEC.md) · Español. Las dos versiones deben mantenerse iguales.*

App web interactiva para explorar técnicas de organización del tiempo asociadas a la música de proceso de Steve Reich: desfase continuo, desfase por saltos, construcción por sustitución, patrones resultantes, ambigüedad métrica y aumentación.

Principio guía: **el proceso debe ser audible y visible mientras sucede**. Cada módulo combina sonido generado en tiempo real, una visualización sincronizada con precisión y pocos controles.

> **Estado (octubre de 2026):** versiones 0.1 a 0.4 publicadas en https://luisnvb.dev/phase-lab/; 0.5 (idiomas, melodía y acorde editables, guía de escucha de la aumentación) implementada. Pendiente la prueba manual en Firefox, Safari de escritorio y móvil (criterio de M5, §9). Las decisiones tomadas durante la implementación aparecen marcadas como **Decidido**.

---

## 1. Objetivos y alcance

### Objetivos
- Que una persona sin formación musical entienda cada técnica en menos de dos minutos de uso.
- Que una persona con formación pueda experimentar con sus propios patrones y parámetros.
- Sincronía estricta entre sonido e imagen (desviación perceptible = fallo).

### MVP (versión 0.1)
- Motor de tiempo común (sección 4).
- Módulo 1: Desfase continuo.
- Módulo 2: Desfase por saltos.
- Capa de patrones resultantes aplicable a ambos (versión básica).
- Editor de patrones de 12 pulsos.

### Versiones posteriores
- 0.2: Módulo 3 (sustitución) y módulo 4 (ambigüedad 3 contra 2).
- 0.3: Módulo 5 (aumentación) y variante "cinta" del módulo 1 (grabación por micrófono).
- 0.4: Compartir configuraciones por URL, exportar audio.
- 0.5: Interfaz en inglés (predeterminado) y español; melodía del módulo 1 y acorde de la aumentación editables; guía de escucha de la aumentación.

### Fuera de alcance
- Grabaciones, partituras o fragmentos de obras de Reich. Todo el material por defecto es original y editable (ver sección 8).
- Cuentas de usuario y backend. La app es 100 % cliente.

---

## 2. Stack técnico

| Área | Elección | Motivo |
|---|---|---|
| Build | Vite 8 | Arranque rápido, sin configuración |
| Lenguaje | TypeScript estricto | Lógica temporal propensa a errores sutiles |
| UI | React 18 | Componentes por módulo |
| Audio | Web Audio API + Tone.js **solo para instrumentos** | Ver 4.1: el transporte de Tone.js no sirve para voces con periodos independientes |
| Gráficos | Canvas 2D para animación; SVG para editores y matrices | Rendimiento a 60 fps |
| Estado | `useState` / `useReducer` de React | **Decidido:** Zustand no hizo falta |
| Tests | Vitest | Lógica pura del motor y de los patrones |
| Estilo | CSS Modules con variables CSS | **Decidido en M0** (frente a Tailwind): sin dependencias y encaja con un módulo por carpeta |
| Despliegue | GitHub Actions → GitHub Pages | Lint, tests y build en cada push a `main` |

Idiomas de la interfaz: inglés (predeterminado) y español (v0.5, §6). Código, nombres y comentarios: inglés.

Versiones fijadas exactas en `package.json`. Vite 8 y Vitest 5, que requieren Node ≥ 22.12 (campo `engines`; ver §10).

---

## 3. Modelo de datos

```ts
// Un patrón es un ciclo de pasos; cada paso puede sonar o no.
type Step = {
  active: boolean;
  pitch?: string;
  velocity?: number;
  length?: number;                           // duración en pasos (por defecto, casi un paso)
};
type Pattern = { steps: Step[] };            // longitud por defecto: 12

type VoiceId = 'A' | 'B';
type InstrumentId = 'mallet' | 'click' | 'pianoish' | 'organ' | 'shaker';

type VoiceConfig = {
  id: VoiceId;
  pattern: Pattern;
  pulseDuration: number;                     // segundos por paso
  instrument: InstrumentId;
  gain: number;                              // 0..1
  pan: number;                               // -1..1
};

// Evento ya programado en el reloj de audio.
type ScheduledEvent = {
  voice: VoiceId;
  stepIndex: number;                         // índice dentro del patrón
  cycleIndex: number;                        // nº de repetición del patrón
  time: number;                              // AudioContext.currentTime en el que suena
  active: boolean;
};
```

### Funciones puras (en `src/core/`, todas con tests)
- `melodicPattern(pitches)`: patrón a partir de alturas; `null` es un silencio (v0.5).
- `rotate(pattern, k)`: desplaza el patrón k pasos (k puede ser negativo, se normaliza mod N).
- `resultant(a, b)`: por cada paso devuelve `'none' | 'A' | 'B' | 'both'`. `stageMatrix(pattern)`: la resultante de las N + 1 etapas.
- `phaseOffset(tA, tB, period)`: desfase en pasos (número real) entre dos voces dado su tiempo transcurrido. `phaseReadout`: desfase dentro del ciclo y vueltas completas. `nearestStage`: desfase entero más cercano.
- `positionAt(events, voice, time, N)` y `stepAt(events, voice, time)`: posición de una voz interpolada entre sus eventos (§4.3); `stepAt` admite ciclos de longitud variable.
- `fillOrder(pattern, mode, { seed?, custom? })`: orden de sustitución de silencios por golpes (`'ltr' | 'random' | 'custom'`).
- `accentsFor(n, groupSize)`: índices acentuados para una agrupación dada. `accentPattern`: mismo patrón con velocidades de acento.
- Procesos: `createPlateauSource` (mesetas), `createSteppedProcess` (etapas), `createBuildProcess` (sustitución), `createAugmentationProcess` (aumentación, con las alturas del acorde como opción).
- Aumentación: `initialChord(pitches)`, `chordTexture(notes)`: `'separate' | 'overlapping' | 'chord'` según las notas suenen una tras otra, se solapen o lleguen a sonar todas a la vez (v0.5).
- Cinta: `tapePositionAt`, `waveformPeaks`, `synthesizeSample`.
- v0.4: `encodeState` / `decodeState` (ajustes ↔ URL), `encodeWav`, `trimTrailingSilence`.
- v0.5: `chromaticRange` y `EDITABLE_PITCHES` (do3–do6 cromático, para los editores); `parseLocale` (idioma guardado o predeterminado).

---

## 4. Motor de tiempo

Es la pieza crítica. Todo lo demás depende de que esto sea correcto.

### 4.1 Requisitos
- Cada voz tiene **su propio programador** con su propio periodo, que puede cambiar en caliente. No usar `Tone.Transport` como reloj común: el desfase continuo exige dos tempos distintos simultáneos.
- Todo evento se programa sobre `AudioContext.currentTime`. Prohibido disparar sonido desde `setTimeout`, `setInterval` o `requestAnimationFrame` directamente.

### 4.2 Algoritmo (patrón "lookahead")
- Un `setInterval` de **25 ms** despierta al programador.
- En cada despertar, para cada voz, mientras `voice.nextTime < ctx.currentTime + 0.1`:
  1. Si el paso está activo, programar la nota en `voice.nextTime`.
  2. Registrar el `ScheduledEvent` en una cola circular (para la visualización).
  3. Avanzar: `nextTime += voice.currentPulseDuration()`; incrementar `stepIndex` (y `cycleIndex` al cerrar el ciclo).
- Los cambios de tempo afectan al siguiente evento no programado, nunca a uno ya programado.
- **Decidido:** las voces se programan entre sí en orden cronológico (a igual tiempo, primero A). Así una voz puede decidir su siguiente intervalo conociendo ya los tiempos de la otra (fuentes de pulso, modo mesetas).
- **Decidido:** un ciclo termina con la longitud del patrón con el que se tocó, aunque un oyente cambie el patrón en su último paso. Los cambios de patrón y de acentos se aplican en el último paso de cada ciclo (`onCycleBoundary`), para que caigan en el siguiente límite.
- **Decidido:** si el temporizador se retrasa (pestaña en segundo plano), los eventos ya pasados se registran pero no suenan, para evitar ráfagas.

### 4.3 Sincronía visual
- Las visualizaciones se dibujan en `requestAnimationFrame`.
- Tiempo visual: `ctx.currentTime - (ctx.outputLatency ?? ctx.baseLatency ?? 0)`.
- La posición de cada voz se interpola entre el último evento ya sonado y el siguiente de la cola, no se calcula por separado. Una única fuente de verdad: la cola de eventos.
- **Decidido:** como el pulso puede durar más que la ventana de antelación (114 ms frente a 100 ms con el tempo por defecto), el motor expone también el siguiente evento de cada voz, ya fijado pero aún no programado (`getNextEvents`).

### 4.4 Ciclo de vida
- El `AudioContext` se crea o reanuda **solo tras un gesto del usuario** (botón "Empezar"), por la política de autoplay de los navegadores, especialmente iOS Safari. Se crea de forma síncrona dentro del gesto, antes de cualquier `await`.
- Pausa: suspender el contexto. Detener: vaciar colas y reiniciar índices.
- Cambiar de módulo detiene el motor y libera nodos.
- iOS: `navigator.audioSession.type = 'playback'` para sonar con el interruptor de silencio activado; la interfaz sigue las interrupciones del sistema (pasa a «Reanudar»).

### 4.5 API
```ts
interface Engine {
  start(): Promise<void>;
  stop(): void;
  setVoice(config: VoiceConfig): void;
  setPulseDuration(voice: VoiceId, seconds: number): void;
  setPulseSource(voice: VoiceId, source: PulseSource | null): void;  // intervalos paso a paso (mesetas)
  setPatternOffset(voice: VoiceId, steps: number): void;   // para desfase por saltos; en el límite de ciclo
  setEndCycle(voice: VoiceId, cycle: number | null): void;  // procesos con final; nunca corta un ciclo
  getRecentEvents(sinceTime: number): ScheduledEvent[];
  getNextEvents(): ScheduledEvent[];                        // ver 4.3
  now(): number;                                            // tiempo visual (4.3)
  on(event: 'cycle' | 'step', cb: (e: ScheduledEvent) => void): () => void;
}
```
Los eventos `cycle` y `step` se emiten al programar, hasta 100 ms antes de que suenen.

---

## 5. Módulos

Cada módulo es una carpeta en `src/modules/<nombre>/` con: componente principal, controles, visualización y un breve texto explicativo (2–4 frases) que aparece encima. **Decidido:** cada módulo tiene un `setup.ts` que prepara el motor; lo usan tanto la reproducción en directo como la exportación (§5, v0.4).

### Módulo 1 — Desfase continuo
**Qué muestra:** dos voces con el mismo patrón; la B va ligeramente más deprisa y se separa poco a poco hasta volver al unísono.

**Controles**
- Tempo base (60–200 negras por minuto; por defecto 132, con un paso por semicorchea ≈ 0,114 s).
- Diferencia de tempo de B: 0 %–5 % (por defecto 1 %).
- Modo:
  - *Continuo:* B mantiene la diferencia todo el tiempo.
  - *Con mesetas:* B acelera hasta adelantarse exactamente un paso, entonces vuelve al tempo de A durante K ciclos (por defecto 8; rango 1–32) y repite. Es la práctica habitual en interpretación en vivo. **Decidido:** empieza con K ciclos en unísono; B se ajusta a la rejilla de A, así que la meseta es exacta aunque cambie el tempo.
- Material (**decidido**): melódico (marimba) o rítmico (clic).
- **Decidido (v0.5):** la melodía es editable: un selector de altura por paso (do3–do6 cromático, o silencio), botón «Restaurar la melodía inicial». Se aplica en caliente y viaja en el enlace (`melodia=D4-_-Fs4-…`, `s` = sostenido, `_` = silencio). El patrón rítmico sigue fijo.
- Botón "Reiniciar al unísono".

**Visualización**
- Dos anillos concéntricos (A exterior, B interior) con N marcas; las activas resaltadas.
- Un cursor por anillo que gira según su voz.
- Arco entre ambos cursores que representa el desfase, con su valor en pasos (p. ej. "2,37 pasos").
- Contador de "vuelta completa" cuando B recupera el unísono.

**Criterios de aceptación**
- Con diferencia 1 % y N = 12, B adelanta un ciclo completo tras ≈100 ciclos de A (verificable con test del motor sin audio, usando un reloj simulado). ✅ Test del motor.
- En modo mesetas, el desfase mostrado se detiene en valores enteros (±0,02) durante K ciclos. ✅ Test del motor (de hecho, exacto).
- Sin derivas visibles entre cursor y sonido tras 5 minutos de reproducción. Garantizado por diseño (§4.3) y con test de deriva de tiempos; falta comprobarlo de oído.

### Módulo 2 — Desfase por saltos
**Qué muestra:** B toca el mismo patrón desplazado un número entero de pasos, y el desplazamiento aumenta en 1 cada M repeticiones hasta dar la vuelta completa.

**Controles**
- Editor de patrón de N pasos (por defecto 12) con casillas.
- Repeticiones por etapa M (por defecto 8; rango 1–16).
- Avance automático o manual (botón "Siguiente etapa"). **Decidido:** el avance manual se aplica en el siguiente límite de ciclo.
- Tempo único para ambas voces.
- Bucle (**decidido**: tras la etapa N sigue desde la etapa 1, porque la N ya es el unísono).

**Visualización**
- Matriz de N+1 filas (etapas 0..N) × N columnas. Cada celda muestra la superposición en ese paso: vacía, solo A, solo B, ambas (cuatro estilos distintos, también distinguibles sin color: relleno, borde, mitad, punto).
- Fila actual resaltada; cursor de paso recorriéndola.
- Indicador "Etapa k de N · repetición m de M".

**Criterios de aceptación** (✅ los tres, con tests contra el motor y reloj simulado)
- En la etapa k, el patrón de B es exactamente `rotate(A, k)`.
- El cambio de etapa ocurre en el límite de ciclo, sin cortar el patrón.
- Tras la etapa N, ambas voces vuelven al unísono y el proceso termina (o se reinicia si "bucle" está activado).

### Capa de patrones resultantes (MVP básico, aplicable a 1 y 2)
- Interruptor "Mostrar resultante": añade una tercera fila/anillo con `resultant(A, B)`. **Decidido:** en el módulo 1 el anillo muestra la resultante del desfase entero más cercano y se atenúa entre pasos; en el módulo 2, una tira con A, B y A+B encima de la matriz.
- En el módulo 2, botón "Escuchar solo la resultante": silencia A y B y reproduce la combinación con un timbre distinto (`pianoish`, centrado; las coincidencias suenan acentuadas).
- Posterior: seleccionar un subconjunto de la resultante (por ejemplo, solo notas agudas) para aislar una línea emergente. *(No implementado.)*

### Módulo 3 — Construcción por sustitución (v0.2)
- Patrón objetivo visible en gris; los pasos se activan uno a uno cada M ciclos según `fillOrder`.
- Botones: construir, deshacer (proceso inverso), modo de orden.
- Dos voces opcionales construyendo el mismo patrón con un desfase fijo, para que la resultante crezca de forma compleja.
- **Decidido:**
  - Empieza con un golpe (no con el ciclo vacío) para que haya sonido desde el principio; M por defecto 4 (rango 1–16).
  - Deshacer retira golpes en orden inverso desde el siguiente límite de ciclo; el patrón completo y el silencio se mantienen hasta cambiar de dirección.
  - Orden personalizado: se pulsan los pasos en el orden deseado; los que falten siguen de izquierda a derecha.
  - Desfase de B: 0–11 pasos (por defecto 3). Los golpes pendientes muestran su turno.

### Módulo 4 — Ambigüedad 3 contra 2 (v0.2)
- Ciclo de 12 pasos con un patrón fijo.
- Selector de agrupación: 4×3, 3×4, 6×2, 2×6. Solo cambian los acentos (volumen y marca visual), no los golpes.
- Opción de dos agrupaciones simultáneas en voces distintas.
- **Decidido:**
  - Material por defecto: pulso con los 12 pasos activos (con el patrón rítmico, algunos acentos caerían en silencios); alternativa: la melodía.
  - Acento: velocidad 1; resto: 0,35. Visualmente, barra alta frente a barra baja dentro de un recuadro por grupo.
  - Los cambios de agrupación se aplican en el límite de ciclo, y la visualización muestra la agrupación que suena, no la seleccionada.

### Módulo 5 — Aumentación (v0.3)
- Acorde de 3–5 notas sobre un pulso fijo (maracas/hi-hat sintéticos).
- Cada ciclo, las notas se alargan en un factor (1,0–1,5) o una cantidad fija de pulsos.
- Visualización: barras horizontales tipo piano roll que se estiran.
- **Decidido:**
  - Acorde original sobre re: `D4 A4 E5 G5 C6` (las 3–5 primeras); las notas entran escalonadas, una por pulso, con duración inicial de 1 pulso. Órgano (`organ`) sobre maraca (`shaker`).
  - Por defecto: factor 1,1; en modo pulsos, +1 (rango 0–4).
  - El ciclo se estira hasta contener la nota más larga (mínimo 8 pulsos). Cuando superaría 48 pulsos, el proceso termina: el crecimiento por factor es exponencial.
  - El piano roll muestra en discontinuo la duración inicial y marca el final del ciclo.
- **Decidido (v0.5):**
  - Acorde editable: cinco selectores de altura (se usan los 3–5 primeros, en orden de entrada); bloqueado mientras suena, porque el proceso se crea al empezar. Viaja en el enlace (`acorde=…`). Puede repetir alturas: el piano roll distingue las notas por su entrada.
  - Guía de escucha desplegable («Qué escuchar») bajo el texto breve: la intención del proceso según *Music as a Gradual Process* (1968), las tres fases que se oyen (ritmo, acorde que se forma, sonido sostenido), el pulso como regla de medir, consejos de escucha y la diferencia con *Four Organs* (allí las notas no crecen todas al mismo ritmo).
  - Bajo el piano roll, una frase dice qué se oye en el ciclo actual (`chordTexture`); solo cambia dos veces por proceso, así que se anuncia a lectores de pantalla.

### Variante "cinta" del módulo 1 (v0.3)
- Grabar hasta 3 s por micrófono (`getUserMedia`), recortar inicio/fin.
- Reproducir como dos `AudioBufferSourceNode` en bucle; B con `playbackRate` ligeramente mayor que 1.
- Visualización de forma de onda en dos anillos.
- La grabación nunca sale del navegador.
- **Decidido:** ruta propia (`#/desfase-cinta`), enlazada desde el módulo 1 y desde el inicio, fuera del menú principal. Sonido de ejemplo sintetizado para probarla sin micrófono. Desfase en segundos y en % del bucle.

### Compartir y exportar (v0.4)
- **Decidido — URL:** los ajustes de cada módulo viven en la consulta del hash (`#/desfase-continuo?d=2.5&modo=plateau`). Solo se escriben los que difieren de los valores por defecto; al abrir un enlace, los fuera de rango se ajustan y los no válidos vuelven al valor por defecto. Botón «Copiar enlace a esta configuración». La grabación de la cinta no se comparte.
- **Decidido — audio:** exportación a WAV (estéreo, 16 bits, 44,1 kHz) de 30 s, 1 min o 2 min. Cada módulo se prepara con su `setup.ts` sobre un contexto sin conexión de Tone.js y con un reloj simulado, de modo que el archivo suena igual que la reproducción. Si el proceso termina antes, se recorta el silencio final (1 s de cola). En el módulo 2, la exportación avanza las etapas automáticamente. La cinta se renderiza con un `OfflineAudioContext`.

---

## 6. Interfaz

- Página de inicio con tarjetas de módulos y una frase sobre cada uno.
- Dentro de cada módulo: texto breve arriba, visualización al centro, controles debajo (en móvil) o a la derecha (≥ 1024 px).
- Botón grande de reproducir/pausar siempre visible.
- Tema claro y oscuro según `prefers-color-scheme`.
- Accesibilidad: controles con teclado (espacio = reproducir/pausar), etiquetas ARIA, estados no codificados solo por color, respeto a `prefers-reduced-motion` (sustituir giro continuo por saltos discretos).
- **Decidido (v0.5) — idiomas:** selector junto al título con los nombres en su propio idioma («English», «Español»). Inglés por defecto; la elección se guarda en el navegador (`localStorage`, con alternativa si no está disponible) y cambia `lang` del documento y su título. Textos en `src/i18n/` (un objeto por idioma con la misma forma, comprobada por TypeScript; sin dependencias). Los números siguen el idioma (1.25 / 1,25). Las rutas y las claves de la URL siguen en español para no romper enlaces compartidos. Nombres de notas: C♯4 en inglés y Do♯4 en español, con la misma numeración de octavas.
- **Decidido:** zonas táctiles de al menos 44 px; anuncios para lectores de pantalla del estado de reproducción y de los cambios de etapa; en pantallas estrechas el menú es una fila con desplazamiento lateral y el piano roll se desplaza dentro de su caja.

### Sonidos
- Instrumentos sintetizados con Tone.js, sin muestras externas:
  - `mallet`: tipo marimba (FMSynth con envolvente corta).
  - `click`: percusivo seco (NoiseSynth filtrado).
  - `pianoish`: PolySynth con ataque corto.
  - `organ`: PolySynth sostenido (aumentación).
  - `shaker`: ruido corto filtrado en agudos, tipo maraca (aumentación).
- A y B con paneo opuesto (±0,4) para que el desfase se oiga espacialmente.

---

## 7. Estructura de carpetas

```
src/
  core/            # funciones puras + tests (sin dependencias de navegador)
  engine/          # programador, voces, instrumentos, sincronía, cinta, render sin conexión
  modules/
    catalog.ts     # lista de módulos (inicio y menú)
    continuous-phase/   # incluye la variante con cinta
    stepped-phase/
    substitution/
    metric-ambiguity/
    augmentation/
  components/      # editores de patrón y de alturas, anillos, matriz, piano roll, transporte, compartir/exportar, idioma
  i18n/            # textos de la interfaz en inglés y español, formato de números
  state/           # hooks: audio, URL, idioma, animación, movimiento reducido
  styles/
  App.tsx
docs/              # captura para el README
```

---

## 8. Contenidos y derechos

- No incluir grabaciones, partituras ni patrones transcritos de obras de Reich.
- Patrones por defecto originales (la melodía y el acorde se pueden editar desde la v0.5):
  - Rítmico de 12 pasos: `x x . x . . x . x x . .` (sin simetría rotacional: las 12 etapas del desfase por saltos son distintas; se comprobó que no es ninguna rotación de *Clapping Music*).
  - Melódico de 12 notas (re dórico): `D4 A4 E5 A4 F5 E5 D5 A4 C5 E5 G4 A4`
  - Acorde de la aumentación: `D4 A4 E5 G5 C6`. Sonido de ejemplo de la cinta: cinco notas sintetizadas (re menor pentatónica).
- Los textos explicativos pueden mencionar obras como referencia de escucha (título y año), sin reproducir material.

---

## 9. Hitos

| Hito | Contenido | Hecho cuando | Estado |
|---|---|---|---|
| M0 | Proyecto Vite + TS + React + Vitest, lint, estructura de carpetas | `npm run dev` y `npm test` funcionan | ✅ |
| M1 | `src/core` completo con tests; motor con reloj simulable | Tests del motor verifican el criterio de 100 ciclos del módulo 1 | ✅ |
| M2 | Módulo 1 (continuo y mesetas) | Criterios de aceptación del módulo 1 | ✅ (falta comprobar de oído los 5 minutos) |
| M3 | Módulo 2 + editor de patrón | Criterios de aceptación del módulo 2 | ✅ |
| M4 | Capa de resultantes | Visible en ambos módulos; "solo resultante" en el 2 | ✅ |
| M5 | Pulido MVP: inicio, accesibilidad, móvil (iOS Safari incluido) | Prueba manual en Chrome, Firefox, Safari de escritorio y móvil | Parcial: probado en Chrome de escritorio y a 390 px de ancho; pendiente Firefox, Safari e iOS |
| 0.2 | Sustitución y ambigüedad 3 contra 2 | Procesos verificados con tests contra el motor | ✅ |
| 0.3 | Aumentación y variante con cinta | Ídem; grabación por micrófono sin probar en navegador | ✅ (micrófono pendiente) |
| 0.4 | Compartir por URL y exportar audio | Enlaces validados; WAV generado y analizado en Chrome | ✅ |
| 0.5 | Idiomas, melodía y acorde editables, guía de la aumentación | Tests de la lógica nueva; comprobado en Chrome de escritorio en ambos idiomas | ✅ (sin publicar) |

---

## 10. Riesgos y decisiones

- **Deriva por cambios de tempo en caliente:** recalcular siempre desde `nextTime`, nunca desde el tiempo inicial multiplicado.
- **Latencia de salida variable en Bluetooth:** la compensación de 4.3 lo mitiga; la página de inicio avisa de que con auriculares inalámbricos puede haber desfase imagen-sonido.
- **Testabilidad del motor:** inyectar un reloj (`() => number`) para poder simular tiempo en tests sin `AudioContext`. El mismo reloj simulado sirve para la exportación.
- **Decidido:** N fijo en 12 en la interfaz; el modelo y el motor admiten longitudes variables (la aumentación ya las usa).
- **Decidido:** CSS Modules (M0).
- **iOS y grabación:** la sesión de audio pasa a `play-and-record` mientras se graba y vuelve a `playback`; cada navegador graba en un formato distinto. Riesgo principal sin probar.
- **Dependencias de desarrollo:** resuelto el 25 de octubre de 2026 al pasar a Node 22, Vite 8, Vitest 5 y `@vitejs/plugin-react` 6; `npm audit` ya no señala vulnerabilidades. Vite 8 empaqueta con Rolldown; la configuración no necesitó cambios.

---

## 11. Pendiente y siguientes pasos

*Anotado al cerrar la sesión del 24 de octubre de 2026, con la versión 0.4 publicada.*

### Pendiente (por orden de importancia)
1. **Prueba manual en navegadores** (criterio de M5, aún sin cumplir). Solo se ha probado en Chrome de escritorio.
   - **iOS Safari:** que suene con el interruptor de silencio activado; que tras una llamada o al volver de otra app el botón pase a «Reanudar» y siga sonando al pulsarlo; que el botón de reproducir no quede bajo la barra inferior.
   - **Grabación por micrófono** (variante con cinta) en Chrome, Firefox, Safari e iOS: cada navegador graba en un formato distinto y en iOS cambia la sesión de audio. No se ha probado en ningún navegador.
   - **Firefox y Safari de escritorio:** los cinco módulos, la cinta y la exportación.
2. **Comprobaciones de oído:** que cursor y sonido no se separen tras 5 minutos (módulo 1); que los WAV exportados suenen como la reproducción; el equilibrio entre órgano y maraca (aumentación) y el timbre de «solo resultante».
3. **Botón «Copiar enlace»:** sin probar (se evitó sobrescribir el portapapeles). En iOS puede requerir que la página tenga el foco.

### Limitaciones conocidas (menores)
- Al reiniciar al unísono pueden solaparse hasta ~50 ms de notas ya programadas.
- En la sustitución, si se cambia el orden durante la reproducción, los números de turno se actualizan antes que el sonido (menos de un ciclo).
- No hay tests de componentes de interfaz; solo de la lógica pura, el motor y los procesos.
- En GitHub pueden quedar en caché los commits anteriores a la reescritura del correo (inaccesibles sin conocer su identificador).

### Ideas para una posible versión 0.6 (por decidir)
- Seleccionar un subconjunto de la resultante para aislar una línea emergente (previsto como «posterior» en §5).
- N variable (8, 12 o 16 pasos) en la interfaz; el motor ya lo admite (§10).
- Modo mesetas en la variante con cinta.
- Exportar MIDI además de WAV.
- Tests de componentes de interfaz (por ejemplo, con Testing Library).
