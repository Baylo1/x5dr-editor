import { describe, it, expect } from 'vitest';
import { INIT_COMBI } from './initCombi.js';
import { flattenObjectPaths } from './initProgram.js';
import { encodeCombiToBytes } from '../midi/sysex.js';
import { parseCombi } from '../midi/parser.js';

function resolvePath(obj, path) {
  return path.split('.').reduce((cur, key) => cur?.[key], obj);
}

describe('INIT_COMBI', () => {
  it('round-trips every one of its own fields through encodeCombiToBytes -> parseCombi unchanged', () => {
    // Session-only fields absent from decodeEffects/encodeEffects entirely —
    // just the Parallel-3 OUT3/4-L/R Levels (only Pan is part of the dump
    // format) — same exclusion as INIT_PROGRAM's own round-trip test.
    // eff1Switch/eff2Switch DO round-trip now: encodeEffects derives the
    // dump's Effect I/O byte from them, and decodeEffects derives them back
    // from that byte (see decodeEffects' comment) — no longer excluded here.
    const sessionOnly = new Set([
      'effects.out3LLevel', 'effects.out3RLevel',
      'effects.out4LLevel', 'effects.out4RLevel',
    ]);
    const bytes = encodeCombiToBytes(INIT_COMBI);
    const parsed = parseCombi(bytes);
    for (const [path, value] of flattenObjectPaths(INIT_COMBI)) {
      if (sessionOnly.has(path)) continue;
      expect(resolvePath(parsed, path), `path ${path}`).toBe(value);
    }
  });

  it('fits the 10-character combi name field', () => {
    expect(INIT_COMBI.name.length).toBeLessThanOrEqual(10);
  });

  it('sets Effect 1/2 to Stereo Chorus 1/Room, fully dry, switched on, Serial routing', () => {
    expect(INIT_COMBI.effects.eff1Type).toBe(19);
    expect(INIT_COMBI.effects.eff2Type).toBe(4);
    expect(INIT_COMBI.effects.eff1Switch).toBe(1);
    expect(INIT_COMBI.effects.eff2Switch).toBe(1);
    expect(INIT_COMBI.effects.eff1BalanceL).toBe(0);
    expect(INIT_COMBI.effects.eff2BalanceL).toBe(0);
    expect(INIT_COMBI.effects.placement).toBe(0);
    expect(INIT_COMBI.effects.out3Pan).toBe(1);   // L50
    expect(INIT_COMBI.effects.out4Pan).toBe(101); // R50
  });

  it('sets all 8 timbres to A00, MIDI channel 1, with only Timbre 1 active', () => {
    INIT_COMBI.timbres.forEach((t, n) => {
      expect(t.programNo, `timbre ${n}`).toBe(0);
      expect(t.bankG, `timbre ${n}`).toBe(false);
      expect(t.midiChannel, `timbre ${n}`).toBe(0);
      expect(t.enabled, `timbre ${n}`).toBe(n === 0);
    });
  });

  it('sets Level and A:B Pan to PRG for every timbre', () => {
    INIT_COMBI.timbres.forEach((t, n) => {
      expect(t.outputLevel, `timbre ${n}`).toBe(127);
      expect(t.pan, `timbre ${n}`).toBe('prg');
    });
  });

  it('sets Send C/D, Transpose and Detune to 0 for every timbre', () => {
    INIT_COMBI.timbres.forEach((t, n) => {
      expect(t.sendC, `timbre ${n}`).toBe(0);
      expect(t.sendD, `timbre ${n}`).toBe(0);
      expect(t.transpose, `timbre ${n}`).toBe(0);
      expect(t.detune, `timbre ${n}`).toBe(0);
    });
  });

  it('sets Key/Vel Window to the full range for every timbre', () => {
    INIT_COMBI.timbres.forEach((t, n) => {
      expect(t.keyWindowBottom, `timbre ${n}`).toBe(0);
      expect(t.keyWindowTop, `timbre ${n}`).toBe(127);
      expect(t.velWindowBottom, `timbre ${n}`).toBe(1);
      expect(t.velWindowTop, `timbre ${n}`).toBe(127);
    });
  });

  it('sets PC/DM/AT/CC filters to On for every timbre', () => {
    INIT_COMBI.timbres.forEach((t, n) => {
      expect(t.filters.programChange, `timbre ${n}`).toBe(true);
      expect(t.filters.damper, `timbre ${n}`).toBe(true);
      expect(t.filters.afterTouch, `timbre ${n}`).toBe(true);
      expect(t.filters.controlChange, `timbre ${n}`).toBe(true);
    });
  });
});
