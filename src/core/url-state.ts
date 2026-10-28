import { parseRhythm } from './pattern.ts';
import type { Pattern } from './types.ts';

// Settings <-> URL query (v0.4: share configurations by URL). Only values that
// differ from the defaults are written; anything missing or invalid on the way
// back falls back to the default, so any URL is safe to open.

export type FieldSpec =
  | { readonly key: string; readonly type: 'number'; readonly min: number; readonly max: number; readonly integer?: boolean }
  | { readonly key: string; readonly type: 'choice'; readonly values: readonly (string | number)[] }
  | { readonly key: string; readonly type: 'boolean' }
  /** A pattern as `x` (active) and `.` (rest), e.g. `xx.x..x.xx..`. */
  | { readonly key: string; readonly type: 'rhythm'; readonly length: number }
  /** A list of step indices, e.g. `9-0-3`. */
  | { readonly key: string; readonly type: 'indices'; readonly max: number }
  /**
   * A fixed-length list of pitches from `values`, e.g. `D4-Fs4-_-A4`: `s` stands
   * for a sharp (`#` would need escaping) and `_` for a rest, if `rests` allows them.
   */
  | {
      readonly key: string;
      readonly type: 'pitches';
      readonly length: number;
      readonly values: readonly string[];
      readonly rests?: boolean;
    };

export type UrlSchema<T> = { readonly [K in keyof T]?: FieldSpec };

function toText(value: unknown, field: FieldSpec): string {
  switch (field.type) {
    case 'boolean':
      return value ? '1' : '0';
    case 'rhythm':
      return (value as Pattern).steps.map((s) => (s.active ? 'x' : '.')).join('');
    case 'indices':
      return (value as readonly number[]).join('-');
    case 'pitches':
      return (value as readonly (string | null)[])
        .map((pitch) => (pitch === null ? '_' : pitch.replace('#', 's')))
        .join('-');
    default:
      return String(value);
  }
}

/** The value in `text`, or undefined if it is not valid for the field. */
function fromText(text: string, field: FieldSpec): unknown {
  switch (field.type) {
    case 'number': {
      const value = Number(text);
      if (text.trim() === '' || !Number.isFinite(value)) return undefined;
      const clamped = Math.min(field.max, Math.max(field.min, value));
      return field.integer ? Math.round(clamped) : clamped;
    }
    case 'choice':
      return field.values.find((value) => String(value) === text);
    case 'boolean':
      return text === '1' ? true : text === '0' ? false : undefined;
    case 'rhythm': {
      if (text.length !== field.length || !/^[x.]+$/.test(text)) return undefined;
      return parseRhythm(text);
    }
    case 'indices': {
      if (text === '') return [];
      const values = text.split('-').map(Number);
      const valid = values.every((v) => Number.isInteger(v) && v >= 0 && v <= field.max);
      return valid ? values : undefined;
    }
    case 'pitches': {
      const pitches = text.split('-').map((item) => (item === '_' ? null : item.replace('s', '#')));
      if (pitches.length !== field.length) return undefined;
      const valid = pitches.every((p) => (p === null ? field.rests === true : field.values.includes(p)));
      return valid ? pitches : undefined;
    }
  }
}

/** Query string (without `?`) with the settings that differ from the defaults. */
export function encodeState<T extends object>(state: T, defaults: T, schema: UrlSchema<T>): string {
  const params = new URLSearchParams();
  for (const name of Object.keys(schema) as (keyof T)[]) {
    const field = schema[name]!;
    const text = toText(state[name], field);
    if (text !== toText(defaults[name], field)) params.set(field.key, text);
  }
  return params.toString();
}

/** Settings from a query string, falling back to the defaults field by field. */
export function decodeState<T extends object>(query: string, defaults: T, schema: UrlSchema<T>): T {
  const params = new URLSearchParams(query);
  const result = { ...defaults };
  for (const name of Object.keys(schema) as (keyof T)[]) {
    const field = schema[name]!;
    const text = params.get(field.key);
    if (text === null) continue;
    const value = fromText(text, field);
    if (value !== undefined) result[name] = value as T[keyof T];
  }
  return result;
}
