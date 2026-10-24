import { describe, expect, test } from 'vitest';
import { encodeWav, trimTrailingSilence } from './wav.ts';

const text = (view: DataView, offset: number, length: number) =>
  String.fromCharCode(...Array.from({ length }, (_, i) => view.getUint8(offset + i)));

describe('encodeWav', () => {
  test('writes a valid 16-bit PCM header', () => {
    const left = new Float32Array([0, 0.5, -0.5]);
    const right = new Float32Array([1, -1, 0]);
    const view = new DataView(encodeWav([left, right], 44100));
    expect(text(view, 0, 4)).toBe('RIFF');
    expect(text(view, 8, 4)).toBe('WAVE');
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(3 * 2 * 2);
    expect(view.byteLength).toBe(44 + 12);
  });

  test('interleaves channels and scales samples to 16 bits', () => {
    const view = new DataView(encodeWav([new Float32Array([1, -1]), new Float32Array([0.5, 2])], 8000));
    expect([0, 1, 2, 3].map((i) => view.getInt16(44 + i * 2, true))).toEqual([
      32767,
      Math.round(0.5 * 32767 - 0.5),
      -32768,
      32767, // clipped from 2
    ]);
  });
});

describe('trimTrailingSilence', () => {
  test('keeps up to the last sound plus the tail', () => {
    const channel = new Float32Array(100);
    channel[40] = 0.5;
    const [trimmed] = trimTrailingSilence([channel], 10, { tail: 1 });
    expect(trimmed).toHaveLength(51);
  });

  test('looks at every channel', () => {
    const left = new Float32Array(100);
    const right = new Float32Array(100);
    left[10] = 1;
    right[70] = 1;
    const trimmed = trimTrailingSilence([left, right], 10, { tail: 0 });
    expect(trimmed.map((c) => c.length)).toEqual([71, 71]);
  });

  test('never makes it longer than it was', () => {
    const channel = new Float32Array(20).fill(0.3);
    expect(trimTrailingSilence([channel], 10, { tail: 5 })[0]).toHaveLength(20);
  });
});
