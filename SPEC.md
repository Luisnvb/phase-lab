# Procesos — especificación funcional y técnica

App web interactiva para explorar técnicas de organización del tiempo asociadas a la música de proceso de Steve Reich: desfase continuo, desfase por saltos, construcción por sustitución, patrones resultantes, ambigüedad métrica y aumentación.

Principio guía: **el proceso debe ser audible y visible mientras sucede**. Cada módulo combina sonido generado en tiempo real, una visualización sincronizada con precisión y pocos controles.

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
- 0.2: Módulo 3 (sustitución) y módulo 5 (ambigüedad 3/2).
- 0.3: Módulo 6 (aumentación) y variante "cinta" del módulo 1 (grabación por micrófono).
- 0.4: Compartir configuraciones por URL, exportar audio.

### Fuera de alcance
- Grabaciones, partituras o fragmentos de obras de Reich. Todo el material por defecto es original y editable (ver sección 8).
- Cuentas de usuario y backend. La app es 100 % cliente.

---

## 2. Stack técnico

| Área | Elección | Motivo |
|---|---|---|
| Build | Vite | Arranque rápido, sin configuración |
| Lenguaje | TypeScript estricto | Lógica temporal propensa a errores sutiles |
| UI | React 18 | Componentes por módulo |
| Audio | Web Audio API + Tone.js **solo para instrumentos** | Ver 4.1: el transporte de Tone.js no sirve para voces con periodos independientes |
| Gráficos | Canvas 2D para animación; SVG para editores estáticos | Rendimiento a 60 fps |
| Estado | Zustand (o `useReducer` si basta) | Ligero |
| Tests | Vitest | Lógica pura del motor y de los patrones |
| Estilo | CSS Modules o Tailwind | A elegir en M0 |

Idioma de la interfaz: español. Código, nombres y comentarios: inglés.

---

## 3. Modelo de datos

