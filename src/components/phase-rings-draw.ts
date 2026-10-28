import { mod } from '../core/math.ts';
import type { ResultantCell, Step } from '../core/types.ts';

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
  /** Under the offset, e.g. "steps of offset". */
  caption: string;
  /** Reduced motion: cursors jump from step to step instead of turning. */
  discrete: boolean;
  colors: RingColors;
  /**
   * Optional outer ring with the resultant, aligned with A's steps. `clarity`
   * (0..1) is 1 when B is exactly on a whole step and fades the ring in between.
   */
  resultant?: { cells: readonly ResultantCell[]; clarity: number };
};

const TAU = Math.PI * 2;

/**
 * Resultant cell on a ring, with the same shapes as the stage matrix:
 * both = filled, A only = half, B only = outline, none = dot.
 */
function drawCellMark(
  ctx: CanvasRenderingContext2D,
  type: ResultantCell,
  x: number,
  y: number,
  colors: RingColors,
) {
  ctx.beginPath();
  switch (type) {
    case 'both':
      ctx.arc(x, y, 6.5, 0, TAU);
      ctx.fillStyle = colors.text;
      ctx.fill();
      return;
    case 'A':
      ctx.arc(x, y, 6, 0, TAU);
      ctx.strokeStyle = colors.voiceA;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 6, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.closePath();
      ctx.fillStyle = colors.voiceA;
      ctx.fill();
      return;
    case 'B':
      ctx.arc(x, y, 5.5, 0, TAU);
      ctx.strokeStyle = colors.voiceB;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      return;
    case 'none':
      ctx.arc(x, y, 2, 0, TAU);
      ctx.fillStyle = colors.muted;
      ctx.fill();
      return;
  }
}

/**
 * Two concentric rings (A outside, B inside) with one mark per step, a cursor
 * per voice and an arc for the offset between them (SPEC §5, module 1), plus
 * an optional outermost ring with the resultant.
 * Voices differ by shape too: A's cursor is solid, B's is dashed.
 */
export function drawPhaseRings(ctx: CanvasRenderingContext2D, size: number, frame: RingsFrame) {
  const { steps, colors, discrete, resultant } = frame;
  const n = steps.length;
  const center = size / 2;
  const outer = size / 2 - 30;
  const radiusR = outer;
  const radiusA = resultant ? outer * 0.78 : outer;
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

  if (resultant) {
    ctx.globalAlpha = 0.25 + 0.75 * resultant.clarity;
    ctx.beginPath();
    ctx.arc(center, center, radiusR, 0, TAU);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    resultant.cells.forEach((cell, i) => {
      const [x, y] = point(radiusR, angle(i));
      drawCellMark(ctx, cell, x, y, colors);
    });
    // Its cursor follows A, whose steps it is aligned with.
    const a = angle(posA);
    const [x1, y1] = point(radiusR - 10, a);
    const [x2, y2] = point(radiusR + 10, a);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = colors.text;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('A+B', center + 10, center - radiusR - 16);
  }

  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${Math.round(size / 11)}px system-ui, sans-serif`;
  ctx.fillText(frame.offsetText, center, center + size / 40);
  ctx.fillStyle = colors.muted;
  ctx.font = `${Math.round(size / 28)}px system-ui, sans-serif`;
  ctx.fillText(frame.caption, center, center + size / 40 + size / 18);
}
