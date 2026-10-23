/** Modulo that always returns a value in [0, n), also for negative or fractional a. */
export function mod(a: number, n: number): number {
  const r = a % n;
  // `+ 0` turns -0 into 0.
  return (r < 0 ? r + n : r) + 0;
}

export function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${name} must be an integer, got ${value}`);
  }
}
