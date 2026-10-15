# ADR-0001 — Internal Data Model and Patch Librarian Scope

**Date:** June 2026  
**Status:** Accepted — amended June–July 2026 (see Amendments A–D below)

---

## Context

Before building the dump parser and Phase 2 UI, the project needed a defined internal JavaScript data model — the structure that holds X5DR patch data in memory between parsing a SysEx dump and sending Parameter Change messages to the hardware. Two real dump files (`<identified user>_X5D.syx`, X5dr_Factory_Sounds.syx) were analysed to verify the model against actual device output.

---

## Decisions

### 1. Top-level container: `Snapshot`

A `Snapshot` represents a complete or partial X5DR state. It has five sections, all nullable:

```javascript
{
  programs:  Program[100] | null,
  combis:    Combi[100]   | null,
  global:    Global       | null,
  drums:     DrumKit[2]   | null,
  multi:     Multi        | null,
  sources: {
    programs: string | null,  // filename the section was loaded from
    combis:   string | null,
    global:   string | null,
    drums:    string | null,
    multi:    string | null,
  }
}
```

Missing sections are explicitly `null`, not silently defaulted. The `sources` object records which file each section came from, enabling future librarian features.

### 2. All dump data is packed as one continuous block

The X5DR packs All Program, All Combination, and All Data dumps as a single continuous 7-bit MIDI block covering all records — not as individually packed per-record chunks. The correct approach is to unpack the entire payload, then split into fixed-size records (164 bytes per program, 136 bytes per combi, etc.).

### 3. Raw values throughout; display conversion at UI boundary

The data model stores raw decoded values exactly as they appear in the spec (e.g. `velocityCurve: 0–7`, `midiChannel: 0–15`). The UI layer is responsible for display conversion (e.g. adding 1 for 1-based display). This keeps the parser and encoder simple and makes console debugging straightforward.

### 4. `null` sentinel for PRG fields

Parameters that support a "use program's own value" option (pan, sendC, sendD in Combi timbres; pan in Program OSC sections) store `null` to represent that state. Numeric values represent fixed settings.

### 5. `Program` shape

```javascript
{
  name: string,              // 10 chars
  osc: { mode, assign, hold },
  pitchEG: { startLevel, attackTime, attackLevel, decayTime, releaseTime, releaseLevel, timeVelSense, levelVelSense },
  cutoffMG: { waveForm, frequency, intensity, delay, osc1Enable, osc2Enable, keySync },
  afterTouch: { pitchBendRange, vdfCutoff, vdfMGInt, vdaAmplitude },
  bend: { pitchBendRange, vdfSweepInt, vdfMGInt },
  osc1: OscSection,
  osc2: OscSection,          // includes interval, detune, delayStart (OSC-2 only)
  effects: Effects,
}
```

`osc1` and `osc2` are explicit named properties, not an array. OSC-2 has unique parameters (`interval`, `detune`, `delayStart`) that make true symmetry impractical.

OSC-1→OSC-2 copy/paste is handled at the UI layer via a `copyOsc(source, target)` utility that maps shared properties and leaves OSC-2-only parameters at their current values.

Each `OscSection`:

```javascript
{
  multisound: number,        // 0–429
  level: number,             // 0–99
  octave: number,            // raw: FE–01
  pitchEGInt: number,
  pan: number | null,        // 0–30 or null (PRG / OFF)
  sendC: number,             // 0–9
  sendD: number,
  pitchMG: { waveForm, frequency, intensity, delay, fadeIn, keySync, freqModByKbdTrk, intModByAT, intModByMW, freqModByATMW },
  vdf: { cutoffValue, kbdTrackKey, cutoffKbdTrack, egIntensity, egTimeKbdTrack, egTimeVelSense, egIntVelSense },
  vdfEG: { attackTime, attackLevel, decayTime, breakPoint, slopeTime, sustainLevel, releaseTime, releaseLevel },
  vdfEGTimeMods: { ... },    // KBD track and velocity SW/polarity bits
  vda: { level, kbdTrackKey, ampKbdTrackInt, ampVelocitySense, egTimeKbdTrack, egTimeVelSense },
  vdaEG: { attackTime, attackLevel, decayTime, breakPoint, slopeTime, sustainLevel, releaseTime },
  vdaEGTimeMods: { ... },
  color: { intensity, velocitySense },
  kbdTrackMode: number,      // VDF/VDA KBD track mode bits
}
```

