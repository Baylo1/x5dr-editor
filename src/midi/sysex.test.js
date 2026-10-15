import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  SYSEX_HEADER,
  buildModeChange,
  buildParamChange,
  buildDrumParamChange,
  buildDumpRequest,
  buildCombiWriteRequest,
  buildSingleCombiDump,
  encodeCombiToBytes,
  encodeParamValue,
  pack7bit,
  unpack7bit,
  isAck,
  isNak,
  isActiveSensing,
  encodeProgramNoParam,
  decodeProgramNoParam,
  SEND_PRG_RAW,
  MULTI_PARAM_BASE,
  multiParamNo,
  MULTI_EFFECTS_OFFSET,
  encodeMultiEffectsToBytes,
  encodeMultiTracksToBytes,
  encodeMulti,
  buildMultiEffectsDump,
  buildMultiExpansionDump,
  encodeGlobalToBytes,
  buildGlobalDump,
  encodeDrumsToBytes,
  buildDrumsDump,
} from './sysex.js';
import { parseSnapshot, parseCombi, parseMulti, parseMultiEffects, parseMultiTracks, parseGlobal, parseDrums } from './parser.js';

function hexToBytes(hex) {
  return new Uint8Array(hex.trim().split(/\s+/).map(b => parseInt(b, 16)));
}

function loadSyx(path) {
  const data = readFileSync(path);
  const msgs = [];
  let i = 0;
  while (i < data.length) {
    if (data[i] !== 0xF0) { i++; continue; }
    const start = i;
    while (i < data.length && data[i] !== 0xF7) i++;
    msgs.push(new Uint8Array(data.slice(start, i + 1)));
    i++;
  }
  return msgs;
}

// Factory Bank B (All Data, hardware-captured).
const BANK_B_PATH = resolve(process.cwd(), 'reference_sysex/Factory B Bank Pt 1 dump.syx');

describe('buildModeChange', () => {
  it('produces the correct byte sequence for Prog Edit (mode 0x03)', () => {
    const msg = buildModeChange(0x03);
    expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x4E, 0x03, 0x00, 0xF7]);
  });

  it('uses the supplied mode byte', () => {
    const msg = buildModeChange(0x00);
    expect(msg[5]).toBe(0x00); // mode byte
    expect(msg[4]).toBe(0x4E); // Func
    expect(msg[msg.length - 1]).toBe(0xF7);
  });
});

describe('buildParamChange', () => {
  it('produces the correct byte sequence for OSC Mode = Single (TABLE 7 param 00, value 0)', () => {
    // TABLE 7 param 00 = OSC Mode; LSB=0x00 MSB=0x00; value Single=0 → lsb=0 msb=0
    const msg = buildParamChange(0x00, 0x00, 0x00, 0x00);
    expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x41, 0x00, 0x00, 0x00, 0x00, 0xF7]);
  });

  it('places all four param/value bytes in the correct positions', () => {
    const msg = buildParamChange(0x1F, 0x01, 0x63, 0x00);
    expect(msg[4]).toBe(0x41); // Func=41
    expect(msg[5]).toBe(0x1F); // paramLsb
    expect(msg[6]).toBe(0x01); // paramMsb
    expect(msg[7]).toBe(0x63); // valueLsb
    expect(msg[8]).toBe(0x00); // valueMsb
    expect(msg[9]).toBe(0xF7);
  });
});

describe('encodeParamValue', () => {
  it('encodes zero', () => {
    expect(encodeParamValue(0)).toEqual({ lsb: 0x00, msb: 0x00 });
  });

  it('encodes a small positive value', () => {
    // value = 99 (0x63): lsb = 0x63, msb = 0x00
    expect(encodeParamValue(99)).toEqual({ lsb: 0x63, msb: 0x00 });
  });

  it('encodes a value requiring the MSB byte', () => {
    // value = 128: lsb = 0 (128 & 0x7F), msb = 1 ((128 >> 7) & 0x7F)
    expect(encodeParamValue(128)).toEqual({ lsb: 0x00, msb: 0x01 });
  });

  it('encodes -1 with sign flag set (bits 15~13 all 1)', () => {
    // -1 in 32-bit two's complement: 0xFFFFFFFF
    // lsb = 0xFF & 0x7F = 0x7F; msb = (-1 >> 7) & 0x7F = 0x7F
    // MSB bits[13:7] of 0xFFFF are all 1 → sign flag satisfied per NOTE 12
    expect(encodeParamValue(-1)).toEqual({ lsb: 0x7F, msb: 0x7F });
  });

  it('encodes -99', () => {
    // -99 in 32-bit = 0xFFFFFF9D
    // lsb = 0x9D & 0x7F = 0x1D; msb = (-99 >> 7) & 0x7F = 0x7F
    expect(encodeParamValue(-99)).toEqual({ lsb: 0x1D, msb: 0x7F });
  });

  it('round-trips via buildParamChange without bit errors', () => {
    const { lsb, msb } = encodeParamValue(1);
    const msg = buildParamChange(0x00, 0x00, lsb, msb);
    expect(msg[7]).toBe(lsb);
    expect(msg[8]).toBe(msb);
  });
});

