// Korg X5DR dump parser — pure ES module, no DOM or Web MIDI dependencies.
import { unpack7bit } from './sysex.js';
import { decodeEffectParams, decodeEffectBalance } from './effectLayout.js';

// ─── Unpacking ───────────────────────────────────────────────────────────────

// unpack7bit requires multiples of 8; real dumps may have a final partial group
// (e.g. 18743 bytes = 2342×8 + 7). Pad to multiple of 8 before unpacking.
function unpackPayload(payload) {
  const arr = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
  if (arr.length % 8 === 0) return unpack7bit(arr);
  const padded = new Uint8Array(Math.ceil(arr.length / 8) * 8);
  padded.set(arr);
  return unpack7bit(padded);
}

// ─── Signed byte helper ──────────────────────────────────────────────────────

function s8(b) { return b >= 0x80 ? b - 0x100 : b; }

// ─── Per-section raw sizes ───────────────────────────────────────────────────

const SIZE_GLOBAL   = 28;
const SIZE_DRUMS    = 840;   // 2 kits × 60 notes × 7 bytes
const SIZE_ALL_COMBI = 13600; // 100 × 136 bytes
const SIZE_ALL_PROG  = 16400; // 100 × 164 bytes
const SIZE_MULTI_EFFECTS   = 29;  // TABLE 3 (Func=55), also the amount included in the All Data dump
const SIZE_MULTI_EXPANSION = 208; // TABLE 4 (Func=68) — not part of the All Data dump, see NOTE 10
const SIZE_PROGRAM  = 164;
const SIZE_COMBI    = 136;

// ─── OSC block decoder (for the OSC tab) ─────────────────────────────────────
// Returns fields needed by the OSC tab: multisound, level, octave,
// pitchEGInt, pan, sendC, sendD, pitchMG.
// off = byte offset where this OSC's parameter block starts (40=OSC-1, 87=OSC-2).

function decodeOscBlock(b, off, multisound, level, octave, panByte) {
  return {
    multisound,
    level,
    octave,
    pitchEGInt: s8(b[off + 0]),    // byte 40 / 87
    pan:        panByte === 0xFF ? null : panByte,
    sendC:      (b[off + 42] >> 4) & 0x0F, // byte 82 / 129
    sendD:      b[off + 42] & 0x0F,
    pitchMG: {
      waveForm:          b[off + 1] & 0x07,  // byte 41 / 88
      keySync:           (b[off + 1] >> 7) & 1,
      frequency:         b[off + 2],
      delay:             b[off + 3],
      fadeIn:            b[off + 4],
      intensity:         b[off + 5],
      freqModByKbdTrk:   s8(b[off + 6]),
      intModByAT:        b[off + 7],
      intModByMW:        b[off + 8],
      freqModByATMW:     b[off + 9],
    },
  };
}

// ─── VDA block decoder (for the VDA tab) ─────────────────────────────────────
// off = 40 for VDA-1 (OSC-1), 87 for VDA-2 (OSC-2).
// EG time mod bytes are stored as raw packed bytes matching TABLE 1 layout:
//   bit i = SW for stage i (i=0=Attack,1=Decay,2=Slope,3=Release)
//   bit i+4 = Polarity for that stage (0=+, 1=-)
// VDA KBD Track Mode: bits 4,5 of TABLE 1 byte 85/132 (= b[off+45]).

function decodeVdaBlock(b, off, level) {
  return {
    level,                                    // byte 65 / 112
    kbdTrackKey:    b[off + 26],              // byte 66 / 113
    kbdTrackInt:    s8(b[off + 27]),          // byte 67 / 114
    velSense:       s8(b[off + 28]),          // byte 68 / 115
    egTimeKbdTrack: b[off + 29],              // byte 69 / 116
    egTimeVelSense: b[off + 30],              // byte 70 / 117
    eg: {
      attackTime:   b[off + 31],             // byte 71 / 118
      attackLevel:  b[off + 32],             // byte 72 / 119
      decayTime:    b[off + 33],             // byte 73 / 120
      breakPoint:   b[off + 34],             // byte 74 / 121
      slopeTime:    b[off + 35],             // byte 75 / 122
      sustainLevel: b[off + 36],             // byte 76 / 123
      releaseTime:  b[off + 37],             // byte 77 / 124
    },
    // Raw packed EG time mod bytes (TABLE 1 format)
    egTimeKbdMod:  b[off + 40],              // byte 80 / 127
    egTimeVelMod:  b[off + 41],              // byte 81 / 128
    // VDA KBD Track Mode: bits 4,5 of byte 85/132
    kbdTrackMode: (b[off + 45] >> 4) & 0x03,
  };
}

