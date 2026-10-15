// Effect parameter layout: editor (Parameter Change) order <-> dump byte order.
//
// The editor stores and edits each effect's parameters as a 7-slot array
// indexed by Parameter Change offset (TABLE 7-1 params 168-174 / 179-185),
// which is the order hardware-captured in effect_param_capture_sheet.md and
// encoded in index.html's EFFECT_TYPES. A Program/Combi/Multi dump stores the
// same parameters in a different, per-type 8-byte layout
// (05_effect_parameters.md *11-3), with values over 255 split across a
// (L)/(H) byte pair. This module is the only translation between the two;
// decodeEffects/encodeEffects call it so everything above the MIDI layer sees
// Parameter Change order only.
//
// Dump-side byte positions come from the manual's *11-3 tables, cross-checked
// against real banks (the factory bank plus banks from a private archive) by
// decoding every stored effect and confirming each value falls inside the
// editor's own range — see effectLayout.test.js. Where the manual's (06)/(07) EQ High/Low order varies
// per type, the manual's order is followed; ranges can't distinguish them.

// Slot descriptors (one per editor offset):
//   byte   — dump byte index (0-7)
//   hi     — second byte for a 16-bit little-endian (L)/(H) pair
//   signed — stored as an 8-bit two's-complement value
//   scale  — dump stores value / scale (Chorus/Flanger-Delay Delay Time, 2ms steps)
//   mg     — MG Status byte (*11-3-3): the editor value is bit0 (Sin/Tri) only;
//            bits 1-2 are per-type hardwired constants (`mg` holds them),
//            always rewritten on encode. Live Parameter Change only ever
//            carries 0/1 here (Landmine #90) — the packing is dump-only.
// A layout's optional `fixed` map sets whole constant bytes that have no
// editor slot (type 43's MG Status: bit2 "for Flanger" = 1, no waveform).
// Hardwired values confirmed against every stored instance in those banks.
const u = (byte) => ({ byte });
const s = (byte) => ({ byte, signed: true });
const w = (byte, hi) => ({ byte, hi });
const half = (byte) => ({ byte, scale: 2 });
const mg = (byte, bits) => ({ byte, mg: bits });

const REVERB      = [u(0), u(3), u(4), u(2), s(7), s(6)];          // Hall/Room/Live Stage (1-6)
const PLATE       = [u(3), w(0, 1), u(2), u(4), s(6), s(7)];       // 7-9
const EARLY_REF   = [u(0), u(1), s(7), s(6)];                      // 10-12
const STEREO_DLY  = [w(0, 1), w(4, 5), s(2), u(3), s(7), s(6)];    // 13-14
const DUAL_DLY    = [w(0, 1), s(2), u(3), w(4, 5), s(6), u(7)];    // 15
const MULTI_TAP   = [w(0, 1), w(2, 3), s(4), s(6), s(7)];          // 16-18
const ST_CHORUS_1 = [u(4), u(1), u(0), mg(2, 0b010), s(7), s(6)];  // 19
const ST_CHORUS_2 = [u(4), u(1), u(0), mg(2, 0b000), s(7), s(6)];  // 20
const QUAD_CHORUS = [u(0), u(1), u(2), u(3), s(4), s(6), s(7)];    // 21-22
const HARM_CHORUS = [w(0, 1), w(2, 3), u(4), u(5), u(6)];          // 23
const SYMPHONIC   = [u(0), s(7), s(6)];                            // 24
const FLANGER     = [u(0), u(1), u(2), s(3), s(6), s(7)];          // 25-27
const EXCITER     = [s(0), u(1), s(7), s(6)];                      // 28
const ENHANCER    = [u(0), u(1), u(2), u(3), s(6), s(7)];          // 29
const DISTORTION  = [u(0), u(1), u(2), s(6), s(7), u(3)];          // 30-31
const PHASER_1    = [u(4), u(1), u(0), s(3), mg(2, 0b010)];         // 32
const PHASER_2    = [u(4), u(1), u(0), s(3), mg(2, 0b000)];         // 33
const ROTARY      = [u(0), u(1), u(2), u(3)];                      // 34
const AUTO_PAN    = [mg(2, 0b010), s(3), u(1), u(0), s(7), s(6)];  // 35
const TREMOLO     = [mg(2, 0b000), s(3), u(1), u(0), s(7), s(6)];  // 36
const PARAM_EQ    = [u(0), s(1), u(2), s(3), u(4), u(5), s(6)];    // 37
const CHORUS_DLY  = [u(0), s(3), u(1), u(2), half(4), s(5)];       // 38-39
const DLY_HALL    = [w(0, 1), s(2), u(3), u(4), u(6), u(5)];       // 40
const DLY_ROOM    = [w(0, 1), s(2), u(3), u(4), u(7), u(6)];       // 41
const DLY_CHORUS  = [w(0, 1), s(2), u(3), u(5), u(4), mg(6, 0b000)]; // 42
const DLY_FLANGER = Object.assign([w(0, 1), s(2), u(3), u(5), u(4), s(7)], { fixed: { 6: 0b100 } }); // 43
const DLY_DIST    = [w(0, 1), s(2), u(3), u(4), u(5), u(6)];       // 44-45
const DLY_PHASER  = [w(0, 1), s(2), u(3), u(5), u(4), s(6)];       // 46
const DLY_ROTARY  = [w(0, 1), s(2), u(3), u(4), u(5)];             // 47

