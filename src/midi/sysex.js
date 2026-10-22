// Korg X5DR SysEx helpers — pure functions, no DOM or Web MIDI dependencies.

import { encodeEffectParams, encodeEffectBalance } from './effectLayout.js';

// Header byte `3g`: g = MIDI channel, 0-indexed. The device silently ignores SysEx
// on any other channel (Landmine #57), so every builder uses sysexHeader().
let sysexChannel = 0;

/** Set the MIDI channel (0-15, channel 1 = 0) used by every builder below and by channelled MIDI sends. */
export function setSysexChannel(channel0) {
  sysexChannel = channel0 & 0x0F;
}

/** The current MIDI channel, 0-indexed (0-15). */
export function getSysexChannel() {
  return sysexChannel;
}

/** The current SysEx header: F0 42 3g 36. */
export function sysexHeader() {
  return [0xF0, 0x42, 0x30 | sysexChannel, 0x36];
}

// Channel-1 header for tests only — builders must use sysexHeader() (Landmine #116).
export const SYSEX_HEADER = [0xF0, 0x42, 0x30, 0x36];

/** True if `data` starts with a KORG X5DR SysEx header on *any* channel (F0 42 3g 36). */
function hasX5Header(data) {
  return data[0] === 0xF0 && data[1] === 0x42 && (data[2] & 0xF0) === 0x30 && data[3] === 0x36;
}

/**
 * Build a Mode Change message (Func=4E).
 * @param {number} mode  0=Combi 1=CombiEdit 2=Program 3=ProgEdit 4=Multi 5=Global
 */
export function buildModeChange(mode) {
  return new Uint8Array([...sysexHeader(), 0x4E, mode, 0x00, 0xF7]);
}

/**
 * Build a Parameter Change message (Func=41).
 * Caller is responsible for encoding the parameter number and value (see encodeParamValue).
 */
export function buildParamChange(paramLsb, paramMsb, valueLsb, valueMsb) {
  return new Uint8Array([
    ...sysexHeader(),
    0x41,
    paramLsb, paramMsb,
    valueLsb, valueMsb,
    0xF7,
  ]);
}

/**
 * Encode a signed value per NOTE 12 (14-bit two's complement, -8192..8191).
 * Undefined encodes as 0 — guard param numbers in loops (Landmine #20).
 * @returns {{ lsb: number, msb: number }}
 */
export function encodeParamValue(value) {
  return {
    lsb: value & 0x7F,
    msb: (value >> 7) & 0x7F,
  };
}

/**
 * Pack 8-bit bytes into 7-bit MIDI bytes per NOTE 1: each 7 input bytes become
 * a header byte (their MSBs) + 7 data bytes. Pads the last group — trim with
 * packedLength() before sending (Landmine #23).
 */
export function pack7bit(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const groups = Math.ceil(input.length / 7);
  const out = new Uint8Array(groups * 8);
  let outIdx = 0;

  for (let g = 0; g < groups; g++) {
    const base = g * 7;
    const count = Math.min(7, input.length - base);

    // Header byte: bit i (from LSB) = bit7 of input[base + i]
    let header = 0;
    for (let i = 0; i < count; i++) {
      header |= ((input[base + i] >> 7) & 1) << i;
    }
    out[outIdx++] = header;

    // Data bytes: lower 7 bits of each input byte
    for (let i = 0; i < count; i++) {
      out[outIdx++] = input[base + i] & 0x7F;
    }

    // Pad remaining slots in last partial group
    const pad = 7 - count;
    for (let i = 0; i < pad; i++) {
      out[outIdx++] = 0x00;
    }
  }

  return out;
}

/** Inverse of pack7bit. Input length must be a multiple of 8. */
export function unpack7bit(midiBytes) {
  const input = midiBytes instanceof Uint8Array ? midiBytes : new Uint8Array(midiBytes);
  if (input.length % 8 !== 0) {
    throw new RangeError('unpack7bit: input length must be a multiple of 8');
  }
  const groups = input.length / 8;
  const out = new Uint8Array(groups * 7);
  let outIdx = 0;

  for (let g = 0; g < groups; g++) {
    const base = g * 8;
    const header = input[base];
    for (let i = 0; i < 7; i++) {
      const msb = ((header >> i) & 1) << 7;
      out[outIdx++] = msb | (input[base + 1 + i] & 0x7F);
    }
  }

  return out;
}

