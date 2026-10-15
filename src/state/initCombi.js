// "Initialize" for Combinations: a blank Combi in parseCombi's shape, same
// approach as INIT_PROGRAM (Archive #172). Effects copy INIT_PROGRAM's, including
// its fully-dry balance (owner's choice over the types' own default balance).
// Omits effects.io and eff{1,2}DumpType/DumpParams (Landmine #111).

const initTimbre = (enabled) => ({
  programNo: 0,      // A00
  bankG: false,
  enabled,
  outputLevel: 127,   // PRG — defers to the Program's own level
  transpose: 0,
  detune: 0,
  pan: 'prg',          // A:B Pan PRG — defers to the Program's own pan
  sendC: 0,
  sendD: 0,
  keyWindowTop: 127,     // full range: C-1 to G9
  keyWindowBottom: 0,
  velWindowTop: 127,     // full range: 1-127 (0 is not a valid Vel Window byte)
  velWindowBottom: 1,
  midiChannel: 0,        // MIDI Channel 1 (0-indexed)
  filters: {
    programChange: true,
    damper: true,
    afterTouch: true,
    controlChange: true,
  },
});

export const INIT_COMBI = {
  name: 'Init Combi', // 10-char limit
  effects: {
    eff1Type: 19,  // Stereo Chorus 1
    eff2Type: 4,   // Room
    eff1Switch: 1, // On — drives both L/R channel-enable bits of the dump's Effect I/O byte
    eff2Switch: 1,
    eff1BalanceL: 0, eff1BalanceR: 100, // fully dry — matches INIT_PROGRAM, user-directed
    eff2BalanceL: 0, eff2BalanceR: 100,
    // Same as INIT_PROGRAM: the types' EFFECT_TYPE_RESET_DEFAULTS, 0 where absent.
    eff1Params: [3, 10, 99, 1, 4, 4, 0],
    eff2Params: [11, 8, 68, 36, 1, 2, 0],
    eff1ModSource: 0, eff1ModAmount: 0,
    eff2ModSource: 0, eff2ModAmount: 0,
    placement: 0, // Serial
    out3Pan: 1, out4Pan: 101,     // L50 / R50 (PAN_CENTER=51, see buildEffectPanControl)
    out3LLevel: 4, out3RLevel: 4, // hardware-confirmed device reset values, Archive #76-77
    out4LLevel: 4, out4RLevel: 4,
    // IoL/IoR are ignored on encode (derived from the switches); kept to match parser output.
    eff1IoL: 1, eff1IoR: 1,
    eff2IoL: 1, eff2IoR: 1,
  },
  timbres: [
    initTimbre(true),  // Timbre 1 — the only active timbre
    initTimbre(false),
    initTimbre(false),
    initTimbre(false),
    initTimbre(false),
    initTimbre(false),
    initTimbre(false),
    initTimbre(false),
  ],
};