describe('pack7bit', () => {
  it('packs exactly 7 bytes into 8 MIDI bytes per NOTE 1', () => {
    // Input: 7 bytes, each with a distinct bit7 so we can verify the header byte.
    // Bytes: 0x80, 0x00, 0x80, 0x00, 0x80, 0x00, 0x80
    // bit7 values: 1, 0, 1, 0, 1, 0, 1
    // header = (1<<0)|(0<<1)|(1<<2)|(0<<3)|(1<<4)|(0<<5)|(1<<6) = 0b1010101 = 0x55
    const input = new Uint8Array([0x80, 0x00, 0x80, 0x00, 0x80, 0x00, 0x80]);
    const out = pack7bit(input);
    expect(out.length).toBe(8);
    expect(out[0]).toBe(0x55); // header: bit7s of bytes 0-6
    expect(out[1]).toBe(0x00); // byte 0 lower 7 bits
    expect(out[2]).toBe(0x00); // byte 1
    expect(out[3]).toBe(0x00); // byte 2
    expect(out[7]).toBe(0x00); // byte 6
  });

  it('packs bytes with mixed bit7 and data bits correctly', () => {
    // Input: [0xFF, 0x7F, 0x00, 0x80, 0x01, 0x41, 0xC2]
    // bit7:    1     0     0     1     0     0     1
    // header = 1|(0<<1)|(0<<2)|(1<<3)|(0<<4)|(0<<5)|(1<<6) = 0b1001001 = 0x49
    const input = new Uint8Array([0xFF, 0x7F, 0x00, 0x80, 0x01, 0x41, 0xC2]);
    const out = pack7bit(input);
    expect(out[0]).toBe(0x49);
    expect(out[1]).toBe(0x7F); // 0xFF & 0x7F
    expect(out[2]).toBe(0x7F); // 0x7F & 0x7F
    expect(out[3]).toBe(0x00);
    expect(out[4]).toBe(0x00); // 0x80 & 0x7F
    expect(out[5]).toBe(0x01);
    expect(out[6]).toBe(0x41);
    expect(out[7]).toBe(0x42); // 0xC2 & 0x7F
  });
});

describe('unpack7bit', () => {
  it('round-trips pack7bit → unpack7bit for a 7-byte input', () => {
    const original = new Uint8Array([0xAB, 0xCD, 0xEF, 0x12, 0x34, 0x56, 0x78]);
    const packed = pack7bit(original);
    const unpacked = unpack7bit(packed);
    expect(Array.from(unpacked)).toEqual(Array.from(original));
  });

  it('round-trips for 14 bytes (two groups)', () => {
    const original = new Uint8Array(Array.from({ length: 14 }, (_, i) => (i * 17 + 3) & 0xFF));
    const unpacked = unpack7bit(pack7bit(original));
    expect(Array.from(unpacked.slice(0, 14))).toEqual(Array.from(original));
  });

  it('round-trips for all-zeros', () => {
    const original = new Uint8Array(7);
    expect(Array.from(unpack7bit(pack7bit(original)))).toEqual(Array.from(original));
  });

  it('round-trips for all-0xFF bytes', () => {
    const original = new Uint8Array(7).fill(0xFF);
    expect(Array.from(unpack7bit(pack7bit(original)))).toEqual(Array.from(original));
  });

  it('throws if input length is not a multiple of 8', () => {
    expect(() => unpack7bit(new Uint8Array(7))).toThrow(RangeError);
  });
});