### 6. `Effects` shape (shared across Program, Combi, Multi)

```javascript
{
  effect1: {
    typeNo: number,          // 0 = OFF, 1–47
    balanceL: number,        // 0–100
    balanceR: number,
    modSource: number,       // 0–13
    modAmount: number,       // -15 to +15
    params: number[8],       // type-specific values; unused slots retain previous values on type change
  },
  effect2: { ... },          // same structure
  io: number,                // Effect I/O bits (*11-2)
  out3Pan: number,
  out4Pan: number,
}
```

`params` is a fixed-length array of 8 values. The UI handles type-specific labeling via a lookup table keyed on `typeNo`.

### 7. `Combi` shape

```javascript
{
  name: string,
  effects: Effects,
  timbres: Timbre[8],
}
```

Each `Timbre`:

```javascript
{
  programNo: number,         // 0–99 (Bank A) or 0–135 (Bank G)
  bankG: boolean,
  enabled: boolean,
  outputLevel: number,       // 0–127
  transpose: number,         // -24 to +24
  detune: number,            // -50 to +50
  pan: number | null,        // 0–30 or null (PRG)
  sendC: number | null,      // 0–9 or null (PRG)
  sendD: number | null,
  keyWindowTop: number,
  keyWindowBottom: number,
  velWindowTop: number,
  velWindowBottom: number,
  midiChannel: number,       // raw 0–15
  filters: { programChange, damper, afterTouch, controlChange },
}
```

### 8. `DrumKit` and `DrumNote` shapes

```javascript
// DrumKit
{ notes: DrumNote[60] }

// DrumNote
{
  enabled: boolean,          // false when instNo raw value = 0
  instNo: number,            // 0–214 (decoded sound number)
  key: number,               // 0x0C–0x73
  pan: number,               // 0–30 (no PRG option in drums)
  exclusiveAssign: number,   // 0–7
  tune: number,              // -120 to +120
  level: number,             // -99 to +99
  decay: number,             // -99 to +99
  sendC: number,             // 0–9
  sendD: number,
}
```

### 9. `Global` shape

```javascript
{
  masterTune: number,        // -50 to +50
  keyTranspose: number,      // -12 to +12
  mainScaleType: number,     // 0–10
  mainScaleKey: number,      // 0–11
  userScale: number[12],     // -50 to +50 each
  velocityCurve: number,     // raw 0–7 (display as 1–8)
  afterTouchCurve: number,   // raw 0–7
  subScaleType: number,
  subScaleKey: number,
}
```

### 10. Patch librarian deferred to v1.1

A `Patch` concept (a single extracted Program or Combi, portable across snapshots) is defined but not implemented in v1.0. The v1.0 editor works entirely with `Snapshot` objects. The data model is designed to support librarian extraction without structural changes.

---

## Alternatives Considered

- **`Bank` instead of `Snapshot`:** Rejected — "bank" implies a fixed complete state; "snapshot" better conveys that sections may be null and that it represents a point-in-time capture.
- **Per-record 7-bit packing:** Rejected — verified against real dump files that the X5DR packs all records as one continuous block.
- **Display values in model:** Rejected — complicates encoder and parser; moves conversion logic into the wrong layer.
- **`params` as named per-type sub-objects:** Rejected — 47 effect types would require 47 branches in encoder and parser; generic array is simpler and sufficient.
- **Librarian in v1.0:** Rejected — increases scope significantly; editor functionality is the primary value.

---

---

## Amendment A — Program shape revised (June 2026)

During Phase 2 hardware testing, the original `Program` shape (Decision 5) was found to have key name and structural mismatches between `parser.js` output and the UI's store paths. The parser was updated to use the UI paths as the source of truth. The shapes below supersede Decision 5 for the `Program` and `OscSection` types.

### Revised `Program` shape

