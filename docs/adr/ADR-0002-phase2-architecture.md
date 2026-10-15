# ADR-0002 — Phase 2 UI Architecture

**Date:** June 2026
**Status:** Accepted
**Scope:** Cross-cutting Phase 2 architecture, applicable to all Program Edit, Combination Edit, Multi Setup, and Global modules. Tab-specific implementation decisions (parameter mappings, control rendering, per-feature corrections) belong in their own ADRs — see ADR-0003 (EFFECT tab) as the precedent. Future Combi/Multi/Global modules should each get their own ADR when a scoped planning session is held for them, rather than appending to this document.

---

## Context

Before building the Phase 2 structural UI, a scoped planning session was conducted to make the key architectural decisions that Claude Code needs as a contract. These decisions cover state management, file load/save flow, navigation structure, and the scope of the Drums module.

---

## Decisions

### 1. State Management — Pragmatic Working Copy

The UI uses a **working copy** pattern:

- On load, the `Snapshot` object is deep-cloned into a `workingCopy` object
- All UI controls read from and write to `workingCopy` — never directly to the original `Snapshot`
- All writes go through a single `setParam(path, value)` function — no direct property mutation anywhere in the UI layer
- A `dirtyParams` Set tracks which parameter paths have been changed since load
- On NAK: revert the `workingCopy` entry to its previous value and remove from `dirtyParams`
- On successful save/send: clear `dirtyParams`
- On navigation away from an edited patch (e.g. selecting a new program from the Browser): if `store.isDirty()`, show a confirmation dialog before proceeding; clear `dirtyParams` only if the user confirms Discard

**Why `setParam` as the single write gateway:** it is the future insertion point for undo history (v1.1). By routing all writes through one function now, adding a history stack later requires no refactoring of UI controls.

**Undo is deferred to v1.1.** The `setParam` function is designed to accept it without structural change.

**Navigation guard — every patch selection must check `store.isDirty()`** before replacing the working copy. The current implementation uses a browser `confirm()` dialog (Discard / Cancel). A proper modal will replace this in Phase 3, but the guard logic must be present from Phase 2 onwards. Silently discarding dirty state is not acceptable — the user's edits exist only in `workingCopy` until explicitly saved or written to the device.

### 2. Load Sources — Both Supported in v1.0

Both load paths produce a `Snapshot` object and feed it through the same `loadSnapshot(snapshot)` function. The UI does not need to know which source was used.

- **File load:** `window.showOpenFilePicker()` → read binary → `parseSnapshot(messages)` → `loadSnapshot(snapshot)`
- **Live dump:** "Request Dump" button → SysEx receive buffer → `parseSnapshot([message])` → `loadSnapshot(snapshot)`

### 3. File Save — File System Access API

Save uses `window.showSaveFilePicker()`, which presents an OS-level save dialog. The user chooses location and filename. The OS handles overwrite confirmation. This is Chrome/Edge only, consistent with the project's browser target.

**Why not browser download (`URL.createObjectURL`):** download goes silently to the Downloads folder unless the user has configured Chrome to ask; this was considered inferior UX for a tool where users manage `.syx` files in specific locations.

### 4. Navigation Structure

Top-level navigation tabs: `BROWSER | PROG | COMBI | MULTI | GLOBAL`

| Tab | Description |
|---|---|
| BROWSER | Toggle view — full-screen patch list (100 programs or 100 combis from loaded Snapshot); click a patch to load it and switch to editor view |
| PROG | Program Edit module |
| COMBI | Combination Edit module |
| MULTI | Multi Setup module |
| GLOBAL | Global module |

**Drums is not a top-level tab.** It is an OSC mode (`osc.mode = 2`) within Program Edit. See Decision 5.

### 5. Drums Scope — OSC Mode Within Program Edit

The X5DR's Drums functionality is not a separate top-level mode — it is one of three OSC modes available within a Program (`osc.mode`: 0=Single, 1=Double, 2=Drums).

When `osc.mode = 2` (Drums):
- The OSC tab shows the kit selector (Kit 1, Kit 2, ROM 1–8), plus program-level OSC-1 parameters (Level, Octave, Pitch EG Int, Send C, Send D) and Pitch MG — all using `Func=41` (Program Parameter Change)
- A dedicated **DRUM EDITOR inner tab** appears (between OSC and VDF) containing the per-note slot editor (60 notes per kit × TABLE 10 parameters) — uses `Func=53` (Drum Kit Parameter Change)
- The VDF, VDA, CONTROL, and EFFECT tabs remain visible and functional — they show OSC-1/Single content and use standard `Func=41` parameter changes
- Drum kit parameters require **Global mode (`0x05`)**, not Prog Edit — the DRUM EDITOR tab sends Mode Change `0x05` on entry and `0x03` on exit automatically