/** Program Write Request (Func=11): edit buffer → slot 0–99. Needs the 00 pad byte (Landmine #22). */
export function buildProgramWriteRequest(slotIndex) {
  return new Uint8Array([...sysexHeader(), 0x11, 0x00, slotIndex & 0x7F, 0xF7]);
}

/** Returns true if data is a Write Completed (Func=21) message. */
export function isWriteCompleted(data) {
  return (
    data.length === 6 &&
    hasX5Header(data) &&
    data[4] === 0x21 &&
    data[5] === 0xF7
  );
}

/** Returns true if data is a Write Error (Func=22) message. */
export function isWriteError(data) {
  return (
    data.length === 6 &&
    hasX5Header(data) &&
    data[4] === 0x22 &&
    data[5] === 0xF7
  );
}

/** Wire length of packed data — pack7bit's padding must not be sent (Landmine #23). */
export function packedLength(rawLength) {
  const fullGroups = Math.floor(rawLength / 7);
  const remainder = rawLength % 7;
  return fullGroups * 8 + (remainder > 0 ? 1 + remainder : 0);
}

/** Program Parameter Dump (Func=40) for one program object. */
export function buildSingleProgramDump(programData) {
  const raw = encodeProgramToBytes(programData);
  const packed = pack7bit(raw);
  const trimmed = packed.slice(0, packedLength(raw.length));
  return new Uint8Array([...sysexHeader(), 0x40, ...trimmed, 0xF7]);
}

function u8(v) { return v & 0xFF; }

export function encodeProgramToBytes(p) {
  const b = new Uint8Array(164);

  // Name: bytes 0-9, ASCII, padded with spaces
  const name = (p.name || '').padEnd(10, ' ');
  for (let i = 0; i < 10; i++) b[i] = name.charCodeAt(i) & 0x7F;

  b[10] = p.osc.mode & 0x03;
  b[11] = (p.osc.assign & 0x01) | ((p.osc.hold & 0x01) << 1);

  b[12] = p.osc1.multisound & 0xFF;
  b[13] = (p.osc1.multisound >> 8) & 0x03;
  b[14] = u8(p.osc1.octave);
  b[15] = p.osc2.multisound & 0xFF;
  b[16] = (p.osc2.multisound >> 8) & 0x03;
  b[17] = u8(p.osc2.octave);
  b[18] = u8(p.osc2.interval);
  b[19] = u8(p.osc2.detune);
  b[20] = p.osc2.delayStart;

  // Pitch EG
  b[21] = u8(p.pitchEg.startLevel);
  b[22] = p.pitchEg.attackTime;
  b[23] = u8(p.pitchEg.attackLevel);
  b[24] = p.pitchEg.decayTime;
  b[25] = p.pitchEg.releaseTime;
  b[26] = u8(p.pitchEg.releaseLevel);
  b[27] = u8(p.pitchEg.egIntVelSense);
  b[28] = u8(p.pitchEg.egTimeVelSense);

  // Cutoff MG
  b[29] = (p.cutoffMg.waveForm & 0x07)
        | ((p.cutoffMg.oscSelect & 0x03) << 5)
        | ((p.cutoffMg.keySync & 0x01) << 7);
  b[30] = p.cutoffMg.frequency;
  b[31] = p.cutoffMg.delay;
  b[32] = p.cutoffMg.intensity;

  // After Touch
  b[33] = u8(p.afterTouch.pitchBendRange);
  b[34] = u8(p.afterTouch.vdfCutoff);
  b[35] = p.afterTouch.vdfMgInt;
  b[36] = u8(p.afterTouch.vdaAmplitude);

  // Mod Wheel
  b[37] = u8(p.modWheel.pitchBendRange);
  b[38] = u8(p.modWheel.vdfSweepInt);
  b[39] = p.modWheel.vdfMgInt;

  // OSC-1 block (off=40) and OSC-2 block (off=87)
  encodeOscBlock(b, 40, p.osc1, p.vdf1, p.vda1);
  encodeOscBlock(b, 87, p.osc2, p.vdf2, p.vda2);

  // Pan bytes (stored outside the block structure)
  b[86] = p.osc1.pan == null ? 0xFF : p.osc1.pan;
  b[133] = p.osc2.pan == null ? 0xFF : p.osc2.pan;

  // Byte 134: reserved/unused
  b[134] = 0;

  // Effects (base=135, 29 bytes)
  encodeEffects(b, 135, p.effects);

  return b;
}

