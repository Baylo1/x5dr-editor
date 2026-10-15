# Korg X5DR Editor — Project Plan

*Last updated: 2026-10-07 — Release Plan C4: personal and machine references redacted (Archive #214); Phase 4 checklist brought up to date with the Release Plan; the MIDI Routing section is now a generic example.*

*Last updated: 2026-07-13 — Drums, originally absorbed into §2.2 Program Edit as an inner tab, has been relocated to its own top-level module (§2.6, Briefs #24–#26) — corrected below, since §2.6 previously described the now-superseded inner-tab architecture. ADR-0007 written for the relocation's cross-cutting architecture. This closes out Phase 2 in full except for the Patch Librarian (§2.7, deliberately deferred to v1.1). See `X5DR_Editor_Progress_Log.md` for current status and `X5DR_Editor_Decision_Archive.md` (#86–#92) for full detail.*

*Last updated: 2026-07-10 — Multi Setup Module (§2.4, Briefs #17–#22) and Global Module (§2.5, Brief #23) are both now complete and hardware-verified, closing out Phase 2 in full except for the Patch Librarian (§2.7, deliberately deferred to v1.1). ADR-0005 (Multi) and ADR-0006 (Global) written for their respective cross-cutting architectures. §2.5's checklist below is corrected from its original drafted form: User Scale's range is ±99, not the ±50 this document previously (and TABLE 5's original transcription also) assumed — hardware-confirmed during the Global design session, see Decision Archive #82–#83. See `X5DR_Editor_Progress_Log.md` for current status and `X5DR_Editor_Decision_Archive.md` (#60–#85) for full detail on both modules.*

---

## Overview

A browser-based software editor for the Korg X5DR rack-mount synthesizer, enabling real-time parameter editing via MIDI/SysEx. Built as a single HTML/CSS/JS file using the Web MIDI API. Targeted at Chrome and Edge only.

**Development machine:** the development Mac (no hardware connected)
**Test/performance machine:** the hardware-test Mac (X5DR via the owner's MIDI interface, the owner's MIDI keyboard via USB)
**Primary build tool:** Claude Code (terminal-based)
**Design reference:** Korg M1 VST plugin aesthetic

---

## Phase 0 — Project Setup

*Goal: All tools and infrastructure in place before any code is written.*

- [x] Create Claude Project (claude.ai)
- [x] Upload Project Context document to Claude Project
- [x] Set up local project folder on Mac (`~/Projects/x5dr-editor` or similar)
- [x] Install Claude Code
- [x] Download and install VS Code
- [x] Install Live Server extension in VS Code (by Ritwick Dey) — required for Web MIDI over `http://localhost`
- [x] Verify and correct MIDI reference files (00–07) against original manual
- [x] Upload verified MIDI reference files to Claude Project
- [x] Set up GitHub repository and connect local folder
- [x] Install VS Code and Live Server on the hardware-test Mac
- [x] Clone GitHub repository on the hardware-test Mac
- [x] Confirm MIDI routing architecture (editor direct to the interface — IAC not needed)
- [x] Confirm Web MIDI enumerates the interface's ports directly in Chrome
- [x] Confirm SysEx reaches X5DR and Parameter Change works with Mode Change prerequisite

---

## Phase 1 — Technical Foundation

*Goal: Prove that the browser can talk to the X5DR. No aesthetics — just working communication.*

### 1.1 Web MIDI Proof of Concept
- [x] Confirm the owner's MIDI interface is enumerated as a MIDI port in Chrome (without IAC)
- [x] Confirm SysEx permission is granted (Chrome prompts on first use)
- [x] Send a test SysEx message to X5DR and observe response (LED flash confirmed)
- [x] Confirm Parameter Change (Func=`41`) works after Mode Change (Func=`4E`) prerequisite
- [x] Confirm OSC Mode change is audibly reflected in X5DR output

### 1.2 SysEx Communication Layer
- [x] Implement MIDI port selector (enumerate available ports, user picks send/receive)
- [x] Implement SysEx message builder (header `F0 42 3g 36`, function code, data, `F7`) — `src/midi/sysex.js`
- [x] Implement Mode Change message (`Func=4E`, sent automatically before Parameter Change or dump request)
- [x] Implement Parameter Change message (`Func=41`, 2-byte param number, 2-byte value)
- [x] Implement ACK/NAK handler (`23`/`24` responses from X5DR, with 100ms de-duplication)
- [x] Implement 7-bit data packing/unpacking (`pack7bit` / `unpack7bit` per NOTE 1 in `02_sysex_format.md`)
- [x] Implement `encodeParamValue` — NOTE 12 sign-flag encoding for signed parameter values
- [x] Set up Vitest for unit testing the communication/data layer (`npm test`, `vitest run`)
- [x] Write Vitest tests: message builder, 7-bit packing/unpacking, ACK/NAK handler (29 tests)
- [x] Test: send Mode Change then Parameter Change and confirm X5DR ACKs

### 1.3 Dump Request & Receive
- [x] Implement dump request message — `buildDumpRequest(funcCode, withPadding)` *(note: Func=`10` requires `withPadding=false` — no `00` byte)*
- [x] Implement SysEx receive buffer and message assembly
- [x] Implement `parseSnapshot` / `parseProgram` / `parseGlobal` / `parseDrums` — `src/midi/parser.js`
- [x] Write Vitest tests: dump parser using real `.syx` files as fixtures (29 tests; 59 total)
- [x] Test: request program dump from X5DR, parse it, confirmed name and OSC mode correct from live device

### 1.4 Data Model
- [x] Conduct data model grill session — define internal JS patch data structure
- [x] Define `Snapshot`, `Program`, `Combi`, `Global`, `DrumKit`, `DrumNote`, `Effects`, `Timbre` shapes
- [x] Document in ADR-0001 (`docs/adr/ADR-0001-data-model-and-librarian-scope.md`)
- [x] Patch librarian scope decision: deferred to v1.1; data model designed to support it without structural changes

---

## Phase 2 — Structural UI

*Goal: Full navigable structure with real controls wired to real parameters. Functional, not beautiful. Data model defined in ADR-0001 is the contract for all UI work.*

**Status (2026-07-13):** Program Edit (§2.2), Combination Edit (§2.3), Multi Setup (§2.4), Global (§2.5), and Drums (§2.6) are all complete and hardware-verified (Drums was originally absorbed into §2.2 as an inner tab, then relocated to its own top-level module by Briefs #24–#26 — see §2.6). Phase 2 is now complete except for the Patch Librarian (§2.7), which remains deliberately deferred to v1.1.

### 2.0 Phase 2 Planning
- [x] Scoped planning session in Claude Chat before any Phase 2 Claude Code work begins
- [x] Define state management approach — pragmatic working copy, `setParam` write gateway, dirty tracking via Set
- [x] Define file load/save flow — File System Access API (`showOpenFilePicker` / `showSaveFilePicker`)
- [x] Define navigation structure — BROWSER | PROG | COMBI | MULTI | GLOBAL
- [x] Clarify Drums scope — OSC mode within Program Edit, not a top-level module; Func=53 for drum parameter changes *(this original scoping was reversed by Briefs #24–#26, July 2026 — see §2.6, ADR-0007)*
- [x] ADR-0002 created *(cross-cutting Phase 2 architecture only — EFFECT tab content later split to ADR-0003)*

### 2.1 Application Shell ✅ Complete
- [x] `buildDrumParamChange` added to `src/midi/sysex.js` (Func=53) with Vitest tests *(later rewritten to 3-arg hardware-verified format — see 2.2)*
- [x] `src/state/store.js` — working copy store: `loadSnapshot`, `getParam`, `setParam`, `revertParam`, `isDirty`, `clearDirty`; 17 Vitest tests
- [x] `src/midi/encoder.js` — `snapshotToSyx` stub (returns empty `Uint8Array`)
- [x] `src/index-phase1.html` — Phase 1 proof-of-concept preserved
- [x] `src/index.html` rebuilt as Phase 2 shell:
  - [x] Top-level navigation: BROWSER, PROG, COMBI, MULTI, GLOBAL tabs
  - [x] MIDI port selector (auto-selects any X5/X5D/X5DR port by name, case-insensitive; persistent in header)
  - [x] Connection status indicator dot (grey / green / yellow / red)
  - [x] BROWSER tab: PROGRAMS / COMBIS sub-tabs; patch table populated from loaded Snapshot; click row → switches to editor tab
  - [x] PROG, COMBI, MULTI, GLOBAL: placeholder panels
  - [x] Load .syx — File System Access API; parses via `parseSnapshot`; populates browser
  - [x] Save .syx — File System Access API; disabled until snapshot loaded; writes encoder output (stub = zero bytes)
  - [x] Request Dump — sends Mode Change + Func=0F; settles incoming dump messages after 500ms; calls `loadSnapshot`
  - [x] `awaitingDump` flag — spontaneous X5DR dumps (from front panel button presses) are ignored; only explicit Request Dump clicks trigger snapshot update
  - [x] `item?.name` guard in browser table — prevents crash from `parseCombi` stub returning null records
- [x] Fixed `parser.test.js` fixture path: `reference-sysex/` → `reference_sysex/`
- [x] 82 Vitest tests passing (3 test files)

### 2.2 Program Edit Module
- [x] Inner tab structure: Easy, OSC, Pitch EG, VDF, VDA, EFFECT *(Pitch EG tab to be eliminated by Brief #7)*
- [x] OSC tab — Mode (Single/Double/Drums), Assign, Hold; OSC-1 and OSC-2 full sections; Pitch MG (10 params per OSC); Drums kit selector; dynamic re-render on mode change
- [x] Patch selection: Program Change + Mode Change sequence; eager Mode Change on selection; unsaved edits `confirm()` guard
- [x] `numCtrl` input clamping — clamps typed values to [min, max] and updates field before sending
- [x] Pitch EG tab — Start Level, Attack Time/Level, Decay Time, Release Time/Level, Time/Level Vel Sense; After Touch and Pitch Bend/Mod Wheel routing params *(to be absorbed into OSC tab and CONTROL tab by Brief #7)*
- [x] VDF tab — per-OSC: Cutoff, KBD Track Key, Cutoff KBD Track, EG Intensity, EG Time KBD Track, EG Time/Int Vel Sense; VDF EG 8-point envelope; EG time mods by Vel and KBD Track
- [x] VDA tab — per-OSC: Level, KBD Track Key, AMP KBD Track Int, AMP Velocity Sense, EG Time KBD Track, EG Time Vel Sense; VDA EG 8-point envelope; EG time mods
- [x] **EFFECT tab** — complete and hardware-tested; full architecture and parameter mapping documented in ADR-0003 (split out of ADR-0002)
- [x] OSC copy/paste utility: copy OSC-1 → OSC-2 (shared params only; OSC-2-only params left at current values)
- [x] `editMode` state (replaces `modeChangeSent` boolean) — supports `null`/`progEdit`/`global`; mode-aware NAK recovery; extensible for future Combi/Multi/Global modules
- [x] Drum mode editor — original implementation (Brief #3): a DRUM EDITOR inner tab (visible only when `osc.mode = 2`); ROM kit read-only list (8 ROM kits); user kit two-panel editor (key-sorted slot list + 9-param detail); automatic Global↔Prog Edit mode switching on tab entry/exit; `buildDrumParamChange(dumpIndex, paramNo, value)` rewritten to hardware-verified 3-arg 11-byte format; all hardware-verified including EFFECT tab interop. **Relocated out of Program Edit to a new top-level DRUMS module by Brief #25 (July 2026) — see §2.6, ADR-0007.** The 60-slot list/detail editor itself carried over unchanged; only its placement, Mode Change wiring, and nav-tab integration were rebuilt.
- [x] OSC-2 Pitch EG Int gated to Double mode only (was incorrectly shown in Single/Drums)
- [x] Effect type change off-by-one bug fixed (loop `off < 8` → `off < 7`; was silently resetting OSC Mode to Single)
- [x] **Brief #4** — cross-tab parameter sync via `paramBus` / `subscribeTo` / `data-sync` attributes; `syncByKey` generic helper; Level OSC↔VDA sync; Pitch EG Int OSC↔Pitch EG sync
- [x] **Brief #5** — two-column layout for OSC, VDF, VDA tabs; Copy from OSC-1/OSC-2 buttons relocated to column tops; Cutoff MG full-width top panel with internal two-column split; hardware-verified
- [x] **Brief #6** — Easy tab: OSC panel (mode-aware), Envelopes panel (Pitch EG/VDF/VDA side by side with SVG displays and 1/2 toggles in Double mode), Mod Wheel panel, Effects panel; full cross-tab sync; SVG superimposition in Double mode; implemented, **hardware verification pending**
- [x] **Brief #7** — Controllers tab + OSC Pitch EG absorption: new CONTROL tab (Pitch Bend / After Touch / Mod Wheel / AT+Mod Wheel sections); Pitch EG content moved to OSC tab as full-width bottom panel; Pitch EG tab eliminated; Pitch MG controller params removed from OSC tab; final tab bar: EASY | OSC | VDF | VDA | CONTROL | EFFECT. Brief written, ready for Claude Code.
- [x] **Brief #11 + post-brief refinements** — Multisound (OSC tab, EASY tab), Drum Sound (Drum Editor Inst No.), and Effect Type (EFFECT tab, EASY tab) `<select>` pickers all replaced with `buildSoundField` (bounded name field + hover-pencil icon) opening a modal grid browser (`buildSoundGridTable` — column-major, category-filtered, blue selection highlight, Cancel/X/Escape revert). Category filters: `MULTISOUND_CATEGORIES` (13), `DRUM_SOUND_CATEGORIES` (13), `EFFECT_TYPE_CATEGORIES` (8, consolidated from the original 17 `EFFECT_TYPE_NAMES` groups). Symphonic Ensemble mutual exclusion (§2.2a) is now visually enforced — excluded types greyed out and unselectable in the Effect Type Browser grid, not just rejected-and-reverted. Fully hardware-verified, including two hardware-caught interaction bugs (double-click/Enter confirm-and-close, hover hiding the selection highlight) found and fixed. See ADR-0002/ADR-0003 amendments and Decision Archive #29–#35.

### 2.2a Encoder & Write-Back
- [x] Implement `snapshotToSyx` in `encoder.js` — full bank Func=50 encoder with trimmed 7-bit packing (inverse of `parseSnapshot`)
- [x] Implement single-program dump send (`Func=40`) via `buildSingleProgramDump` — push edited program into device edit buffer
- [x] Implement Program Write Request (`Func=11`) — commit edit buffer to device memory at specified slot (0–99); handle Write Completed (`Func=21`) and Write Error (`Func=22`) responses
- [x] Write / Save / Cancel buttons in PROG editor header; Abandoned Edits modal for nav-away-while-dirty
- [x] Symphonic Ensemble (type 24) mutual exclusion enforced *(moved from §3.3)*
- [x] Program rename UI — inline name editing in PROG header; pencil icon (hover-visible) + double-click trigger; live `0x20–0x7E` sanitization; `setParam` dirty integration; browser row sync via `refreshBrowserRow()`; encoder pads name to 10 `0x20` bytes; 5 Vitest tests added; hardware-verified (Brief #9)
- [x] Write All Data (DEVICE menu) — `sendAllDataDumpAndAwaitAck()` sends the entire workingCopy Snapshot as one Func=50 dump via `snapshotToSyx()` and awaits ACK/NAK; no Mode Change prerequisite and no separate write-request step (bulk dumps save directly to device memory on receipt, per `00_INDEX.md`/`02_sysex_format.md`); gated behind `window.confirm()` and a "no data loaded" guard; hardware-verified. Intended for pushing a factory/clean `.syx` to the device in one shot.

### 2.2b Browser / Navigation UX Design Session ✅ Complete
- [x] Design session in Claude Chat to resolve Browser tab role, footer file-operation relocation, and editor navigation model — produced `X5DR_Browser_Navigation_FileIO_Design_Spec.md`
- [x] Decided final home for file operations — FILE and WRITE header dropdown menus (not a dedicated LIBRARY tab as originally expected)
- [x] Resolved how editors access the browser (BROWSER toggle overlay, `openPatchBrowser()` / `cancelPatchBrowser()` / `confirmPatchSelection()` API)
- [x] Resolved dirty-state check scope: all file load/import flows gate at start of flow; browser selection checks before patch change; Write Browser checks at destination confirmation
- [x] Decisions captured in ADR-0002 (Amendment — Brief #10, below) and Decision Archive
- [x] **Brief #10 implemented and hardware-verified** — BROWSER toggle overlay, Patch Browser (audition/confirm/cancel with dirty-state resync), Write Browser (mode: 'source'/'load'/'write'), FILE/WRITE header dropdown menus (renamed WRITE → DEVICE during bug-fix closeout), `resyncDeviceProgramBuffer`, `writeProgramToSlot`, `replaceProgram` in store, `programsToSyx` encoder (Func=4C), `doSaveAllDataFlow` / `doSave1ProgramFlow` / `doSaveAllProgramsFlow`, Load 1 Program two-step flow, Import from Device (All Data Func=0x0F, Current Program Func=0x10). 125 Vitest tests passing. All backlog bugs Verified except B09 (Won't Fix).
- [x] **Brief #11 implemented and hardware-verified** — Multisound Browser and Drum Sound Browser (see §2.2 for the shared `buildSoundField`/`buildSoundGridTable` component family, reused for the Effect Type Browser too). New overlays share the Patch/Write Browser's `browserState` pattern (extended with `kind: 'multisound'|'drum'|'effectType'`) and the `.patch-table` grid CSS for visual/behavioral consistency. z-index scheme extended (`#nav` lowered to 120 relative to `#header`'s 150) to fix a FILE/DEVICE dropdown-clipping regression this surfaced. Escape wired to Cancel for all three new browsers.

### 2.3 Combination Edit Module ✅ Complete
- [x] Combination rename UI — same pattern as Program rename (Brief #9); name bytes in TABLE 2 dump positions 00–09. **Brief #13, hardware-verified.**
- [x] 8-timbre channel strip layout. **Brief #13, hardware-verified.**
- [x] Per-timbre: program selector (Bank A / Bank G, via a new Program Browser overlay), level, pan (sentinel corrected to `'prg'`/`'off'` per ADR-0001 Amendment C, not the originally-planned bare `null`), MIDI channel, enabled toggle. **Brief #13, hardware-verified.**
- [x] Per-timbre send levels: sendC, sendD. **Brief #13, hardware-verified.**
- [x] Per-timbre key zone / velocity zone (Key Window Top/Bottom 0–127, Vel Window Top/Bottom 1–127). **Brief #15, hardware-verified.**
- [x] Per-timbre MIDI filters: program change, damper, aftertouch, control change. **Brief #15, hardware-verified**, including checkbox polarity.
- [x] Combi-level effect section (shared `Effects` structure per ADR-0001) — reuses the Program EFFECT tab's exact engine via a `mode`/`n` parameterization and `-19` Parameter Change offset, rather than a separate implementation (see ADR-0003 amendment). **Brief #14, hardware-verified** (Combi = Program − 19 offset confirmed on real hardware).
- [x] Patch Browser Combi confirm-select (single-click audition; double-click/Enter/OK confirm), Write Combi (menu + in-place), Discard Edits, dirty-scope generalization (`getDirtyScope`), Abandoned Edits modal generalized for Combi, File menu (Load/Save/Import All & Single Combinations), Write All Combinations. **Brief #16, hardware-verified.**
- [x] Post-Brief-#16 hardware test cycle (four rounds) found and fixed eight bugs: device-mode-matches-active-subpanel, Cancel-from-Browser prior-context tracking, a mode-transition settling delay (fixes silent `0x26` after Discard/Write-then-continue flows, applied symmetrically to Program too), Abandoned modal `onStay`, scoped bulk-import merge-vs-replace, browser auto-focus ordering, and A:B Pan "Off" signed-value encoding (also fixed for Program's OSC Pan controls, which shared the same bug). Full detail: ADR-0004, Decision Archive #51–#59.

### 2.4 Multi Setup Module ✅ Complete
- [x] 16-Track SOUND tab layout (`buildTrackRow`) — Active (Track SW), Program (Bank A/G via the shared Program Browser), Level, Pan, Send C/D, Transpose, Detune, Bend Range. Live Parameter Change path confirmed for all nine TABLE 9 fields (contradicting the Function Code List's blank "M" column). **Brief #18, hardware-verified.**
- [x] CONFIG tab — per-Track Key/Vel Window, the four Control Filters, and MIDI Channel; no live Parameter Change path exists for any of these (confirmed via hardware capture), so they sync via a debounced Func=0x68 (Expansion) send instead. **Brief #20, hardware-verified.**
- [x] EFFECT panel — reuses the literal same engine Program/Combi use, at a `Program − 11` Parameter Change offset (confirmed via two independent hardware captures), plus the cross-mode Copy Effects control. **Brief #19, hardware-verified.**
- [x] 22A Copy from Combination modal — bulk-copies an existing Combi's 8 Timbres into Tracks 1–8 or 9–16, with an optional Effects copy. **Brief #21, hardware-verified.**
- [x] Navigation, dirty-state exclusion (`setParamQuiet` so `multi.*` never pollutes the shared dirty flag), File I/O (Load with auto-push, Save, Import from Device — both Func=0x55 Effects and Func=0x68 Expansion), and the Patch Browser's Multi-scope Cancel handling. **Brief #22, hardware-verified.** Multi has no on-device persistent slot and no Write Request function code — the dump itself is the only way loaded/edited data reaches the device (no Write menu entry, no destination picker).
- [x] Full architecture, all ten cross-cutting decisions, and every post-implementation hardware fix documented in ADR-0005.

### 2.5 Global Module ✅ Complete
- [x] Master tune (-50 to +50), key transpose (-12 to +12). **Brief #23, hardware-verified.**
- [x] Velocity curve and aftertouch curve selectors (display as 1–8; store as raw 0–7). **Brief #23, hardware-verified.**
- [x] Main and sub scale type and key (11-entry `SCALE_TYPES`, 12-entry `KEY_NAMES`). **Brief #23, hardware-verified.**
- [x] User scale tuning (12 notes, **-99 to +99 each** — corrected from this document's original ±50, which matched TABLE 5's since-refuted transcription; hardware-confirmed via two boundary-value wire captures, Decision Archive #82–#83). Always editable regardless of Main Scale Type — not gated, since it's one table shared with Sub Scale Type (Decision Archive #85). **Brief #23, hardware-verified.**
- [x] Global has no Parameter Change table at all — every field syncs via a debounced full Func=0x51 dump send (`scheduleGlobalSync`, reusing Multi's `createDebouncer` utility), never a live per-field path. No MIDI Channel control — confirmed structurally unreachable via SysEx (it lives in the SysEx header's own channel byte, and the device silently ignores any message not addressed to its current channel; Project Context Landmine #57).
- [x] Full architecture documented in ADR-0006.

### 2.6 Drums Module ✅ Complete (top-level module, Briefs #24–#26)
~~Originally absorbed into §2.2 Program Edit Module as a DRUM EDITOR inner tab (see §2.2's own checklist for that original implementation).~~ A design review (July 2026) found this placement misleading: Drum Kit editing (Func=52/53) has no Edit Buffer or Write Request — the same persistence shape as Multi Setup (§2.4), not Program/Combi's two-step model — so housing it inside Program Edit implied a save/discard lifecycle that doesn't exist. The same review also found a live, pre-existing bug: `drums.*` edits were polluting the shared dirty-state tracking Set. Relocated to its own top-level `DRUMS` module across three briefs, sequenced for incremental hardware verification (mirroring Combi's and Multi's own brief sequencing):

- [x] **Brief #24** — `drums.` dirty-scope exclusion fix in the local `setParam` wrapper, mirroring the existing `multi.`/`global.` branches. Small, isolated, landed first. Hardware-verified.
- [x] **Brief #25** — top-level `DRUMS` nav tab: relocates the 60-slot list/detail editor unchanged; adds a standalone Kit 1/Kit 2 selector (decoupled from any Program's own kit field); Mode Change entry/exit wiring; a narrowly-scoped PROG↔DRUMS nav-gate exception (only this one edge skips the dirty-check gate, in both directions); a generic, reusable "dirty scope elsewhere" banner component. First hardware test found and fixed two further bugs: DRUMS→PROG was silently discarding a dirty Program's device-side edit buffer (a stale function reused past the assumption it depended on), and the device silently reassigns a colliding Drum Key to the nearest free key instead of rejecting it (fixed by filtering the Key dropdown to only ever offer free keys). Both hardware-confirmed fixed.
- [x] **Brief #26** — two independent, pure-read additions, no SysEx traffic: a read-only Kit Summary table in the Program Edit OSC tab (one unified column-major table for both User and ROM kits, reusing the Patch Browser's own grid-fill convention rather than a fixed cell count); and a "Used By" cross-reference listing in the DRUMS tab (which loaded Programs/Combinations/Multi Tracks reference the selected kit, with Bank G correctly excluded as a structural non-match). Resolution logic extracted into a unit-tested pure module, `src/state/drumCrossReference.js`. Browser-verified; no hardware needed.

Full architecture, all ten cross-cutting decisions, and both post-implementation hardware fixes documented in ADR-0007.

### 2.7 Patch Librarian *(deferred to v1.1 — do not build in v1.0)*
- [ ] File import: read `.syx` files via File Picker, parse by function code
- [ ] Individual Patch (Program or Combi) extraction from Snapshot
- [ ] Patch list display with drag-to-slot assembly
- [ ] Combi program slot dependency warning (slot renumbering risk)
- [ ] Export assembled Snapshot to `.syx`

---

## Phase 3 — Visual Design

*Goal: Apply the M1-inspired aesthetic. Purely additive — no structural changes.*

### 3.1 Design System ✅ Complete
- [x] Colour palette and tokens — three themes (Warm Graphite, Cool Slate, Acid Archive) plus a value-colour option (`docs/design spec docs/`, private archive; Archive #99–#100)
- [x] Typography (Inter UI, IBM Plex Mono readouts)
- [x] Control styles: rotary knobs, sliders, toggles, dropdowns (`src/ui/controls.js`, Control Component Spec)
- [x] Panel/card borders and depth treatment

### 3.2 Apply Design ✅ Complete
- [x] Application shell and navigation tabs
- [x] Every tab retrofitted onto the component library and hardware-verified (PROG's 6 sub-tabs, COMBI, MULTI, GLOBAL, DRUMS — Archive #128–#165, ADR-0008)
- [x] SVG envelope curve displays with draggable points (`egCurveWidget`, Archive #117–#118)
- [x] Rotary knob rendering (SVG)

### 3.3 Refinement *(polish pass still open)*
- [x] ~~Enforce Symphonic Ensemble (type 24) mutual exclusion in EFFECT tab type selectors~~ *(done in §2.2a, Brief #8)*
- [x] Responsive layout: accepted as a fixed 1400px canvas, no responsive intent below ~1200px (Archive #98, #137)
- [ ] Keyboard accessibility review *(overlay Tab focus-trap and focus ring done, Archive #167)*
- [ ] Cross-browser check (Chrome vs Edge)
- [ ] Final UX pass — label clarity, control grouping, visual hierarchy

---

## Phase 4 — Distribution & Release

*Goal: Make it available to other X5DR users with minimal friction.*

- [x] **Single-file distribution build** — `npm run build` (`scripts/build.mjs`) inlines all 11 `src/` modules and embeds the fonts into `dist/index.html` (Archive #200); hardware smoke test passed, and the built file works over `file://` in Chrome and Edge (Release Plan A2, Archive #202–#203, Landmine #103). Release steps: `X5DR_Editor_Release_Plan.md`.
- [x] CI and Deploy workflows: CI tests and builds every pushed branch; Deploy publishes to GitHub Pages on a published Release (Release Plan A3, Archive #207)
- [ ] Set up GitHub Pages hosting (serve `dist/index.html`) — Release Plan E5–E6
- [x] MIT License added to the repo and `index.html` (SPDX identifier)
- [x] In-app Help menu: Getting Started, Troubleshooting, Report a Problem, Copy Diagnostics, About (Archive #181, #182); release text (Release Plan C2, Archive #212)
- [x] Title bar color and `manifest.json`; app icons and local install done (Release Plan B1–B2, Archive #209, #211)
- [x] Write user-facing README (setup instructions, Chrome requirement, port selector guidance) — Release Plan C3, Archive #213
- ~~Write Windows setup notes (loopMIDI equivalent of IAC Driver)~~ — obsolete: the editor talks to the MIDI interface directly (Archive #199)
- [ ] Test on a clean machine (no prior setup) — Release Plan E7
- [ ] Tag v1.0 release on GitHub — Release Plan E6 (`v1.0.0`)

---

## MIDI Routing — Example Setup

*The original hardware-test setup, with the gear named generically.*

| Component | Connection |
|---|---|
| MIDI keyboard | USB → computer |
| 2-port USB MIDI interface | USB → computer |
| X5DR | MIDI In/Out → interface port 2 |
| Editor app | Chrome → Web MIDI → interface port 2 (direct, no IAC) |
| Keyboard → X5DR | The DAW (Reason) routes keyboard input → interface port 2 output |

**Editor + DAW running simultaneously:**
- Editor sends SysEx directly to interface port 2 via Web MIDI
- The DAW routes keyboard note data to interface port 2 independently
- The interface merges both streams in hardware — no conflict, no IAC needed

**Why IAC is not required:**
- Reason drops SysEx and cannot act as an intermediary for the editor (Landmine #8)
- Chrome's Web MIDI API enumerates the interface's ports directly by name
- The editor addresses the interface's output port (e.g. `Korg X5DR <interface>`) directly

**Standalone editor sessions (without a DAW):**
- No additional routing software needed — editor talks directly to the interface

---

## Key Reference Files

| File | Contents | Status |
|---|---|---|
| `X5DR_Editor_Project_Context.md` | Master project context, architecture, Landmines (always-read non-obvious facts) | ✅ Current |
| `X5DR_Editor_Progress_Log.md` | Current status, next actions, known outliers — slim, read every session | ✅ Current |
| `X5DR_Editor_Decision_Archive.md` | Full decision history and hardware discovery write-ups — read on demand | ✅ Current |
| `docs/adr/ADR-0001-data-model-and-librarian-scope.md` | Data model contract: Snapshot, Program, Combi, Global, DrumKit, Effects shapes; librarian deferred to v1.1 | ✅ Current |
| `docs/adr/ADR-0002-phase2-architecture.md` | Cross-cutting Phase 2 architecture: state management, file load/save, navigation structure, drums scope, mode state, framework choice | ⚠️ Amended for Briefs #1, #3, #4, #7, #10, #11, and post-Brief #14 hardware test; now points to ADR-0004 for its two now-stale Combi-specific sections. Its Drums-scope decision (OSC mode within Program Edit, not top-level) is superseded by ADR-0007 |
| `docs/adr/ADR-0003-effect-tab-architecture.md` | Program Edit EFFECT tab (now shared with Combi's SOUND tab EFFECT panel — see Brief #14 amendment): parameter mapping, control rendering, hardware corrections (split out of ADR-0002) | ⚠️ Amended for Brief #8, 2026-07-02 (Type Selector → Effect Type Browser), and Brief #14 (extended to Combi, hardware-verified) |
| `docs/adr/ADR-0004-combi-editor-architecture.md` | Combi editor cross-cutting architecture (Briefs #12–#16): data layer, Parameter Change addressing, dirty-scope generalization, write/cancel flows, and the eight post-implementation hardware fixes | ✅ Current |
| `docs/adr/ADR-0005-multi-editor-architecture.md` | Multi editor cross-cutting architecture (Briefs #17–#22): Track/Timbre wire-format reuse, live Parameter Change addressing, CONFIG-tab debounced sync, dirty-state exclusion, no-non-volatile-slot file I/O model, and post-implementation hardware fixes | ✅ Current |
| `docs/adr/ADR-0006-global-editor-architecture.md` | Global editor cross-cutting architecture (Brief #23): dump-only data layer, wire format, MIDI-channel-unreachability finding, ±99 User Scale correction, debounced sync, and the User Scale gating reversal | ✅ Current |
| `docs/adr/ADR-0007-drum-editor-architecture.md` | Drum Editor relocation (Briefs #24–#26): top-level DRUMS module rationale, dirty-scope fix, nav-gate exception, the dirty-edit-buffer-discard and Drum-Key-collision hardware fixes, and the OSC-tab summary/cross-reference additions | ✅ Current — new this session |
| `00_INDEX.md` | SysEx header, function codes, device identity, operational notes | ✅ Updated |
| `01_channel_messages.md` | CC map, RPN, Program Change | ✅ Verified |
| `02_sysex_format.md` | SysEx formats, data packing | ✅ Verified |
| `03_program_parameters.md` | Program parameter tables | ✅ Verified |
| `04_combi_multi_global_drums.md` | Combi, Multi, Global, Drums tables | ✅ Verified |
| `05_effect_parameters.md` | 47 effect types, parameter detail | ⚠️ Labels/ranges mostly reliable; parameter slot ORDER not reliable — see Decision Archive, Critical Discovery #11 |
| `06_multisound_names.md` | Multisound name list (000–429) | ✅ Verified |
| `07_drum_sound_names.md` | Drum Sound name list (000–214) | ✅ Verified |

---

## Development Principles

1. **Build in layers** — prove communication before building UI; prove structure before applying aesthetics
2. **Read the reference files before writing any MIDI code** — byte addresses and value ranges must be exact
3. **Data model stores raw values; UI handles display conversion** — e.g. velocity curve stored as 0–7, displayed as 1–8; conversion happens only at the UI boundary
4. **Store-side sentinels are field-specific — check ADR-0001 before assuming a blanket convention.** Neither pan nor Send C/D actually use `null` today, despite this principle's original wording: pan uses string sentinels (`'prg'`/`'off'`, Amendment C); Send C/D use a plain raw number (`10` = PRG, Amendment D), no `null` at all. Wire-side encoding is a separate question from store-side representation — don't assume a sentinel's own dump-byte value is safe to resend verbatim as the live Parameter Change value. Signed 14-bit fields (NOTE 12) need their off/sentinel state sent as `-1` (encodes to `7F 7F`), not the raw unsigned dump byte (e.g. Pan's `0xFF`/255, which encodes to `7F 01` and is silently ignored by the device) — `-1` is the *correct* wire value here, not a magic number to avoid (Project Context Landmines #13, #44)
5. **Test the communication and data layer with Vitest** — message builder, 7-bit packing, ACK/NAK handler, and dump parser are deterministic and testable; UI is not
6. **Distribute as a single file** — keep the final app self-contained for maximum distribution simplicity
7. **Don't style until it works** — Phase 3 is purely additive

**MIDI protocol gotchas (Mode Change prerequisite, dump padding, effect parameter slot order, byte-split artifacts, and more) are documented once, in `X5DR_Editor_Landmines.md` — consult that instead of duplicating them here.**

---

*This document was originally maintained in the owner's private notes. Update checkboxes as tasks are completed. Data model contract is in ADR-0001 — consult before any Phase 2 Claude Code work.*