describe('isAck', () => {
  it('returns true for a valid ACK message', () => {
    expect(isAck(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x23, 0xF7]))).toBe(true);
  });

  it('returns false for a NAK message', () => {
    expect(isAck(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x24, 0xF7]))).toBe(false);
  });

  it('returns false for a message with wrong length', () => {
    expect(isAck(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x23]))).toBe(false);
  });

  it('returns false for Active Sensing', () => {
    expect(isAck(new Uint8Array([0xFE]))).toBe(false);
  });
});

describe('isNak', () => {
  it('returns true for a valid NAK message', () => {
    expect(isNak(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x24, 0xF7]))).toBe(true);
  });

  it('returns false for an ACK message', () => {
    expect(isNak(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x23, 0xF7]))).toBe(false);
  });

  it('returns false for a message with wrong length', () => {
    expect(isNak(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x24]))).toBe(false);
  });
});

describe('isActiveSensing', () => {
  it('returns true for 0xFE', () => {
    expect(isActiveSensing(new Uint8Array([0xFE]))).toBe(true);
  });

  it('returns false for other status bytes', () => {
    expect(isActiveSensing(new Uint8Array([0xF0]))).toBe(false);
    expect(isActiveSensing(new Uint8Array([0x90, 0x40, 0x64]))).toBe(false);
  });
});

describe('buildDrumParamChange', () => {
  it('produces correct 11-byte message: F0 42 30 36 53 00 ss pp vv vv F7', () => {
    const msg = buildDrumParamChange(0, 0, 0);
    expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x53, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF7]);
  });

  it('encodes dumpIndex as slot byte (ss)', () => {
    // Kit 1 slot 6: dumpIndex=6
    const msg = buildDrumParamChange(6, 1, 20);
    expect(msg[6]).toBe(0x06); // ss = slot 6
    expect(msg[7]).toBe(0x01); // pp = Inst No.
    expect(msg[8]).toBe(0x14); // valueLsb = 20
    expect(msg[9]).toBe(0x00); // valueMsb
  });

  it('encodes Kit 2 dumpIndex correctly (ss=60+slot)', () => {
    // Kit 2 slot 10: dumpIndex=70 (0x46)
    const msg = buildDrumParamChange(70, 1, 175);
    expect(msg[6]).toBe(0x46); // ss = 70
    expect(msg[7]).toBe(0x01); // pp = Inst No.
    expect(msg[8]).toBe(0x2F); // valueLsb = 175 & 0x7F = 47
    expect(msg[9]).toBe(0x01); // valueMsb = 175 >> 7 = 1
  });

  it('encodes negative value with sign flag (Pan OFF = -1)', () => {
    const msg = buildDrumParamChange(6, 6, -1);
    expect(msg[8]).toBe(0x7F); // valueLsb
    expect(msg[9]).toBe(0x7F); // valueMsb
  });

  it('matches Snoize-captured Kit 1 Slot 6 Pan=CNT message', () => {
    // Snoize: F0 42 30 36 53 00 06 06 0F 00 F7
    const msg = buildDrumParamChange(6, 6, 15);
    expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x53, 0x00, 0x06, 0x06, 0x0F, 0x00, 0xF7]);
  });

  it('terminates with 0xF7', () => {
    const msg = buildDrumParamChange(0, 0, 0);
    expect(msg[msg.length - 1]).toBe(0xF7);
  });
});

describe('buildCombiWriteRequest', () => {
  it('produces the correct byte sequence with padding byte', () => {
    const msg = buildCombiWriteRequest(42);
    expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x1A, 0x00, 42, 0xF7]);
  });

  it('has padding byte at position 5 and slotIndex at position 6', () => {
    const msg = buildCombiWriteRequest(0);
    expect(msg[4]).toBe(0x1A);
    expect(msg[5]).toBe(0x00);
    expect(msg[6]).toBe(0);
    expect(msg[7]).toBe(0xF7);
  });

  it('masks slotIndex to 7 bits', () => {
    const msg = buildCombiWriteRequest(0xFF);
    expect(msg[6]).toBe(0x7F);
  });
});

