# CLAUDE.md

App web educativa para explorar técnicas temporales de la música de proceso (desfase, sustitución, resultantes, etc.). La especificación completa está en `SPEC.md` (inglés) y `SPEC.es.md` (español): léela antes de empezar cualquier tarea y sigue sus hitos en orden. Mantén las dos versiones iguales, igual que `README.md` y `README.es.md`.

## Comandos
- `npm run dev` — servidor de desarrollo
- `npm test` — tests (Vitest)
- `npm run build` — build de producción
- `npm run lint` — lint y comprobación de tipos

## Reglas del proyecto
- **Nunca** disparar sonido con `setTimeout`, `setInterval` o `requestAnimationFrame`. Todo evento se programa sobre `AudioContext.currentTime` mediante el motor de `src/engine/` (SPEC §4).
- Cada voz tiene su propio programador. No usar `Tone.Transport` como reloj común; Tone.js solo para instrumentos.
- Las visualizaciones leen la cola de eventos del motor y `engine.now()`; no calculan el tiempo por su cuenta.
- La lógica pura vive en `src/core/` sin dependencias del navegador y siempre con tests.
- El motor recibe un reloj inyectable para poder testearse sin `AudioContext`.
- El `AudioContext` se crea solo tras un gesto del usuario.
- No incluir grabaciones, partituras ni patrones transcritos de obras de Reich (SPEC §8).

## Convenciones
- TypeScript estricto. Código, nombres y comentarios en inglés; textos de interfaz en inglés (predeterminado) y español, siempre en `src/i18n/` (nunca escritos en los componentes).
- Componentes funcionales de React, un módulo por carpeta en `src/modules/`.
- Estados visuales distinguibles sin color; respetar `prefers-reduced-motion`.

## Flujo de trabajo
- Trabaja hito a hito (SPEC §9). Al terminar uno, ejecuta tests y lint y resume qué criterios de aceptación se cumplen.
- Si una decisión marcada como "abierta" en SPEC §10 bloquea el trabajo, pregunta antes de decidir.
