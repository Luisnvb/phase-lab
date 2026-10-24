# Procesos

App web educativa para explorar técnicas de organización del tiempo de la música de proceso: desfase continuo, desfase por saltos, construcción por sustitución, patrones resultantes y ambigüedad métrica.

Cada módulo combina sonido generado en tiempo real, una visualización sincronizada con precisión y pocos controles: **el proceso se oye y se ve mientras sucede**.

**Pruébala:** https://luisnvb.dev/phase-lab/

## Módulos

| Módulo | Qué muestra | Estado |
|---|---|---|
| Desfase continuo | Dos voces con el mismo patrón; una va un poco más deprisa y se separa poco a poco hasta volver al unísono. Modo continuo o con mesetas. | ✅ |
| Desfase por saltos | La segunda voz se adelanta un paso cada M repeticiones; una matriz muestra todas las etapas. | ✅ |
| Patrones resultantes | Capa común a los dos anteriores: qué suena cuando las voces se superponen, y escucha de solo la resultante. | ✅ |
| Construcción por sustitución | Un ciclo vacío se llena golpe a golpe (o se vacía), con una o dos voces. | ✅ |
| Ambigüedad 3 contra 2 | El mismo ciclo de 12 pulsos acentuado como 4×3, 3×4, 6×2 o 2×6, con una o dos voces. | ✅ |
| Aumentación | Notas de un acorde que se alargan ciclo a ciclo. | Próximamente |

Usa auriculares o altavoces estéreo: las voces suenan a cada lado.

## Desarrollo

Requiere Node.js 18 o superior.

```sh
npm install
npm run dev      # servidor de desarrollo
npm test         # tests (Vitest)
npm run lint     # ESLint y comprobación de tipos
npm run build    # build de producción en dist/
```

Stack: Vite, React 18, TypeScript estricto, Web Audio API, Tone.js (solo para sintetizar los instrumentos), Canvas y SVG.

## Cómo funciona el tiempo

El reto técnico es la sincronía entre sonido e imagen con voces que tienen tempos distintos a la vez.

- **Nada suena desde un temporizador.** Un programador con ventana de antelación (`src/engine/`) agenda cada nota sobre `AudioContext.currentTime`. Cada voz lleva su propio reloj y su propio periodo.
- **Una única fuente de verdad.** Las visualizaciones no calculan el tiempo: leen la cola de eventos del motor e interpolan en `engine.now()`, ya compensado por la latencia de salida.
- **Lógica pura y testeada.** Patrones, procesos y planificación (`src/core/`) no dependen del navegador, y el motor recibe un reloj inyectable, así que los tests comprueban, por ejemplo, que con un 1 % de diferencia la voz B adelanta un ciclo completo tras 100 ciclos de A, sin `AudioContext`.

La especificación completa está en [`SPEC.md`](SPEC.md).

## Contenidos y derechos

Todo el material musical es original. La app no incluye grabaciones, partituras ni patrones transcritos de obras de Steve Reich; los textos solo citan títulos y años como referencia de escucha.

## Licencia

[MIT](LICENSE)
