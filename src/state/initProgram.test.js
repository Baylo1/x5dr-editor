import { describe, it, expect } from 'vitest';
import { INIT_PROGRAM, flattenObjectPaths } from './initProgram.js';
import { encodeProgramToBytes } from '../midi/sysex.js';
import { parseProgram } from '../midi/parser.js';

function resolvePath(obj, path) {
  return path.split('.').reduce((cur, key) => cur?.[key], obj);
}

describe('flattenObjectPaths', () => {
  it('joins nested object keys with dots, at the scalar leaves', () => {
    expect(flattenObjectPaths({ a: 1, b: { c: 2, d: 3 } })).toEqual([
      ['a', 1], ['b.c', 2], ['b.d', 3],
    ]);
  });

  it('indexes array elements by position, same shape as a nested object', () => {
    expect(flattenObjectPaths({ a: [10, 20, 30] })).toEqual([
      ['a.0', 10], ['a.1', 20], ['a.2', 30],
    ]);
  });

  it('treats null as a leaf, not an object to recurse into', () => {
    expect(flattenObjectPaths({ a: null })).toEqual([['a', null]]);
  });
});

describe('INIT_PROGRAM', () => {
  it('round-trips every one of its own fields through encodeProgramToBytes -> parseProgram unchanged', () => {
    // Session-only fields absent from decodeEffects/encodeEffects entirely —
    // just the Parallel-3 OUT3/4-L/R Levels (only Pan is part of the dump
    // format, see copyEffectsFrom's own comment). Excluded from this
    // round-trip check by design, not an oversight. eff1Switch/eff2Switch DO
    // round-trip now: encodeEffects derives the dump's Effect I/O byte from
    // them, and decodeEffects derives them back from that byte (see
    // decodeEffects' comment) — no longer excluded here.
    const sessionOnly = new Set([
      'effects.out3LLevel', 'effects.out3RLevel',
      'effects.out4LLevel', 'effects.out4RLevel',
    ]);
    const bytes = encodeProgramToBytes(INIT_PROGRAM);
    const parsed = parseProgram(bytes);
    for (const [path, value] of flattenObjectPaths(INIT_PROGRAM)) {
      if (sessionOnly.has(path)) continue;
      expect(resolvePath(parsed, path), `path ${path}`).toBe(value);
    }
  });

  it('fits the 10-character program name field', () => {
    expect(INIT_PROGRAM.name.length).toBeLessThanOrEqual(10);
  });

  it('sets both oscillators to the agreed values (Saw, median level, Single mode)', () => {
    expect(INIT_PROGRAM.osc.mode).toBe(0);
    expect(INIT_PROGRAM.osc1.multisound).toBe(330);
    expect(INIT_PROGRAM.osc1.level).toBe(43);
    expect(INIT_PROGRAM.osc2).toEqual({ ...INIT_PROGRAM.osc1, interval: 0, detune: 0, delayStart: 0 });
  });

  it('mirrors VDF/VDA-1 onto VDF/VDA-2 exactly, so Double mode is already initialized', () => {
    expect(INIT_PROGRAM.vda2).toEqual(INIT_PROGRAM.vda1);
    expect(INIT_PROGRAM.vdf2).toEqual(INIT_PROGRAM.vdf1);
  });

  it('sets Effect 1/2 to Stereo Chorus 1/Room, fully dry, switched on', () => {
    expect(INIT_PROGRAM.effects.eff1Type).toBe(19);
    expect(INIT_PROGRAM.effects.eff2Type).toBe(4);
    expect(INIT_PROGRAM.effects.eff1Switch).toBe(1);
    expect(INIT_PROGRAM.effects.eff2Switch).toBe(1);
    expect(INIT_PROGRAM.effects.eff1BalanceL).toBe(0);
    expect(INIT_PROGRAM.effects.eff2BalanceL).toBe(0);
  });

  it('spaces the VDF/VDA envelope handles with Decay/Slope Time 30', () => {
    for (const block of ['vdf1', 'vdf2', 'vda1', 'vda2']) {
      expect(INIT_PROGRAM[block].eg.decayTime, block).toBe(30);
      expect(INIT_PROGRAM[block].eg.slopeTime, block).toBe(30);
    }
  });

  it('opens the filter fully with no envelope shaping', () => {
    expect(INIT_PROGRAM.vdf1.cutoff).toBe(99);
    expect(INIT_PROGRAM.vdf1.egIntensity).toBe(0);
  });
});