// ─── VDF block decoder (for the VDF tab) ─────────────────────────────────────
// off = 40 for VDF-1 (OSC-1), 87 for VDF-2 (OSC-2).
// VDF KBD Track Mode: bits 0,1 of TABLE 1 byte 85/132.
// Color (timbre) params are flattened into this object.

function decodeVdfBlock(b, off) {
  return {
    cutoff:         b[off + 10],             // byte 50 / 97
    egIntensity:    b[off + 13],             // byte 53 / 100
    colorIntensity: b[off + 43],             // byte 83 / 130
    colorVelSense:  s8(b[off + 44]),         // byte 84 / 131
    kbdTrackKey:    b[off + 11],             // byte 51 / 98
    kbdTrackMode:   b[off + 45] & 0x03,     // byte 85/132 bits 0,1
    cutoffKbdTrack: s8(b[off + 12]),         // byte 52 / 99
    egTimeKbdTrack: b[off + 14],             // byte 54 / 101
    egIntVelSense:  s8(b[off + 16]),         // byte 56 / 103
    egTimeVelSense: b[off + 15],             // byte 55 / 102
    eg: {
      attackTime:   b[off + 17],            // byte 57 / 104
      attackLevel:  s8(b[off + 18]),        // byte 58 / 105
      decayTime:    b[off + 19],            // byte 59 / 106
      breakPoint:   s8(b[off + 20]),        // byte 60 / 107
      slopeTime:    b[off + 21],            // byte 61 / 108
      sustainLevel: s8(b[off + 22]),        // byte 62 / 109
      releaseTime:  b[off + 23],            // byte 63 / 110
      releaseLevel: s8(b[off + 24]),        // byte 64 / 111
    },
    // Raw packed EG time mod bytes (TABLE 1 format)
    egTimeKbdMod:  b[off + 38],             // byte 78 / 125
    egTimeVelMod:  b[off + 39],             // byte 79 / 126
  };
}

// ─── Effects decoder (bytes 135-163, 29 bytes) ───────────────────────────────
// Dump layout (05_effect_parameters.md TABLE *11):
//   +0: Eff1 Type,  +1: Eff2 Type
//   +2: Eff1 Bal L, +3: Eff1 Bal R, +4: Eff2 Bal L, +5: Eff2 Bal R
//   +6: Out3 Pan,   +7: Out4 Pan,   +8: I/O byte (bits 0-3=ch enables, 4-5=placement)
//   +9..+16: Eff1 Params (8),  +17: Eff1 Mod Source, +18: Eff1 Mod Amount
//   +19..+26: Eff2 Params (8), +27: Eff2 Mod Source, +28: Eff2 Mod Amount
//
// effNParams/effNBalance* are translated to Parameter Change semantics via
// effectLayout.js (the dump's per-type byte order and Balance encoding differ
// from the live one). effNDumpParams/effNDumpType keep the raw 8-byte block
// and the type it belongs to, so encodeEffects can preserve bytes the editor
// doesn't model (NUL/reserved) when the type is unchanged.

