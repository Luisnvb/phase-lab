import { describe, expect, test } from 'vitest';
import { EventQueue } from './event-queue.ts';

describe('EventQueue', () => {
  test('keeps items in insertion order', () => {
    const queue = new EventQueue<number>(4);
    queue.push(1);
    queue.push(2);
    expect(queue.toArray()).toEqual([1, 2]);
    expect(queue.size).toBe(2);
  });

  test('overwrites the oldest items when full', () => {
    const queue = new EventQueue<number>(3);
    for (let i = 1; i <= 7; i++) queue.push(i);
    expect(queue.toArray()).toEqual([5, 6, 7]);
    expect(queue.size).toBe(3);
  });

  test('clear empties the queue', () => {
    const queue = new EventQueue<number>(3);
    queue.push(1);
    queue.clear();
    expect(queue.toArray()).toEqual([]);
    queue.push(2);
    expect(queue.toArray()).toEqual([2]);
  });

  test('rejects invalid capacity', () => {
    expect(() => new EventQueue(0)).toThrow(RangeError);
  });
});