```ts
// Un patrón es un ciclo de pasos; cada paso puede sonar o no.
type Step = { active: boolean; pitch?: string; velocity?: number };
type Pattern = { steps: Step[] };            // longitud por defecto: 12

type VoiceId = 'A' | 'B';

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
- `rotate(pattern, k)`: desplaza el patrón k pasos (k puede ser negativo, se normaliza mod N).
- `resultant(a, b)`: por cada paso devuelve `'none' | 'A' | 'B' | 'both'`.
- `phaseOffset(tA, tB, period)`: desfase en pasos (número real) entre dos voces dado su tiempo transcurrido.
- `fillOrder(pattern, mode, seed?)`: orden de sustitución de silencios por golpes (`'ltr' | 'random' | 'custom'`).
- `accentsFor(n, groupSize)`: índices acentuados para una agrupación dada.

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

### 4.3 Sincronía visual
- Las visualizaciones se dibujan en `requestAnimationFrame`.
- Tiempo visual: `ctx.currentTime - (ctx.outputLatency ?? ctx.baseLatency ?? 0)`.
- La posición de cada voz se interpola entre el último evento ya sonado y el siguiente de la cola, no se calcula por separado. Una única fuente de verdad: la cola de eventos.

### 4.4 Ciclo de vida
- El `AudioContext` se crea o reanuda **solo tras un gesto del usuario** (botón "Empezar"), por la política de autoplay de los navegadores, especialmente iOS Safari.
- Pausa: suspender el contexto. Detener: vaciar colas y reiniciar índices.
- Cambiar de módulo detiene el motor y libera nodos.

### 4.5 API propuesta
```ts
interface Engine {
  start(): Promise<void>;
  stop(): void;
  setVoice(config: VoiceConfig): void;
  setPulseDuration(voice: VoiceId, seconds: number): void;
  setPatternOffset(voice: VoiceId, steps: number): void;   // para desfase por saltos
  getRecentEvents(sinceTime: number): ScheduledEvent[];
  now(): number;                                            // tiempo visual (4.3)
  on(event: 'cycle' | 'step', cb: (e: ScheduledEvent) => void): () => void;
}
```

---

## 5. Módulos

Cada módulo es una carpeta en `src/modules/<nombre>/` con: componente principal, controles, visualización y un breve texto explicativo (2–4 frases) que aparece encima.

### Módulo 1 — Desfase continuo
**Qué muestra:** dos voces con el mismo patrón; la B va ligeramente más deprisa y se separa poco a poco hasta volver al unísono.

**Controles**
- Tempo base (60–200 pulsos por minuto; por defecto 132 pulsos por negra equivalentes a pasos de semicorchea ≈ 0,114 s; ajustar a gusto).
- Diferencia de tempo de B: 0 %–5 % (por defecto 1 %).
- Modo:
  - *Continuo:* B mantiene la diferencia todo el tiempo.
  - *Con mesetas:* B acelera hasta adelantarse exactamente un paso, entonces vuelve al tempo de A durante K ciclos (por defecto 8) y repite. Es la práctica habitual en interpretación en vivo.
- Botón "Reiniciar al unísono".

**Visualización**
- Dos anillos concéntricos (A exterior, B interior) con N marcas; las activas resaltadas.
- Un cursor por anillo que gira según su voz.
- Arco entre ambos cursores que representa el desfase, con su valor en pasos (p. ej. "2,37 pasos").
- Contador de "vuelta completa" cuando B recupera el unísono.

**Criterios de aceptación**
- Con diferencia 1 % y N = 12, B adelanta un ciclo completo tras ≈100 ciclos de A (verificable con test del motor sin audio, usando un reloj simulado).
- En modo mesetas, el desfase mostrado se detiene en valores enteros (±0,02) durante K ciclos.
- Sin derivas visibles entre cursor y sonido tras 5 minutos de reproducción.

### Módulo 2 — Desfase por saltos
**Qué muestra:** B toca el mismo patrón desplazado un número entero de pasos, y el desplazamiento aumenta en 1 cada M repeticiones hasta dar la vuelta completa.

**Controles**
- Editor de patrón de N pasos (por defecto 12) con casillas.
- Repeticiones por etapa M (por defecto 8; rango 1–16).
- Avance automático o manual (botón "Siguiente etapa").
- Tempo único para ambas voces.

**Visualización**
- Matriz de N+1 filas (etapas 0..N) × N columnas. Cada celda muestra la superposición en ese paso: vacía, solo A, solo B, ambas (cuatro estilos distintos, también distinguibles sin color: relleno, borde, mitad, punto).
- Fila actual resaltada; cursor de paso recorriéndola.
- Indicador "Etapa k de N · repetición m de M".

**Criterios de aceptación**
- En la etapa k, el patrón de B es exactamente `rotate(A, k)`.
- El cambio de etapa ocurre en el límite de ciclo, sin cortar el patrón.
- Tras la etapa N, ambas voces vuelven al unísono y el proceso termina (o se reinicia si "bucle" está activado).

### Capa de patrones resultantes (MVP básico, aplicable a 1 y 2)
- Interruptor "Mostrar resultante": añade una tercera fila/anillo con `resultant(A, B)`.
- En el módulo 2, botón "Escuchar solo la resultante": silencia A y B y reproduce la combinación con un timbre distinto.
- Posterior: seleccionar un subconjunto de la resultante (por ejemplo, solo notas agudas) para aislar una línea emergente.

### Módulo 3 — Construcción por sustitución (v0.2)
- Patrón objetivo visible en gris; los pasos se activan uno a uno cada M ciclos según `fillOrder`.
- Botones: construir, deshacer (proceso inverso), modo de orden.
- Dos voces opcionales construyendo el mismo patrón con un desfase fijo, para que la resultante crezca de forma compleja.

### Módulo 4 — Ambigüedad 3 contra 2 (v0.2)
- Ciclo de 12 pasos con un patrón fijo.
- Selector de agrupación: 4×3, 3×4, 6×2, 2×6. Solo cambian los acentos (volumen y marca visual), no los golpes.
- Opción de dos agrupaciones simultáneas en voces distintas.

### Módulo 5 — Aumentación (v0.3)
- Acorde de 3–5 notas sobre un pulso fijo (maracas/hi-hat sintéticos).
- Cada ciclo, las notas se alargan en un factor (1,0–1,5) o una cantidad fija de pulsos.
- Visualización: barras horizontales tipo piano roll que se estiran.

### Variante "cinta" del módulo 1 (v0.3)
- Grabar hasta 3 s por micrófono (`getUserMedia`), recortar inicio/fin.
- Reproducir como dos `AudioBufferSourceNode` en bucle; B con `playbackRate` ligeramente mayor que 1.
- Visualización de forma de onda en dos anillos.
- La grabación nunca sale del navegador.

---

## 6. Interfaz

- Página de inicio con tarjetas de módulos y una frase sobre cada uno.
- Dentro de cada módulo: texto breve arriba, visualización al centro, controles debajo (en móvil) o a la derecha (≥ 1024 px).
- Botón grande de reproducir/pausar siempre visible.
- Tema claro y oscuro según `prefers-color-scheme`.
- Accesibilidad: controles con teclado (espacio = reproducir/pausar), etiquetas ARIA, estados no codificados solo por color, respeto a `prefers-reduced-motion` (sustituir giro continuo por saltos discretos).

### Sonidos
- Instrumentos sintetizados con Tone.js, sin muestras externas en el MVP:
  - `mallet`: tipo marimba (FMSynth o MetalSynth con envolvente corta).
  - `click`: percusivo seco (NoiseSynth filtrado).
  - `pianoish`: PolySynth con ataque corto.
- A y B con paneo opuesto (±0,4) para que el desfase se oiga espacialmente.

---

## 7. Estructura de carpetas

```
src/
  core/            # funciones puras + tests (sin dependencias de navegador)
  engine/          # programador, voces, instrumentos, sincronía
  modules/
    continuous-phase/
    stepped-phase/
    substitution/
    metric-ambiguity/
    augmentation/
  components/      # editor de patrón, anillos, matriz, transporte
  state/
  styles/
  App.tsx