describe('encodeCombiToBytes / buildSingleCombiDump — round-trip', () => {
  const msgs = loadSyx(BANK_B_PATH);
  const snap = parseSnapshot(msgs);

  it('buildSingleCombiDump starts with correct header and Func=49, no padding byte', () => {
    const msg = buildSingleCombiDump(snap.combis[0]);
    expect(msg[0]).toBe(0xF0);
    expect(msg[1]).toBe(0x42);
    expect(msg[2]).toBe(0x30);
    expect(msg[3]).toBe(0x36);
    expect(msg[4]).toBe(0x49);
    expect(msg[msg.length - 1]).toBe(0xF7);
  });

  it('round-trips combi 0 through parseCombi(encodeCombiToBytes(...))', () => {
    const original = snap.combis[0];
    const reencoded = encodeCombiToBytes(original);
    const reparsed = parseCombi(reencoded);
    expect(reparsed).toEqual(original);
  });

  it('round-trips all 100 Factory Bank B combis through parseCombi(encodeCombiToBytes(...))', () => {
    for (let i = 0; i < 100; i++) {
      const original = snap.combis[i];
      const reencoded = encodeCombiToBytes(original);
      const reparsed = parseCombi(reencoded);
      expect(reparsed).toEqual(original);
    }
  });

  it('round-trips combi 0 through buildSingleCombiDump + parseSnapshot (Func=49)', () => {
    const original = snap.combis[0];
    const msg = buildSingleCombiDump(original);
    const reparsed = parseSnapshot([msg]);
    expect(reparsed.combis[0]).toEqual(original);
    expect(reparsed.sources.combis).toBe('0x49');
  });

  it('always writes 0x30 for the fixed bits 4,5 of byte t+10 on every timbre', () => {
    const bytes = encodeCombiToBytes(snap.combis[0]);
    for (let n = 0; n < 8; n++) {
      const t = 40 + 12 * n;
      expect(bytes[t + 10] & 0x30).toBe(0x30);
    }
  });
});

// Effect 1/2 On/Off ("Write In Place" bug): eff1Switch/eff2Switch (the live
// PC 157/158 toggle) and the dump's Effect I/O byte L/R channel-enable bits
// were previously modeled as two unrelated features — the Switch was
// session-only and never reached the dump, so any dump-based write (Write In
// Place, Write Request) silently reverted the on-device Effect 1/2 On/Off
// state to whatever it was when the combi/program was loaded. Confirmed via
// real captured data (the factory bank plus banks from a private archive,
// zero cases of eff{n}IoL != eff{n}IoR) that the front panel's single
// per-effect On/Off switch drives both channel bits together — see
// decodeEffects'/encodeEffects' own comments.
// Hardware-captured 2026-09-29 after a previously-used internet copy of the
// factory bank (private archive) was found to diverge from real factory
// content on Program #82 "VeloFlugel" and #97 "SopranoVox" — see
// src/index.html's FACTORY_SOUNDS_SYX_BASE64 comment.
describe('Effect 1/2 On/Off — dump round-trip (Write In Place bug)', () => {
  const FACTORY_PATH = resolve(process.cwd(), 'reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx');
  const factorySnap = parseSnapshot(loadSyx(FACTORY_PATH));

  it('decodes A02 StereoKeys as Effect 1 Off / Effect 2 On, matching the device front panel', () => {
    const stereoKeys = factorySnap.combis.find(c => c.name === 'StereoKeys');
    expect(stereoKeys.effects.eff1Switch).toBe(0);
    expect(stereoKeys.effects.eff2Switch).toBe(1);
  });

  it('decodes A04 AnalogKing as both Effect 1 and Effect 2 On', () => {
    const analogKing = factorySnap.combis.find(c => c.name === 'AnalogKing');
    expect(analogKing.effects.eff1Switch).toBe(1);
    expect(analogKing.effects.eff2Switch).toBe(1);
  });

  it('no combi or program in the factory bank ever has eff1IoL != eff1IoR or eff2IoL != eff2IoR', () => {
    const allEffects = [
      ...factorySnap.combis.map(c => c.effects),
      ...factorySnap.programs.map(p => p.effects),
    ];
    for (const fx of allEffects) {
      expect(fx.eff1IoL).toBe(fx.eff1IoR);
      expect(fx.eff2IoL).toBe(fx.eff2IoR);
    }
  });

  it('toggling eff1Switch/eff2Switch and re-encoding changes the dump — the actual Write In Place bug', () => {
    const stereoKeys = factorySnap.combis.find(c => c.name === 'StereoKeys');
    // Simulate the user flipping both switches in the editor before hitting
    // "Write In Place" (eff1: Off->On, eff2: On->Off).
    const edited = {
      ...stereoKeys,
      effects: { ...stereoKeys.effects, eff1Switch: 1, eff2Switch: 0 },
    };
    const reencoded = encodeCombiToBytes(edited);
    const reparsed = parseCombi(reencoded);
    // Before the fix, encodeEffects ignored eff1Switch/eff2Switch entirely
    // and rebuilt the I/O byte from the stale eff1IoL/eff1IoR/eff2IoL/eff2IoR
    // fields captured at load time — so the write would have silently
    // reverted to the original Off/On state instead of carrying the edit.
    expect(reparsed.effects.eff1Switch).toBe(1);
    expect(reparsed.effects.eff2Switch).toBe(0);
    expect(reparsed.effects.eff1IoL).toBe(1);
    expect(reparsed.effects.eff1IoR).toBe(1);
    expect(reparsed.effects.eff2IoL).toBe(0);
    expect(reparsed.effects.eff2IoR).toBe(0);
  });

  it('encodeEffects sets both L and R channel-enable bits together from a single Switch value', () => {
    const analogKing = factorySnap.combis.find(c => c.name === 'AnalogKing');
    const bothOff = {
      ...analogKing,
      effects: { ...analogKing.effects, eff1Switch: 0, eff2Switch: 0 },
    };
    const reparsed = parseCombi(encodeCombiToBytes(bothOff));
    expect(reparsed.effects.io & 0x0F).toBe(0); // all 4 channel-enable bits clear
    expect(reparsed.effects.eff1Switch).toBe(0);
    expect(reparsed.effects.eff2Switch).toBe(0);
  });
});

