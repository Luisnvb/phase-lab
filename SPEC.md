# Processes — functional and technical specification

*English · [Español](SPEC.es.md). Both versions must be kept in sync.*

An interactive web app for exploring the time-organization techniques associated with Steve Reich's process music: continuous phasing, stepped phasing, build-up by substitution, resultant patterns, metric ambiguity and augmentation.

Guiding principle: **the process must be audible and visible while it happens**. Every module combines sound generated in real time, a precisely synchronized visualization and a few controls.

> **Status (October 2026):** versions 0.1 to 0.4 published at https://luisnvb.dev/phase-lab/; 0.5 (languages, editable melody and chord, listening guide for augmentation) implemented. Manual testing in Firefox, desktop Safari and mobile is still pending (M5 criterion, §9). Decisions taken during implementation are marked **Decided**.

---

## 1. Goals and scope

### Goals
- Someone without musical training understands each technique in under two minutes of use.
- Someone with training can experiment with their own patterns and parameters.
- Strict sync between sound and picture (a perceptible deviation = failure).

### MVP (version 0.1)
- Shared time engine (section 4).
- Module 1: Continuous phasing.
- Module 2: Stepped phasing.
- Resultant-pattern layer for both (basic version).
- 12-pulse pattern editor.

### Later versions
- 0.2: Module 3 (substitution) and module 4 (3 against 2 ambiguity).
- 0.3: Module 5 (augmentation) and the "tape" variant of module 1 (microphone recording).
- 0.4: Share settings by URL, export audio.
- 0.5: English (default) and Spanish interface; editable melody (module 1) and chord (augmentation); listening guide for augmentation.

### Out of scope
- Recordings, scores or excerpts of works by Reich. All default material is original and editable (see section 8).
- User accounts and backend. The app is 100% client-side.

---

## 2. Technical stack

| Area | Choice | Reason |
|---|---|---|
| Build | Vite 8 | Fast start, no configuration |
| Language | Strict TypeScript | Time logic is prone to subtle bugs |
| UI | React 18 | One component per module |
| Audio | Web Audio API + Tone.js **for instruments only** | See 4.1: Tone.js's transport does not work for voices with independent periods |
| Graphics | Canvas 2D for animation; SVG for editors and matrices | 60 fps performance |
| State | React `useState` / `useReducer` | **Decided:** Zustand was not needed |
| Tests | Vitest | Pure logic of the engine and the patterns |
| Styling | CSS Modules with CSS variables | **Decided in M0** (over Tailwind): no dependencies, fits one module per folder |
| Deployment | GitHub Actions → GitHub Pages | Lint, tests and build on every push to `main` |

Interface languages: English (default) and Spanish (v0.5, §6). Code, names and comments: English.

Exact versions pinned in `package.json`. Vite 8 and Vitest 5 require Node ≥ 22.12 (`engines` field; see §10).

---

## 3. Data model

```ts
// A pattern is a cycle of steps; each step sounds or not.
type Step = {
  active: boolean;
  pitch?: string;
  velocity?: number;
  length?: number;                           // length in steps (default: just under one step)
};
type Pattern = { steps: Step[] };            // default length: 12

type VoiceId = 'A' | 'B';
type InstrumentId = 'mallet' | 'click' | 'pianoish' | 'organ' | 'shaker';

type VoiceConfig = {
  id: VoiceId;
  pattern: Pattern;
  pulseDuration: number;                     // seconds per step
  instrument: InstrumentId;
  gain: number;                              // 0..1
  pan: number;                               // -1..1
};

// An event already scheduled on the audio clock.
type ScheduledEvent = {
  voice: VoiceId;
  stepIndex: number;                         // index within the pattern
  cycleIndex: number;                        // pattern repetition number
  time: number;                              // AudioContext.currentTime at which it sounds
  active: boolean;
};
```