function encodeOscBlock(b, off, osc, vdf, vda) {
  // Pitch EG Int + Pitch MG
  b[off + 0] = u8(osc.pitchEGInt);
  b[off + 1] = (osc.pitchMG.waveForm & 0x07) | ((osc.pitchMG.keySync & 0x01) << 7);
  b[off + 2] = osc.pitchMG.frequency;
  b[off + 3] = osc.pitchMG.delay;
  b[off + 4] = osc.pitchMG.fadeIn;
  b[off + 5] = osc.pitchMG.intensity;
  b[off + 6] = u8(osc.pitchMG.freqModByKbdTrk);
  b[off + 7] = osc.pitchMG.intModByAT;
  b[off + 8] = osc.pitchMG.intModByMW;
  b[off + 9] = osc.pitchMG.freqModByATMW;

  // VDF
  b[off + 10] = vdf.cutoff;
  b[off + 11] = vdf.kbdTrackKey;
  b[off + 12] = u8(vdf.cutoffKbdTrack);
  b[off + 13] = vdf.egIntensity;
  b[off + 14] = vdf.egTimeKbdTrack;
  b[off + 15] = vdf.egTimeVelSense;
  b[off + 16] = u8(vdf.egIntVelSense);
  b[off + 17] = vdf.eg.attackTime;
  b[off + 18] = u8(vdf.eg.attackLevel);
  b[off + 19] = vdf.eg.decayTime;
  b[off + 20] = u8(vdf.eg.breakPoint);
  b[off + 21] = vdf.eg.slopeTime;
  b[off + 22] = u8(vdf.eg.sustainLevel);
  b[off + 23] = vdf.eg.releaseTime;
  b[off + 24] = u8(vdf.eg.releaseLevel);

  // Level (shared: osc.level = vda.level)
  b[off + 25] = osc.level;

  // VDA
  b[off + 26] = vda.kbdTrackKey;
  b[off + 27] = u8(vda.kbdTrackInt);
  b[off + 28] = u8(vda.velSense);
  b[off + 29] = vda.egTimeKbdTrack;
  b[off + 30] = vda.egTimeVelSense;
  b[off + 31] = vda.eg.attackTime;
  b[off + 32] = vda.eg.attackLevel;
  b[off + 33] = vda.eg.decayTime;
  b[off + 34] = vda.eg.breakPoint;
  b[off + 35] = vda.eg.slopeTime;
  b[off + 36] = vda.eg.sustainLevel;
  b[off + 37] = vda.eg.releaseTime;

  // VDF EG time mods
  b[off + 38] = vdf.egTimeKbdMod;
  b[off + 39] = vdf.egTimeVelMod;
  // VDA EG time mods
  b[off + 40] = vda.egTimeKbdMod;
  b[off + 41] = vda.egTimeVelMod;

  // Send C/D
  b[off + 42] = ((osc.sendC & 0x0F) << 4) | (osc.sendD & 0x0F);

  // VDF Color
  b[off + 43] = vdf.colorIntensity;
  b[off + 44] = u8(vdf.colorVelSense);

  // Combined KBD Track Mode: VDF bits 0-1, VDA bits 4-5
  b[off + 45] = (vdf.kbdTrackMode & 0x03) | ((vda.kbdTrackMode & 0x03) << 4);
}

// effNParams/effNBalance* are in Parameter Change semantics (see
// decodeEffects); effectLayout.js translates them back to the dump layout.
function encodeEffects(b, base, fx) {
  b[base + 0] = fx.eff1Type;
  b[base + 1] = fx.eff2Type;
  [b[base + 2], b[base + 3]] = encodeEffectBalance(fx.eff1Type, fx.eff1BalanceL, fx.eff1BalanceR);
  [b[base + 4], b[base + 5]] = encodeEffectBalance(fx.eff2Type, fx.eff2BalanceL, fx.eff2BalanceR);
  // Invert pan: PC → dump. PC non-zero: dump = 102 - PC
  b[base + 6] = fx.out3Pan === 0 ? 0 : 102 - fx.out3Pan;
  b[base + 7] = fx.out4Pan === 0 ? 0 : 102 - fx.out4Pan;
  // I/O byte: each Effect On/Off switch drives both its L/R channel bits (Landmine #16).
  const eff1On = fx.eff1Switch ?? 1;
  const eff2On = fx.eff2Switch ?? 1;
  b[base + 8] = (eff1On & 0x01)
              | ((eff1On & 0x01) << 1)
              | ((eff2On & 0x01) << 2)
              | ((eff2On & 0x01) << 3)
              | ((fx.placement & 0x03) << 4);
  const dumpBase = (n) => (fx[`eff${n}DumpType`] === fx[`eff${n}Type`] ? fx[`eff${n}DumpParams`] : null);
  b.set(encodeEffectParams(fx.eff1Type, fx.eff1Params, dumpBase(1)), base + 9);
  b[base + 17] = fx.eff1ModSource;
  b[base + 18] = u8(fx.eff1ModAmount);
  b.set(encodeEffectParams(fx.eff2Type, fx.eff2Params, dumpBase(2)), base + 19);
  b[base + 27] = fx.eff2ModSource;
  b[base + 28] = u8(fx.eff2ModAmount);
}