describe('buildDumpRequest', () => {
  it('produces the correct 7-byte message for All Data request (0x0F)', () => {
    const msg = buildDumpRequest(0x0F);
    expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x0F, 0x00, 0xF7]);
  });

  it('produces the correct 7-byte message for Program Dump request (0x10)', () => {
    const msg = buildDumpRequest(0x10);
    expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x10, 0x00, 0xF7]);
    expect(msg[4]).toBe(0x10);
    expect(msg[5]).toBe(0x00);
    expect(msg[6]).toBe(0xF7);
  });

  it('uses the supplied func code in the correct position', () => {
    const msg = buildDumpRequest(0x1C);
    expect(msg[4]).toBe(0x1C);
  });

  it('buildDumpRequest without padding omits the 00 byte', () => {
  const msg = buildDumpRequest(0x10, false);
  expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x10, 0xF7]);
  });

  // Brief #17 §2.2 — Func=06 (Multi Effects) and Func=33 (Multi Expansion)
  // dump requests both require a trailing 00 byte before F7; an earlier ad hoc
  // test omitted it and the device returned Func=0x26 (Received Data Format
  // Error). Confirms buildDumpRequest's default `withPadding=true` already
  // produces the correct wire format for both — no code change needed, just
  // this explicit regression test (02_sysex_format.md items 6 and 7).
  it('produces the correct padded message for Multi Effects Dump Request (0x06)', () => {
    const msg = buildDumpRequest(0x06);
    expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x06, 0x00, 0xF7]);
  });

  it('produces the correct padded message for Multi Expansion Dump Request (0x33)', () => {
    const msg = buildDumpRequest(0x33);
    expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x33, 0x00, 0xF7]);
  });
});

describe('encodeProgramNoParam / decodeProgramNoParam', () => {
  it('encodes Off as 0', () => {
    expect(encodeProgramNoParam(false, false, 42)).toBe(0);
  });

  it('encodes Bank A as programNo + 1', () => {
    expect(encodeProgramNoParam(true, false, 0)).toBe(1);
    expect(encodeProgramNoParam(true, false, 99)).toBe(100);
  });

  it('encodes Bank G as programNo + 101', () => {
    expect(encodeProgramNoParam(true, true, 0)).toBe(101);
    expect(encodeProgramNoParam(true, true, 135)).toBe(236);
  });

  it('decodes 0 as Off with programNo null (transient decode only)', () => {
    expect(decodeProgramNoParam(0)).toEqual({ enabled: false, bankG: false, programNo: null });
  });

  it('decodes 1 as A00 and 100 as A99', () => {
    expect(decodeProgramNoParam(1)).toEqual({ enabled: true, bankG: false, programNo: 0 });
    expect(decodeProgramNoParam(100)).toEqual({ enabled: true, bankG: false, programNo: 99 });
  });

  it('decodes 101 as G01 and 236 as G136', () => {
    expect(decodeProgramNoParam(101)).toEqual({ enabled: true, bankG: true, programNo: 0 });
    expect(decodeProgramNoParam(236)).toEqual({ enabled: true, bankG: true, programNo: 135 });
  });

  it('throws on an out-of-range value', () => {
    expect(() => decodeProgramNoParam(237)).toThrow();
  });
});

