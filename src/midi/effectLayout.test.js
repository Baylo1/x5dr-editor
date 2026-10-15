import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import {
  decodeEffectParams, encodeEffectParams, decodeEffectBalance, encodeEffectBalance,
  liveEffectParamValue,
} from './effectLayout.js';
import { unpack7bit, encodeProgramToBytes, encodeCombiToBytes } from './sysex.js';
import { parseProgram, parseCombi } from './parser.js';

describe('decodeEffectParams / encodeEffectParams', () => {
  it('reorders Hall/Room bytes into Parameter Change order, skipping the NUL bytes', () => {
    // A16 "Upright" Effect 2 (Room): RT 12, NUL, Hi Damp 20, Pre Delay 10, E.R 75, NUL, EQ High -4, EQ Low 0
    const raw = [12, 0, 20, 10, 75, 0, 252, 0];
    expect(decodeEffectParams(4, raw)).toEqual([12, 10, 75, 20, 0, -4, 0]);
  });

  it('joins (L)/(H) byte pairs into one value and splits them back', () => {
    // A33 "Lore" Effect 1 (Stereo Delay): Delay L 500, FB -40, Hi Damp 40, Delay R 370, EQ High 12, EQ Low 12
    const raw = [244, 1, 216, 40, 114, 1, 12, 12];
    const values = decodeEffectParams(13, raw);
    expect(values).toEqual([500, 370, -40, 40, 12, 12, 0]);
    expect(encodeEffectParams(13, values)).toEqual(raw);
  });

  it('writes an edited value to its own dump byte, not the one at the same index', () => {
    // The hardware-confirmed bug: editing Hi Damp (editor offset 3) on a Room
    // must change dump byte 2, leaving Pre Delay (dump byte 3) alone.
    const raw = [12, 0, 20, 10, 75, 0, 252, 0];
    const values = decodeEffectParams(4, raw);
    values[3] = 50;
    expect(encodeEffectParams(4, values, raw)).toEqual([12, 0, 50, 10, 75, 0, 252, 0]);
  });

  it('stores Chorus/Flanger-Delay Delay Time (0-450ms) in 2ms steps', () => {
    const raw = [24, 3, 99, 24, 195, 60, 0, 0]; // factory C60 "Crossfades", type 38
    const values = decodeEffectParams(38, raw);
    expect(values[4]).toBe(390);
    expect(encodeEffectParams(38, values, raw)).toEqual(raw);
  });

  it('decodes MG Status to the Sin/Tri bit and re-applies the type\'s hardwired bits on encode', () => {
    // Phaser 1 (32): bit1 hardwired to 1 — stored 2 = Sin, 3 = Tri
    expect(decodeEffectParams(32, [97, 3, 2, 157, 99, 0, 0, 0])[4]).toBe(0);
    expect(decodeEffectParams(32, [97, 17, 3, 98, 98, 0, 0, 0])[4]).toBe(1);
    expect(encodeEffectParams(32, [99, 3, 97, -99, 0, 0, 0])[2]).toBe(2);
    expect(encodeEffectParams(32, [99, 3, 97, -99, 1, 0, 0])[2]).toBe(3);
    // Phaser 2 (33): bit1 hardwired to 0
    expect(encodeEffectParams(33, [99, 3, 97, -99, 1, 0, 0])[2]).toBe(1);
  });

  it('writes type 43\'s hardwired "for Flanger" MG Status byte even with no source block', () => {
    expect(encodeEffectParams(43, [300, 0, 0, 0, 0, 0, 0])[6]).toBe(4);
  });

  it('preserves bytes the layout does not model when a base block is given', () => {
    const raw = [12, 7, 20, 10, 75, 9, 252, 0]; // non-zero "NUL" bytes
    expect(encodeEffectParams(4, decodeEffectParams(4, raw), raw)).toEqual(raw);
    expect(encodeEffectParams(4, decodeEffectParams(4, raw))[1]).toBe(0);
  });
});