function decodeEffects(b, base) {
  const io = b[base + 8];
  const eff1Type = b[base + 0];
  const eff2Type = b[base + 1];
  const eff1Raw = Array.from(b.slice(base + 9, base + 17));
  const eff2Raw = Array.from(b.slice(base + 19, base + 27));
  const [eff1BalanceL, eff1BalanceR] = decodeEffectBalance(eff1Type, b[base + 2], b[base + 3]);
  const [eff2BalanceL, eff2BalanceR] = decodeEffectBalance(eff2Type, b[base + 4], b[base + 5]);
  return {
    eff1Type,
    eff2Type,
    eff1BalanceL,
    eff1BalanceR,
    eff2BalanceL,
    eff2BalanceR,
    // Dump encoding is inverted vs Parameter Change: dump 1=R, 101=L; PC 1=L, 101=R.
    // Convert dump → PC so the UI and panLabel are consistent: PC = 102 - dump (non-zero).
    out3Pan:       b[base + 6] === 0 ? 0 : 102 - b[base + 6],
    out4Pan:       b[base + 7] === 0 ? 0 : 102 - b[base + 7],
    io,
    placement:     (io >> 4) & 0x03,
    eff1IoL:       (io >> 0) & 0x01,
    eff1IoR:       (io >> 1) & 0x01,
    eff2IoL:       (io >> 2) & 0x01,
    eff2IoR:       (io >> 3) & 0x01,
    // On/Off switch = the L/R channel bits, which are always equal (Landmine #16).
    eff1Switch:    (io >> 0) & 0x01,
    eff2Switch:    (io >> 2) & 0x01,
    eff1Params:    decodeEffectParams(eff1Type, eff1Raw),
    eff1DumpParams: eff1Raw,
    eff1DumpType:  eff1Type,
    eff1ModSource: b[base + 17],
    eff1ModAmount: s8(b[base + 18]),
    eff2Params:    decodeEffectParams(eff2Type, eff2Raw),
    eff2DumpParams: eff2Raw,
    eff2DumpType:  eff2Type,
    eff2ModSource: b[base + 27],
    eff2ModAmount: s8(b[base + 28]),
  };
}

// ─── parseProgram ────────────────────────────────────────────────────────────
//
// Returns a program object whose top-level keys match the UI's store paths:
//   osc, osc1, osc2   — OSC tab
//   pitchEg           — Pitch EG tab (lowercase 'g')
//   cutoffMg          — VDF Cutoff MG section (lowercase 'g')
//   afterTouch        — Pitch EG After Touch section
//   modWheel          — Pitch EG Pitch Bend/Mod Wheel section
//   vda1, vda2        — VDA tab (vda2 only relevant in Double mode)
//   vdf1, vdf2        — VDF tab (vdf2 only relevant in Double mode)
//   effects           — EFFECT tab

export function parseProgram(bytes164) {
  const b = bytes164 instanceof Uint8Array ? bytes164 : new Uint8Array(bytes164);

  // Name: bytes 0-9, ASCII, trailing spaces trimmed
  let name = '';
  for (let i = 0; i < 10; i++) name += String.fromCharCode(b[i]);
  name = name.trimEnd();

  const osc1Level = b[65];
  const osc2Level = b[112]; // = 65 + 47

  const osc1Multisound = ((b[13] & 0x03) << 8) | b[12];
  const osc2Multisound = ((b[16] & 0x03) << 8) | b[15];

  const osc1 = decodeOscBlock(b, 40, osc1Multisound, osc1Level, s8(b[14]), b[86]);
  const osc2Raw = decodeOscBlock(b, 87, osc2Multisound, osc2Level, s8(b[17]), b[133]);
  const osc2 = {
    ...osc2Raw,
    interval:   s8(b[18]),
    detune:     s8(b[19]),
    delayStart: b[20],
  };

  return {
    name,
    osc: {
      mode:   b[10] & 0x03,
      assign: b[11] & 0x01,
      hold:   (b[11] >> 1) & 0x01,
    },

    osc1,
    osc2,

    // Pitch EG tab — lowercase 'g'; field names match UI reads
    pitchEg: {
      startLevel:     s8(b[21]),
      attackTime:     b[22],
      attackLevel:    s8(b[23]),
      decayTime:      b[24],
      releaseTime:    b[25],
      releaseLevel:   s8(b[26]),
      egIntVelSense:  s8(b[27]),    // TABLE 7 param 9
      egTimeVelSense: s8(b[28]),    // TABLE 7 param 10
    },

    // VDF Cutoff MG section — lowercase 'g'
    cutoffMg: {
      waveForm:   b[29] & 0x07,
      oscSelect:  (b[29] >> 5) & 0x03,   // bits 5,6 → 0=Off,1=OSC-1,2=OSC-2,3=Both
      keySync:    (b[29] >> 7) & 1,
      frequency:  b[30],
      delay:      b[31],
      intensity:  b[32],
    },

    // After Touch section
    afterTouch: {
      pitchBendRange: s8(b[33]),
      vdfCutoff:      s8(b[34]),
      vdfMgInt:       b[35],
      vdaAmplitude:   s8(b[36]),
    },

    // Pitch Bend / Mod Wheel section
    modWheel: {
      pitchBendRange: s8(b[37]),
      vdfSweepInt:    s8(b[38]),
      vdfMgInt:       b[39],
    },

    // VDA tab data
    vda1: decodeVdaBlock(b, 40, osc1Level),
    vda2: decodeVdaBlock(b, 87, osc2Level),

    // VDF tab data
    vdf1: decodeVdfBlock(b, 40),
    vdf2: decodeVdfBlock(b, 87),

    effects: decodeEffects(b, 135),
  };
}