**`buildDrumParamChange(dumpIndex, paramNo, value)`** — hardware-verified 3-argument format producing an 11-byte message: `F0 42 3g 36 53 00 ss pp vv vv F7`. `dumpIndex` = 0–59 (Kit 1) or 60–119 (Kit 2); `paramNo` = TABLE 10 number (0–9); `value` = NOTE 12 signed encoding. See Archive Critical Discovery #19.

**Status:** Complete and hardware-verified (Brief #3). See `X5DR_Editor_Progress_Log.md`.

### 6. JavaScript Framework — Vanilla JS

No framework (React, Svelte, Vue) will be used in Phase 2. Reasons:
- Single-file distribution requirement is incompatible with a build step
- The project is already established as vanilla JS (`type="module"` ES modules)
- Complexity does not yet justify the overhead

### 6a. Module Structure and Single-File Distribution

During development the app is **three files**: `src/index.html`, `src/midi/sysex.js`, `src/state/store.js`. `index.html` imports the `.js` files as ES modules via `<script type="module">`. This structure is intentional — it allows Vitest to unit-test the communication and data layer independently of the browser and hardware.

For distribution, the three files must be **inlined into a single `index.html`** so the app works by simply opening the file in Chrome with no server or dependencies. This is done as a one-time step at release time (Phase 4), not during development.

**Inlining approach:** Replace each `import` statement in `index.html` with the content of the imported module wrapped in an inline `<script>` block. This can be done manually or with a trivial build script (e.g. a short Node.js script or `esbuild --bundle`). The result is a fully self-contained HTML file.

**Why not inline from the start:** The Vitest test suite (82+ tests covering `sysex.js` and `store.js`) requires ES modules. Inlining during development would eliminate testability of the communication and data layer — an unacceptable tradeoff given the complexity of the SysEx encoding.

**Consequence for Phase 4:** Before tagging v1.0, produce a single-file `dist/index.html` by inlining all modules. Verify it opens and functions correctly in Chrome directly from the filesystem (`file://`) and from GitHub Pages.

### 7. Browser View — Patch Selector, Not Librarian

The `BROWSER` tab in v1.0 is a simple patch selector — a table of program or combi names from the currently loaded `Snapshot`. It is not a full librarian (no cross-file patch extraction, no curated collections). The v1.1 librarian will build on this foundation.

---

## Alternatives Considered

- **Inline all JS into `index.html` from the start:** rejected — eliminates Vitest testability of `sysex.js` and `store.js`; the 82+ unit tests covering the communication and data layer are too valuable to lose
- **Use a bundler (esbuild/webpack/rollup) during development:** rejected — adds tooling complexity for no benefit during development; a simple inline step at release time is sufficient
- **Full undo in v1.0:** rejected — history stack grouping logic is non-trivial in a real-time MIDI editor; better designed after using the editor in practice
- **Browser download for save:** rejected — silently saves to Downloads folder; inferior UX for file management
- **Drums as a top-level module:** rejected — contradicts how the X5DR itself structures drum kits (as a Program OSC mode); would require duplicating parameter change infrastructure unnecessarily
- **Drum note editor inline in the OSC tab:** rejected after initial implementation — the OSC tab became too busy, and drum kit editing requires Global mode (`0x05`) while all other OSC tab parameters require Prog Edit (`0x03`). Splitting into a dedicated DRUM EDITOR inner tab provides a clean mode-switching boundary
- **Hiding VDF/VDA/CONTROL/EFFECT tabs in Drums mode:** rejected after hardware testing — all four tabs expose program-level parameters that are functional and editable in Drums mode (they use OSC-1/Single content). Only the DRUM EDITOR tab requires Global mode

---

## Consequences

- All UI controls must call `setParam(path, value)` — never assign to `workingCopy` directly
- `loadSnapshot(snapshot)` is the single entry point for both file load and live dump
- `buildDrumParamChange(dumpIndex, paramNo, value)` in `sysex.js` — hardware-verified 3-arg format *(done — Brief #3)*
- The OSC tab in Program Edit dynamically switches content based on `osc.mode` *(done — all three modes complete)*
- The DRUM EDITOR inner tab requires automatic mode switching between Global (`0x05`) and Prog Edit (`0x03`) on tab entry/exit *(done — Brief #3)*
- The BROWSER tab requires knowing whether the user is in PROG or COMBI context to show the correct patch list
- Every patch selection handler must call `store.isDirty()` and guard before proceeding — this applies to the BROWSER, any future patch-selector dropdown, and any "next/previous patch" navigation
- Phase 3 (visual design) will style the BROWSER view to match the M1 VST browser aesthetic, and will replace the `confirm()` dirty-check dialog with a proper modal
- **Phase 4 build step required:** before release, inline `sysex.js` and `store.js` into a single `dist/index.html`; the development multi-file structure is not the distribution artifact

---

*Tab-specific architecture (EFFECT tab parameter mapping, control rendering, hardware-derived corrections) has been split out to its own ADR — see ADR-0003. This keeps this document focused on decisions that apply across all Phase 2 modules.*

---

## Amendment — Brief #10: Browser Overlay, Navigation, and File I/O (June 2026)

### Decision 4 amended — BROWSER changed from navigation tab to toggle overlay

The `BROWSER` tab in the top-level navigation is no longer a peer tab that switches `#content` panels. It is now a **toggle button** that opens a full-screen Patch Browser overlay on top of the current content panel.

**Rationale:** the Browser is a servant of the active editor (PROG/COMBI/MULTI) rather than a peer. The M1 VST interaction model — where browsing does not destroy the editor state — requires the editor panel to remain rendered and accessible behind the browser overlay.

**Patch Browser overlay API:**
- `openPatchBrowser()` — opens the overlay, calls `enterBrowserMode()`, saves `priorProgIndex` into `browserState`
- `cancelPatchBrowser()` — calls `resyncDeviceProgramBuffer(priorProgIndex, workingCopyOfPriorProg)` to restore the device edit buffer to the pre-browse state (preserving dirty edits); closes overlay
- `confirmPatchSelection(i)` — dirty-state check → sets `currentProgIndex = i`, calls `switchToAndEditSlot(i)` (Mode Change `0x02` → Program Change → Mode Change `0x03` — see below), calls `renderProgPanel()`, switches to PROG tab, closes overlay

**Single-click in the Patch Browser auditions only** (sends `[0xC0, i]`). No dirty-state check on single-click; no `currentProgIndex` mutation. Double-click or OK button triggers `confirmPatchSelection`.

**BROWSER toggle button** carries an `.active` class while the overlay is open; removed on close.

### Decision 4 amended — file operations moved from footer to header dropdown menus

The footer Load .syx / Save .syx / Request Dump buttons remain for backward compatibility but their functionality is now also exposed — and more granularly controlled — via **FILE** and **WRITE** header dropdown menus.

**FILE menu:**

| Item | Function | Format |
|---|---|---|
| Load > All Data | `doLoadFileFlow()` | Func=50 or Func=4C (any file) |
| Load > All Programs | `doLoadFileFlow()` | Func=50 or Func=4C (any file) |
| Load > 1 Program | `doLoad1ProgramFlow()` | Any file; two-step source/destination flow for multi-program files |
| Save > All Data | `doSaveAllDataFlow()` | Func=50 |
| Save > All Programs | `doSaveAllProgramsFlow()` | Func=4C |
| Save > 1 Program | `doSave1ProgramFlow()` | Func=40 |
| Import from Device > All Data | `doRequestAllDataDumpFlow()` | Sends Func=0x0F |
| Import from Device > Current Program | `doRequestCurrentProgramDumpFlow()` | Sends Func=0x10 (no padding byte) |

All Load and Import from Device flows gate on `store.isDirty()` at the start and route through `showAbandonedModal()` before proceeding.

**WRITE menu:** triggers the Write Browser overlay for device write-back operations (Write Program, Write Combination stub).

### Write Browser overlay

A second overlay — `openWriteBrowser({ mode, patchType, patchName, defaultIndex, onConfirm, onCancel, items })` — handles write-destination and source-selection UI. Three modes:

| mode | Title shown | Used by |
|---|---|---|
| `'write'` | "Write Program: [name]" | WRITE > Write Program |
| `'load'` | "Load Program: [name] → Select Destination" | Load 1 Program destination step |
| `'source'` | "Select Program from: [filename]" | Load 1 Program source step (multi-program files) |

Invoked with `onConfirm` / `onCancel` callbacks — callers supply their own behavior locally. This avoids a central dispatch function that would need to be modified each time a new caller is added.

### `browserState` module-level variable

A single `browserState` object (`{ kind, priorProgIndex, onConfirm, onCancel }`) replaces what would otherwise be several loose module-level variables per overlay type. Reset to `null` on every overlay close. Chosen because Brief #10/#11 introduce four overlay types simultaneously; `browserState` is a single shared pattern rather than per-overlay variable sets.

### `resyncDeviceProgramBuffer` and `writeProgramToSlot` — shared functions

Two previously-duplicated code paths extracted as named functions:

- **`resyncDeviceProgramBuffer(progIndex, programData)`** — sends `[0xC0, progIndex]` (Program Change to return device to the right patch) then `sendProgramDumpAndAwaitAck(programData)` (Func=40 dump to restore edit buffer). Used by Patch Browser Cancel (restoring dirty working copy) and Discard flow (restoring clean snapshot).
- **`writeProgramToSlot(programData, destSlot)`** — sends Func=40 dump + awaits ACK, then sends Func=11 write request + awaits WriteCompleted. Used by "Write in place" button and Write Browser confirm.

### `store.replaceProgram(index, programData)`

New store method that bulk-replaces `workingCopy.programs[index]` with a deep clone without touching `dirtyParams`. Used by Load 1 Program and Import > Current Program. `setParam` is not appropriate for full program replacement because it marks every field dirty.

### Consequences (additions)

- `BROWSER` nav-tab CSS class `.nav-toggle` distinguishes the toggle button from peer navigation tabs; `switchTab()` and `updateEditBtn()` exclude `.nav-toggle` from their selectors
- All file load/import flows follow a consistent pattern: `async function proceed() { ... }` body + upfront `if (store.isDirty()) { showAbandonedModal(null, proceed); return; } proceed();`
- `scheduleDumpSettle` branches on `dumpBuffer[0][4] === 0x40` (single-program) vs. any other function code (full-bank): single-program uses `replaceProgram`; full-bank uses `loadSnapshot` (see Archive Critical Discovery #27)
- `.prog-actions` button row: "Write in place" (replaces "Write"), "Discard Edits" (replaces "Cancel"); "Save" button removed (FILE menu covers all save paths)

---

## Amendment — Brief #10 bug fixes: DEVICE menu, menu restructure, cross-slot switch (July 2026)

### WRITE menu renamed DEVICE

The header menu button previously labelled "WRITE" has been renamed "DEVICE". The element ID (`write-menu-btn`) is unchanged; only the visible label changed. "DEVICE" is unambiguous — "WRITE" was ambiguous between writing to a file and writing to the device.

### Import from Device moved from FILE menu to DEVICE menu

The FILE menu table in the earlier Brief #10 amendment is **superseded**. The corrected menu structure is:

**FILE menu** — file I/O only:

| Item | Function | Format |
|---|---|---|
| Load > All Data | `doLoadFileFlow()` | Func=50 or Func=4C |
| Load > All Programs | `doLoadFileFlow()` | Func=50 or Func=4C |
| Load > 1 Program | `doLoad1ProgramFlow()` | Any file; two-step source/destination flow |
| Save > All Data | `doSaveAllDataFlow()` | Func=50 |
| Save > All Programs | `doSaveAllProgramsFlow()` | Func=4C |
| Save > 1 Program | `doSave1ProgramFlow()` | Func=40 |

**DEVICE menu** — device communication only (two sections):

| Section | Item | Function |
|---|---|---|
| Write to device | Program | `openWriteBrowser(...)` → `writeProgramToSlot` |
| Write to device | Combination | stub |
| Write to device | All Programs | stub |
| Write to device | All Data | stub |
| Import from device | All Data | `doRequestAllDataDumpFlow()` — Func=0x0F |
| Import from device | Current Program | `doRequestCurrentProgramDumpFlow()` — Func=0x10 (no padding byte) |

Items inside the DEVICE menu drop the "Write" prefix (e.g. "Write Program" → "Program") since the menu name provides context. Item labels in the FILE menu are unchanged. All element IDs across both menus are unchanged from the original Brief #10 implementation.

### Cross-slot write and import always switch editor and device to destination slot

After any write or import operation where the destination slot `d` differs from `currentProgIndex`, the editor and device always switch to slot `d` via `switchToAndEditSlot(d)`. Previously the device physically switched as a side-effect of the Func=40 dump + Func=11 write, but the editor stayed on the source slot (B12).

`switchToAndEditSlot(i)` is a shared helper that: sends Mode Change to Program (`0x02`), then `[0xC0, i]` (Program Change), then Mode Change Prog Edit (`0x03`); sets `currentProgIndex = i`; calls `renderProgPanel()`; switches to PROG tab; and calls `updateEditBtn()`. For Write Program, `store.replaceProgram(d, prog)` is also called before the switch so the store, browser row, and panel all reflect the written data.

**Amendment (2026-07-02, B19):** the leading Mode Change to Program (`0x02`) was added after hardware testing showed the device silently ignores Program Change while still in Prog Edit mode (Landmine #2). Callers that reach `switchToAndEditSlot` immediately after a write/resync operation (`sendProgramDumpAndAwaitAck` — the Abandoned Edits modal's Write and Discard handlers) leave the device in Prog Edit mode, so the original two-message sequence silently failed to switch the device in those paths, even though the editor advanced correctly. See Decision Archive Critical Discovery #30.

This applies to: Write Program `onConfirm`, and Load 1 Program destination `onConfirm`. Any future write or import flow that places data into a slot must follow the same pattern.

---

## Amendment — Brief #1: Audition vs. Edit Mode (June 2026)

### Decision 4 amended — Patch Selection Flow

The BROWSER tab's patch row click behaviour described in Decision 4 has changed. The previous "click a patch to load it and switch to editor view" behaviour has been replaced by a two-step audition/edit split:

**Patch row click (audition):** sends Program Change only (`[0xC0, programIndex]`). No Mode Change. No auto-navigation to the PROG tab. The device auditions the patch; the editor stays on BROWSER.

**Edit button:** a persistent button in the nav bar (right side, visible across all tabs) is the sole trigger for Mode Change `0x03` and entry to the editor UI. Button label and state are context-aware:

| Context | Label | State |
|---|---|---|
| BROWSER, Programs sub-tab, snapshot loaded | `Edit Program` | Enabled |
| BROWSER, Combis sub-tab | `Edit Combi` | Disabled (stub — Combi Edit not yet built) |
| PROG tab, Edit mode active | `Editing Program` | Active/highlighted |
| COMBI / MULTI / GLOBAL tabs | `Edit` | Disabled |

**`enterBrowserMode()`:** a new function called at three triggers — BROWSER tab click, file load complete, dump receive complete — that sends Mode Change `0x02` (exits any edit mode), clears `editMode`, and resets the Edit button to inactive state.

### NAK recovery amended

Silent lazy re-entry has been replaced by an explicit recovery dialog. The NAK handler is **mode-aware** — it checks `pendingParam.drum` to determine recovery mode. On NAK:

1. `editMode = null`; Edit button highlight removed; `ignoringNaks = true`
2. `alert()` dialog shown — message reflects current mode ("Edit mode" or "Global mode")
3. On OK: Mode Change sent (`0x03` for program params, `0x05` for drum params); after 100ms delay, the single failed parameter is resent via the appropriate send function; `editMode` restored; Edit button re-highlighted; `ignoringNaks = false`

The 100ms delay is required because the device needs a settling period after Mode Change when transitioning from a non-edit state before it will accept Parameter Changes (see Archive #17). The `ignoringNaks` flag suppresses duplicate NAK callbacks from multiple logical MIDI input ports for the same physical device (same dedup issue as ACK deduplication — see Archive #3).

### Consequences (additions)

- `store.js` gains `lastFailedParam` state: `getLastFailedParam()`, `setLastFailedParam(paramNo, value)`, `clearLastFailedParam()`
- `sendParamChange()` no longer contains a lazy Mode Change fallback — Mode Change is only sent by the Edit button click, DRUM EDITOR tab entry/exit, and NAK recovery
- The Consequences item "BROWSER tab requires knowing whether the user is in PROG or COMBI context" remains correct; the mechanism is now the Edit button rather than auto-navigation

---

## Amendment — Brief #3: Drum Editor and Mode State (June 2026)

### `editMode` replaces `modeChangeSent`

The boolean `modeChangeSent` has been replaced by a mode state variable `editMode` with three values:

| Value | Meaning | Triggered by |
|---|---|---|
| `null` | No edit mode active | `enterBrowserMode()`, port change, NAK (temporarily) |
| `'progEdit'` | Prog Edit (`0x03`) | Edit button click, leaving DRUM EDITOR tab, program-param NAK recovery |
| `'global'` | Global (`0x05`) | Entering DRUM EDITOR tab, drum-param NAK recovery |

The Edit button label reflects the current mode: "Editing Program" for `progEdit`, "Editing Drums" for `global`.

This design supports future extension: Combi Edit (`0x01`), Multi (`0x04`), and Global (`0x05` — shared with drum editing) can be added as new `editMode` values without structural changes.

### DRUM EDITOR inner tab — mode switching

The DRUM EDITOR tab is conditionally added to the inner tab bar when `osc.mode === 2`. Tab click handlers manage mode transitions:

- **Clicking DRUM EDITOR** while `editMode !== 'global'`: sends Mode Change `0x05`, sets `editMode = 'global'`
- **Clicking any other tab** while `editMode === 'global'`: sends Mode Change `0x03`, sets `editMode = 'progEdit'`

This ensures the device is always in the correct mode for the active tab's parameters. Hardware-verified: switching between DRUM EDITOR and EFFECT tab works correctly, with each tab's parameter changes accepted by the device.

---

## Amendment — Brief #4: Cross-Tab Parameter Sync (June 2026)

### `paramBus` — publish/subscribe on `setParam`

`store.js` exports a lightweight event bus: `subscribeTo(path, callback)`, `unsubscribeFrom(path, callback)`, and `clearAllSubscribers()`. `setParam` notifies all registered subscribers for the written path after updating `workingCopy`. A re-entrancy guard (`_notifying` flag) prevents infinite recursion when a subscriber calls `setParam` on a mirrored path.

### Rules

1. **Every control that shares a device parameter with a control on another tab must register a `subscribeTo` call at render time.** This applies to all current and future tabs (including Quick Edit).
2. **Subscriber callbacks update DOM only — no MIDI send.** For split-path parameters (where two store paths map to the same device parameter), subscribers may also call `setParam` on the mirror path to keep the store consistent; the re-entrancy guard prevents recursion.
3. **`clearAllSubscribers()` is called at the start of each `renderProgPanel()` subscriber wiring block** to clean up stale references from previous renders.

### Currently known shared parameters

| Device Param | Store Path A (Tab) | Store Path B (Tab) | Same Path? |
|---|---|---|---|
| 25 (OSC-1 Level) | `osc1.level` (OSC) | `vda1.level` (VDA) | No — mirror sync |
| 92 (OSC-2 Level) | `osc2.level` (OSC) | `vda2.level` (VDA) | No — mirror sync |
| 27 (OSC-1 Pitch EG Int) | `osc1.pitchEGInt` (OSC) | `osc1.pitchEGInt` (EASY) | Yes |
| 94 (OSC-2 Pitch EG Int) | `osc2.pitchEGInt` (OSC) | `osc2.pitchEGInt` (EASY) | Yes |
| 21 (MW VDF MG Int) | `modWheel.vdfMgInt` (CONTROL) | `modWheel.vdfMgInt` (EASY) | Yes |
| 87 (OSC-1 Pitch MG Int Mod by MW) | `osc1.pitchMG.intModByMW` (CONTROL) | `osc1.pitchMG.intModByMW` (EASY) | Yes |
| 154 (OSC-2 Pitch MG Int Mod by MW) | `osc2.pitchMG.intModByMW` (CONTROL) | `osc2.pitchMG.intModByMW` (EASY) | Yes |

### Consequences (additions)

- `store.js` exports `subscribeTo`, `unsubscribeFrom`, `clearAllSubscribers` alongside `createStore`
- Shared controls are tagged with `data-sync` attributes for querySelector-based wiring after render
- Any new tab that introduces a control sharing a device parameter with an existing control must add subscriber wiring in `renderProgPanel()`

---

## Amendment — Brief #11 + Post-Brief Refinements: Multisound/Drum Sound/Effect Type Browsers (July 2026)

Full session detail and hardware-verification notes in `X5DR_Editor_Decision_Archive.md` (Decisions and Critical Discoveries #29–#35, dated July 2026, and the Brief #11 record for the initial build).

### New shared control: `buildSoundField(displayName, onOpen)`

A bounded, hover-reveal-pencil-icon field (visually modeled on the Brief #9 program-rename control) that replaces every `<select>`-based value picker with a click target opening a modal browser. Used for Multisound (OSC tab, EASY tab), Drum Sound (Drum Editor Inst No.), and Effect Type (EFFECT tab, EASY tab) selection — 6 call sites total.

### New shared component: `buildSoundGridTable(indices, labelFn, selectedIndex, onSelect, onConfirm, isDisabledFn)`

A column-major grid (5 columns, reusing `.patch-table` CSS for visual/behavioral parity with the Patch Browser's grid), with two differences from that earlier component:
- **Row count is derived per-render** (`ceil(itemCount / cols)`), not fixed at 20, since category filtering changes item counts.
- **Optional `isDisabledFn(index)`** greys out and disables individual cells (no click/dblclick handlers, skipped by keyboard navigation) — used by the Effect Type Browser for the Symphonic Ensemble mutual-exclusion rule. Callers that omit it (Multisound, Drum Sound) are unaffected.

Selection highlight is blue (`#2d68a2`, sampled from the Korg M1 reference image), not the original dark green — applies everywhere `.patch-table`/`.sound-browser-off-row` selection styling is used, including the Patch/Write Browsers and the Drum Editor's persistent slot list. Hover is scoped per-cell (`td:hover`), not per-row (`tr:hover td`) — the row-scoped form (a leftover from a pre-grid, single-column-list era) had higher CSS specificity than the selection state and would hide it; any future hover rule on this grid must stay cell-scoped.

### `browserState` extended with three new `kind`s

`'multisound'`, `'drum'`, `'effectType'` (see Brief #10's original `browserState` introduction above). Each carries domain-specific fields — `category`, `candidateValue`/`candidateRaw`, `priorValue`, `onConfirm` — but no shared schema is enforced beyond `kind`.

### Category lookup tables

`MULTISOUND_CATEGORIES` (13, editorial approximation by name semantics), `DRUM_SOUND_CATEGORIES` (13, editorial approximation, proposed and approved before implementation), `EFFECT_TYPE_CATEGORIES` (8, hand-authored consolidation of `EFFECT_TYPE_NAMES`'s existing 17 `group` values — display-only, the underlying data is unchanged). None of these are manufacturer-documented; all are best-guess groupings by name/data semantics, flagged as revisitable if they prove confusing in practice.

### Interaction model — two variants

- **Multisound/Drum Sound:** single-click previews live (`sendParamChange`/`sendDrumParamChange`, no store mutation); double-click/Enter/OK commits (`setParam` + re-render) and closes; Cancel/X/Escape reverts via a single live `sendParamChange` and closes.
- **Effect Type:** no lightweight preview is possible — the device resets the type's 7 per-type params as part of any type change, so every click (not just confirm) performs the full existing commit. Double-click/Enter/OK re-invoke the same commit (idempotent) and close; Cancel/X/Escape re-invokes the commit with the prior type and closes.

Escape is wired to each browser's Cancel path via the document-level Escape handler (extends the handler introduced in Brief #10's amendment above).

### z-index

`.sound-browser-overlay` (all three new browsers) sits at `z-index: 150`, the same tier as `#header` — these are focused, blocking pickers that intentionally dim/click-block the nav row while open, unlike the Patch Browser. A separate regression this uncovered — `#header`'s FILE/DEVICE dropdowns being clipped behind `#nav` because both were tied at `z-index: 150` — was fixed by lowering `#nav` to `120` (Critical Discovery #32); this did not require changing the sound browsers' own tier.

### Write All Data (DEVICE menu)

`sendAllDataDumpAndAwaitAck()` sends the full workingCopy Snapshot as one Func=50 dump (`snapshotToSyx()`, previously only used for file save) and awaits ACK/NAK via the existing `awaitingWriteAck`/`writeCallbacks` mechanism. Unlike the single-Program write flow, no Mode Change is sent first and no separate Func=11-equivalent write-request step exists — bulk dumps (Func=40/4C/50) are exempt from the Mode Change prerequisite, and the device persists an All Data dump directly on receipt. Gated behind `window.confirm()` (destructive/irreversible on the device) and a "no data loaded" guard.

### Consequences (additions)

- Any future "pick one of N named things" control should reuse `buildSoundField` + `buildSoundGridTable`, not a new `<select>` or a bespoke list component
- New category tables for future pickers should be flagged explicitly as editorial/best-guess unless sourced from manufacturer documentation
- `onConfirm` on a `buildSoundGridTable`-based browser must always close the modal — never wire `onSelect` and `onConfirm` to the same non-closing function (Critical Discovery #33)
- Any `render*BrowserList()` that recreates the grid's `<table>` must refocus it (`table.focus({ preventScroll: true })`) so Enter continues to work after a rebuild (Critical Discovery #34)
- Hover CSS added to `.patch-table` must be cell-scoped (`td:hover`), never row-scoped (`tr:hover td`) (Critical Discovery #35)

---

## Amendment — Post-Brief #14 Hardware Test Session: Navigation/Mode-State Corrections and Edit Button Removal (July 2026)

Brief #14 (Combi EFFECT Panel Reuse — see ADR-0003 amendment) itself needed no changes here, but the hardware test session that followed it surfaced three corrections to decisions this document defines. Full detail and hardware-verification notes: `X5DR_Editor_Decision_Archive.md`, Critical Discoveries #46–#48.

### Decision 2 (Load Sources) — `loadSnapshot()` alone does not refresh the UI

Both `doLoadFileFlow()` (file load) and `scheduleDumpSettle()`'s full-dump branch (Request Dump) were found to call `store.loadSnapshot(snap)` and then only `updateBrowser()` / `openPatchBrowser()` — never re-rendering whichever Program/Combi panel was currently visible underneath the Patch Browser overlay. The visible panel kept showing pre-load data until an unrelated interaction (typically a nav-tab click) happened to force a re-render. This is now fixed with a new `refreshActiveEditorPanel()` helper, called from both flows immediately after `updateBrowser()`.

**Amended consequence:** any current or future code path that calls `store.loadSnapshot()` (or otherwise bulk-replaces working-copy data) must explicitly call `refreshActiveEditorPanel()` (or the correct `renderProgPanel()`/`renderCombiPanel()`) afterward. Loading data into the store is necessary but not sufficient for the UI to reflect it.

### Decision 4 / Brief #3 Amendment (`editMode`) — mode-entry points must also handle their own exit

The single shared `editMode` variable (Brief #3 Amendment, above) is claimed unconditionally by whichever mode-entry branch runs last. The top-level nav-tab handler had an *enter* transition for Combi (`dest === 'combi'` always resends its Mode Change) but no corresponding *exit* transition restoring Prog Edit for Program's benefit — so navigating COMBI → PROG left the device in Combi Edit mode indefinitely, while PROG → COMBI already worked. Fixed by mirroring the DRUM EDITOR inner-tab's existing enter/exit pattern (Brief #3 Amendment, above) exactly: on the `'prog'` nav-tab branch, if `editMode === 'combiEdit'`, resend Mode Change to Prog Edit and update `editMode` before continuing.

**Amended consequence:** any future top-level tab that comes to unconditionally claim its own device mode (mirroring Combi's pattern) needs an explicit corresponding exit transition wherever the user can navigate away from it, not just an entry transition. A single shared mode-state variable cannot represent "what mode should the device be in" on its own — every claiming branch needs a matching un-claiming branch.

**Known adjacent gap, not addressed by this fix:** the nav-tab handler's `'prog'` branch still skips the `store.isDirty()` check entirely (a separate, pre-existing issue — see Critical Discovery #37 — deferred to Brief #16).

### Amendment to Brief #1 Amendment (Audition vs. Edit Mode) — the Edit button has been removed entirely

The persistent "Edit Program"/"Editing Program"/"Editing Drums" button described in the Brief #1 Amendment above (context-aware label/state table) **no longer exists**. Its role — being "the only thing" that sends Mode Change to Prog Edit — was quietly superseded once Brief #10's `switchToAndEditSlot` made confirming a program via the Patch Browser unconditionally enter Prog Edit mode as part of that action (see Brief #10 Amendment, above). By the time of this session the button had become redundant when a program was actively being edited, and actively non-functional-looking while the Patch Browser overlay was open (it remained clickable, since `#header` outranks the overlay in z-index, but produced no visible effect since closing the overlay is a separate, unrelated action).

**`updateEditBtn()` and `#edit-btn` are removed** along with all their call sites. `editMode` itself — the state variable — is completely unchanged and remains functionally necessary (NAK recovery, scope resolution for `sendParamChange`, the Drums inner-tab, `switchToAndEditSlot`, and the COMBI→PROG restore fix above). Only its visible button representation is gone.

**Accepted consequence:** there is now no in-UI way to enter Prog Edit mode other than (a) confirming a program via the Patch Browser, or (b) navigating COMBI → PROG while `editMode === 'combiEdit'` (the fix above). If the Patch Browser is Cancelled without picking a program, the PROG tab shows an idle, non-editable view with no button to bootstrap editing from — the user confirmed this gap is acceptable rather than making every PROG tab arrival eagerly enter edit mode.

### Adjacent discovery, flagged not fixed — Combi Patch Browser has no working confirm handler

While investigating the Edit button removal, found that the Patch Browser's Combi sub-table (`buildPatchTable(snap.combis, () => {})`) wires only a no-op `onSelect` and no `onConfirm` at all, and that `currentCombiIndex` is never reassigned anywhere in the codebase outside its initial `= 0`. Decision 4's Consequences item ("The BROWSER tab requires knowing whether the user is in PROG or COMBI context to show the correct patch list") is only half-true today for Combi — the list displays correctly, but selecting a row does nothing. Not fixed this session; likely within Brief #16's intended scope ("Combi nav/write/dirty-scope closeout") but not confirmed.

---

## Correction — Both Combi Items Above Superseded by ADR-0004 (July 2026)

**Status:** Both sections immediately above are now stale. Per the established convention of appending corrections rather than rewriting settled history (ADR-0001's "Amendment A," ADR-0003's Channel Enable correction), this note points forward rather than editing them in place.

- The "Adjacent discovery, flagged not fixed — Combi Patch Browser has no working confirm handler" section is resolved: Brief #16 implemented `switchToAndEditCombiSlot` and wired the Patch Browser's Combi confirm-select path fully. See ADR-0004, Decisions 5–8.
- Decision 4's COMBI→PROG restore fix (directly above) has itself since been corrected twice more, via hardware testing after Brief #16 shipped: it now resyncs the Program Change to `currentProgIndex` (not just the Mode Change) and includes a settling delay, and the symmetric PROG→COMBI direction received the same treatment. See ADR-0004, Decision 8 (Critical Discovery #54).

Per ADR-0002's own scope note (top of this document), all further Combi-specific architectural decisions — including any future corrections to the above — belong in ADR-0004, not here.

---

## Amendment — §6a Single-File Distribution, as Built and Tested (Phase 4, 2026-10-06)

§6a's picture of "three files" and a hand-inlining step is out of date. As built (Release Plan A1, Decision Archive #200, Landmine #123):

- `src/index.html` imports **11 ES modules** (`src/midi/*`, `src/state/*`, `src/ui/controls.js`). `npm run build` (`scripts/build.mjs`, Node built-ins only) wraps each module in an IIFE, rewrites the named imports to destructuring, and emits **one inline `<script type="module">`** in `dist/index.html`. It also embeds the fonts (base64 WOFF2) and copies `manifest.json` and the icons next to the page. `scripts/build.test.js` guards the output. The Vitest rationale above still holds: `src/` stays modular and is the only place to edit.
- `dist/` is gitignored. GitHub Actions builds and deploys it (Release Plan A3, D5).

**`file://`: works, as §6a assumed.** Owner hardware tests, 2026-10-06 (Decision Archive #202, #203). `dist/index.html` was opened from disk in Chrome and Edge (macOS):
- Web MIDI **with SysEx** works both ways: port auto-select, Import From Device, live edits, Write In Place, the send-timeout modal.
- FILE → Load and Save, Copy Diagnostics, and saved settings (theme, channel, Getting Started dismissal) all work.

**Two `file://` limits:**
1. Chrome doesn't remember the MIDI permission for `file://` pages, so it asks on every load. The hosted (`https://`) site and the installed app remember it.
2. If the prompt is blocked and MIDI is then allowed from the address bar, the ports only appear after a reload. This is being addressed separately (a warning box plus a re-request when permission changes).

`src/index.html` itself cannot run from `file://` (browsers block module imports there); only the built file can.

The earlier statement that `file://` "will not work" was in the Project Plan's Phase 4 text (corrected in Archive #200), not in this ADR.
