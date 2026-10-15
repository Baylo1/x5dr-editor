import { describe, it, expect } from 'vitest';
import { gridArrowTarget, gridArrowTargetSkipping } from './gridNav.js';

// 13 items, 5 columns:
//    0  1  2  3  4
//    5  6  7  8  9
//   10 11 12
describe('gridArrowTarget (row-major, 13 items × 5 columns)', () => {
  const t = (pos, key) => gridArrowTarget(pos, key, 13, 5);

  it('Left/Right step one item and wrap between rows', () => {
    expect(t(4, 'ArrowRight')).toBe(5);
    expect(t(5, 'ArrowLeft')).toBe(4);
    expect(t(0, 'ArrowLeft')).toBeNull();
    expect(t(12, 'ArrowRight')).toBeNull();
  });

  it('Up/Down move a row inside a column', () => {
    expect(t(1, 'ArrowDown')).toBe(6);
    expect(t(11, 'ArrowUp')).toBe(6);
  });

  it('Down at the bottom of a column goes to the top of the next column', () => {
    expect(t(10, 'ArrowDown')).toBe(1);
    expect(t(12, 'ArrowDown')).toBe(3); // short column next door
    expect(t(8, 'ArrowDown')).toBe(4);
  });

  it('Up at the top of a column goes to the bottom of the previous column', () => {
    expect(t(1, 'ArrowUp')).toBe(10);
    expect(t(3, 'ArrowUp')).toBe(12);
    expect(t(4, 'ArrowUp')).toBe(8); // previous column is short
  });

  it('stops at the first and last item; ignores other keys', () => {
    expect(t(0, 'ArrowUp')).toBeNull();
    expect(t(9, 'ArrowDown')).toBeNull(); // bottom of the last column
    expect(t(3, 'Enter')).toBeNull();
  });

  it('walking Down visits every item in column order', () => {
    const seen = [0];
    for (let p = 0; (p = t(p, 'ArrowDown')) !== null;) seen.push(p);
    expect(seen).toEqual([0, 5, 10, 1, 6, 11, 2, 7, 12, 3, 8, 4, 9]);
  });

  it('walking Up from the last column bottom visits every item in reverse', () => {
    const seen = [9];
    for (let p = 9; (p = t(p, 'ArrowUp')) !== null;) seen.push(p);
    expect(seen).toEqual([9, 4, 8, 3, 12, 7, 2, 11, 6, 1, 10, 5, 0]);
  });
});

describe('gridArrowTarget edge cases', () => {
  it('fewer items than columns', () => {
    expect(gridArrowTarget(0, 'ArrowDown', 3, 5)).toBe(1);
    expect(gridArrowTarget(2, 'ArrowDown', 3, 5)).toBeNull();
    expect(gridArrowTarget(1, 'ArrowUp', 3, 5)).toBe(0);
  });
  it('a full 100-slot Patch Browser grid', () => {
    expect(gridArrowTarget(95, 'ArrowDown', 100, 5)).toBe(1);   // A95 → A01
    expect(gridArrowTarget(4, 'ArrowUp', 100, 5)).toBe(98);     // A04 → A98
    expect(gridArrowTarget(99, 'ArrowDown', 100, 5)).toBeNull();
  });
  it('empty grid or out-of-range position', () => {
    expect(gridArrowTarget(0, 'ArrowDown', 0, 5)).toBeNull();
    expect(gridArrowTarget(13, 'ArrowLeft', 13, 5)).toBeNull();
  });
});

describe('gridArrowTargetSkipping', () => {
  it('passes over skipped items in the same direction', () => {
    const skip = (p) => p === 5 || p === 10;
    expect(gridArrowTargetSkipping(0, 'ArrowDown', 13, 5, skip)).toBe(1);
    expect(gridArrowTargetSkipping(4, 'ArrowRight', 13, 5, skip)).toBe(6);
  });
  it('returns null when only skipped items remain', () => {
    expect(gridArrowTargetSkipping(11, 'ArrowRight', 13, 5, (p) => p === 12)).toBeNull();
  });
});