/** Combination Write Request (Func=1A): edit buffer → slot 0–99. */
export function buildCombiWriteRequest(slotIndex) {
  return new Uint8Array([...sysexHeader(), 0x1A, 0x00, slotIndex & 0x7F, 0xF7]);
}

/** Combination Parameter Dump (Func=49) for one combi object; no pad byte, like Func=40. */
export function buildSingleCombiDump(combiData) {
  const raw = encodeCombiToBytes(combiData);
  const packed = pack7bit(raw);
  const trimmed = packed.slice(0, packedLength(raw.length));
  return new Uint8Array([...sysexHeader(), 0x49, ...trimmed, 0xF7]);
}

/** Encode a Combi to its 136-byte dump layout (TABLE 2). */
export function encodeCombiToBytes(c) {
  const b = new Uint8Array(136);

  const name = (c.name || '').padEnd(10, ' ');
  for (let i = 0; i < 10; i++) b[i] = name.charCodeAt(i) & 0x7F;
  b[10] = 0x00; // reserved

  encodeEffects(b, 11, c.effects);

  for (let n = 0; n < 8; n++) encodeTimbre(b, 40 + 12 * n, c.timbres[n]);

  return b;
}

function encodeTimbre(b, t, timbre) {
  b[t + 0] = u8(timbre.programNo); // raw 8-bit (0-135, Bank A/G); packing happens later
  b[t + 1] = u8(timbre.outputLevel);
  b[t + 2] = u8(timbre.transpose);
  b[t + 3] = u8(timbre.detune);
  b[t + 4] = timbre.pan === 'prg' ? 0x1F : timbre.pan === 'off' ? 0xFF : timbre.pan;
  b[t + 5] = ((timbre.sendC & 0x0F) << 4) | (timbre.sendD & 0x0F);
  b[t + 6] = timbre.keyWindowTop;
  b[t + 7] = timbre.keyWindowBottom;
  b[t + 8] = timbre.velWindowTop;
  b[t + 9] = timbre.velWindowBottom;
  b[t + 10] = (timbre.filters.programChange ? 0x01 : 0)
            | (timbre.filters.damper        ? 0x02 : 0)
            | (timbre.filters.afterTouch    ? 0x04 : 0)
            | (timbre.filters.controlChange ? 0x08 : 0)
            | 0x30                                          // bits 4,5 fixed at 1 per manual
            | (timbre.bankG ? 0x80 : 0);                    // bit 7, not bit 6 (Landmine #35)
  b[t + 11] = (timbre.midiChannel & 0x0F) | (timbre.enabled ? 0 : 0x10);
}

/** Returns true if data is a Data Load Completed (ACK) message. */
export function isAck(data) {
  return (
    data.length === 6 &&
    hasX5Header(data) &&
    data[4] === 0x23 &&
    data[5] === 0xF7
  );
}

/** Returns true if data is a Data Load Error (NAK) message. */
export function isNak(data) {
  return (
    data.length === 6 &&
    hasX5Header(data) &&
    data[4] === 0x24 &&
    data[5] === 0xF7
  );
}

/** Returns true if data is a Received Data Format Error message. */
export function isFormatError(data) {
  return (
    data.length === 6 &&
    hasX5Header(data) &&
    data[4] === 0x26 &&
    data[5] === 0xF7
  );
}

// Program No./Bank/Enabled as one Parameter Change value (Combi TABLE 8, Multi TABLE 9):
// 0 = off; 1-100 = Bank A 0-99; 101-236 = Bank G 0-135. Dump bytes differ (Landmine #45).
export function encodeProgramNoParam(enabled, bankG, programNo) {
  if (!enabled) return 0;
  return bankG ? programNo + 101 : programNo + 1;
}