```javascript
{
  name: string,
  osc: { mode, assign, hold },

  // Pitch EG tab
  pitchEg: {             // ← lowercase 'g' (was pitchEG)
    startLevel, attackTime, attackLevel, decayTime, releaseTime, releaseLevel,
    egIntVelSense,       // TABLE 7 param 9  (was levelVelSense)
    egTimeVelSense,      // TABLE 7 param 10 (was timeVelSense)
  },

  // VDF Cutoff MG section
  cutoffMg: {            // ← lowercase 'g' (was cutoffMG)
    waveForm, frequency, intensity, delay,
    oscSelect,           // 0–3: 0=Off,1=OSC-1,2=OSC-2,3=Both (was osc1Enable+osc2Enable separately)
    keySync,
  },

  // After Touch section (Pitch EG tab)
  afterTouch: { pitchBendRange, vdfCutoff, vdfMgInt, vdaAmplitude },
  //                                               ↑ lowercase 'g' (was vdfMGInt)

  // Pitch Bend / Mod Wheel section (Pitch EG tab)
  modWheel: { pitchBendRange, vdfSweepInt, vdfMgInt },
  // ↑ renamed from 'bend'; vdfMgInt lowercase 'g'

  // OSC tab data — general per-oscillator fields only
  osc1: OscBlock,
  osc2: OscBlock,        // also includes interval, detune, delayStart

  // VDA tab data — top-level keys (was nested inside osc1.vda / osc1.vdaEG)
  vda1: VdaBlock,
  vda2: VdaBlock,

  // VDF tab data — top-level keys (was nested inside osc1.vdf / osc1.vdfEG)
  vdf1: VdfBlock,
  vdf2: VdfBlock,

  effects: Effects,
}
```

### Revised `OscBlock` shape (for OSC tab only)

```javascript
{
  multisound: number,    // 0–429
  level: number,         // 0–99
  octave: number,
  pitchEGInt: number,
  pan: number | null,
  sendC: number,
  sendD: number,
  pitchMG: { waveForm, frequency, intensity, delay, fadeIn, keySync,
             freqModByKbdTrk, intModByAT, intModByMW, freqModByATMW },
  // osc2 only:
  interval: number,
  detune: number,
  delayStart: number,
}
```

### `VdaBlock` shape

```javascript
{
  level: number,         // 0–99
  kbdTrackKey: number,   // MIDI note number (was ampKbdTrackKey)
  kbdTrackInt: number,   // -99 to +99 (was ampKbdTrackInt)
  velSense: number,      // -99 to +99 (was ampVelocitySense)
  egTimeKbdTrack: number,
  egTimeVelSense: number,
  eg: {
    attackTime, attackLevel, decayTime, breakPoint,
    slopeTime, sustainLevel, releaseTime,
    // no releaseLevel — VDA EG always returns to 0
  },
  egTimeKbdMod: number,  // raw packed byte: bit i = SW for stage i, bit i+4 = Pol for stage i
  egTimeVelMod: number,  // same format
  kbdTrackMode: number,  // 0–3 (bits 4,5 of TABLE 1 byte 85/132)
}
```

### `VdfBlock` shape

```javascript
{
  cutoff: number,        // 0–99 (was cutoffValue)
  egIntensity: number,
  colorIntensity: number,   // was color.intensity
  colorVelSense: number,    // was color.velocitySense
  kbdTrackKey: number,
  kbdTrackMode: number,  // 0–3 (bits 0,1 of TABLE 1 byte 85/132)
  cutoffKbdTrack: number,
  egTimeKbdTrack: number,
  egIntVelSense: number,
  egTimeVelSense: number,
  eg: {
    attackTime, attackLevel, decayTime, breakPoint,
    slopeTime, sustainLevel, releaseTime, releaseLevel,  // VDF includes releaseLevel
  },
  egTimeKbdMod: number,  // raw packed byte (same format as VdaBlock)
  egTimeVelMod: number,
}
```

### EG time mod byte format

`egTimeKbdMod` and `egTimeVelMod` store the TABLE 1 byte directly. For stage index `i` (0=Attack, 1=Decay, 2=Slope, 3=Release):
- Bit `i` = SW (0=off, 1=on)
- Bit `i+4` = Polarity (0=+, 1=−)

**Parameter Change value encoding** (important distinction): when sending a per-stage Parameter Change (TABLE 7 params 66–69, 45–48, etc.), the value uses **compact 2-bit encoding**: `value = sw | (pol << 1)`. This differs from the TABLE 1 storage format. Sending `pol << 4` (the TABLE 1 bit position) does not work — the device reads bit1 for polarity in the Parameter Change value.

---

---

## Amendment B — Effects shape revised (June 2026)

