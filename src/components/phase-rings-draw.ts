import { mod } from '../core/math.ts';
import type { Step } from '../core/types.ts';

export type RingColors = {
  voiceA: string;
  voiceB: string;
  text: string;
  muted: string;
  border: string;
};

export type RingsFrame = {
  steps: readonly Step[];
  /** Elapsed positions in steps (fractional). */
  posA: number;
  posB: number;
  /** Displayed offset in steps, already formatted. */
  offsetText: string;
  /** Reduced motion: cursors jump from step to step instead of turning. */
  discrete: boolean;
  colors: RingColors;
};

const TAU = Math.PI * 2;

/**
 * Two concentric rings (A outside, B inside) with one mark per step, a cursor
 * per voice and an arc for the offset between them (SPEC §5, module 1).
 * Voices differ by shape too: A's cursor is solid, B's is dashed.
 */
export function drawPhaseRings(ctx: CanvasRenderingContext2D, size: number, frame: RingsFrame) {
  const { steps, colors, discrete } = frame;
  const n = steps.length;
  const center = size / 2;
  const radiusA = size / 2 - 30;
  const radiusB = radiusA * 0.64;
  const angle = (position: number) => -Math.PI / 2 + (position / n) * TAU;
  const point = (radius: number, a: number): [number, number] => [
    center + radius * Math.cos(a),
    center + radius * Math.sin(a),
  ];

  const posA = discrete ? Math.floor(frame.posA) : frame.posA;
  const posB = discrete ? Math.floor(frame.posB) : frame.posB;

  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = 'round';

  for (const radius of [radiusA, radiusB]) {
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Offset arc, clockwise from A's cursor to B's.
  const span = mod(posB - posA, n);
  if (span > 0.005) {
    ctx.beginPath();
    ctx.arc(center, center, (radiusA + radiusB) / 2, angle(posA), angle(posA + span));
    ctx.strokeStyle = colors.muted;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const rings = [
    { radius: radiusA, position: frame.posA, color: colors.voiceA, dash: [] as number[] },
    { radius: radiusB, position: frame.posB, color: colors.voiceB, dash: [5, 4] },
  ];

  for (const ring of rings) {
    const current = mod(Math.floor(ring.position), n);
    const fresh = ring.position - Math.floor(ring.position) < 0.5;
    steps.forEach((step, i) => {
      const [x, y] = point(ring.radius, angle(i));
      ctx.beginPath();
      if (step.active) {
        // Active: filled dot. Inactive: small hollow dot.
        ctx.arc(x, y, 6, 0, TAU);
        ctx.fillStyle = ring.color;
        ctx.fill();
      } else {
        ctx.arc(x, y, 3, 0, TAU);
        ctx.strokeStyle = colors.muted;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // Halo on the step that is sounding.
      if (i === current && step.active && (fresh || discrete)) {
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, TAU);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }

  rings.forEach((ring, index) => {
    const a = angle(index === 0 ? posA : posB);
    const [x1, y1] = point(ring.radius - 16, a);
    const [x2, y2] = point(ring.radius + 16, a);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.setLineDash(ring.dash);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]);

    const [lx, ly] = point(ring.radius + 26, a);
    ctx.fillStyle = ring.color;
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(index === 0 ? 'A' : 'B', lx, ly);
  });

  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${Math.round(size / 11)}px system-ui, sans-serif`;
  ctx.fillText(frame.offsetText, center, center + size / 40);
  ctx.fillStyle = colors.muted;
  ctx.font = `${Math.round(size / 28)}px system-ui, sans-serif`;
  ctx.fillText('pasos de desfase', center, center + size / 40 + size / 18);
}
