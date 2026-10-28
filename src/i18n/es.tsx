// Spanish interface texts. Same shape as the English ones (`Messages`).
import type { Messages } from './en.tsx';

const SOLFEGE: Record<string, string> = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

export const es: Messages = {
  appName: 'Procesos',
  nav: 'Módulos',
  language: 'Idioma',

  units: {
    percent: (value) => `${value} %`,
    seconds: (value) => `${value} s`,
  },
  /** `C#4` → `Do♯4`: solfège names, same octave numbers. */
  pitchName: (pitch) =>
    pitch.replace(/^([A-G])(#?)/, (_, name: string, sharp: string) => `${SOLFEGE[name]}${sharp ? '♯' : ''}`),

  home: {
    lead: 'Técnicas para organizar el tiempo en la música de proceso: voces que se desfasan, patrones que se construyen paso a paso y figuras que surgen de su superposición. Cada módulo suena y se ve a la vez, mientras el proceso ocurre.',
    open: 'Abrir →',
    upcoming: 'Próximamente',
    note: 'Usa auriculares o altavoces estéreo: las dos voces suenan a cada lado. Con auriculares inalámbricos el sonido puede llegar con algo de retraso respecto a la imagen.',
  },

  modules: {
    continuousPhase: {
      title: 'Desfase continuo',
      summary:
        'Dos voces con el mismo patrón: una va un poco más deprisa, se separa poco a poco y acaba volviendo al unísono.',
    },
    tapePhase: {
      title: 'Desfase con cinta',
      summary:
        'Variante del desfase continuo con tu propia voz: dos copias de una grabación corta en bucle, una algo más rápida.',
    },
    steppedPhase: {
      title: 'Desfase por saltos',
      summary:
        'La segunda voz se adelanta un paso cada pocas repeticiones y recorre todas las combinaciones del patrón consigo mismo.',
    },
    substitution: {
      title: 'Construcción por sustitución',
      summary: 'Un patrón aparece golpe a golpe, cambiando silencios por notas.',
    },
    metricAmbiguity: {
      title: 'Ambigüedad 3 contra 2',
      summary: 'El mismo ciclo de 12 pulsos se oye en grupos de tres o de dos según dónde caen los acentos.',
    },
    augmentation: {
      title: 'Aumentación',
      summary: 'Las notas de un acorde se alargan ciclo a ciclo sobre un pulso que no cambia.',
    },
  },

  transport: {
    labels: {
      idle: 'Empezar',
      loading: 'Cargando…',
      playing: 'Pausar',
      paused: 'Reanudar',
      ended: 'Empezar de nuevo',
    },
    announcements: {
      idle: '',
      loading: 'Cargando el sonido',
      playing: 'Reproduciendo',
      paused: 'En pausa',
      ended: 'Proceso terminado',
    },
    hint: 'Barra espaciadora: reproducir / pausar',
  },

  share: {
    panel: 'Compartir y exportar',
    copy: 'Copiar enlace a esta configuración',
    copied: 'Enlace copiado.',
    copyFailed: 'No se ha podido copiar: usa la dirección de la barra del navegador.',
    duration: 'Duración del audio',
    export: 'Exportar audio (WAV)',
    rendering: 'Generando el audio…',
    done: 'Audio exportado.',
    failed: 'No se ha podido exportar el audio.',
    endsEarly: 'Si el proceso termina antes, el audio acaba con él.',
  },

  controls: {
    region: 'Controles',
    tempo: 'Tempo (negras por minuto)',
    showResultant: 'Mostrar resultante',
    restartUnison: 'Reiniciar al unísono',
  },

  patternEditor: {
    legend: 'Patrón',
    step: (n) => `Paso ${n}`,
    reset: 'Restaurar el patrón inicial',
  },

  pitchEditor: {
    rest: 'Silencio',
    melody: 'Melodía',
    resetMelody: 'Restaurar la melodía inicial',
    chord: 'Notas del acorde, en orden de entrada',
    resetChord: 'Restaurar el acorde inicial',
    note: (n) => `Nota ${n}`,
    lockedWhilePlaying: 'Detén el proceso para cambiar el acorde.',
  },

  phaseRings: {
    label:
      'Dos anillos concéntricos: la voz A por fuera y la B por dentro, cada uno con un cursor que recorre los pasos del patrón.',
    offset: 'Desfase:',
    caption: 'pasos de desfase',
    laps: 'Vueltas completas:',
    steps: (value, singular) => `${value} ${singular ? 'paso' : 'pasos'}`,
  },

  tapeRings: {
    label:
      'Dos anillos con la forma de onda de la grabación: la copia A por fuera y la B por dentro, cada una con su cabezal de reproducción.',
    caption: 'de desfase',
    ofLoop: (seconds, percent) => `${seconds} (${percent} % del bucle)`,
  },

  stageMatrix: {
    label: (stages, steps) =>
      `Matriz de ${stages} etapas por ${steps} pasos: en cada etapa, qué voces suenan en cada paso.`,
    cells: { none: 'ninguna', A: 'solo A', B: 'solo B', both: 'ambas' },
  },

  voiceRows: {
    label: (stage, withResultant) =>
      withResultant ? `Voces A y B en la etapa ${stage} y su resultante.` : `Voces A y B en la etapa ${stage}.`,
  },

  buildRows: {
    label: (beats, built) => `Patrón objetivo de ${beats} golpes, ${built} ya sustituidos.`,
  },

  groupingRows: {
    voice: (voice, groups, size) => `Voz ${voice}: ${groups} grupos de ${size}`,
  },

  pianoRoll: {
    region: 'Rollo de piano',
    label: (notes, pulses) => `Acorde de ${notes} notas en un ciclo de ${pulses} pulsos.`,
    pulse: 'pulso',
  },

  continuousPhase: {
    filename: 'desfase-continuo',
    intro: (
      <>
        Dos voces tocan el mismo patrón, pero la voz B va un poco más deprisa. Poco a poco se adelanta:
        el patrón se superpone consigo mismo en posiciones distintas y aparecen figuras nuevas, hasta
        que tras una vuelta completa ambas vuelven al unísono. Con «mesetas», B se detiene en cada
        desfase exacto durante unos ciclos, como suele hacerse al tocarlo en directo. Para escuchar:{' '}
        <cite>Piano Phase</cite> (1967). <a href="#/desfase-cinta">Pruébalo con tu propia voz</a>.
      </>
    ),
    difference: 'Diferencia de tempo de B',
    mode: 'Modo',
    modes: { continuous: 'Continuo', plateau: 'Con mesetas' },
    plateauCycles: 'Ciclos en cada meseta',
    material: 'Material',
    materials: { melody: 'Melódico', rhythm: 'Rítmico' },
  },

  tapePhase: {
    filename: 'desfase-con-cinta',
    intro: (
      <>
        La misma técnica que el desfase continuo, pero con tu propia grabación: dos copias de un
        fragmento corto suenan en bucle, una a cada lado, y la segunda va un poco más deprisa. Las
        palabras se separan, se superponen y aparecen ritmos y sonidos que no estaban en la grabación.
        Para escuchar: <cite>It&apos;s Gonna Rain</cite> (1965).{' '}
        <a href="#/desfase-continuo">Volver al desfase con patrones</a>.
      </>
    ),
    micError:
      'No se ha podido usar el micrófono. Revisa el permiso del navegador o prueba con el sonido de ejemplo.',
    placeholder: (seconds) => `Graba una frase corta (hasta ${seconds} segundos) o usa el sonido de ejemplo.`,
    stopRecording: 'Detener la grabación',
    recordAgain: 'Grabar de nuevo',
    record: (seconds) => `Grabar (máx. ${seconds} s)`,
    useSample: 'Usar el sonido de ejemplo',
    recording: 'Grabando',
    recordingNotice: 'Grabando… habla cerca del micrófono.',
    privacy: 'La grabación se queda en tu navegador: no se envía a ningún sitio ni se guarda.',
    loopStart: 'Inicio del bucle',
    loopEnd: 'Final del bucle',
    extraSpeed: 'Velocidad extra de B',
    exportNote: 'El audio exportado se genera en tu navegador. La grabación no se puede compartir por enlace.',
  },

  steppedPhase: {
    filename: 'desfase-por-saltos',
    intro: (
      <>
        Las dos voces tocan el mismo patrón al mismo tempo, pero B lo empieza desplazado un número
        entero de pasos. Cada pocas repeticiones el desplazamiento crece en uno, y cada etapa hace sonar
        una combinación distinta, hasta que tras dar la vuelta completa las voces vuelven a coincidir.
        La matriz muestra todas las etapas a la vez. Para escuchar: <cite>Clapping Music</cite> (1972).
      </>
    ),
    initial: (steps) => `Etapa 0 de ${steps}`,
    ended: 'Proceso terminado: las voces han vuelto al unísono',
    stage: (stage, steps, repetition, repetitions) =>
      `Etapa ${stage} de ${steps} · repetición ${repetition}` +
      (repetitions === null ? '' : ` de ${repetitions}`),
    announce: (stage) => `Etapa ${stage}`,
    advance: 'Avance de etapa',
    advances: { auto: 'Automático', manual: 'Manual' },
    repetitions: 'Repeticiones por etapa',
    loop: 'Repetir en bucle',
    nextStage: 'Siguiente etapa',
    soloResultant: 'Escuchar solo la resultante',
    backToVoices: 'Volver a escuchar A y B',
    exportNote: 'La exportación avanza las etapas automáticamente.',
  },

  substitution: {
    filename: 'sustitucion',
    intro: (
      <>
        Un ciclo vacío se va llenando: cada pocas repeticiones, un silencio se cambia por un golpe del
        patrón objetivo, hasta completarlo. El oído reinterpreta el ciclo con cada golpe nuevo. También
        puede hacerse al revés, retirando golpes. Con dos voces desfasadas, la combinación crece de
        forma más compleja. Para escuchar: <cite>Drumming</cite> (1971).
      </>
    ),
    beats: (count, total) => `Golpes: ${count} de ${total}`,
    complete: ' · patrón completo',
    silence: 'Silencio: todos los golpes retirados',
    repetition: (repetition, repetitions) => ` · repetición ${repetition} de ${repetitions}`,
    legend: 'Contorno discontinuo: golpe pendiente, con su turno. Relleno: golpe ya sustituido.',
    direction: 'Dirección del proceso',
    build: 'Construir',
    unbuild: 'Deshacer',
    order: 'Orden de sustitución',
    orders: { ltr: 'De izquierda a derecha', random: 'Aleatorio', custom: 'Personalizado' },
    anotherRandom: 'Otro orden aleatorio',
    pickOrder: 'Pulsa los pasos en el orden deseado',
    orderList: (steps) => `Orden: ${steps}`,
    clearOrder: 'Borrar orden',
    repetitions: 'Repeticiones entre sustituciones',
    twoVoices: 'Dos voces',
    offset: 'Desfase de B (pasos)',
  },

  metricAmbiguity: {
    filename: 'ambiguedad-3-contra-2',
    intro: (
      <>
        Un ciclo de doce pulsos puede oírse como cuatro grupos de tres o como tres grupos de cuatro:
        basta con mover los acentos. Aquí los golpes no cambian nunca, solo cuáles suenan más fuerte.
        Con dos voces, cada una acentúa una agrupación distinta a la vez, y el oído puede saltar de una
        a otra.
      </>
    ),
    both: (a, b) => `A: ${a} · B: ${b}`,
    one: (grouping) => `Agrupación: ${grouping}`,
    legend: 'Barra alta: golpe acentuado. Barra baja: golpe sin acento. Cada recuadro es un grupo.',
    groupingA: 'Agrupación de A',
    grouping: 'Agrupación',
    twoVoices: 'Dos voces con agrupaciones distintas',
    groupingB: 'Agrupación de B',
    material: 'Material',
    materials: { pulse: 'Pulso', melody: 'Melodía' },
  },

  augmentation: {
    filename: 'aumentacion',
    intro: (
      <>
        Sobre un pulso que no cambia, las notas de un acorde se alargan un poco en cada ciclo. Al
        principio suenan como golpes cortos, uno tras otro; poco a poco se solapan y se convierten en
        un acorde sostenido, y el ciclo se estira con ellas. Para escuchar: <cite>Four Organs</cite>{' '}
        (1970).
      </>
    ),
    guide: {
      summary: 'Qué escuchar',
      body: (
        <>
          <p>
            La idea de este proceso es que se oiga mientras sucede. Reich escribió que un proceso
            musical debe avanzar tan gradualmente que el oyente pueda seguirlo en detalle, como quien
            mira caer la arena de un reloj de arena (<cite>Music as a Gradual Process</cite>, 1968). No
            se añade nada nuevo: las mismas notas solo duran más, y eso basta para cambiar lo que oyes.
          </p>
          <ol>
            <li>
              <strong>Un ritmo.</strong> Al principio cada nota es un golpe corto y las notas se suceden
              una tras otra: oyes una pequeña figura rítmica sobre el pulso, todavía no un acorde.
            </li>
            <li>
              <strong>Un acorde que se forma.</strong> A medida que crecen, cada nota sigue sonando
              cuando llega la siguiente. La figura se difumina y las notas empiezan a oírse como
              armonía: el acorde se construye nota a nota.
            </li>
            <li>
              <strong>Sonido en lugar de ritmo.</strong> Al final todas las notas suenan juntas y los
              golpes se convierten en un acorde largo y sostenido. La atención pasa del ritmo al sonido
              mismo: cómo se funden las notas y en qué orden se apagan.
            </li>
          </ol>
          <p>
            Las maracas son la regla de medir. Su pulso no cambia nunca, así que la música no se
            ralentiza: el tiempo entre los sucesos crece mientras el reloj sigue igual. Cuenta los
            pulsos de cada ciclo para notar cómo se estira; sigue una sola nota, por ejemplo la más
            aguda, durante varios ciclos; y luego vuelve a escuchar el conjunto. Cambiar el factor o
            los pulsos cambia la rapidez del proceso, no adónde lleva.
          </p>
          <p>
            En <cite>Four Organs</cite> las notas no crecen todas al mismo ritmo, así que el acorde se
            va separando en el tiempo. Aquí crecen juntas, para que el proceso sea fácil de seguir.
          </p>
        </>
      ),
    },
    textures: {
      separate: 'Ahora las notas están separadas, una tras otra: se oye un ritmo.',
      overlapping: 'Ahora las notas se solapan: el acorde se está formando.',
      chord: 'Ahora todas las notas suenan juntas: escucha el acorde y el orden en que se apagan.',
    },
    cycle: (cycle, pulses) => `Ciclo ${cycle} · ${pulses} pulsos`,
    ended: 'Proceso terminado: el acorde ya no cabe en el ciclo más largo',
    announce: (pulses) => `Ciclo de ${pulses} pulsos`,
    legend:
      'Barra: duración actual de cada nota. Contorno discontinuo: duración inicial. Línea discontinua gruesa: final del ciclo.',
    mode: 'Alargar las notas',
    modes: { factor: 'Por un factor', pulses: 'Por pulsos' },
    factor: 'Factor por ciclo',
    pulses: 'Pulsos más por ciclo',
    size: 'Notas del acorde',
  },
};