describe('decodeEffectBalance / encodeEffectBalance', () => {
  it('single-control types: dump stores wet in both bytes, editor holds wet / 100-wet', () => {
    expect(decodeEffectBalance(13, 30, 30)).toEqual([30, 70]);
    expect(encodeEffectBalance(13, 30, 70)).toEqual([30, 30]);
  });

  it('dual-balance types and 44-45 pass both bytes through unchanged', () => {
    expect(decodeEffectBalance(40, 100, 30)).toEqual([100, 30]);
    expect(encodeEffectBalance(42, 35, 50)).toEqual([35, 50]);
    expect(decodeEffectBalance(45, 25, 100)).toEqual([25, 100]);
    expect(encodeEffectBalance(45, 25, 100)).toEqual([25, 100]);
  });
});

describe('liveEffectParamValue', () => {
  it('halves Chorus/Flanger-Delay Delay Time for the live wire, matching the dump scale', () => {
    // Hardware-confirmed 2026-09-24: editor 150 -> live wire 75 -> device
    // shows 150ms (was sending 150 raw, device showed 300ms until Write).
    expect(liveEffectParamValue(38, 4, 150)).toBe(75);
    expect(liveEffectParamValue(39, 4, 300)).toBe(150);
    // Odd editor values round the same way the device's own front-panel
    // stepping does (confirmed: editor 151 -> device rounds to 152).
    expect(liveEffectParamValue(38, 4, 151)).toBe(76);
  });

  it('passes every other offset and type through unchanged', () => {
    expect(liveEffectParamValue(38, 0, 30)).toBe(30);
    expect(liveEffectParamValue(13, 0, 500)).toBe(500);
    expect(liveEffectParamValue(4, 3, 20)).toBe(20);
  });
});