const LAYOUTS = [
  [],                                                   // 0: No Effect
  REVERB, REVERB, REVERB, REVERB, REVERB, REVERB,       // 1-6
  PLATE, PLATE, PLATE,                                  // 7-9
  EARLY_REF, EARLY_REF, EARLY_REF,                      // 10-12
  STEREO_DLY, STEREO_DLY,                               // 13-14
  DUAL_DLY,                                             // 15
  MULTI_TAP, MULTI_TAP, MULTI_TAP,                      // 16-18
  ST_CHORUS_1, ST_CHORUS_2,                             // 19-20
  QUAD_CHORUS, QUAD_CHORUS,                             // 21-22
  HARM_CHORUS,                                          // 23
  SYMPHONIC,                                            // 24
  FLANGER, FLANGER, FLANGER,                            // 25-27
  EXCITER,                                              // 28
  ENHANCER,                                             // 29
  DISTORTION, DISTORTION,                               // 30-31
  PHASER_1, PHASER_2,                                   // 32-33
  ROTARY,                                               // 34
  AUTO_PAN, TREMOLO,                                    // 35-36
  PARAM_EQ,                                             // 37
  CHORUS_DLY, CHORUS_DLY,                               // 38-39
  DLY_HALL,                                             // 40
  DLY_ROOM,                                             // 41
  DLY_CHORUS,                                           // 42
  DLY_FLANGER,                                          // 43
  DLY_DIST, DLY_DIST,                                   // 44-45
  DLY_PHASER,                                           // 46
  DLY_ROTARY,                                           // 47
];

export const EFFECT_PARAM_SLOTS = 7;

export function effectLayout(type) {
  return LAYOUTS[type] ?? [];
}

// 8 dump bytes -> 7 editor-order values (unmapped slots are 0).
export function decodeEffectParams(type, dumpBytes) {
  const out = new Array(EFFECT_PARAM_SLOTS).fill(0);
  effectLayout(type).forEach((slot, off) => {
    let v = dumpBytes[slot.byte] & 0xFF;
    if (slot.mg !== undefined) v &= 0x01;
    else if (slot.hi !== undefined) v |= (dumpBytes[slot.hi] & 0xFF) << 8;
    else if (slot.signed && v >= 0x80) v -= 0x100;
    if (slot.scale) v *= slot.scale;
    out[off] = v;
  });
  return out;
}

// 7 editor-order values -> 8 dump bytes. Bytes the layout doesn't cover
// (NUL/reserved bytes) are taken from `baseBytes` — the block this effect was
// originally decoded from, when the type hasn't changed since — so untouched
// data round-trips byte-for-byte.
export function encodeEffectParams(type, values, baseBytes = null) {
  const out = new Array(8).fill(0);
  if (baseBytes) for (let i = 0; i < 8; i++) out[i] = baseBytes[i] & 0xFF;
  const layout = effectLayout(type);
  for (const [i, v] of Object.entries(layout.fixed ?? {})) out[i] = v;
  layout.forEach((slot, off) => {
    let v = Math.round(values[off] ?? 0);
    if (slot.mg !== undefined) { out[slot.byte] = slot.mg | (v ? 1 : 0); return; }
    if (slot.scale) v = Math.round(v / slot.scale);
    if (slot.hi !== undefined) {
      out[slot.byte] = v & 0xFF;
      out[slot.hi] = (v >> 8) & 0xFF;
    } else {
      out[slot.byte] = v & 0xFF;
    }
  });
  return out;
}

// Dry:FX Balance pair semantics differ between the two transports. Live
// Parameter Change (and the editor's store) uses balL = wet, balR = 100 - wet
// for single-control types; dumps store both bytes as the wet value (1,025 of
// 1,029 stored single-control effects across the factory bank and a private
// archive). Dual-balance types (Landmine #93) hold two independent values in
// both transports, and 44-45 use balL only (balR has no device effect), so both pass through as-is.
const DUAL_BALANCE_TYPES = new Set([15, 40, 41, 42, 43, 46, 47]);

function isMirroredBalanceType(type) {
  return type !== 0 && type !== 44 && type !== 45 && !DUAL_BALANCE_TYPES.has(type);
}

export function decodeEffectBalance(type, dumpL, dumpR) {
  return isMirroredBalanceType(type) ? [dumpL, 100 - dumpL] : [dumpL, dumpR];
}

export function encodeEffectBalance(type, balL, balR) {
  return isMirroredBalanceType(type) ? [balL, balL] : [balL, balR];
}

// Live wire value for a per-type effect param. Applies the slot's `scale` on
// the live wire too — e.g. types 38-39 Delay Time is 2ms steps (editor 150 →
// wire 75). Every live effect-param send goes through this (Landmine #109).
export function liveEffectParamValue(type, offset, value) {
  const slot = effectLayout(type)[offset];
  return slot?.scale ? Math.round(value / slot.scale) : value;
}