// ─── parseGlobal ─────────────────────────────────────────────────────────────

export function parseGlobal(bytes28) {
  const b = bytes28 instanceof Uint8Array ? bytes28 : new Uint8Array(bytes28);
  const userScale = [];
  for (let i = 0; i < 12; i++) userScale.push(s8(b[7 + i]));
  return {
    masterTune:      s8(b[0]),
    keyTranspose:    s8(b[1]),
    mainScaleType:   b[5],
    mainScaleKey:    b[6],
    userScale,
    velocityCurve:   b[19],
    afterTouchCurve: b[20],
    subScaleType:    b[21],
    subScaleKey:     b[22],
  };
}

// ─── parseDrums ──────────────────────────────────────────────────────────────

export function parseDrums(bytes840) {
  const b = bytes840 instanceof Uint8Array ? bytes840 : new Uint8Array(bytes840);
  const kits = [];
  for (let kit = 0; kit < 2; kit++) {
    const notes = [];
    for (let n = 0; n < 60; n++) {
      const base = (kit * 60 + n) * 7;
      const instRaw = b[base + 0];
      const panExcl = b[base + 2];
      notes.push({
        enabled:         instRaw > 0,
        instNo:          instRaw > 0 ? instRaw - 1 : 0,
        key:             b[base + 1],
        pan:             panExcl & 0x1F,
        exclusiveAssign: (panExcl >> 5) & 0x07,
        tune:            s8(b[base + 3]),
        level:           s8(b[base + 4]),
        decay:           s8(b[base + 5]),
        sendC:           (b[base + 6] >> 4) & 0x0F,
        sendD:           b[base + 6] & 0x0F,
      });
    }
    kits.push({ notes });
  }
  return kits;
}

// ─── parseCombi ──────────────────────────────────────────────────────────────
// Byte layout (TABLE 2, 04_combi_multi_global_drums.md), 136 bytes total:
//   0-9   name (ASCII, trim trailing spaces)
//   10    reserved
//   11-39 effects block (29 bytes) — decodeEffects(b, 11)
//   40-135 8 Timbres x 12 bytes; Timbre n (0-7) starts at t = 40 + 12*n