export function decodeProgramNoParam(value) {
  if (value === 0)   return { enabled: false, bankG: false, programNo: null };
  if (value <= 100)  return { enabled: true,  bankG: false, programNo: value - 1 };
  if (value <= 236)  return { enabled: true,  bankG: true,  programNo: value - 101 };
  throw new Error(`Program No. param out of range: ${value}`);
}

/** Send C/D nibble sentinel meaning "follow Program's own value" (Combi + Multi). */
export const SEND_PRG_RAW = 0x0A;

/** Dump Request. Most take a trailing 00 pad (Landmine #47); Func=10 does not (Landmine #5). */
export function buildDumpRequest(funcCode, withPadding = true) {
  return withPadding
    ? new Uint8Array([...sysexHeader(), funcCode, 0x00, 0xF7])
    : new Uint8Array([...sysexHeader(), funcCode, 0xF7]);
}

// Byte length of each dump the device sends back for a dump request; sizes
// the editor's request watchdog (Archive #194). factoryBanks.test.js checks
// these against the encoder and the hardware captures.
export const DUMP_REPLY_BYTES = {
  program: 194,       // Func=40
  allPrograms: 18750, // Func=4C
  combi: 162,         // Func=49
  allCombis: 15550,   // Func=4D
  multiEffects: 41,   // Func=55
  multiTracks: 244,   // Func=68
  drums: 967,         // Func=52
  global: 39,         // Func=51
  allData: 35318,     // Func=50
};

/** Returns true if data is an Active Sensing message (0xFE). */
export function isActiveSensing(data) {
  return data[0] === 0xFE;
}

/**
 * Build a Drum Kit Parameter Change message (Func=53).
 * Wire format: F0 42 3g 36 53 00 ss pp vv vv F7
 * @param {number} dumpIndex  0–59 (Kit 1) or 60–119 (Kit 2)
 * @param {number} paramNo    TABLE 10 parameter number (0–9)
 * @param {number} value      Signed value (NOTE 12 encoded)
 */
export function buildDrumParamChange(dumpIndex, paramNo, value) {
  const { lsb: valueLsb, msb: valueMsb } = encodeParamValue(value);
  return new Uint8Array([
    ...sysexHeader(),
    0x53,
    0x00,
    dumpIndex & 0x7F,
    paramNo & 0x7F,
    valueLsb, valueMsb,
    0xF7,
  ]);
}

// ─── Multi Setup (TABLE 3/4/9) ───────────────────────────────────────────────
// Two separate dumps: Func=55 = Effects (29 bytes, same block as Program/Combi);
// Func=68 = 16 Tracks (12 bytes each, Combi Timbre layout, Landmine #49) + 16
// Pitch Bend Range bytes at 192+n. All Data (Func=50) never carries Func=68 (Landmine #53).

const MULTI_TRACK_COUNT = 16;

/** Parameter Change addressing (TABLE 9). n = 0-15 (Track 1-16). */
export const MULTI_PARAM_BASE = {
  outputLevel:         16,
  pan:                 32,
  sendC:               48,
  sendD:               64,
  transpose:           80,
  detune:              96,
  bendRange:           112,
  filterProgramChange: 128,
};

/** Multi Parameter Change number (TABLE 9). programNo (base 0) goes through encodeProgramNoParam. */
export function multiParamNo(field, n) {
  if (n < 0 || n > 15) throw new Error(`Track index out of range: ${n}`);
  const base = MULTI_PARAM_BASE[field];
  if (base === undefined) throw new Error(`Field has no live Parameter Change path: ${field}`);
  return base + n;
}

/** Multi's Effects Parameter Change offset relative to Program's (TABLE 7-1); hardware-confirmed. */
export const MULTI_EFFECTS_OFFSET = -11;

/** Encode a MultiSetup's Effects object to the 29-byte TABLE 3 layout. */
export function encodeMultiEffectsToBytes(effects) {
  const b = new Uint8Array(29);
  encodeEffects(b, 0, effects);
  return b;
}

/** Encode a MultiSetup's 16 Tracks to the 208-byte TABLE 4 expansion layout. */
export function encodeMultiTracksToBytes(tracks) {
  const b = new Uint8Array(208);
  for (let n = 0; n < MULTI_TRACK_COUNT; n++) {
    encodeTimbre(b, 12 * n, tracks[n]);
    b[192 + n] = u8(tracks[n].bendRange);
  }
  return b;
}

/** Encode a MultiSetup ({ effects, tracks }) to its two dump payloads. */
export function encodeMulti(multi) {
  return {
    effectsBytes:   encodeMultiEffectsToBytes(multi.effects),
    expansionBytes: encodeMultiTracksToBytes(multi.tracks),
  };
}

