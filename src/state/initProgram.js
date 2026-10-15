// "Initialize Patch": a blank Program in parseProgram's shape. The device has no
// factory Init, so each value is either neutral (flat/off/centre) or an agreed
// pick, noted inline (Archive #172). Omits fields the encoder doesn't read —
// effects.io and eff{1,2}DumpType/DumpParams (Landmine #111).

// Single OSC, Saw wave (multisound 330), flat pitch EG/MG, filter open, no
// envelope shaping, no dynamic modulation — a plain, predictable starting
// tone. OSC-2/VDF-2/VDA-2 mirror OSC-1/VDF-1/VDA-1 exactly (interval/detune/
// delayStart at 0) so switching to Double mode is also already initialized.
const initOsc = () => ({
  multisound: 330, // Saw
  level: 43,        // median of the 3 reference banks
  octave: 0,         // 8', no shift
  pan: 15,           // CNT (center) — explicit, not the ambiguous "Off" (0xFF) state
  sendC: 0,
  sendD: 0,
  pitchEGInt: 0,
  pitchMG: {
    waveForm: 0, keySync: 0, frequency: 0, delay: 0, fadeIn: 0, intensity: 0,
    freqModByKbdTrk: 0, intModByAT: 0, intModByMW: 0, freqModByATMW: 0,
  },
});

// Organ-style envelope: instant attack to full level, no decay dip, full
// sustain, a short (not instant — avoids a click) release.
const initVda = () => ({
  kbdTrackKey: 60, // C4 — irrelevant, kbdTrackInt is 0
  kbdTrackInt: 0,
  velSense: 40,     // pick — "moderate" per user direction
  egTimeKbdTrack: 0,
  egTimeVelSense: 0,
  eg: {
    attackTime: 0, attackLevel: 99,
    decayTime: 0, breakPoint: 99,
    slopeTime: 0, sustainLevel: 99,
    releaseTime: 15, // pick — short but click-free; instant (0) can pop
  },
  egTimeKbdMod: 0,
  egTimeVelMod: 0,
  kbdTrackMode: 0, // Off
});

// Filter fully open; every envelope/tracking/color amount at 0 — cutoff
// alone (99) defines the sound, everything else is inert until the user
// dials it in.
const initVdf = () => ({
  cutoff: 99, // fully open
  kbdTrackKey: 60, // irrelevant, kbdTrackMode/cutoffKbdTrack are 0
  kbdTrackMode: 0, // Off
  cutoffKbdTrack: 0,
  egIntensity: 0,
  egTimeKbdTrack: 0,
  egIntVelSense: 0,
  egTimeVelSense: 0,
  eg: {
    attackTime: 0, attackLevel: 0,
    decayTime: 0, breakPoint: 0,
    slopeTime: 0, sustainLevel: 0,
    releaseTime: 0, releaseLevel: 0,
  },
  colorIntensity: 0,
  colorVelSense: 0,
  egTimeKbdMod: 0,
  egTimeVelMod: 0,
});

export const INIT_PROGRAM = {
  name: 'Init Prog', // 10-char limit — "Init Program" doesn't fit
  osc: {
    mode: 0,   // Single
    assign: 0, // pick — Poly
    hold: 0,   // Off
  },
  osc1: initOsc(),
  osc2: { ...initOsc(), interval: 0, detune: 0, delayStart: 0 },
  pitchEg: {
    startLevel: 0, attackTime: 0, attackLevel: 0, decayTime: 0,
    releaseTime: 0, releaseLevel: 0, egIntVelSense: 0, egTimeVelSense: 0,
  },
  cutoffMg: {
    waveForm: 0, oscSelect: 0, keySync: 0, // disabled — cosmetic only
    frequency: 0, delay: 0, intensity: 0,
  },
  afterTouch: {
    pitchBendRange: 0, vdfCutoff: 0, vdfMgInt: 0, vdaAmplitude: 0,
  },
  modWheel: {
    pitchBendRange: 2, // agreed — Bend ±2
    vdfSweepInt: 0, vdfMgInt: 0,
  },
  vda1: initVda(),
  vda2: initVda(),
  vdf1: initVdf(),
  vdf2: initVdf(),
  effects: {
    eff1Type: 19,  // Stereo Chorus 1
    eff2Type: 4,   // Room
    eff1Switch: 1, // On — drives both L/R channel-enable bits of the dump's Effect I/O byte
    eff2Switch: 1,
    eff1BalanceL: 0, eff1BalanceR: 100, // fully dry
    eff2BalanceL: 0, eff2BalanceR: 100,
    // Stereo Chorus 1/Room's own device defaults — EFFECT_TYPE_RESET_DEFAULTS
    // (index.html), offsets 0-6, missing offsets filled with 0.
    eff1Params: [3, 10, 99, 1, 4, 4, 0],
    eff2Params: [11, 8, 68, 36, 1, 2, 0],
    eff1ModSource: 0, eff1ModAmount: 0,
    eff2ModSource: 0, eff2ModAmount: 0,
    placement: 0, // Serial
    out3Pan: 1, out4Pan: 101,     // hardware-confirmed device reset values, Archive #76-77
    out3LLevel: 4, out3RLevel: 4, // same source
    out4LLevel: 4, out4RLevel: 4,
    // IoL/IoR are ignored on encode (derived from the switches); kept to match parser output.
    eff1IoL: 1, eff1IoR: 1,
    eff2IoL: 1, eff2IoR: 1,
  },
};

// Flattens plain data into [dot.path, value] leaf pairs (e.g. 'effects.eff1Params.0'),
// so a whole record can be applied field by field through setParam (Landmine #110).
export function flattenObjectPaths(obj, prefix = '') {
  const out = [];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      out.push(...flattenObjectPaths(value, path));
    } else {
      out.push([path, value]);
    }
  }
  return out;
}