describe('SEND_PRG_RAW', () => {
  it('is the PRG sentinel nibble value (10 / 0x0A)', () => {
    expect(SEND_PRG_RAW).toBe(0x0A);
  });
});

describe('multiParamNo / MULTI_PARAM_BASE (TABLE 9)', () => {
  it('matches every base number cross-checked against front-panel capture for Track 1 (n=0)', () => {
    expect(multiParamNo('outputLevel', 0)).toBe(16);
    expect(multiParamNo('pan', 0)).toBe(32);
    expect(multiParamNo('sendC', 0)).toBe(48);
    expect(multiParamNo('sendD', 0)).toBe(64);
    expect(multiParamNo('transpose', 0)).toBe(80);
    expect(multiParamNo('detune', 0)).toBe(96);
    expect(multiParamNo('bendRange', 0)).toBe(112);
    expect(multiParamNo('filterProgramChange', 0)).toBe(128);
  });

  it('adds the track index n to the field base', () => {
    expect(multiParamNo('outputLevel', 15)).toBe(31);
    expect(multiParamNo('pan', 9)).toBe(41);
  });

  it('throws for a track index out of range', () => {
    expect(() => multiParamNo('outputLevel', -1)).toThrow();
    expect(() => multiParamNo('outputLevel', 16)).toThrow();
  });

  it('throws for a field with no live Parameter Change path (e.g. programNo)', () => {
    expect(() => multiParamNo('programNo', 0)).toThrow();
  });

  it('MULTI_PARAM_BASE deliberately excludes programNo', () => {
    expect(MULTI_PARAM_BASE.programNo).toBeUndefined();
  });
});

describe('MULTI_EFFECTS_OFFSET', () => {
  it('is -11, confirmed via two independent hardware captures', () => {
    expect(MULTI_EFFECTS_OFFSET).toBe(-11);
    // Effect 1 Parameter 1: Program 168 -> Multi 157
    expect(168 + MULTI_EFFECTS_OFFSET).toBe(157);
    // Effect 2 Parameter 1: Program 179 -> Multi 168
    expect(179 + MULTI_EFFECTS_OFFSET).toBe(168);
  });
});