During EFFECT tab implementation, `decodeEffects` was found to have wrong byte offsets (see ADR-0002 §8.11). The parser was rewritten, and in the process the `Effects` shape (Decision 6) was revised from a nested `effect1` / `effect2` structure to a flat `eff1*` / `eff2*` layout that directly mirrors the dump field names and makes store path notation consistent with all other sections of the data model.

The revised `Effects` shape supersedes Decision 6:

```javascript
{
  eff1Type:      number,        // 0 = No Effect, 1–47
  eff2Type:      number,
  eff1BalanceL:  number,        // 0–100
  eff1BalanceR:  number,
  eff2BalanceL:  number,
  eff2BalanceR:  number,
  out3Pan:       number,        // 0–100
  out4Pan:       number,
  io:            number,        // raw I/O byte (bits 0-3=ch enables, 4-5=placement)
  placement:     number,        // 0=Serial, 1=Para1, 2=Para2, 3=Para3 (decoded from io bits 4-5)
  eff1IoL:       number,        // 0/1 — decoded from io bit 0
  eff1IoR:       number,        // 0/1 — decoded from io bit 1
  eff2IoL:       number,        // 0/1 — decoded from io bit 2
  eff2IoR:       number,        // 0/1 — decoded from io bit 3
  eff1Params:    number[8],     // type-specific values; unused slots retain previous values
  eff1ModSource: number,        // 0–6
  eff1ModAmount: number,        // −15 to +15 (signed)
  eff2Params:    number[8],
  eff2ModSource: number,
  eff2ModAmount: number,
}
```

The store dot-notation paths for effects use this flat structure, e.g. `programs.0.effects.eff1Params.0`.

Two aspects of the original Decision 6 shape are no longer present in the working parser output:
- The `effect1` / `effect2` sub-objects have been removed; all fields are top-level on the `effects` object.
- `io` is retained as the raw byte; `placement` and the four `eff*Io*` flags are added as decoded fields alongside it.

---

## Consequences

- The dump parser (`parseSnapshot`) produces a `Snapshot` with decoded values ready for the UI to consume directly.
- The SysEx encoder reads from a `Snapshot` and handles all raw value reconstruction and 7-bit packing.
- UI controls read and write decoded values; display formatting (unit labels, 1-based indices, etc.) is a UI concern only.
- The `sources` metadata on `Snapshot` is available for the v1.1 librarian without model changes.
- OSC copy/paste requires a utility function at the UI layer, not a change to the data model.

---

---

## Amendment C: `Timbre.pan` and `OscSection.pan` sentinel correction

**Date:** July 2026
**Status:** Proposed amendment — to be appended to ADR-0001-data-model-and-librarian-scope.md
**Discovered during:** Combi Editor design session, cross-referenced against X5DR manual pages 105 and Appendix p.169 (footnote `*6`)
## Context

ADR-0001 Decision 4 and Decision 7 define `pan: number | null` for both `Combi.Timbre` and `Program.OscSection`, using `null` as a single "use program's own value" (PRG) sentinel. Reading the manual's actual Pan encoding table (footnote `*6`) and the "7A, 7B Panpot" manual section directly shows this is incorrect for both shapes, in opposite directions.

## Finding

Manual footnote `*6` (Pan):

```
00      = A15
...
0F      = CNT (center)
...
1E      = B15
1F      = PRG (only Combi data)
FF      = Off
```