/** Multi Setup Data Dump (Func=55), Effects only. Takes a 00 pad byte, unlike Func=68. */
export function buildMultiEffectsDump(effects) {
  const raw = encodeMultiEffectsToBytes(effects);
  const packed = pack7bit(raw);
  const trimmed = packed.slice(0, packedLength(raw.length));
  return new Uint8Array([...sysexHeader(), 0x55, 0x00, ...trimmed, 0xF7]);
}

/** Multi Setup Expansion Dump (Func=68), 16 Tracks. No pad byte (hardware-confirmed). */
export function buildMultiExpansionDump(tracks) {
  const raw = encodeMultiTracksToBytes(tracks);
  const packed = pack7bit(raw);
  const trimmed = packed.slice(0, packedLength(raw.length));
  return new Uint8Array([...sysexHeader(), 0x68, ...trimmed, 0xF7]);
}

// ─── Global (TABLE 5) ────────────────────────────────────────────────────────
// Dump-only: no Parameter Change table exists (Landmine #55).

/** Encode a GlobalSettings object to TABLE 5's 28-byte raw dump layout. */
export function encodeGlobalToBytes(g) {
  const b = new Uint8Array(28);
  b[0] = u8(g.masterTune);
  b[1] = u8(g.keyTranspose);
  b[5] = g.mainScaleType;
  b[6] = g.mainScaleKey;
  for (let i = 0; i < 12; i++) b[7 + i] = u8(g.userScale[i]);
  b[19] = g.velocityCurve;
  b[20] = g.afterTouchCurve;
  b[21] = g.subScaleType;
  b[22] = g.subScaleKey;
  return b;
}

/** Global Data Dump (Func=51). 00 pad byte; 28 raw bytes pack to exactly 32. */
export function buildGlobalDump(settings) {
  const raw = encodeGlobalToBytes(settings);
  const packed = pack7bit(raw);
  const trimmed = packed.slice(0, packedLength(raw.length));
  return new Uint8Array([...sysexHeader(), 0x51, 0x00, ...trimmed, 0xF7]);
}

// ─── Drums (TABLE 6) ─────────────────────────────────────────────────────────
// No edit buffer: Func=53 and Func=52 write straight to device memory (Landmine #58).

/**
 * Encode 2 Drum Kits (60 notes each) to TABLE 6's 840-byte raw dump layout.
 * No null-kits fallback here; encoder.js wraps it with one for All Data.
 */
export function encodeDrumsToBytes(kits) {
  const b = new Uint8Array(840);
  for (let kit = 0; kit < 2; kit++) {
    for (let n = 0; n < 60; n++) {
      const note = kits[kit].notes[n];
      const base = (kit * 60 + n) * 7;
      b[base + 0] = note.enabled ? note.instNo + 1 : 0;
      b[base + 1] = note.key;
      b[base + 2] = ((note.exclusiveAssign & 0x07) << 5) | (note.pan & 0x1F);
      b[base + 3] = u8(note.tune);
      b[base + 4] = u8(note.level);
      b[base + 5] = u8(note.decay);
      b[base + 6] = ((note.sendC & 0x0F) << 4) | (note.sendD & 0x0F);
    }
  }
  return b;
}

/** Drums Data Dump (Func=52). 00 pad byte, like Func=51 (manual §20). */
export function buildDrumsDump(kits) {
  const raw = encodeDrumsToBytes(kits);
  const packed = pack7bit(raw);
  const trimmed = packed.slice(0, packedLength(raw.length));
  return new Uint8Array([...sysexHeader(), 0x52, 0x00, ...trimmed, 0xF7]);
}

/**
 * "Panic" for the header's All Notes Off button: on every channel 1-16, Damper
 * Off (CC 64 = 0), All Sound Off (CC 120) and All Notes Off (CC 123). All 16,
 * not the selected channel: Combi timbres and Multi tracks each listen on their
 * own channel. CC 123 is always received; CC 64 and 120 only with Global's
 * Control Filter enabled (01_channel_messages.md §2-1) — ignored otherwise.
 * One flat array of 3-byte messages, ready for a single send().
 */
export function buildAllNotesOff() {
  const bytes = [];
  for (let ch = 0; ch < 16; ch++) {
    bytes.push(0xB0 | ch, 64, 0, 0xB0 | ch, 120, 0, 0xB0 | ch, 123, 0);
  }
  return new Uint8Array(bytes);
}