describe('Multi Setup — encode/decode round-trip (real captured data)', () => {
  const FACTORY_PATH = resolve(process.cwd(), 'reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx');
  const FACTORY_MULTI_PATH = resolve(process.cwd(), 'reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (Multi Expansion).syx');
  const msgs = [...loadSyx(FACTORY_PATH), ...loadSyx(FACTORY_MULTI_PATH)];
  const snap = parseSnapshot(msgs);

  it('round-trips the captured Multi Effects block through encodeMultiEffectsToBytes/parseMultiEffects', () => {
    const original = snap.multi.effects;
    const reencoded = encodeMultiEffectsToBytes(original);
    expect(reencoded).toHaveLength(29);
    expect(parseMultiEffects(reencoded)).toEqual(original);
  });

  it('round-trips the captured 16 Tracks through encodeMultiTracksToBytes/parseMultiTracks', () => {
    const original = snap.multi.tracks;
    const reencoded = encodeMultiTracksToBytes(original);
    expect(reencoded).toHaveLength(208);
    expect(parseMultiTracks(reencoded)).toEqual(original);
  });

  it('encodeMulti produces both payloads matching the individual encoders', () => {
    const { effectsBytes, expansionBytes } = encodeMulti(snap.multi);
    expect(effectsBytes).toEqual(encodeMultiEffectsToBytes(snap.multi.effects));
    expect(expansionBytes).toEqual(encodeMultiTracksToBytes(snap.multi.tracks));
  });

  it('buildMultiEffectsDump: Func=55 with a 0x00 padding byte before the packed payload', () => {
    const msg = buildMultiEffectsDump(snap.multi.effects);
    expect(msg[4]).toBe(0x55);
    expect(msg[5]).toBe(0x00);
    // header(4) + func(1) + 00(1) + packedLength(29)=34 + F7(1) = 41
    expect(msg.length).toBe(41);
    expect(msg[msg.length - 1]).toBe(0xF7);
  });

  it('buildMultiEffectsDump round-trips through parseSnapshot (Func=55)', () => {
    const msg = buildMultiEffectsDump(snap.multi.effects);
    const reparsed = parseSnapshot([msg]);
    expect(reparsed.multi.effects).toEqual(snap.multi.effects);
    expect(reparsed.sources.multi).toBe('0x55');
  });

  it('buildMultiExpansionDump: Func=68 with NO padding byte before the packed payload', () => {
    const msg = buildMultiExpansionDump(snap.multi.tracks);
    expect(msg[4]).toBe(0x68);
    // header(4) + func(1) + packedLength(208)=238 + F7(1) = 244 — matches the
    // real captured Func=0x68 message length exactly (no extra 0x00 byte).
    expect(msg.length).toBe(244);
    expect(msg[msg.length - 1]).toBe(0xF7);
  });

  it('buildMultiExpansionDump round-trips through parseSnapshot (Func=68)', () => {
    const msg = buildMultiExpansionDump(snap.multi.tracks);
    const reparsed = parseSnapshot([msg]);
    expect(reparsed.multi.tracks).toEqual(snap.multi.tracks);
    expect(reparsed.sources.multi).toBe('0x68');
  });
});

describe('Global — hardware-captured wire fixtures (Brief #23 §2.1)', () => {
  // Captured live from the device this session (Global MIDI Channel 1). The
  // middle two are the load-bearing tests for the ±99 User Scale range
  // correction (Landmine #56) — a bug that silently clamps or wraps at ±50
  // must fail these.
  const FIXTURES = {
    baseline: hexToBytes(
      'F0 42 30 36 51 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 02 02 00 0A 00 00 00 00 00 00 F7'
    ),
    userScaleCPlus60: hexToBytes(
      'F0 42 30 36 51 00 00 00 00 00 00 00 00 00 00 3C 00 00 00 00 00 00 00 00 00 00 00 00 02 02 00 0A 00 00 00 00 00 00 F7'
    ),
    userScaleCSharpMinus99: hexToBytes(
      'F0 42 30 36 51 00 00 00 00 00 00 00 00 00 02 00 1D 00 00 00 00 00 00 00 00 00 00 00 02 02 00 0A 00 00 00 00 00 00 F7'
    ),
  };

  it('baseline decodes to all-default GlobalSettings', () => {
    const snap = parseSnapshot([FIXTURES.baseline]);
    expect(snap.global).toEqual({
      masterTune: 0,
      keyTranspose: 0,
      mainScaleType: 0,
      mainScaleKey: 0,
      userScale: new Array(12).fill(0),
      velocityCurve: 2,
      afterTouchCurve: 2,
      subScaleType: 10,
      subScaleKey: 0,
    });
  });

  it('User Scale Note C (+60) decodes correctly, all else matching baseline', () => {
    const snap = parseSnapshot([FIXTURES.userScaleCPlus60]);
    expect(snap.global.userScale[0]).toBe(60);
    expect(snap.global).toEqual({ ...parseSnapshot([FIXTURES.baseline]).global, userScale: snap.global.userScale });
  });

  it('User Scale Note C# (-99) decodes correctly — the ±99 boundary, not ±50', () => {
    const snap = parseSnapshot([FIXTURES.userScaleCSharpMinus99]);
    expect(snap.global.userScale[1]).toBe(-99);
    expect(snap.global).toEqual({ ...parseSnapshot([FIXTURES.baseline]).global, userScale: snap.global.userScale });
  });

  for (const [name, fixture] of Object.entries(FIXTURES)) {
    it(`buildGlobalDump round-trips the "${name}" fixture byte-for-byte`, () => {
      const settings = parseSnapshot([fixture]).global;
      const rebuilt = buildGlobalDump(settings);
      expect(rebuilt).toEqual(fixture);
    });
  }

  it('buildGlobalDump: single 0x00 padding byte before the packed payload, no trailing padding', () => {
    const settings = parseSnapshot([FIXTURES.baseline]).global;
    const msg = buildGlobalDump(settings);
    expect(msg[4]).toBe(0x51);
    expect(msg[5]).toBe(0x00);
    // header(4) + func(1) + 00(1) + packedLength(28)=32 + F7(1) = 39
    expect(msg.length).toBe(39);
    expect(msg[msg.length - 1]).toBe(0xF7);
  });

  it('encodeGlobalToBytes/parseGlobal round-trip an arbitrary in-range GlobalSettings', () => {
    const settings = {
      masterTune: -50,
      keyTranspose: 12,
      mainScaleType: 5,
      mainScaleKey: 7,
      userScale: [99, -99, 0, 1, -1, 50, -50, 99, -99, 0, 1, -1],
      velocityCurve: 7,
      afterTouchCurve: 0,
      subScaleType: 10,
      subScaleKey: 11,
    };
    expect(parseGlobal(encodeGlobalToBytes(settings))).toEqual(settings);
  });
});

