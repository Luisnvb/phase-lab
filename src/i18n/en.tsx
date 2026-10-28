// English interface texts. This object defines the shape of every language (`Messages`).

const SHARP = '♯';

export const en = {
  appName: 'Processes',
  nav: 'Modules',
  language: 'Language',

  units: {
    percent: (value: string) => `${value}%`,
    seconds: (value: string) => `${value} s`,
  },
  /** `C#4` → `C♯4`. */
  pitchName: (pitch: string) => pitch.replace('#', SHARP),

  home: {
    lead: 'Techniques for organizing time in process music: voices drifting out of phase, patterns built step by step and figures that emerge from their overlap. Every module sounds and shows itself at once, while the process happens.',
    open: 'Open →',
    upcoming: 'Coming soon',
    note: 'Use headphones or stereo speakers: the two voices sound on either side. With wireless headphones, the sound may arrive slightly later than the picture.',
  },

  modules: {
    continuousPhase: {
      title: 'Continuous phasing',
      summary:
        'Two voices with the same pattern: one is slightly faster, drifts apart little by little and ends up back in unison.',
    },
    tapePhase: {
      title: 'Tape phasing',
      summary:
        'A variant of continuous phasing with your own voice: two copies of a short recording loop, one a little faster.',
    },
    steppedPhase: {
      title: 'Stepped phasing',
      summary:
        'The second voice moves one step ahead every few repetitions, going through every combination of the pattern with itself.',
    },
    substitution: {
      title: 'Build-up by substitution',
      summary: 'A pattern appears beat by beat, as rests are replaced by notes.',
    },
    metricAmbiguity: {
      title: '3 against 2 ambiguity',
      summary: 'The same 12-pulse cycle is heard in groups of three or of two depending on where the accents fall.',
    },
    augmentation: {
      title: 'Augmentation',
      summary: 'The notes of a chord grow longer cycle after cycle over a pulse that never changes.',
    },
  },

  transport: {
    labels: {
      idle: 'Start',
      loading: 'Loading…',
      playing: 'Pause',
      paused: 'Resume',
      ended: 'Start again',
    },
    announcements: {
      idle: '',
      loading: 'Loading the sound',
      playing: 'Playing',
      paused: 'Paused',
      ended: 'Process finished',
    },
    hint: 'Space bar: play / pause',
  },

  share: {
    panel: 'Share and export',
    copy: 'Copy link to these settings',
    copied: 'Link copied.',
    copyFailed: 'Could not copy: use the address in the browser bar.',
    duration: 'Audio length',
    export: 'Export audio (WAV)',
    rendering: 'Generating the audio…',
    done: 'Audio exported.',
    failed: 'Could not export the audio.',
    endsEarly: 'If the process ends earlier, the audio ends with it.',
  },

  controls: {
    region: 'Controls',
    tempo: 'Tempo (quarter notes per minute)',
    showResultant: 'Show resultant',
    restartUnison: 'Restart in unison',
  },

  patternEditor: {
    legend: 'Pattern',
    step: (n: number) => `Step ${n}`,
    reset: 'Restore the original pattern',
  },

  pitchEditor: {
    rest: 'Rest',
    melody: 'Melody',
    resetMelody: 'Restore the original melody',
    chord: 'Chord notes, in order of entry',
    resetChord: 'Restore the original chord',
    note: (n: number) => `Note ${n}`,
    lockedWhilePlaying: 'Stop the process to change the chord.',
  },

  phaseRings: {
    label:
      'Two concentric rings: voice A outside and B inside, each with a cursor that goes round the steps of the pattern.',
    offset: 'Offset:',
    caption: 'steps of offset',
    laps: 'Full laps:',
    steps: (value: string, singular: boolean) => `${value} ${singular ? 'step' : 'steps'}`,
  },

  tapeRings: {
    label:
      "Two rings with the recording's waveform: copy A outside and B inside, each with its own playhead.",
    caption: 'of offset',
    ofLoop: (seconds: string, percent: string) => `${seconds} (${percent}% of the loop)`,
  },

  stageMatrix: {
    label: (stages: number, steps: number) =>
      `Matrix of ${stages} stages by ${steps} steps: at each stage, which voices sound on each step.`,
    cells: { none: 'neither', A: 'A only', B: 'B only', both: 'both' },
  },

  voiceRows: {
    label: (stage: number, withResultant: boolean) =>
      withResultant ? `Voices A and B at stage ${stage}, and their resultant.` : `Voices A and B at stage ${stage}.`,
  },

  buildRows: {
    label: (beats: number, built: number) => `Target pattern of ${beats} beats, ${built} already substituted.`,
  },

  groupingRows: {
    voice: (voice: string, groups: number, size: number) => `Voice ${voice}: ${groups} groups of ${size}`,
  },

  pianoRoll: {
    region: 'Piano roll',
    label: (notes: number, pulses: number) => `Chord of ${notes} notes in a cycle of ${pulses} pulses.`,
    pulse: 'pulse',
  },

  continuousPhase: {
    filename: 'continuous-phasing',
    intro: (
      <>
        Two voices play the same pattern, but voice B is slightly faster. Little by little it moves
        ahead: the pattern overlaps itself at different positions and new figures appear, until after
        a full lap both are back in unison. With “plateaus”, B stops at each exact offset for a few
        cycles, as is usual when it is played live. Listen to: <cite>Piano Phase</cite> (1967).{' '}
        <a href="#/desfase-cinta">Try it with your own voice</a>.
      </>
    ),
    difference: "B's tempo difference",
    mode: 'Mode',
    modes: { continuous: 'Continuous', plateau: 'With plateaus' },
    plateauCycles: 'Cycles on each plateau',
    material: 'Material',
    materials: { melody: 'Melodic', rhythm: 'Rhythmic' },
  },

  tapePhase: {
    filename: 'tape-phasing',
    intro: (
      <>
        The same technique as continuous phasing, but with your own recording: two copies of a short
        fragment loop, one on each side, and the second is a little faster. The words drift apart,
        overlap, and rhythms and sounds appear that were not in the recording. Listen to:{' '}
        <cite>It&apos;s Gonna Rain</cite> (1965). <a href="#/desfase-continuo">Back to phasing with patterns</a>.
      </>
    ),
    micError: 'Could not use the microphone. Check the browser permission or try the sample sound.',
    placeholder: (seconds: number) => `Record a short phrase (up to ${seconds} seconds) or use the sample sound.`,
    stopRecording: 'Stop recording',
    recordAgain: 'Record again',
    record: (seconds: number) => `Record (max. ${seconds} s)`,
    useSample: 'Use the sample sound',
    recording: 'Recording',
    recordingNotice: 'Recording… speak close to the microphone.',
    privacy: 'The recording stays in your browser: it is not sent anywhere or saved.',
    loopStart: 'Loop start',
    loopEnd: 'Loop end',
    extraSpeed: 'Extra speed of B',
    exportNote: 'The exported audio is generated in your browser. The recording cannot be shared by link.',
  },

  steppedPhase: {
    filename: 'stepped-phasing',
    intro: (
      <>
        Both voices play the same pattern at the same tempo, but B starts it shifted by a whole number
        of steps. Every few repetitions the shift grows by one, and each stage sounds a different
        combination, until after a full lap the voices coincide again. The matrix shows every stage at
        once. Listen to: <cite>Clapping Music</cite> (1972).
      </>
    ),
    initial: (steps: number) => `Stage 0 of ${steps}`,
    ended: 'Process finished: the voices are back in unison',
    stage: (stage: number, steps: number, repetition: number, repetitions: number | null) =>
      `Stage ${stage} of ${steps} · repetition ${repetition}` +
      (repetitions === null ? '' : ` of ${repetitions}`),
    announce: (stage: number) => `Stage ${stage}`,
    advance: 'Stage advance',
    advances: { auto: 'Automatic', manual: 'Manual' },
    repetitions: 'Repetitions per stage',
    loop: 'Loop',
    nextStage: 'Next stage',
    soloResultant: 'Listen to the resultant only',
    backToVoices: 'Listen to A and B again',
    exportNote: 'The export advances the stages automatically.',
  },

  substitution: {
    filename: 'substitution',
    intro: (
      <>
        An empty cycle fills up: every few repetitions, a rest is replaced by a beat of the target
        pattern, until it is complete. The ear reinterprets the cycle with every new beat. It can also
        run backwards, taking beats away. With two voices out of phase, the combination grows in a more
        complex way. Listen to: <cite>Drumming</cite> (1971).
      </>
    ),
    beats: (count: number, total: number) => `Beats: ${count} of ${total}`,
    complete: ' · pattern complete',
    silence: 'Silence: every beat removed',
    repetition: (repetition: number, repetitions: number) => ` · repetition ${repetition} of ${repetitions}`,
    legend: 'Dashed outline: pending beat, with its turn. Filled: beat already substituted.',
    direction: 'Direction of the process',
    build: 'Build',
    unbuild: 'Undo',
    order: 'Substitution order',
    orders: { ltr: 'Left to right', random: 'Random', custom: 'Custom' },
    anotherRandom: 'Another random order',
    pickOrder: 'Press the steps in the order you want',
    orderList: (steps: string) => `Order: ${steps}`,
    clearOrder: 'Clear order',
    repetitions: 'Repetitions between substitutions',
    twoVoices: 'Two voices',
    offset: "B's offset (steps)",
  },

  metricAmbiguity: {
    filename: '3-against-2',
    intro: (
      <>
        A cycle of twelve pulses can be heard as four groups of three or as three groups of four: it is
        enough to move the accents. Here the beats never change, only which of them sound louder. With
        two voices, each accents a different grouping at the same time, and the ear can jump from one to
        the other.
      </>
    ),
    both: (a: string, b: string) => `A: ${a} · B: ${b}`,
    one: (grouping: string) => `Grouping: ${grouping}`,
    legend: 'Tall bar: accented beat. Short bar: unaccented beat. Each box is a group.',
    groupingA: "A's grouping",
    grouping: 'Grouping',
    twoVoices: 'Two voices with different groupings',
    groupingB: "B's grouping",
    material: 'Material',
    materials: { pulse: 'Pulse', melody: 'Melody' },
  },

  augmentation: {
    filename: 'augmentation',
    intro: (
      <>
        Over a pulse that never changes, the notes of a chord get a little longer every cycle. At first
        they sound like short strokes, one after another; little by little they overlap and turn into a
        sustained chord, and the cycle stretches with them. Listen to: <cite>Four Organs</cite> (1970).
      </>
    ),
    guide: {
      summary: 'What to listen for',
      body: (
        <>
          <p>
            The idea behind this process is that you can hear it happen. Reich wrote that a musical
            process should unfold so gradually that the listener can follow it in detail, the way you
            watch sand run through an hourglass (<cite>Music as a Gradual Process</cite>, 1968). Nothing
            new is added: the same notes simply last longer, and that alone changes what you hear.
          </p>
          <ol>
            <li>
              <strong>A rhythm.</strong> At first each note is a short stroke and the notes follow one
              another: you hear a small rhythmic figure over the pulse, not yet a chord.
            </li>
            <li>
              <strong>A chord taking shape.</strong> As the notes grow, each one is still ringing when
              the next arrives. The figure blurs, and the notes start to sound as harmony: the chord
              builds up note by note.
            </li>
            <li>
              <strong>Sound instead of rhythm.</strong> In the end all the notes ring together and the
              strokes become a long, sustained chord. Attention moves from rhythm to the sound itself:
              how the notes blend, and the order in which they drop out.
            </li>
          </ol>
          <p>
            The maracas are the ruler. Their pulse never changes, so the music does not slow down: the
            time between events grows while the clock stays the same. Count the pulses of each cycle
            to feel it stretching; follow one note, the highest for instance, across several cycles;
            then listen to the whole again. Changing the factor or the pulses changes how fast this
            happens, not where it leads.
          </p>
          <p>
            In <cite>Four Organs</cite> the notes do not all grow at the same rate, so the chord is
            gradually pulled apart in time. Here they grow together, to keep the process easy to follow.
          </p>
        </>
      ),
    },
    /** What the current cycle sounds like (see `chordTexture`). */
    textures: {
      separate: 'Now the notes are separate, one after another: you hear a rhythm.',
      overlapping: 'Now the notes overlap: the chord is taking shape.',
      chord: 'Now all the notes ring together: listen to the chord, and to the order in which they stop.',
    },
    cycle: (cycle: number, pulses: number) => `Cycle ${cycle} · ${pulses} pulses`,
    ended: 'Process finished: the chord no longer fits in the longest cycle',
    announce: (pulses: number) => `Cycle of ${pulses} pulses`,
    legend: 'Bar: current length of each note. Dashed outline: initial length. Thick dashed line: end of the cycle.',
    mode: 'Lengthen the notes',
    modes: { factor: 'By a factor', pulses: 'By pulses' },
    factor: 'Factor per cycle',
    pulses: 'Extra pulses per cycle',
    size: 'Notes in the chord',
  },
};

export type Messages = typeof en;
