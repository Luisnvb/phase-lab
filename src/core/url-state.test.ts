import { describe, expect, test } from 'vitest';
import { parseRhythm } from './pattern.ts';
import type { Pattern } from './types.ts';
import { decodeState, encodeState, type UrlSchema } from './url-state.ts';

type Settings = {
  bpm: number;
  difference: number;
  mode: 'continuous' | 'plateau';
  group: 2 | 3 | 4 | 6;
  loop: boolean;
  pattern: Pattern;
  order: number[];
  ignored: string;
};

const defaults: Settings = {
  bpm: 132,
  difference: 1,
  mode: 'continuous',
  group: 3,
  loop: false,
  pattern: parseRhythm('xx.x..x.xx..'),
  order: [],
  ignored: 'local',
};

const schema: UrlSchema<Settings> = {
  bpm: { key: 'bpm', type: 'number', min: 60, max: 200, integer: true },
  difference: { key: 'd', type: 'number', min: 0, max: 5 },
  mode: { key: 'modo', type: 'choice', values: ['continuous', 'plateau'] },
  group: { key: 'g', type: 'choice', values: [2, 3, 4, 6] },
  loop: { key: 'bucle', type: 'boolean' },
  pattern: { key: 'patron', type: 'rhythm', length: 12 },
  order: { key: 'orden', type: 'indices', max: 11 },
};

const rhythm = (p: Pattern) => p.steps.map((s) => (s.active ? 'x' : '.')).join('');

describe('url state', () => {
  test('defaults encode to an empty query', () => {
    expect(encodeState(defaults, defaults, schema)).toBe('');
  });

  test('only changed fields are written, with their short keys', () => {
    const query = encodeState({ ...defaults, difference: 2.5, loop: true }, defaults, schema);
    expect(query).toBe('d=2.5&bucle=1');
  });

  test('round trip of every field type', () => {
    const state: Settings = {
      ...defaults,
      bpm: 90,
      difference: 0.3,
      mode: 'plateau',
      group: 4,
      loop: true,
      pattern: parseRhythm('x.x.x.x.x.xx'),
      order: [9, 0, 3],
    };
    const decoded = decodeState(encodeState(state, defaults, schema), defaults, schema);
    expect({ ...decoded, pattern: rhythm(decoded.pattern) }).toEqual({
      ...state,
      pattern: 'x.x.x.x.x.xx',
    });
  });

  test('fields not in the schema are never read or written', () => {
    expect(decodeState('ignored=hack', defaults, schema).ignored).toBe('local');
  });

  test('invalid values fall back to the default; numbers are clamped', () => {
    const decoded = decodeState(
      'bpm=999&d=abc&modo=other&g=5&bucle=yes&patron=xx&orden=1-40',
      defaults,
      schema,
    );
    expect(decoded.bpm).toBe(200);
    expect(decoded.difference).toBe(1);
    expect(decoded.mode).toBe('continuous');
    expect(decoded.group).toBe(3);
    expect(decoded.loop).toBe(false);
    expect(rhythm(decoded.pattern)).toBe('xx.x..x.xx..');
    expect(decoded.order).toEqual([]);
  });

  test('choices keep their type (numbers stay numbers)', () => {
    expect(decodeState('g=6', defaults, schema).group).toBe(6);
  });
});