describe('Drums Data Dump (Func=52, TABLE 6)', () => {
  // Arbitrary but in-range 2-kit fixture — one note per kit exercises every
  // field, matching this file's existing "arbitrary in-range" pattern for
  // Global above (no captured hardware .syx fixture needed for a pure
  // encode/decode round-trip check).
  const kits = [
    { notes: Array.from({ length: 60 }, (_, n) => ({
        enabled: n === 0, instNo: n === 0 ? 5 : 0, key: 36 + n, pan: 16,
        exclusiveAssign: 3, tune: -50, level: 99, decay: -99, sendC: 9, sendD: 0,
      })) },
    { notes: Array.from({ length: 60 }, (_, n) => ({
        enabled: n === 1, instNo: n === 1 ? 12 : 0, key: 38 + n, pan: 0,
        exclusiveAssign: 0, tune: 50, level: 0, decay: 99, sendC: 0, sendD: 15,
      })) },
  ];

  it('encodeDrumsToBytes/parseDrums round-trip an arbitrary in-range 2-kit fixture', () => {
    expect(parseDrums(encodeDrumsToBytes(kits))).toEqual(kits);
  });

  it('a disabled note (enabled:false) always round-trips instNo as 0, regardless of the value written', () => {
    // Byte-level encoding: instRaw = enabled ? instNo+1 : 0 — instNo has no
    // wire representation at all while disabled (parseDrums.instNo above 0
    // only reflects instRaw>0). A disabled note carrying a stale instNo
    // must not silently reappear as a real value after a round trip.
    const withStaleInstNo = [
      { notes: [{ enabled: false, instNo: 40, key: 36, pan: 0, exclusiveAssign: 0, tune: 0, level: 0, decay: 0, sendC: 0, sendD: 0 }, ...Array(59).fill({ enabled: false, instNo: 0, key: 0, pan: 0, exclusiveAssign: 0, tune: 0, level: 0, decay: 0, sendC: 0, sendD: 0 })] },
      { notes: Array(60).fill({ enabled: false, instNo: 0, key: 0, pan: 0, exclusiveAssign: 0, tune: 0, level: 0, decay: 0, sendC: 0, sendD: 0 }) },
    ];
    const result = parseDrums(encodeDrumsToBytes(withStaleInstNo));
    expect(result[0].notes[0].instNo).toBe(0);
  });

  it('buildDrumsDump: single 0x00 padding byte before the packed payload, no trailing padding', () => {
    const msg = buildDrumsDump(kits);
    expect(msg[4]).toBe(0x52);
    expect(msg[5]).toBe(0x00);
    // header(4) + func(1) + 00(1) + packedLength(840)=960 + F7(1) = 967
    expect(msg.length).toBe(967);
    expect(msg[msg.length - 1]).toBe(0xF7);
  });

  it('buildDrumsDump/parseDrums round-trip through the full wire format (header, padding, 7-bit packing, F7)', () => {
    const msg = buildDrumsDump(kits);
    const raw = unpack7bit(msg.slice(6, -1));
    expect(parseDrums(raw.slice(0, 840))).toEqual(kits);
  });
});
