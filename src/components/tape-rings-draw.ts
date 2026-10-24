import { mod } from '../core/math.ts';
import type { RingColors } from './phase-rings-draw.ts';

export type TapeFrame = {
  /** Waveform of the looping region, 0..1 per bin. */
  peaks: readonly number[];
  /** Seconds of material played by each loop (unwrapped). */
  posA: number;
  posB: number;
  /** Loop length in seconds. */
  loop: number;
  offsetText: string;
  /** Reduced motion: playheads jump in twelfths of a turn instead of turning. */
  discrete: boolean;
  colors: RingColors;
};

const TAU = Math.PI * 2;
const DISCRETE_STEPS = 12;

/**
 * Two rings (A outside, B inside) with the recording's waveform around them,
 * a playhead per loop (A solid, B dashed) and an arc for the offset.
 */
export function drawTapeRings(ctx: CanvasRenderingContext2D, size: number, frame: TapeFrame) {
  const { peaks, colors, loop } = frame;
  const center = size / 2;
  const radiusA = size / 2 - 34;
  const radiusB = radiusA * 0.62;
  const turns = (position: number) => {
    const turn = mod(position / loop, 1);
    return frame.discrete ? Math.floor(turn * DISCRETE_STEPS) / DISCRETE_STEPS : turn;
  };
  const angle = (turn: number) => -Math.PI / 2 + turn * TAU;
  const point = (radius: number, a: number): [number, number] => [
    center + radius * Math.cos(a),
    center + radius * Math.sin(a),
  ];

  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = 'round';

  const rings = [
    { radius: radiusA, turn: turns(frame.posA), color: colors.voiceA, dash: [] as number[], label: 'A' },
    { radius: radiusB, turn: turns(frame.posB), color: colors.voiceB, dash: [5, 4], label: 'B' },
  ];

  // Offset arc, clockwise from A's playhead to B's.
  const span = loop > 0 ? mod((frame.posB - frame.posA) / loop, 1) : 0;
  if (span > 0.002) {
    const start = angle(rings[0]!.turn);
    ctx.beginPath();
    ctx.arc(center, center, (radiusA + radiusB) / 2, start, start + span * TAU);
    ctx.strokeStyle = colors.muted;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (const ring of rings) {
    ctx.beginPath();
    ctx.arc(center, center, ring.radius, 0, TAU);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Waveform: one radial bar per bin, as long as its peak.
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = Math.max(1, (TAU * ring.radius) / Math.max(1, peaks.length) - 1);
    ctx.globalAlpha = 0.75;
    peaks.forEach((peak, i) => {
      const a = angle(i / peaks.length);
      const half = 1 + peak * (ring === rings[0] ? 14 : 10);
      const [x1, y1] = point(ring.radius - half, a);
      const [x2, y2] = point(ring.radius + half, a);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  for (const ring of rings) {
    const a = angle(ring.turn);
    const [x1, y1] = point(ring.radius - 20, a);
    const [x2, y2] = point(ring.radius + 20, a);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.setLineDash(ring.dash);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);

    const [lx, ly] = point(ring.radius + 30, a);
    ctx.fillStyle = ring.color;
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ring.label, lx, ly);
  }

  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${Math.round(size / 12)}px system-ui, sans-serif`;
  ctx.fillText(frame.offsetText, center, center + size / 40);
  ctx.fillStyle = colors.muted;
  ctx.font = `${Math.round(size / 28)}px system-ui, sans-serif`;
  ctx.fillText('de desfase', center, center + size / 40 + size / 18);
}