### Pure functions (in `src/core/`, all tested)
- `melodicPattern(pitches)`: a pattern from pitches; `null` is a rest (v0.5).
- `rotate(pattern, k)`: shifts the pattern k steps (k may be negative; normalized mod N).
- `resultant(a, b)`: for each step returns `'none' | 'A' | 'B' | 'both'`. `stageMatrix(pattern)`: the resultant of the N + 1 stages.
- `phaseOffset(tA, tB, period)`: offset in steps (a real number) between two voices given their elapsed time. `phaseReadout`: offset within the cycle and full laps. `nearestStage`: nearest whole offset.
- `positionAt(events, voice, time, N)` and `stepAt(events, voice, time)`: a voice's position interpolated between its events (§4.3); `stepAt` supports cycles of varying length.
- `fillOrder(pattern, mode, { seed?, custom? })`: order in which rests are replaced by beats (`'ltr' | 'random' | 'custom'`).
- `accentsFor(n, groupSize)`: accented indices for a grouping. `accentPattern`: the same pattern with accent velocities.
- Processes: `createPlateauSource` (plateaus), `createSteppedProcess` (stages), `createBuildProcess` (substitution), `createAugmentationProcess` (augmentation, with the chord's pitches as an option).
- Augmentation: `initialChord(pitches)`, `chordTexture(notes)`: `'separate' | 'overlapping' | 'chord'` depending on whether the notes sound one after another, overlap, or at some point all ring together (v0.5).
- Tape: `tapePositionAt`, `waveformPeaks`, `synthesizeSample`.
- v0.4: `encodeState` / `decodeState` (settings ↔ URL), `encodeWav`, `trimTrailingSilence`.
- v0.5: `chromaticRange` and `EDITABLE_PITCHES` (chromatic C3–C6, for the editors); `parseLocale` (stored language or the default).

---

## 4. Time engine

This is the critical piece. Everything else depends on it being right.

### 4.1 Requirements
- Each voice has **its own scheduler** with its own period, which can change on the fly. Do not use `Tone.Transport` as a shared clock: continuous phasing needs two different tempos at once.
- Every event is scheduled on `AudioContext.currentTime`. Triggering sound directly from `setTimeout`, `setInterval` or `requestAnimationFrame` is forbidden.

### 4.2 Algorithm ("lookahead" pattern)
- A **25 ms** `setInterval` wakes the scheduler.
- On each wake-up, for each voice, while `voice.nextTime < ctx.currentTime + 0.1`:
  1. If the step is active, schedule the note at `voice.nextTime`.
  2. Record the `ScheduledEvent` in a circular queue (for the visualization).
  3. Advance: `nextTime += voice.currentPulseDuration()`; increment `stepIndex` (and `cycleIndex` when the cycle closes).
- Tempo changes affect the next unscheduled event, never one already scheduled.
- **Decided:** voices are scheduled together in chronological order (at equal times, A first). That way a voice can decide its next interval already knowing the other's times (pulse sources, plateau mode).
- **Decided:** a cycle ends with the length of the pattern it was played with, even if a listener changes the pattern on its last step. Pattern and accent changes are applied on the last step of each cycle (`onCycleBoundary`), so they land on the next boundary.
- **Decided:** if the timer is late (background tab), past events are recorded but do not sound, to avoid bursts.

### 4.3 Visual sync
- Visualizations are drawn in `requestAnimationFrame`.
- Visual time: `ctx.currentTime - (ctx.outputLatency ?? ctx.baseLatency ?? 0)`.
- Each voice's position is interpolated between the last event already heard and the next one in the queue, not computed separately. A single source of truth: the event queue.
- **Decided:** since a pulse can last longer than the lookahead window (114 ms vs 100 ms at the default tempo), the engine also exposes each voice's next event, already decided but not yet scheduled (`getNextEvents`).

### 4.4 Lifecycle
- The `AudioContext` is created or resumed **only after a user gesture** ("Start" button), because of browser autoplay policies, especially iOS Safari. It is created synchronously inside the gesture, before any `await`.
- Pause: suspend the context. Stop: empty the queues and reset the indices.
- Switching modules stops the engine and frees the nodes.
- iOS: `navigator.audioSession.type = 'playback'` so it sounds with the silent switch on; the interface follows system interruptions (it switches to "Resume").

### 4.5 API
```ts
interface Engine {
  start(): Promise<void>;
  stop(): void;
  setVoice(config: VoiceConfig): void;
  setPulseDuration(voice: VoiceId, seconds: number): void;
  setPulseSource(voice: VoiceId, source: PulseSource | null): void;  // step-by-step intervals (plateaus)
  setPatternOffset(voice: VoiceId, steps: number): void;   // for stepped phasing; at the cycle boundary
  setEndCycle(voice: VoiceId, cycle: number | null): void;  // processes with an end; never cuts a cycle
  getRecentEvents(sinceTime: number): ScheduledEvent[];
  getNextEvents(): ScheduledEvent[];                        // see 4.3
  now(): number;                                            // visual time (4.3)
  on(event: 'cycle' | 'step', cb: (e: ScheduledEvent) => void): () => void;
}
```
The `cycle` and `step` events are emitted on scheduling, up to 100 ms before they sound.

---

## 5. Modules

Each module is a folder in `src/modules/<name>/` with: main component, controls, visualization and a short explanatory text (2–4 sentences) shown above. **Decided:** each module has a `setup.ts` that prepares the engine; it is used both by live playback and by export (§5, v0.4).

### Module 1 — Continuous phasing
**What it shows:** two voices with the same pattern; B is slightly faster and drifts apart little by little until it is back in unison.

**Controls**
- Base tempo (60–200 quarter notes per minute; default 132, one step per sixteenth note ≈ 0.114 s).
- B's tempo difference: 0%–5% (default 1%).
- Mode:
  - *Continuous:* B keeps the difference all the time.
  - *With plateaus:* B speeds up until it is exactly one step ahead, then returns to A's tempo for K cycles (default 8; range 1–32) and repeats. This is the usual practice in live performance. **Decided:** it starts with K cycles in unison; B snaps to A's grid, so the plateau is exact even if the tempo changes.
- Material (**decided**): melodic (marimba) or rhythmic (click).
- **Decided (v0.5):** the melody is editable: one pitch selector per step (chromatic C3–C6, or a rest), and a "Restore the original melody" button. It applies on the fly and travels in the link (`melodia=D4-_-Fs4-…`, `s` = sharp, `_` = rest). The rhythmic pattern stays fixed.
- "Restart in unison" button.

**Visualization**
- Two concentric rings (A outside, B inside) with N marks; active ones highlighted.
- One cursor per ring, turning with its voice.
- An arc between the cursors representing the offset, with its value in steps (e.g. "2.37 steps").
- A "full lap" counter when B is back in unison.

**Acceptance criteria**
- With a 1% difference and N = 12, B gains a full cycle after ≈100 cycles of A (verifiable with an engine test without audio, using a simulated clock). ✅ Engine test.
- In plateau mode, the displayed offset stops at whole values (±0.02) for K cycles. ✅ Engine test (exact, in fact).
- No visible drift between cursor and sound after 5 minutes of playback. Guaranteed by design (§4.3) and by a timing-drift test; still to be checked by ear.

### Module 2 — Stepped phasing
**What it shows:** B plays the same pattern shifted by a whole number of steps, and the shift grows by 1 every M repetitions until it comes full circle.

**Controls**
- N-step pattern editor (default 12) with checkboxes.
- Repetitions per stage M (default 8; range 1–16).
- Automatic or manual advance ("Next stage" button). **Decided:** a manual advance applies at the next cycle boundary.
- A single tempo for both voices.
- Loop (**decided**: after stage N it continues from stage 1, because N is already unison).

**Visualization**
- A matrix of N+1 rows (stages 0..N) × N columns. Each cell shows the overlap at that step: empty, A only, B only, both (four distinct styles, also distinguishable without color: fill, outline, half, dot).
- Current row highlighted; a step cursor moving along it.
- "Stage k of N · repetition m of M" indicator.

**Acceptance criteria** (✅ all three, with tests against the engine and a simulated clock)
- At stage k, B's pattern is exactly `rotate(A, k)`.
- The stage changes at the cycle boundary, without cutting the pattern.
- After stage N, both voices are back in unison and the process ends (or restarts if "loop" is on).

### Resultant-pattern layer (basic MVP, for 1 and 2)
- "Show resultant" toggle: adds a third row/ring with `resultant(A, B)`. **Decided:** in module 1 the ring shows the resultant of the nearest whole offset and fades between steps; in module 2, a strip with A, B and A+B above the matrix.
- In module 2, a "Listen to the resultant only" button: mutes A and B and plays the combination with a different timbre (`pianoish`, centered; coincidences sound accented).
- Later: select a subset of the resultant (for example, only high notes) to isolate an emerging line. *(Not implemented.)*

### Module 3 — Build-up by substitution (v0.2)
- Target pattern shown in grey; steps are switched on one by one every M cycles according to `fillOrder`.
- Buttons: build, undo (reverse process), order mode.
- Two optional voices building the same pattern with a fixed offset, so the resultant grows in a complex way.
- **Decided:**
  - It starts with one beat (not with the empty cycle) so there is sound from the start; default M 4 (range 1–16).
  - Undo removes beats in reverse order from the next cycle boundary; the full pattern and the silence hold until the direction changes.
  - Custom order: the steps are pressed in the desired order; missing ones follow left to right.
  - B's offset: 0–11 steps (default 3). Pending beats show their turn.

### Module 4 — 3 against 2 ambiguity (v0.2)
- A 12-step cycle with a fixed pattern.
- Grouping selector: 4×3, 3×4, 6×2, 2×6. Only the accents change (volume and visual mark), not the beats.
- Option of two simultaneous groupings in different voices.
- **Decided:**
  - Default material: a pulse with all 12 steps active (with the rhythmic pattern, some accents would fall on rests); alternative: the melody.
  - Accent: velocity 1; the rest: 0.35. Visually, a tall bar versus a short bar inside a box per group.
  - Grouping changes apply at the cycle boundary, and the visualization shows the grouping that is sounding, not the one selected.

### Module 5 — Augmentation (v0.3)
- A chord of 3–5 notes over a fixed pulse (synthetic maracas/hi-hat).
- Each cycle, the notes are lengthened by a factor (1.0–1.5) or a fixed number of pulses.
- Visualization: horizontal piano-roll bars that stretch.
- **Decided:**
  - Original chord on D: `D4 A4 E5 G5 C6` (the first 3–5); the notes enter staggered, one per pulse, with an initial length of 1 pulse. Organ (`organ`) over maracas (`shaker`).
  - Default: factor 1.1; in pulses mode, +1 (range 0–4).
  - The cycle stretches to hold the longest note (minimum 8 pulses). When it would exceed 48 pulses, the process ends: growth by a factor is exponential.
  - The piano roll shows the initial length dashed and marks the end of the cycle.
- **Decided (v0.5):**
  - Editable chord: five pitch selectors (the first 3–5 are used, in order of entry); locked while playing, because the process is created at the start. It travels in the link (`acorde=…`). It may repeat pitches: the piano roll tells notes apart by their onset.
  - A collapsible listening guide ("What to listen for") under the short text: the intention of the process according to *Music as a Gradual Process* (1968), the three phases you hear (a rhythm, a chord taking shape, sustained sound), the pulse as a ruler, listening tips and the difference with *Four Organs* (there the notes do not all grow at the same rate).
  - Under the piano roll, a sentence says what the current cycle sounds like (`chordTexture`); it only changes twice per process, so it is announced to screen readers.

### "Tape" variant of module 1 (v0.3)
- Record up to 3 s with the microphone (`getUserMedia`), trim start/end.
- Play it as two looping `AudioBufferSourceNode`s; B with a `playbackRate` slightly above 1.
- Waveform visualization on two rings.
- The recording never leaves the browser.
- **Decided:** its own route (`#/desfase-cinta`), linked from module 1 and from the home page, outside the main menu. A synthesized sample sound to try it without a microphone. Offset in seconds and as a % of the loop.

### Share and export (v0.4)
- **Decided — URL:** each module's settings live in the hash query (`#/desfase-continuo?d=2.5&modo=plateau`). Only values that differ from the defaults are written; when a link is opened, out-of-range values are clamped and invalid ones fall back to the default. "Copy link to these settings" button. The tape recording is not shared.
- **Decided — audio:** export to WAV (stereo, 16-bit, 44.1 kHz) of 30 s, 1 min or 2 min. Each module is set up with its `setup.ts` on an offline Tone.js context with a simulated clock, so the file sounds the same as playback. If the process ends earlier, the trailing silence is trimmed (1 s tail). In module 2, the export advances the stages automatically. The tape is rendered with an `OfflineAudioContext`.

---

## 6. Interface

- Home page with module cards and a sentence about each.
- Inside each module: short text at the top, visualization in the center, controls below (on mobile) or on the right (≥ 1024 px).
- A large play/pause button, always visible.
- Light and dark theme following `prefers-color-scheme`.
- Accessibility: keyboard controls (space = play/pause), ARIA labels, states not encoded by color only, respect for `prefers-reduced-motion` (replace continuous turning with discrete jumps).
- **Decided (v0.5) — languages:** a switch next to the title with each language named in itself ("English", "Español"). English by default; the choice is stored in the browser (`localStorage`, with a fallback when it is unavailable) and changes the document's `lang` and title. Texts in `src/i18n/` (one object per language with the same shape, checked by TypeScript; no dependencies). Numbers follow the language (1.25 / 1,25). Routes and URL keys stay in Spanish so shared links keep working. Note names: C♯4 in English and Do♯4 in Spanish, with the same octave numbering.
- **Decided:** touch targets of at least 44 px; screen-reader announcements of the playback state and stage changes; on narrow screens the menu is a sideways-scrolling row and the piano roll scrolls inside its box.

### Sounds
- Instruments synthesized with Tone.js, no external samples:
  - `mallet`: marimba-like (FMSynth with a short envelope).
  - `click`: dry percussive (filtered NoiseSynth).
  - `pianoish`: PolySynth with a short attack.
  - `organ`: sustained PolySynth (augmentation).
  - `shaker`: short high-filtered noise, maraca-like (augmentation).
- A and B panned opposite (±0.4) so the phasing can be heard in space.

---

## 7. Folder structure

```
src/
  core/            # pure functions + tests (no browser dependencies)
  engine/          # scheduler, voices, instruments, sync, tape, offline render
  modules/
    catalog.ts     # module list (home page and menu)
    continuous-phase/   # includes the tape variant
    stepped-phase/
    substitution/
    metric-ambiguity/
    augmentation/
  components/      # pattern and pitch editors, rings, matrix, piano roll, transport, share/export, language
  i18n/            # interface texts in English and Spanish, number formatting
  state/           # hooks: audio, URL, language, animation, reduced motion
  styles/
  App.tsx
docs/              # screenshot for the README
```

---

## 8. Content and rights

- Do not include recordings, scores or transcribed patterns from works by Reich.
- Original default patterns (the melody and the chord can be edited since v0.5):
  - 12-step rhythm: `x x . x . . x . x x . .` (no rotational symmetry: the 12 stages of stepped phasing are all different; checked not to be any rotation of *Clapping Music*).
  - 12-note melody (D Dorian): `D4 A4 E5 A4 F5 E5 D5 A4 C5 E5 G4 A4`
  - Augmentation chord: `D4 A4 E5 G5 C6`. Tape sample sound: five synthesized notes (D minor pentatonic).
- The explanatory texts may mention works as listening references (title and year), without reproducing material.

---

## 9. Milestones

| Milestone | Content | Done when | Status |
|---|---|---|---|
| M0 | Vite + TS + React + Vitest project, lint, folder structure | `npm run dev` and `npm test` work | ✅ |
| M1 | Complete `src/core` with tests; engine with a simulable clock | Engine tests verify module 1's 100-cycle criterion | ✅ |
| M2 | Module 1 (continuous and plateaus) | Module 1 acceptance criteria | ✅ (5 minutes still to be checked by ear) |
| M3 | Module 2 + pattern editor | Module 2 acceptance criteria | ✅ |
| M4 | Resultant layer | Visible in both modules; "resultant only" in module 2 | ✅ |
| M5 | MVP polish: home page, accessibility, mobile (iOS Safari included) | Manual test in Chrome, Firefox, desktop and mobile Safari | Partial: tested in desktop Chrome and at 390 px width; Firefox, Safari and iOS pending |
| 0.2 | Substitution and 3 against 2 ambiguity | Processes verified with tests against the engine | ✅ |
| 0.3 | Augmentation and tape variant | Same; microphone recording not tested in a browser | ✅ (microphone pending) |
| 0.4 | Share by URL and export audio | Links validated; WAV generated and analyzed in Chrome | ✅ |
| 0.5 | Languages, editable melody and chord, augmentation guide | Tests of the new logic; checked in desktop Chrome in both languages | ✅ (not published) |

---

## 10. Risks and decisions

- **Drift from tempo changes on the fly:** always recompute from `nextTime`, never from the start time multiplied.
- **Variable output latency over Bluetooth:** the compensation in 4.3 mitigates it; the home page warns that with wireless headphones there may be a lag between picture and sound.
- **Engine testability:** inject a clock (`() => number`) to simulate time in tests without an `AudioContext`. The same simulated clock is used for export.
- **Decided:** N fixed at 12 in the interface; the model and the engine support variable lengths (augmentation already uses them).
- **Decided:** CSS Modules (M0).
- **iOS and recording:** the audio session switches to `play-and-record` while recording and back to `playback`; each browser records in a different format. The main untested risk.
- **Development dependencies:** solved on 25 October 2026 by moving to Node 22, Vite 8, Vitest 5 and `@vitejs/plugin-react` 6; `npm audit` no longer reports vulnerabilities. Vite 8 bundles with Rolldown; the configuration needed no changes.

---

## 11. Pending work and next steps

*Noted at the end of the 24 October 2026 session, with version 0.4 published.*

### Pending (in order of importance)
1. **Manual browser testing** (M5 criterion, not yet met). Only tested in desktop Chrome.
   - **iOS Safari:** that it sounds with the silent switch on; that after a call or coming back from another app the button switches to "Resume" and keeps playing when pressed; that the play button is not hidden under the bottom bar.
   - **Microphone recording** (tape variant) in Chrome, Firefox, Safari and iOS: each browser records in a different format and on iOS the audio session changes. Not tested in any browser.
   - **Desktop Firefox and Safari:** the five modules, the tape and the export.
2. **Listening checks:** that cursor and sound do not drift apart after 5 minutes (module 1); that exported WAVs sound like playback; the balance between organ and maracas (augmentation) and the timbre of "resultant only".
3. **"Copy link" button:** untested (overwriting the clipboard was avoided). On iOS it may require the page to have focus.

### Known limitations (minor)
- Restarting in unison can overlap up to ~50 ms of already scheduled notes.
- In substitution, if the order is changed during playback, the turn numbers update before the sound (less than one cycle).
- No interface component tests; only of the pure logic, the engine and the processes.
- GitHub may keep cached commits from before the email rewrite (inaccessible without knowing their identifier).
- The README screenshot shows the Spanish interface (v0.5).

### Ideas for a possible version 0.6 (to be decided)
- Select a subset of the resultant to isolate an emerging line (planned as "later" in §5).
- Variable N (8, 12 or 16 steps) in the interface; the engine already supports it (§10).
- Plateau mode in the tape variant.
- Export MIDI as well as WAV.
- Interface component tests (for example, with Testing Library).