```

---

## 8. Contenidos y derechos

- No incluir grabaciones, partituras ni patrones transcritos de obras de Reich.
- Patrones por defecto originales. Propuestas iniciales:
  - Rítmico de 12 pasos: `x x . x . . x . x x . .` (sin simetría rotacional: las 12 etapas del desfase por saltos son distintas)
  - Melódico de 12 notas (re dórico): `D4 A4 E5 A4 F5 E5 D5 A4 C5 E5 G4 A4`
- Los textos explicativos pueden mencionar obras como referencia de escucha (título y año), sin reproducir material.

---

## 9. Hitos

| Hito | Contenido | Hecho cuando |
|---|---|---|
| M0 | Proyecto Vite + TS + React + Vitest, lint, estructura de carpetas | `npm run dev` y `npm test` funcionan |
| M1 | `src/core` completo con tests; motor con reloj simulable | Tests del motor verifican el criterio de 100 ciclos del módulo 1 |
| M2 | Módulo 1 (continuo y mesetas) | Criterios de aceptación del módulo 1 |
| M3 | Módulo 2 + editor de patrón | Criterios de aceptación del módulo 2 |
| M4 | Capa de resultantes | Visible en ambos módulos; "solo resultante" en el 2 |
| M5 | Pulido MVP: inicio, accesibilidad, móvil (iOS Safari incluido) | Prueba manual en Chrome, Firefox, Safari de escritorio y móvil |

---

## 10. Riesgos y decisiones abiertas

- **Deriva por cambios de tempo en caliente:** recalcular siempre desde `nextTime`, nunca desde el tiempo inicial multiplicado.
- **Latencia de salida variable en Bluetooth:** la compensación de 4.3 lo mitiga; documentar que con auriculares inalámbricos puede haber desfase imagen-sonido.
- **Testabilidad del motor:** inyectar un reloj (`() => number`) para poder simular tiempo en tests sin `AudioContext`.
- **Abierto:** ¿N variable (8, 12, 16) desde el MVP o fijo en 12? Propuesta: fijo en 12 en MVP, el modelo ya lo admite variable.
- **Abierto:** CSS Modules o Tailwind (decidir en M0).
