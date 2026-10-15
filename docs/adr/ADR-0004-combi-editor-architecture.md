# ADR-0004 — Combination Editor: Cross-Cutting Architecture

**Date:** July 2026
**Status:** Accepted — Combi editor complete and hardware-tested (Briefs #12–#16)
**Scope:** Cross-cutting decisions specific to the Combination Editor — data layer, Parameter Change addressing, navigation, dirty-state/write/cancel flows, and the hardware-discovered fixes that followed. This document does **not** cover:
- The EFFECT panel engine Combi shares with Program (parameterized `buildEffectContent`/`buildEffectColumn`/`isEffectTypeAllowed`, the `-19` param offset) — that's ADR-0003's amendment, unchanged by anything below.
- The Combi data model itself (`Timbre`, `Combi` shapes, the three-state Pan sentinel, Send C/D encoding) — that's ADR-0001 (Amendments C and D).

*Written following ADR-0002/ADR-0003's established precedent: each module gets its own ADR rather than appending to ADR-0002. Source material: Briefs #12–#16 (`Setup Instructions/Claude Prompts/`, private archive) and this session's post-Brief-#16 hardware test rounds (Critical Discoveries #51–#58 in the Decision Archive).*

---

## Context

The Combi editor was built across five briefs: #12 (data layer), #13 (SOUND tab foundation — mode/state/Parameter Change addressing), #14 (EFFECT panel reuse, ADR-0003), #15 (ZONES tab), and #16 (navigation, write, file I/O, dirty-scope closeout). Brief #16 was followed by four rounds of hardware testing that found and fixed eight distinct bugs, none of which were anticipated by the briefs — all are documented in detail as Critical Discoveries #51–#58.

---

## Decisions

### 1. Data Layer Shape (Brief #12)

`parseCombi`/`encodeCombiToBytes` mirror `parseProgram`/`encodeProgramToBytes`'s existing conventions exactly — inline offset arithmetic (`t = 40 + 12 * n` for timbre `n`), not a lookup-table indirection, matching the established `decodeOscBlock(b, 40, ...)` pattern. `store.replaceCombi(index, combiData)` mirrors `replaceProgram` and exists specifically to avoid a Combi recurrence of Critical Discovery #27 (Landmine #25): guards `workingCopy.combis == null` so a single-Combi dump merging into a snapshot that has no Combi section yet doesn't throw.

**Wire builders:** `buildCombiWriteRequest` (Func=0x1A, `00`-padded, mirrors Program's Func=0x11) and `buildSingleCombiDump` (Func=0x49, **no** padding byte, mirrors Func=0x40) were added to `sysex.js`. No new dump-*request* builder was added — the existing generic `buildDumpRequest(funcCode, withPadding)` is reused directly for every Combi dump request (`0x19`/no padding for current Combi, `0x1D`/padded for all Combis), consistent with how it already served Program.

### 2. Combi Mode & Parameter Change Addressing (Brief #13)

`MODE_COMBI = 0x00`, `MODE_COMBI_EDIT = 0x01` — added alongside the existing Program mode constants. `TIMBRE_PARAM_BASE`/`timbreParamNo(field, n)` compute per-timbre Parameter Change numbers (`base + n`, n=0–7), verified against TABLE 8. **Spec correction, not silent:** the Design Spec's own table excluded `programNo` from `TIMBRE_PARAM_BASE` with a comment that the *value* encoding was combined/special — but the Parameter Change *number* (base `0`) is still needed and was missing; TABLE 8 confirms `0+n → Program No.` directly. Added `TIMBRE_PARAM_BASE.programNo = 0`.

**Program No./Mute is a combined field:** Program No., Bank, and Enabled share one Parameter Change value (`encodeProgramNoParam`/`decodeProgramNoParam`). Toggling Mute off sends a bare `0`; toggling it back on must re-encode all three current values together — a bare "on" value is never valid on its own (`sendTimbreMute`).

**`sendParamChange` scope generalization:** given a defaulted third argument (`scope = 'prog'`) rather than touching any of the ~189 existing call sites — a deliberate defaulted-parameter choice per Landmine #26/#27 (a prior mass `replace_all` across call sites already caused a production bug once on this project). The NAK handler's recovery-mode branch was generalized from a 2-way (drum/program) to a 3-way (drum/combi/program) branch keyed off this scope tag. Every Combi call site passes `'combi'` explicitly.

### 3. EFFECT Panel Reuse

Combi's SOUND tab Effects panel is the *same engine* Program's EFFECT tab uses, parameterized by `mode`/`n` with a `-19` Parameter Change offset — this is documented in full in ADR-0003's Brief #14 amendment, including the hardware-confirmed offset and Critical Discovery #45's lesson about checking a "generic" helper's full call graph, not just its argument list. Not repeated here.

### 4. ZONES Tab & Store-Path Naming (Brief #15)

Key/Vel Window fields and the four Control Filter checkboxes read/write per-timbre. **Vel Window's minimum is 1, not 0** (TABLE 2: `01~7F : 01~127`) — distinct from Key Window's 0 minimum; easy to get wrong by copying the neighboring field's bounds. The Control Filter checkboxes write to the *nested* `timbre.filters.{programChange,damper,afterTouch,controlChange}` store path, not a flat field matching `TIMBRE_PARAM_BASE`'s lookup-table key names — the two naming schemes coincidentally resemble each other but serve different purposes (Parameter Change addressing vs. store shape). Full detail: Critical Discovery #49.

### 5. Navigation, Dirty-State & Write/Cancel Generalization (Brief #16)

**Dirty-scope resolution:** `getDirtyScope()` inspects `store.getDirtyParams()` for paths under `combis.${currentCombiIndex}.` or `programs.${currentProgIndex}.` and returns which single scope is dirty. This only works because of the next decision:

**Every nav-tab destination now goes through the same `store.isDirty()` gate**, including `dest === 'prog'` (previously a hardcoded early-return bypass, safe only while Program was the sole editable tab — Landmine #32). This is a deliberate behavior change for Program too: clicking PROG while something is dirty now shows the Abandoned Edits modal, where it previously didn't. It's also what makes `getDirtyScope()`'s "only one thing can be dirty at a time" assumption actually hold — every attempt to switch away from a dirty scope now forces a Write/Discard/Stay decision first.

**Abandoned Edits modal generalized** to branch on `getDirtyScope()` for its body text and both Write/Discard handlers, rather than hardcoding Program. Requires two small `store.js` additions mirroring the Program equivalents exactly: `getCleanCombi(index)`, `revertCombi(index)`.

**Write Combi flow mirrors Program's two-step pattern exactly:** dump into edit buffer (Func=0x49, await ACK/NAK) then a separate write-to-permanent-memory request (Func=0x1A, await Write Completed/Error) — `sendCombiDumpAndAwaitAck`/`sendCombiWriteRequestAndAwait`/`writeCombiToSlot`, paralleling `sendProgramDumpAndAwaitAck`/`sendWriteRequestAndAwait`/`writeProgramToSlot` structurally.

**Cancel-from-Browser tracks actual prior context, not dirty state** — see Decision 7 below; this was corrected after Brief #16 shipped, via hardware testing.

### 6. Device Mode Must Match the Active Sub-Panel, Not Default to Program

**Hardware-discovered, Critical Discovery #52.** The Patch Browser's device Mode Change was hardcoded to `MODE_PROGRAM` on every open, regardless of which sub-panel (PROG/COMBI) was actually visible — since Program Change (`Cn pp`) is interpreted by the device according to its *current* SysEx mode (`01_channel_messages.md`: "Cn pp → Prog, Comb Change"), this stranded the Combi sub-panel unable to select anything but whatever the device happened to already be on. Fixed by moving the Mode Change into `setPatchBrowserType()`, which now sends the mode matching whichever sub-panel becomes visible — both on initial open and when the user toggles PROG/COMBI inside an already-open browser (which previously never touched device mode at all).

### 7. Cancel-from-Browser Restores Prior Context, Not Dirty Scope

**Hardware-discovered, Critical Discovery #53.** `cancelPatchBrowser()` initially branched on `getDirtyScope()` — but that returns `null` whenever the user only auditioned without editing, which is the common case, and the function then defaulted to resyncing Program regardless of which tab the Browser was actually opened from. Fixed by recording the actual prior context in `browserState` at open time (`priorScopeType`, `priorCombiIndex`, alongside the existing `priorProgIndex`) and branching on that instead. `store.getSnapshot()` already reflects dirty data for that index if there is any, so one code path correctly covers both the dirty and clean cases.

### 8. Settling Delay Required Between Mode-Exit and Mode-Re-Entry When Not Triggered by a Direct Human Click

**Hardware-discovered, Critical Discovery #54 — the most consequential fix in this closeout.** `switchToAndEditSlot`/`switchToAndEditCombiSlot` send three messages: Mode Change (exit to bare Program/Combi) → Program Change → Mode Change (re-entry to Prog/Combi Edit). This is safe with zero delay when reached from a Patch Browser confirm click, because `enterBrowserMode`/`setPatchBrowserType` already primed the device into that mode well before the click (a multi-second natural gap). It silently fails — device drops out of edit mode, subsequent Parameter Changes get `0x26` with no error surfaced — when reached immediately after another just-completed SysEx exchange (a modal Write/Discard's ACK, or a cross-slot write's Write Completed response), because there's no such gap and the burst becomes two genuine, back-to-back mode transitions. Fixed by delaying the final re-entry Mode Change (and the matching `editMode` assignment) by 100ms after the exit Mode Change + Program Change — the same settling-window pattern already established for NAK recovery (Landmine #18). Applied symmetrically to both `switchToAndEditSlot` (Program) and `switchToAndEditCombiSlot` (Combi), since the risk is identical in both directions; only the Combi side had been hardware-exercised in the exact failing sequence at the time of the fix.

**The same commit also closed a related, simpler gap:** the nav-tab handler's `dest === 'combi'` branch sent a bare `Mode Change → Combi Edit` with no Program Change at all, unconditionally, on every click — meaning a manual front-panel Combi change made while the editor sat on PROG would silently desync `currentCombiIndex` from the device. Fixed by routing through `switchToAndEditCombiSlot(currentCombiIndex)` instead, symmetric with the equivalent fix already made to the `dest === 'prog'` branch (which routes through `switchToAndEditSlot(currentProgIndex)`).

### 9. Abandoned Edits Modal Can Close an Already-Open Browser on Stay

**Hardware-discovered, Critical Discovery #55.** When the dirty-check modal is raised by the in-Browser PROG/COMBI type toggle (`setPatchBrowserType`'s own dirty gate), hitting "Stay" previously only hid the modal — leaving the Browser open on the wrong sub-panel, requiring a second, separate Cancel click to actually back out. `showAbandonedModal` gained an optional third `onStay` callback; the in-browser toggle's dirty gate passes `() => cancelPatchBrowser()`, so Stay now fully backs out to the last-used edit tab in one action. Deliberately **not** applied to `confirmPatchSelection`'s own dirty modal (selecting a different patch to edit) — there, Stay should let the user pick a different patch from the still-open list, not close the browser out from under them. The top-level nav-tab handler's dirty gate got the same defensive treatment (checking whether the Browser happens to be open) for consistency, since the nav row stays clickable while the Browser overlay is open (Landmine #28/29).

### 10. Bulk "All X" Imports Must Merge, Not Replace

**Hardware-adjacent discovery, Critical Discovery #56 — cross-cutting beyond Combi, but surfaced entirely by Combi work.** `scheduleDumpSettle`'s generic path called `store.loadSnapshot(snap)` for any bulk dump, including scoped ones (Func=0x4C "All Programs", Func=0x4D "All Combinations") whose parsed result leaves the *other* category `null`. Since `loadSnapshot` fully replaces the working copy, importing one category silently wiped the other out of the editor's local state (not the device — only the in-memory session). Fixed by merging per-slot into an already-loaded snapshot (looping `store.replaceProgram`/`replaceCombi` over all 100 indices) whenever `store.getSnapshot()` already exists, falling back to `loadSnapshot` only on a genuine cold start. **This is now the required pattern for any future scoped bulk import** (Drums, Global, Multi, once those get their own Import menu items) — see Landmine #42.

---

## Alternatives Considered

- **Abstract a shared Program/Combi editor-panel component:** rejected, consistent with this project's established convention (duplicate rather than abstract across component families — the EFFECT panel, ADR-0003, is the deliberate, narrow exception because it's the literal same engine at a shifted address, not two similar-but-distinct things). Combi's name/rename header, SOUND tab, and ZONES tab are all independent implementations mirroring Program's shape, not shared functions.
- **Single shared dirty flag with no scope tagging:** rejected — `getDirtyScope()` plus the uniform dirty-check gate (Decision 5) gives precise per-scope behavior (correct modal wording, correct resync target) at the cost of the "only one scope dirty at a time" invariant, which the uniform gate itself enforces.
- **Infer Cancel's resync target from dirty state:** rejected after hardware testing (Decision 7) — dirty state answers "what changed," not "what was I looking at," and the common pure-audition case has no dirty state to infer from at all.
- **Fix the settling-delay bug only where it was hardware-reproduced (Combi):** rejected — the identical zero-delay burst exists in Program's own cross-slot write/discard flows (`switchToAndEditSlot`), and the mechanism is understood well enough to fix proactively rather than wait for a second hardware report.
- **Leave scoped bulk imports as full replaces and document the caveat instead of fixing it:** rejected — the wipe is silent and irreversible within the editing session (no warning, no error, just missing data), and the fix (per-slot merge) is small and reuses already-tested `replaceProgram`/`replaceCombi`.

---

## Consequences

- Any future top-level tab that comes to claim its own device mode (mirroring Combi's pattern — e.g. Multi or Global, if they ever do) needs the same three things Combi required: an entry transition, a symmetric exit transition on every other destination's branch, and — per Decision 8 — a settling delay on the mode-re-entry step of whatever `switchToAndEditXSlot`-style function it uses, especially if that function can be reached from an async continuation rather than a direct click.
- Any future scoped "Import from device" addition (All Drums, All Global, All Multi) must follow Decision 10's merge pattern in `scheduleDumpSettle`, not a bare `store.loadSnapshot()` call.
- `getDirtyScope()`'s single-scope assumption is only as sound as the uniform dirty-check gate (Decision 5) remains uniform — if a future nav-tab branch reintroduces a bypass (as `dest === 'prog'` once did), both the Abandoned modal and Cancel-from-Browser logic built on top of it would silently misattribute dirty state again.
- The Combi editor is now feature-complete and hardware-verified end-to-end: SOUND tab (timbres, rename, Program Browser, EFFECT panel), ZONES tab, Patch Browser confirm-select (single-click, double-click, Enter, OK), Write Combi (menu and in-place), Discard Edits, File menu (Load/Save/Import, All and Single), Write All Combinations, and the Abandoned Edits modal. Remaining open items are pre-existing and out of this ADR's scope: Multi/Global editors, the Channel Enable full-dump-write retest (ADR-0003's correction), and "14A COPY EFF".
