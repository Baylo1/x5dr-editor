# ADR-0003 — Program Edit: EFFECT Tab Architecture

**Date:** June 2026
**Status:** Accepted — EFFECT tab complete and hardware-tested
**Scope:** Decisions specific to the Program Edit EFFECT tab — parameter mapping, control rendering, and hardware-derived corrections. Cross-cutting Phase 2 architecture (state management, navigation, file load/save) is in ADR-0002; this document does not repeat it.

*This ADR was split out of ADR-0002 (originally sections 8–12) once it became clear that EFFECT-tab-specific implementation detail was crowding out the cross-cutting architectural content the original document was meant to hold. Future Program Edit sub-features (e.g. the Drums OSC mode editor, the Quick Edit tab) and future modules (Combi, Multi, Global) should each get their own ADR following this precedent, rather than being appended here or to ADR-0002.*

---

## Context

Decided via grilling session after reading the X5DR manual Effects chapter (pp.115–145), followed by two rounds of hardware testing and correction (see `X5DR_Editor_Decision_Archive.md`, Critical Discoveries #11–#14, for full verification detail).

---

## Decisions

### 1. Parameter Change Source of Truth

**TABLE 7-1** in `03_program_parameters.md` is the authoritative source for Parameter Change number mapping. `05_effect_parameters.md` is used only for per-type parameter labels, value ranges, and initial values. The `*11` offset table in `05_effect_parameters.md` describes the SysEx dump data layout — the per-type parameter slot ORDER within each effect type does not match the device's actual Parameter Change slot assignments for most types. Always verify parameter order via hardware capture.

### 2. Design Axiom

**The editor should always reflect the state of the device as closely as possible.** This drives decisions like resetting `workingCopy` on type change, eager Mode Change send, NAK recovery, and parameter state synchronization throughout. (Restated from ADR-0002/Project Context — repeated here because it directly motivates several EFFECT-tab-specific decisions below.)

### 3. Per-Type Parameter Lookup Table

A `const EFFECT_TYPES` object keyed by effect type number (0–47). Each entry is an array of parameter definition objects:

```js
{ offset, label, min, max, format, initial }
```

- `offset` — index into the 8-parameter block (0–7); NUL slots are simply absent from the array
- `format` — string identifier handled by a central renderer: `'linear'`, `'modSpeed'`, `'bipolar'`, `'sinTri'`, `'modShape'`, `'reverbTime'`, `'erTime'`
- `initial` — the documented factory initial value for this parameter
- Types sharing an identical parameter set reference the same array object

**Alternative considered:** inline formatting logic per parameter — rejected for maintainability; a central formatter keeps display and validation logic in one place.

### 4. Parameter Reset on Type Change

When the user changes an effect type, `workingCopy` is immediately updated for all 8 parameter slots of that effect to the `initial` values from the lookup table. This mirrors device behavior (the device resets parameters on type change) and keeps editor state synchronized.

### 5. Dry:FX Balance Control

All effect types use a single "Dry:FX Balance" slider. The slider position represents the **wet** amount (0=fully dry, 100=fully wet). The display shows a live Dry:Wet ratio label (e.g. `61:39`) rather than a raw numeric field. A `balanceSliderCtrl(wetVal, onChange)` helper renders the slider and ratio label.

The device interprets the `balL` Parameter Change parameter differently by type group, requiring the UI to handle the inversion:

| Type group | Device interprets `balL` as | UI sends to `balLPN` | UI sends to `balRPN` |
|---|---|---|---|
| 1–39 | wet amount | `wet` | `100 - wet` |
| 40–43, 46–47 | dry amount | `100 - wet` | `wet` |
| 44–45 | wet amount | `wet` | *(not sent — no device effect)* |

**Types 44–45:** Hardware testing confirmed that `balR` (Parameter Change numbers 176/187) has no audible or measurable effect on the device. The Balance R control is not shown for these types.

**Implementation:** `rebuildBalance(t)` in `buildEffectColumn` selects the correct branch based on `t` and builds a single `balanceSliderCtrl` in all cases.

**Supersedes an earlier decision** (recorded in the Decision Archive) that types 44–45 had two independent Balance L/R controls. Hardware testing disproved that; only Balance L is functional.

### 6. Control Types

| Parameter category | Control |
|---|---|
| All numeric params (any range) | Slider + linked number field — `sliderCtrl` |
| Sin/Tri waveform toggle | Styled toggle button pair (Sin \| Tri) — `format: 'sinTri'` |
| MG Status (full 3-bit bitfield) | Three independent checkboxes — `format: 'mgStatus'` (retained but currently unused) |
| Mod Shape (waveform + ±10 offset) | Sin/Tri toggle + slider (−10 to +10) + editable number field — `format: 'modShape'` |
| Mod Speed (non-linear Hz) | Slider + field with `'modSpeed'` format function |

`sliderCtrl` accepts an optional `labelFormatter` callback — when provided, replaces the numeric input field with a formatted label span (used for OUT3/OUT4 Pan decoded labels).

**Note:** An earlier version used `numCtrl` (number field only) for params with range ≤ 20 steps. This was removed; `sliderCtrl` is used for all params regardless of range. The linked number field still allows precise entry for narrow ranges.

### 7. Layout

- **Routing section** — full-width at top: Placement dropdown (Serial / Parallel 1 / Parallel 2 / Parallel 3), Effect I/O checkboxes (Eff 1 L, Eff 1 R, Eff 2 L, Eff 2 R — see §13, now hidden), output controls (Pan 3 + Pan 4 for Serial/Parallel 1/2; Level 1L + 1R + 2L + 2R for Parallel 3 — dynamically swapped on Placement change)
- **Effect 1 and Effect 2** — side-by-side columns below the routing section
- Each column: Type selector, Switch (ON/OFF), Dry:FX Balance, Dynamic Mod Source, Dynamic Mod Intensity, per-type parameter block

### 8. Type Selector

**Superseded 2026-07-02 — see amendment below.** Originally: `<select>` with `<optgroup>` groupings matching manual families. Option text format: `"N: Name"`. `"0: No Effect"` ungrouped at top.

Groups: Reverb (1–9), Early Reflection (10–12), Stereo Delay (13–14), Dual Mono Delay (15), Multi-Tap Delay (16–18), Chorus (19–23), Symphonic Ensemble (24), Flanger (25–27), Exciter (28), Enhancer (29), Distortion (30–31), Phaser (32–33), Rotary Speaker (34), Tremolo (35–36), Parametric EQ (37), Combination Serial (38–39), Combination Parallel (40–47).

**Amendment (2026-07-02):** the `<select>` was replaced with `buildSoundField` (a bounded name field + hover-reveal pencil icon, same control used for Multisound/Drum Sound selection) opening a dedicated Effect Type Browser modal — same shape as the Multisound/Drum Sound Browsers (grid, category filter, Cancel/X/Escape revert; see ADR-0002's Brief #11 amendment for the shared component family). Two behavior changes this brought:

- **Category row consolidated to 8, display-only.** The 17 groups above are still the underlying data (`EFFECT_TYPE_NAMES.group`, unchanged) but the browser's category filter buttons merge them into 8: Reverb (=Reverb+Early Reflection), Delay (=Stereo Delay+Dual Mono Delay+Multi-Tap Delay), Chorus (=Chorus+Symphonic Ensemble+Flanger), Distortion (=Exciter+Enhancer+Distortion), Phaser (=Phaser+Rotary Speaker+Tremolo), Parametric EQ, Combination Serial, Combination Parallel. The 17-category row was hardware-tested first and found too dense.
- **Symphonic Ensemble mutual exclusion (§10) is now visually enforced, not just rejected-and-reverted.** Excluded types are greyed out and unselectable in the browser grid (`buildSoundGridTable`'s `isDisabledFn`) rather than the old flow of silently reverting a `<select>` change after the fact with a status-bar message. The `isEffectTypeAllowed()` check itself is unchanged.

See `X5DR_Editor_Decision_Archive.md`, Critical Discoveries #33–#35, for the two hardware-caught interaction bugs (double-click/Enter confirm, hover hiding the selection highlight) found and fixed in this new component.

### 9. Dynamic Mod Source Labels

`"None"`, `"JS(+Y) / CC#1"`, `"JS(−Y) / CC#2"`, `"After Touch"`, `"Pedal 1 / CC#12"`, `"Pedal 2 / CC#13"`, `"VDA-EG"`. Small annotation near the control: *JS(+Y) = Mod Wheel (CC#1) on most controller keyboards.*

### 10. Symphonic Ensemble Mutual Exclusion (Enforced)

When Effect 24 (Symphonic Ensemble) is selected for one processor, certain effect types are incompatible with the other processor. Source: X5DR Reference Guide p.145, Symphonic Ensemble effect description, Note.

**Excluded types:** Choruses 19–23, Symphonic Ensemble 24, Flangers 25–27, Phasers 32–33, Rotary Speaker 34, Tremolos 35–36, Chorus/Flanger-Delay 38–39, Delay/Chorus 42, Delay/Flanger 43, Delay/Phaser 46, Delay/Rotary Speaker 47.

**Implementation:** `SYMPHONIC_EXCLUDED` Set + `isEffectTypeAllowed(effNo, newType, store)` validation function. Both EFFECT tab and EASY tab type change handlers check before applying: if the new type would violate the exclusion, the selector reverts to its previous value and a status bar message explains the conflict. The device silently reverts incompatible changes — this editor-side enforcement prevents the editor and device from getting out of sync.

*Originally deferred to Phase 3; implemented in Brief #8 (June 2026) as it was straightforward and directly prevents editor/device desync.*

### 11. Parameter Mapping Corrections (Hardware Testing, June 2026)

Following hardware testing of the first EFFECT tab build, systematic parameter mapping errors were discovered and corrected.

**Root cause:** `05_effect_parameters.md` describes the SysEx *dump data byte order* for each effect type — this is NOT the same as the Parameter Change slot order. For most effect types, the parameter sequence in the dump layout differs from the sequence the device uses for real-time Parameter Change messages. Claude Code faithfully transcribed the reference doc, producing an `EFFECT_TYPES` table where 23 of 25 unique parameter arrays had incorrect offset assignments.

**Ground truth methodology:** For each effect type, navigate every parameter on the X5DR front panel and capture the outbound SysEx using Snoize MIDI Monitor. Extract the `pp pp` parameter number bytes; subtract the Effect 1 base (168 = `0x28`) or Effect 2 base (179 = `0x33`) to get the correct offset. This is the only reliable way to determine per-type parameter slot order.

**Confirmed correct without hardware correction:** Only two arrays were already correct: `rotary` (type 34) and `paramEQ` (type 37).

**`(L)`/`(H)` byte-split entries eliminated:** Several effect types in the reference doc listed entries like `Delay Time L (L)` and `Delay Time L (H)` at consecutive offsets — dump layout artifacts for values >127. In the Parameter Change system, each delay time is a single parameter at a single offset with full range (e.g. 0–500). All `(H)` entries are removed from `EFFECT_TYPES`.

**`sinTri` control type added:** A new `format: 'sinTri'` renders as a two-option `<select>` (Sin / Tri), later restyled as a toggle button pair (see §12). Replaces `format: 'mgStatus'` for all currently confirmed effect types. Hardware testing showed that for all types where MG Status appeared, only the Sin/Tri bit (bit0) is user-controllable — the Phase (bit1) and Flanger (bit2) bits are fixed by the device. `buildMgStatusCtrl` is retained in the codebase but currently unused.

**`dlyBlock` spread pattern eliminated:** The shared `dlyBlock` base (offsets 0–3: Delay Time, Delay Feedback, Delay Hi Damp) was found to be incorrect for the types that used it. Each of `dlyHall`, `dlyRoom`, `dlyChorus`, `dlyPhaser` is now written explicitly.

**`offset <= 6` guard removed:** The old guard (`if (def.offset <= 6) sendParamChange(...)`) was a workaround for the original incorrect arrays which used offsets up to 7. All corrected arrays use a maximum of offset 6. The guard is removed to avoid silently dropping valid sends in the future.

**Ranges flagged for follow-up hardware verification (now resolved — see §14):**
- `hallRoom` / `plate`: Reverb Time max (97 vs 99)
- `multiTap`: Delay Time 1 and 2 max (500)
- `quadChorus`: Delay Time L/R max (250)
- `harmonicChorus`: Delay Time L/R max (500)
- `distortion`: Drive max (111)
- `dlyHall` / `dlyRoom`: Delay Time max (500)

### 12. UI Tweaks (June 2026)

**`sinTri` control: toggle buttons replacing `<select>`.** `buildSinTriCtrl` was rewritten to produce a styled two-button toggle (Sin | Tri) instead of a `<select>`. Buttons give a clearer affordance for a binary toggle and are visually consistent with the `modShape` control. Value semantics are unchanged: Sin = 0, Tri = 1.

**`modShape` renderer: dedicated Sin/Tri toggle + slider.** `buildModShapeCtrl` was added for `format: 'modShape'` (used by `quadChorus` types 21–22). The raw device value spans −21 to +20, encoding both waveform and ±10 offset:
- **Decode** (raw → display): `raw >= 0` → Sin, `disp = raw − 10`; `raw < 0` → Tri, `disp = −raw − 11`
- **Encode** (display → raw): Sin → `raw = disp + 10`; Tri → `raw = −(disp + 11)`

The control renders as a Sin/Tri toggle above a −10 to +10 slider with a linked editable number field. The slider and number field stay in sync; either can drive the parameter.

**All effect params use `sliderCtrl`.** The `range > 20` threshold in `buildPerTypeParams` was removed. All non-special-format effect parameters now render as `sliderCtrl` (slider + number field) regardless of range. See §6.

**`dlyHall` / `dlyRoom`: offsets 4 and 5 corrected.** In both arrays, the `offset` values for Reverb Hi Damp and Reverb Pre Dly were swapped. Corrected: Reverb Pre Dly = offset 4, Reverb Hi Damp = offset 5. Labels and ranges were already correct; only the Parameter Change codes were wrong.

**`dlyChorus` / `dlyFlanger` split.** Types 42 (Delay/Chorus) and 43 (Delay/Flanger) previously shared the `dlyChorus` array. They share offsets 0–4 but differ at offset 5: Chorus uses a Sin/Tri toggle (`sinTri`), Flanger uses a Feedback slider (bipolar, −99 to 99). A new `dlyFlanger` array was created for type 43 with Flanger-prefixed labels and the Feedback parameter. Type map updated: `42: dlyChorus, 43: dlyFlanger`.

**OUT3/OUT4 Pan: range 0–101 with decoded label.** The Pan sliders for Serial/Parallel 1/2 placement were extended from 0–65 to 0–101 (the full device range). A decoded label replaces the raw number field:

| Raw value | Label |
|---|---|
| 0 | `OFF` |
| 1 | `L` |
| 2–100 | `LL:RR` (left% = `101 − v`, right% = `v − 1`, zero-padded to 2 digits) |
| 101 | `R` |

`sliderCtrl` was extended with an optional `labelFormatter` callback parameter to support this. When provided, the callback replaces the `<input type="number">` with a `<span>` label.

### 13. Routing Section Corrections (June 2026)

**OUT3/OUT4 Pan encoding — parser fix.** The X5DR dump encodes OUT3/OUT4 pan with an **inverted direction** relative to the Parameter Change encoding:
- **Dump** (bytes base+6, base+7): 0=OFF, 1=R, 101=L
- **Parameter Change** (params 159, 160): 0=OFF, 1=L, 101=R

The parser (`decodeEffects` in `parser.js`) now converts dump bytes to PC values on load: `PC = dump === 0 ? 0 : 102 - dump`. This ensures `panLabel` (which expects PC encoding: 1=L, 101=R) displays correctly for loaded patches, and the slider sends correct PC values without further conversion.

The reference table `*11-1` in `05_effect_parameters.md` is accurate for the dump encoding. Its maximum value "65" is decimal 65 = hex 0x65 = decimal 101 as a raw unpacked byte. The slider/PC range has always been 0–101 (0x00–0x65); there was no extension.

**OUT3/OUT4 Pan defaults.** When no patch is loaded, `rebuildOutput` falls back to: OUT3 Pan `?? 1` (L), OUT4 Pan `?? 101` (R).

**Parallel 3 level controls.** Range corrected to `sliderCtrl(0, 9, …)` (was `0, 100`). Default corrected to `?? 5` (was `?? 100`). The original range was a copy error; the device range is 0–9.

**Channel Enable row hidden.** The I/O channel-enable checkboxes (Eff 1 L/R, Eff 2 L/R) are fully constructed and wired but hidden via `ioRow.style.display = 'none'`. TABLE 7-1 in `03_program_parameters.md` does not list individual Parameter Change numbers for these bits. **Resolved (June 2026):** follow-up hardware verification confirmed the bits have no effect via SysEx on this device. Decision: leave hidden, leave code in place (not removed), close the item.

**Effect Switch: toggle button pair.** The ON/OFF effect switch was changed from a `selCtrl` dropdown to a styled two-button toggle pair (ON | OFF), consistent with the Sin/Tri toggle style used elsewhere in the EFFECT tab. Values unchanged: ON=1, OFF=0.

**Mod Intensity: slider.** `numCtrl(-15, 15, …)` replaced with `sliderCtrl(-15, 15, …)`. Consistent with all other continuous parameters in the EFFECT tab. The linked number field remains for precise entry.

### 14. Final Hardware Spot-Check (June 2026) — Resolved

The ranges flagged in §11 for follow-up verification were confirmed correct on hardware: `hallRoom`/`plate` Reverb Time max, `multiTap` Delay Time max, `quadChorus` Delay Time L/R max, `harmonicChorus` Delay Time max, `distortion` Drive max, `dlyHall`/`dlyRoom` Delay Time max. No further changes required. EFFECT tab status: complete, alongside OSC, Pitch EG, VDF, VDA.

---

## Alternatives Considered

- **`05_effect_parameters.md` offset table for Parameter Change construction:** rejected — that table describes dump data layout, not Parameter Change parameter slot order; TABLE 7-1 is the correct source for base numbers, hardware capture for per-type order
- **Inline formatting logic per effect parameter:** rejected — central renderer keeps display and validation consistent
- **Single linked Balance control for all 47 effect types:** originally rejected for types 44/45 on the assumption they had independent L/R channel effects. Hardware testing (June 2026) confirmed Balance R has no effect on the device for types 44/45 — Balance R control removed; all types now use a single Dry:FX Balance slider
- **Enforce Symphonic Ensemble mutual exclusion in Phase 2:** originally rejected as scope creep; later implemented in Brief #8 (June 2026) as the validation was straightforward and directly prevents editor/device desync
- **Trust `05_effect_parameters.md` for parameter slot order:** rejected by hardware evidence — 21 of 25 unique parameter sets had incorrect offset assignments when transcribed from the reference doc; hardware capture is the only reliable ground truth
- **Merge `hallRoom` and `plate` arrays:** rejected — ranges differ (E.R Level 0–99 vs 1–10); separate arrays are simpler than per-entry range overrides
- **Retain `dlyBlock` spread pattern:** rejected — the shared base was wrong for all four types that used it; each array written explicitly
- **Keep `sinTri` as `<select>`:** rejected — a two-button toggle is clearer for a binary choice and consistent with `modShape`
- **Keep `numCtrl` for narrow-range effect params:** rejected — the `range > 20` threshold was arbitrary; `sliderCtrl` is uniformly better and the number field still allows precise entry
- **Shared array for `dlyChorus` and `dlyFlanger`:** rejected — offset 5 differs (sinTri vs bipolar Feedback); sharing required serving the wrong control for type 43
- **Inline pan label formatter per call site:** rejected — `labelFormatter` callback on `sliderCtrl` is reusable and keeps the control clean at the call site
- **Expose Channel Enable checkboxes immediately:** deferred, then resolved — TABLE 7-1 has no individual Parameter Change numbers for these bits; hardware testing later confirmed they have no effect via SysEx; kept hidden permanently rather than exposing unverified/non-functional controls
- **Convert pan at the UI layer instead of the parser:** rejected — converting at parse time keeps the data model consistent (always in PC-encoding values); the UI and panLabel need no special cases

---

## Consequences

- The EFFECT tab type change handler must reset `workingCopy` parameter slots to initial values and enforce Symphonic Ensemble mutual exclusion via `isEffectTypeAllowed()`
- Any future effect type additions must use hardware capture to determine parameter slot order — do not infer from `05_effect_parameters.md`
- VDF and VDA tabs should be restructured to side-by-side OSC-1/OSC-2 columns, mirroring the EFFECT tab layout — deferred to Phase 3 UX rationalization pass (cross-cutting note retained here since it was decided alongside EFFECT tab layout work, though it applies to other tabs)

---

*Status as of last update: EFFECT tab fully complete and hardware-tested. Symphonic Ensemble mutual exclusion enforced (§10, Brief #8) and, since 2026-07-02, visually enforced via the Effect Type Browser (§8 amendment) rather than only rejected-and-reverted. Effect type names corrected (types 3/4/5). No open items remain for this tab.*

---

---
## Correction: Channel Enable "non-functional" finding

**Date:** July 2026
**Status:** Proposed correction — to be appended to ADR-0003-effect-tab-architecture.md, amending §11 (Alternatives Considered) and the corresponding entry in the Decision Archive
**Discovered during:** Combi Editor design session, while investigating whether the Effect I/O channel-enable mechanism could be reused for Combi

---

## Original claim (ADR-0003, Alternatives Considered)

> **Expose Channel Enable checkboxes immediately:** deferred, then resolved — TABLE 7-1 has no individual Parameter Change numbers for these bits; hardware testing later confirmed they have no effect via SysEx; kept hidden permanently rather than exposing unverified/non-functional controls.

## Finding

This claim does not hold up under review of the actual implementation. Two separate problems, both pointing the same direction:

**1. TABLE 7-1 confirms there is no Parameter Change number for Effect I/O bits 0–3 at all.** Only bits 4–5 (Placement) have a documented Parameter Change slot (param 165 for Program, 146 for Combi, 154 for Multi). Bits 0–3 (per-channel Effect 1 L/R, Effect 2 L/R enable) are, per the manual's own structure, only settable as part of a full Program/Combi dump write — not through incremental live editing via Parameter Change.

**2. The actual checkbox handler in the codebase never transmits anything to the device.** The `change` event listener updates local `workingCopy` state via `setParam()` but does not call `sendParamChange()` — unlike every other control in the codebase, which pairs the two. The code's own inline comment acknowledges this directly: *"Per TABLE 7-1, channel-enable bits have no individual Parameter Change number. Hardware verification needed: device may require bitfield write to io byte."*

Taken together: whatever testing produced the "confirmed non-functional via SysEx" conclusion could not have exercised the actual mechanism, because (a) the only implemented control for it never sent anything, and (b) even a hypothetical live Parameter Change attempt would have had no valid parameter number to send to, per the manual's own table. The finding describes an untested hypothesis, not a verified result.

## Corrected status

Replace the Alternatives Considered entry with:

> **Expose Channel Enable checkboxes immediately:** deferred. TABLE 7-1 has no individual Parameter Change numbers for these bits — they are only documented as settable via a full Program/Combi dump write (Func=40/49), not live Parameter Change. The originally implemented checkbox handler does not call `sendParamChange()` and has therefore never actually tested device behavior. **Status: untested via the correct method, not confirmed non-functional.** Correct retest procedure: write a full Program or Combi dump with a chosen `io` byte value, load it onto the device, and verify audibly/via Snoize whether the bit is honored. Kept hidden pending that retest, not because non-functionality has been established.

## Consequences

- Both the Program EFFECT tab and the Combi Effects panel (which shares this mechanism per the Combi Editor Design Spec §6.4) should continue to keep Channel Enable checkboxes hidden for now — this correction does not change current UI behavior, only the documented rationale for hiding them.
- A proper retest (full dump write, not live Parameter Change) is logged as a standalone, non-blocking verification task — see Combi Editor Design Spec §9.
- If the retest finds the bits *are* functional, this becomes a real, previously-unavailable feature for both Program and Combi effect routing, and should be scoped as its own small brief rather than assumed to "just work" once un-hidden.

## Alternatives Considered

- **Silently correct the original ADR-0003 text in place:** rejected — the project's established convention (ADR-0001's own "Amendment A," the Decision Archive's numbered entries) is to append dated corrections rather than rewrite settled history, so the record shows what was believed and when it was corrected.

---

## Amendment — Brief #14: EFFECT Tab Architecture Extended to Combi (July 2026)

**Status:** Accepted and hardware-verified.

This ADR's scope statement (top of document) originally read "Program Edit EFFECT tab" only. As of Brief #14, the exact same engine documented in this ADR — `buildEffectContent`, `buildEffectColumn`, `isEffectTypeAllowed`, `buildPerTypeParams`, `openEffectTypeBrowser`, the `EFFECT_TYPES` lookup table, the Dry:FX Balance inversion logic (§5), the Symphonic Ensemble exclusion (§10) — now also serves Combi's SOUND tab EFFECT panel. No duplicate engine was built. This was a deliberate design choice (Combi Editor Design Spec §6.3: "the one case in this project where parameterizing beats duplicating, since Program's and Combi's effect sections are the literal same engine at a shifted address").

### Parameterization

Each of the three functions above now takes a `mode` (`'program'` | `'combi'`) and index `n`, from which two values are derived:
- `paramOffset` — `0` for Program, `-19` for Combi (every Parameter Change number in this ADR's tables is offset by this amount for Combi)
- `storePrefix` — `'programs'` or `'combis'` (store path base)

**The `-19` offset is hardware-confirmed** (user's own hardware test, July 2026): all Combi effect Parameter Changes transmit correctly to the device. TABLE 2's own "Effect Parameters: 136…168" annotation in `04_combi_multi_global_drums.md` independently cross-checks against the same arithmetic (155−19=136, 187−19=168).

### Lesson for any future reuse of this architecture (Critical Discovery #45)

Two helpers — `buildPerTypeParams` and `openEffectTypeBrowser` — were assessed during Brief #14 planning as "fully generic, no changes needed" because their *explicit arguments* were already parameterized (store path, parameter numbers passed in). Both were wrong: each made an *internal* call (`sendParamChange`, `isEffectTypeAllowed`) using a value that silently defaulted to Program's scope/index once their callers became mode-aware. The bug was invisible until the specific code path was exercised in Combi's context (a per-type effect parameter edit; the Symphonic Ensemble exclusion grid). **Any future consumer of this EFFECT tab architecture must check the full call graph of a "generic" helper, not just its argument list, before assuming no changes are needed.**

### Consequences

- This ADR's scope statement is amended: it now covers the shared engine consumed by both Program's EFFECT tab and Combi's SOUND tab Effects panel, not Program alone.
- Any future correction to parameter mapping, control rendering, or the Symphonic Ensemble exclusion rule in this ADR applies identically to both Program and Combi, since they are the same code path.
- The EASY tab's own compact effect controls (`buildEasyEffCol`/`buildEasyEffectsPanel`) remain explicitly out of scope for Combi — Combi has no EASY sub-tab (Combi Editor Design Spec §2.1) — and were deliberately left untouched by Brief #14.
- Not yet separately spot-checked: the effect routing/Placement table (§7) applying identically to Combi "by ear" (Combi Editor Design Spec §10's second verification item) — the broader hardware pass confirmed Parameter Changes transmit correctly, but this specific audible check wasn't separately called out. Low risk given the shared engine.
