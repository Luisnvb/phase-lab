# Processes

*English · [Español](README.es.md)*

An educational web app for exploring the time techniques of process music: continuous phasing, stepped phasing, build-up by substitution, resultant patterns, metric ambiguity and augmentation.

Every module combines sound generated in real time, a precisely synchronized visualization and a few controls: **you hear and see the process while it happens**.

**Try it:** https://luisnvb.dev/phase-lab/ — in English or Spanish (switch next to the title).

![Continuous phasing module in “with plateaus” mode: two concentric rings with the steps of voices A and B, the offset arc (4.87 steps) and an outer ring with the resultant; the controls on the right.](docs/screenshot.png)

## Modules

| Module | What it shows | Status |
|---|---|---|
| Continuous phasing | Two voices with the same pattern; one is slightly faster and drifts apart little by little until it is back in unison. Continuous mode or with plateaus, and an editable melody. | ✅ |
| Tape phasing | A variant of the above with your own voice: record up to 3 s with the microphone (or use a sample sound) and hear two looping copies, one slightly faster. | ✅ |
| Stepped phasing | The second voice moves one step ahead every M repetitions; a matrix shows every stage. | ✅ |
| Resultant patterns | A layer shared by the two above: what sounds when the voices overlap, and listening to the resultant alone. | ✅ |
| Build-up by substitution | An empty cycle fills up beat by beat (or empties), with one or two voices. | ✅ |
| 3 against 2 ambiguity | The same 12-pulse cycle accented as 4×3, 3×4, 6×2 or 2×6, with one or two voices. | ✅ |
| Augmentation | Over a steady pulse, the notes of an (editable) chord grow longer cycle after cycle and the cycle stretches with them. Includes a guide to what to listen for. | ✅ |

Use headphones or stereo speakers: the voices sound on either side.

## Sharing and exporting

- **Links:** the browser address always holds the module's settings (for example `#/desfase-continuo?d=2.5&modo=plateau`), and the “Copy link to these settings” button copies it for sharing. When a link is opened, out-of-range values are clamped and invalid ones fall back to the default. Routes and setting keys are in Spanish in both languages, so links work whatever language the reader has chosen.
- **Audio:** “Export audio (WAV)” renders 30 s, 1 min or 2 min of the process with the current settings, in stereo at 44.1 kHz. It is rendered in the browser, faster than real time, with the same logic as live playback; if the process ends earlier, the audio ends with it.
- **Privacy:** microphone recordings never leave the browser: they are not sent, not saved and cannot be shared by link. The chosen language is remembered in the browser only.

## Development

Requires Node.js 22.12 or later.

```sh
npm install
npm run dev      # development server
npm test         # tests (Vitest)
npm run lint     # ESLint and type checking
npm run build    # production build in dist/
```

Stack: Vite, React 18, strict TypeScript, Web Audio API, Tone.js (only to synthesize the instruments), Canvas and SVG. Interface texts live in `src/i18n/`, one object per language with the same shape, checked by TypeScript; there is no i18n dependency.

## How time works

The technical challenge is keeping sound and picture in sync with voices that run at different tempos at the same time.

- **Nothing sounds from a timer.** A lookahead scheduler (`src/engine/`) schedules every note on `AudioContext.currentTime`. Each voice keeps its own clock and its own period.
- **A single source of truth.** Visualizations do not compute time: they read the engine's event queue and interpolate at `engine.now()`, already compensated for output latency.
- **Export uses the same engine.** To generate the WAV, each module is set up with the same function as in live playback, but on an offline audio context and with a simulated clock that runs through the whole duration; Tone.js then renders every scheduled note.
- **Pure, tested logic.** Patterns, processes and scheduling (`src/core/`) do not depend on the browser, and the engine takes an injectable clock, so the tests check, for example, that with a 1% difference voice B gains a full cycle after 100 cycles of A, without an `AudioContext`.

The full specification is in [`SPEC.md`](SPEC.md) (in Spanish: [`SPEC.es.md`](SPEC.es.md)).

## Versions

| Version | Content |
|---|---|
| 0.1 | Time engine, continuous phasing (with plateaus), stepped phasing, pattern editor and resultant layer. |
| 0.2 | Build-up by substitution and 3 against 2 ambiguity. |
| 0.3 | Augmentation and the tape variant of continuous phasing (microphone recording). |
| 0.4 | Sharing settings by URL and exporting audio as WAV. |
| 0.5 | English and Spanish interface, editable melody and chord, listening guide for augmentation. |

## Content and rights

All musical material is original. The app includes no recordings, scores or transcribed patterns from works by Steve Reich; the texts only cite titles and years as listening references.

## License

[MIT](LICENSE)