function decodeTimbre(b, t) {
  const progByte   = b[t + 0];
  const ctrlFilter = b[t + 10];
  const midiCh     = b[t + 11];
  const panByte    = b[t + 4];
  const sendByte   = b[t + 5];

  return {
    programNo: progByte,                          // raw 0-99 (Bank A) or 0-135 (Bank G) - no offset arithmetic on the dump side
    // Bank G flag is bit 7, not bit 6 (Landmine #35).
    bankG:     ((ctrlFilter >> 7) & 0x01) === 1,
    enabled:   ((midiCh >> 4) & 0x01) === 0,       // Timbre SW: bit4=0 -> ON
    outputLevel: b[t + 1],
    transpose:   s8(b[t + 2]),
    detune:      s8(b[t + 3]),
    // Three-state pan: 'prg' | 'off' | 0-30 (ADR-0001).
    pan: panByte === 0x1F ? 'prg' : panByte === 0xFF ? 'off' : panByte,
    // Send C/D: raw nibbles (SEND_PRG_RAW = follow Program).
    sendC: (sendByte >> 4) & 0x0F,
    sendD: sendByte & 0x0F,
    keyWindowTop:    b[t + 6],
    keyWindowBottom: b[t + 7],
    velWindowTop:    b[t + 8],
    velWindowBottom: b[t + 9],
    midiChannel: midiCh & 0x0F,                    // raw 0-15
    filters: {
      programChange: !!(ctrlFilter & 0x01),
      damper:        !!(ctrlFilter & 0x02),
      afterTouch:    !!(ctrlFilter & 0x04),
      controlChange: !!(ctrlFilter & 0x08),
      // bits 4,5 are fixed at 1 per the manual; set on encode, not modeled
    },
  };
}

export function parseCombi(bytes136) {
  const b = bytes136 instanceof Uint8Array ? bytes136 : new Uint8Array(bytes136);
  let name = '';
  for (let i = 0; i < 10; i++) name += String.fromCharCode(b[i]);
  name = name.trimEnd();

  const timbres = [];
  for (let n = 0; n < 8; n++) timbres.push(decodeTimbre(b, 40 + 12 * n));

  return {
    name,
    effects: decodeEffects(b, 11),
    timbres,
  };
}

// ─── parseMulti ──────────────────────────────────────────────────────────────
// Two separate dumps: Func=55 (29-byte Effects) and Func=68 (16 Tracks + 16
// Pitch Bend Range bytes). Tracks use Combi's Timbre layout (Landmine #49).

/** Decode the 29-byte Multi Effects block (Func=55, TABLE 3). */
export function parseMultiEffects(bytes29) {
  const b = bytes29 instanceof Uint8Array ? bytes29 : new Uint8Array(bytes29);
  return decodeEffects(b, 0);
}

/** Decode the 208-byte Multi expansion block (Func=68, TABLE 4) into 16 Tracks. */
export function parseMultiTracks(bytes208) {
  const b = bytes208 instanceof Uint8Array ? bytes208 : new Uint8Array(bytes208);
  const tracks = [];
  for (let n = 0; n < 16; n++) {
    const track = decodeTimbre(b, 12 * n);
    track.bendRange = s8(b[192 + n]);
    tracks.push(track);
  }
  return tracks;
}

/** Combine the two Multi dump payloads; either may be omitted. */
export function parseMulti(effectsBytes29, expansionBytes208) {
  return {
    effects: effectsBytes29 != null ? parseMultiEffects(effectsBytes29) : null,
    tracks: expansionBytes208 != null ? parseMultiTracks(expansionBytes208) : null,
  };
}

// ─── parseSnapshot ───────────────────────────────────────────────────────────