// Whole-bank round trip: every Program's and Combination's 29-byte effects
// block in both hardware-captured factory banks (A and B, 800 stored effects
// across 41 effect types) must decode and re-encode byte-for-byte. Checked
// on the effects block only — the encoders already normalize a few non-effect
// bytes independently of this layer (Program byte 134 reserved, a Cutoff MG
// bit in byte 29; Combi byte 10, Timbre Control Filter bits 4-5), which is
// pre-existing behavior outside this module's scope. The only tolerated differences are
// Balance R bytes on single-control types that were stored != Balance L —
// normalized to the dominant L == R form: any Exciter (Bank A: Program 13
// "Harp Gliss" 52/55, Program 17 "Velo Flute" 64/65), plus one named
// non-Exciter instance in Bank B (Combi 4 "Mr. Tone", Effect 1 type 31,
// stored 50/100).
describe('real bank round trip', () => {
  const SIZE_PROGRAM = 164;
  const SIZE_COMBI = 136;

  function allDataRecords(file) {
    const buf = readFileSync(new URL(`../../reference_sysex/${file}`, import.meta.url));
    const msgs = [];
    let start = -1;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 0xF0) start = i;
      if (buf[i] === 0xF7 && start >= 0) { msgs.push(buf.subarray(start, i + 1)); start = -1; }
    }
    const records = [];
    for (const m of msgs) {
      const payload = m.subarray(6, m.length - 1);
      const padded = new Uint8Array(Math.ceil(payload.length / 8) * 8);
      padded.set(payload);
      const raw = unpack7bit(padded);
      let combis = null;
      let programs = null;
      if (m[4] === 0x50) { combis = 28 + 840; programs = combis + 100 * SIZE_COMBI; }
      else if (m[4] === 0x4C) programs = 0;
      else if (m[4] === 0x4D) combis = 0;
      for (let i = 0; i < 100; i++) {
        if (combis !== null) records.push({ kind: 'combi', i, bytes: raw.slice(combis + i * SIZE_COMBI, combis + (i + 1) * SIZE_COMBI) });
        if (programs !== null) records.push({ kind: 'program', i, bytes: raw.slice(programs + i * SIZE_PROGRAM, programs + (i + 1) * SIZE_PROGRAM) });
      }
    }
    return records;
  }

  // Effects block offsets within each record, and the single-control-type
  // Balance R bytes allowed to differ (see describe comment above).
  const FX_BASE = { program: 135, combi: 11 };
  const EXCITER = 28;
  const BANK_A = 'X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx';
  const BANK_B = 'Factory B Bank Pt 1 dump.syx';
  // Non-Exciter Balance R normalizations, named one by one: `${file} ${kind} ${i} ${effNo}`.
  const KNOWN_BALANCE_R = new Set([`${BANK_B} combi 4 1`]);
  // Exact number of tolerated normalizations per bank.
  const EXPECTED_NORMALIZED = { [BANK_A]: 2, [BANK_B]: 1 };

  // Bank A: the 2026-09-29 hardware capture. Bank B: Pt 1 is its All Data
  // (0x50) dump (Pt 2 is the Multi Expansion, which holds no effects).
  for (const file of [BANK_A, BANK_B]) {
    it(`re-encodes every effects block in ${file} byte-for-byte`, () => {
      const records = allDataRecords(file);
      expect(records.length).toBeGreaterThan(0);
      let normalized = 0;
      for (const { kind, i, bytes } of records) {
        const out = kind === 'program'
          ? encodeProgramToBytes(parseProgram(bytes))
          : encodeCombiToBytes(parseCombi(bytes));
        const base = FX_BASE[kind];
        for (let k = base; k < base + 29; k++) {
          if (out[k] === bytes[k]) continue;
          const effNo = k === base + 3 ? 1 : k === base + 5 ? 2 : null;
          const isToleratedBalanceR = effNo !== null
            && (bytes[base + effNo - 1] === EXCITER || KNOWN_BALANCE_R.has(`${file} ${kind} ${i} ${effNo}`))
            && out[k] === bytes[k - 1]; // normalized to Balance L
          expect(isToleratedBalanceR, `${file} ${kind} ${i} byte ${k}: ${bytes[k]} -> ${out[k]}`).toBe(true);
          normalized++;
        }
      }
      expect(normalized).toBe(EXPECTED_NORMALIZED[file]);
    });
  }

  // Neither factory bank stores a Dual Mono Delay (15, the only layout with no
  // stored factory instance) or a No Effect (0) slot, so a factory program is
  // given one of each here and must still round-trip byte-for-byte.
  it('re-encodes a synthetic Dual Mono Delay (15) + No Effect (0) program byte-for-byte', () => {
    const [record] = allDataRecords(BANK_A)
      .filter(r => r.kind === 'program');
    const bytes = new Uint8Array(record.bytes);
    const base = FX_BASE.program;
    // Delay L 300, FB L -30, Hi Damp L 40, Delay R 450, FB R +20, Hi Damp R 60
    const dualDelay = [44, 1, 226, 40, 194, 1, 20, 60];
    bytes[base + 0] = 15;
    bytes[base + 1] = 0;
    bytes.set([70, 40, 0, 0], base + 2);        // Eff1 dual balance 70/40, Eff2 none
    bytes.set(dualDelay, base + 9);
    bytes.set(new Array(8).fill(0), base + 19);

    const parsed = parseProgram(bytes);
    expect(parsed.effects.eff1Params).toEqual([300, -30, 40, 450, 20, 60, 0]);
    expect([parsed.effects.eff1BalanceL, parsed.effects.eff1BalanceR]).toEqual([70, 40]);
    expect(parsed.effects.eff2Params).toEqual([0, 0, 0, 0, 0, 0, 0]);
    const out = encodeProgramToBytes(parsed);
    expect(Array.from(out.slice(base, base + 29))).toEqual(Array.from(bytes.slice(base, base + 29)));
  });
});