**Combi `Timbre.pan`** (TABLE 2 param 44, documented range `00–1E, 1F, FF`) has **three** distinct states, not two:
- `00–1E` — fixed A:B pan position
- `1F` — PRG (inherit the Program's own pan setting)
- `FF` — Off (output routed to neither bus A nor B; see manual text: "Nothing is output to buses A and B")

**Program `OscSection.pan`** (TABLE 1 param 86, documented range `00–1E, FF` only) has **two** states, but not the two ADR-0001 currently models:
- `00–1E` — fixed A:B pan position
- `FF` — Off
- No PRG value exists here — a Program has no other Program to defer to, so PRG is structurally inapplicable.

## Decision

Amend ADR-0001 Decision 7 (`Timbre` shape):

```diff
- pan: number | null,      // 0–30 or null (PRG)
+ pan: number | 'prg' | 'off',   // 0–30, 'prg' (0x1F), or 'off' (0xFF)
```

Amend ADR-0001 Decision 5 / Amendment A (`OscSection`/`OscBlock` shape):

```diff
- pan: number | null,
+ pan: number | 'off',     // 0–30 or 'off' (0xFF); no PRG state exists for a Program's own pan
```

## Consequences

- `parseCombi`/`parser.js` and `encodeCombi`/encoder logic must map raw byte `0x1F` → `'prg'`, `0xFF` → `'off'` for Combi timbre pan, and raw byte `0xFF` → `'off'` (no `0x1F` case) for Program OSC pan.
- Any UI control built against `pan` must handle three states for Combi (numeric, PRG checkbox, and a currently-unbuilt "Off" affordance — see Combi Editor Design Spec §2.1, which specifies only a PRG checkbox for the initial build; an explicit "Off" control is not yet scoped and should be added to the SOUND tab brief) and two states for Program OSC pan (numeric and Off, no PRG).
- The exact audible behavior of Pan="Off" is not yet hardware-verified beyond the manual's text description ("nothing is output to buses A and B"). See Combi Editor Design Spec §10 for the verification checklist item.
- This correction does not affect `Timbre.sendC`/`sendD`, which are confirmed to have only two states (numeric or PRG) per manual text — no "Off" equivalent exists for the send levels.

## Alternatives Considered

- **Leave `pan: number | null` and treat `'off'` as a UI-only concept, mapped to a special numeric value:** rejected — conflates two semantically distinct raw byte values (`0x1F` vs `0xFF`) into one sentinel, which would silently corrupt round-trip encoding for whichever state doesn't get chosen as the "real" `null`.

---

---

## Amendment D: `Timbre.sendC`/`sendD` sentinel correction

**Date:** July 2026
**Status:** Accepted — implemented and hardware-confirmed (see Decision Archive Critical Discoveries #42, #50)
**Discovered during:** Review following hardware verification of a genuine device-generated dump (`reference_sysex/X5DR_SendCD.syx`)

## Context

ADR-0001 Decision 4 and Decision 7 define `sendC: number | null` and `sendD: number | null` for `Combi.Timbre`, documenting `null` as the "use program's own value" (PRG) sentinel — the same pattern Amendment C corrected for `pan`. The actual implemented parser/encoder (`decodeTimbre`/`encodeTimbre` in `parser.js`/`sysex.js`) has never used `null` for these fields: it stores the raw nibble value directly (0–15), and the UI (`buildSendCtrl` in `index.html`) treats any value >9 as "already PRG" for display.

## Finding

A genuine device-generated "All Data" dump — captured specifically to give this open question a hardware ground truth, using three known front-panel test cases (Timbre 0 Send C:D = P:0, Timbre 1 = 0:P, Timbre 2 = P:P) — confirmed the PRG raw nibble is exactly `10` (`0x0A`) for both Send C and Send D. This is not a `null` sentinel at the JS layer; it's a real byte-level convention where 0–9 are literal send levels and `10` is the device's own PRG code.

## Decision

Amend ADR-0001 Decision 7 (`Timbre` shape):

```diff
- sendC: number | null,      // 0–9 or null (PRG)
- sendD: number | null,
+ sendC: number,             // 0–9 direct, 10 = PRG (hardware-confirmed raw nibble)
+ sendD: number,
```

Amend ADR-0001 Decision 4 (`null` sentinel for PRG fields): the original text listing `sendC`/`sendD` alongside `pan` as `null`-sentinel fields is corrected. `pan` uses the `'prg'`/`'off'` string sentinels established in Amendment C; `sendC`/`sendD` use the numeric raw-nibble convention above — no `null` involved at all.

## Consequences

- No parser/encoder code change was required — `decodeTimbre`/`encodeTimbre` already implemented the correct (non-`null`) convention; only the ADR's documentation had drifted from the code.
- `buildSendCtrl`'s PRG checkbox now writes `10` for real on check (previously a deliberate no-op pending this exact hardware confirmation — Critical Discovery #42, resolved by #50).
- Any future work touching Send C/D should treat `10` as a real, load-bearing constant (`SEND_PRG_RAW` in `index.html`), not a magic number to rediscover.

## Alternatives Considered

- **Leave the ADR text as-is since the code already worked correctly:** rejected — an ADR's value is as a reliable reference to the actual data model; letting it silently diverge from the implemented code defeats that for any future reader who trusts the ADR over reading the parser source directly.