export function parseSnapshot(messages) {
  const snap = {
    programs: null,
    combis:   null,
    global:   null,
    drums:    null,
    multi:    null,
    sources: {
      programs: null,
      combis:   null,
      global:   null,
      drums:    null,
      multi:    null,
    },
  };

  for (const msg of messages) {
    const m = msg instanceof Uint8Array ? msg : new Uint8Array(msg);
    if (m[0] !== 0xF0) continue;
    const func = m[4];

    if (func === 0x50) {
      // All Data: F0 42 3g 36 50 00 [payload] F7
      const raw = unpackPayload(m.slice(6, -1));
      let offset = 0;
      snap.global   = parseGlobal(raw.slice(offset, offset + SIZE_GLOBAL));  offset += SIZE_GLOBAL;
      snap.drums    = parseDrums(raw.slice(offset, offset + SIZE_DRUMS));     offset += SIZE_DRUMS;
      const combisRaw = raw.slice(offset, offset + SIZE_ALL_COMBI);          offset += SIZE_ALL_COMBI;
      snap.combis = [];
      for (let i = 0; i < 100; i++) snap.combis.push(parseCombi(combisRaw.slice(i * SIZE_COMBI, (i+1) * SIZE_COMBI)));
      const progsRaw = raw.slice(offset, offset + SIZE_ALL_PROG);            offset += SIZE_ALL_PROG;
      snap.programs = [];
      for (let i = 0; i < 100; i++) snap.programs.push(parseProgram(progsRaw.slice(i * SIZE_PROGRAM, (i+1) * SIZE_PROGRAM)));
      // All Data only carries Multi's 29-byte Effects block, not the 208-byte
      // expansion (NOTE 10's byte-count formula omits it) — tracks stay null.
      snap.multi = { effects: parseMultiEffects(raw.slice(offset, offset + SIZE_MULTI_EFFECTS)), tracks: null };
      snap.sources.programs = '0x50';
      snap.sources.combis   = '0x50';
      snap.sources.global   = '0x50';
      snap.sources.drums    = '0x50';
      snap.sources.multi    = '0x50';

    } else if (func === 0x4C) {
      // All Program dump: F0 42 3g 36 4C 00 [payload] F7
      const raw = unpackPayload(m.slice(6, -1));
      snap.programs = [];
      for (let i = 0; i < 100; i++) snap.programs.push(parseProgram(raw.slice(i * SIZE_PROGRAM, (i+1) * SIZE_PROGRAM)));
      snap.sources.programs = '0x4C';

    } else if (func === 0x4D) {
      // All Combination dump: F0 42 3g 36 4D 00 [payload] F7
      const raw = unpackPayload(m.slice(6, -1));
      snap.combis = [];
      for (let i = 0; i < 100; i++) snap.combis.push(parseCombi(raw.slice(i * SIZE_COMBI, (i+1) * SIZE_COMBI)));
      snap.sources.combis = '0x4D';

    } else if (func === 0x51) {
      // Global dump: F0 42 3g 36 51 00 [payload] F7
      const raw = unpackPayload(m.slice(6, -1));
      snap.global = parseGlobal(raw.slice(0, SIZE_GLOBAL));
      snap.sources.global = '0x51';

    } else if (func === 0x52) {
      // Drums dump: F0 42 3g 36 52 00 [payload] F7
      const raw = unpackPayload(m.slice(6, -1));
      snap.drums = parseDrums(raw.slice(0, SIZE_DRUMS));
      snap.sources.drums = '0x52';

    } else if (func === 0x40) {
      // Single Program dump (edit buffer): F0 42 3g 36 40 [payload] F7
      const raw = unpackPayload(m.slice(5, -1));
      snap.programs = [parseProgram(raw.slice(0, SIZE_PROGRAM))];
      snap.sources.programs = '0x40';

    } else if (func === 0x49) {
      // Single Combi dump (edit buffer): F0 42 3g 36 49 [payload] F7
      // No padding byte, same wire pattern as Func=0x40.
      const raw = unpackPayload(m.slice(5, -1));
      snap.combis = [parseCombi(raw.slice(0, SIZE_COMBI))];
      snap.sources.combis = '0x49';

    } else if (func === 0x55) {
      // Multi Setup Effects dump: F0 42 3g 36 55 00 [payload] F7
      // Arrives independently of Func=68 — merge into whatever multi state
      // this parseSnapshot call has already built up, never overwrite tracks.
      const raw = unpackPayload(m.slice(6, -1));
      const effects = parseMultiEffects(raw.slice(0, SIZE_MULTI_EFFECTS));
      snap.multi = { effects, tracks: snap.multi?.tracks ?? null };
      snap.sources.multi = snap.sources.multi ? `${snap.sources.multi}+0x55` : '0x55';

    } else if (func === 0x68) {
      // Multi Setup Expansion dump: F0 42 3g 36 68 [payload] F7 — no pad byte, unlike Func=55.
      const raw = unpackPayload(m.slice(5, -1));
      const tracks = parseMultiTracks(raw.slice(0, SIZE_MULTI_EXPANSION));
      snap.multi = { effects: snap.multi?.effects ?? null, tracks };
      snap.sources.multi = snap.sources.multi ? `${snap.sources.multi}+0x68` : '0x68';
    }
  }

  return snap;
}
