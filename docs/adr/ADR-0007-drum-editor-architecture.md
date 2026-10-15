# ADR-0007 — Drum Editor: Relocation to a Top-Level Module

**Date:** July 2026
**Status:** Accepted — Drum Editor relocation complete and hardware-tested (Briefs #24–#26, including two post-test bug fixes)
**Scope:** The relocation of drum kit editing from an inner tab of Program Edit to its own top-level DRUMS module — the dirty-scope fix that preceded it, the new tab's navigation/Mode Change wiring, the narrow PROG↔DRUMS nav-gate exception, the generic "dirty scope elsewhere" banner, and the read-only OSC-tab kit summary and cross-reference listing. This document does **not** cover:
- The original Drum Editor implementation itself (Brief #3) — the 60-slot list/detail editor, `buildDrumParamChange`'s wire format, and Func=53's Global-mode requirement were all built and hardware-verified before this ADR's scope begins, and are carried forward unmodified (a relocation, not a rebuild).
- The generic dirty-scope architecture (`dirtyParams`, `getDirtyScope`, `setParamQuiet`) — that's ADR-0005 §6/§9 (Multi) and ADR-0006 §6 (Global); this ADR only covers Drums' own instantiation of the same pattern.

*Written following ADR-0002 through ADR-0006's established precedent: each module gets its own ADR. Source material: `X5DR_Drum_Editor_Design_Spec.md`, `Brief-24-Drum-Dirty-Scope-Fix.md`, `Brief-25-Drum-Editor-Top-Level-Tab.md`, `Brief-26-Drum-OSC-Summary-And-Cross-Reference.md`, and the Decision Archive's Critical Discoveries #86–#92.*

---

## Context

The Drum Editor (Brief #3) was originally built as an inner tab of Program Edit — a reasonable first cut, since drum kits are addressed via a Program's own OSC Mode (`osc.mode === 2`). A later design review, prompted by a concern about Program-write/Drum-Kit-save confusion, surfaced three problems with that placement (none of them implementation defects in Brief #3 itself):

1. **Persistence-model mismatch.** Drum Kit Parameter Change (Func=53) and Drums Data Dump (Func=52) both write directly to the device's Internal Memory with no Edit Buffer and no Write Request — the same shape as Multi Setup (ADR-0005 §6), not Program/Combi's two-step model. Housing it next to tabs that *do* have a real Write/Discard lifecycle implied a save step that doesn't exist.
2. **Discoverability.** The inner tab only appeared when the *currently loaded Program's* OSC Mode was Drums — with no path to editing a Kit at all otherwise.
3. **No visibility into blast radius.** A Kit is a shared resource; edits are live and permanent, and can affect every Program (and transitively every Combi/Multi Track) that references it, with nothing in the UI surfacing this before an edit.

A fourth, independent problem was found during the same review, via direct code reading rather than hardware testing: `drums.*` writes were falling through the local `setParam` wrapper's default branch and polluting the shared `dirtyParams` Set — the same bug shape Multi and Global had already hit and fixed (ADR-0005 §9, ADR-0006 §6), never extended to Drums because Drums predates the dirty-scope architecture entirely.

Three implementation briefs followed, sequenced for incremental hardware verification (mirroring Combi's and Multi's own brief sequencing): #24 (the dirty-scope fix, landed first and in isolation), #25 (the relocation itself — the largest single increment), and #26 (two independent read-only additions). Brief #25's first hardware test found two further, previously-latent bugs — both are covered as their own Decisions below.

---

## Decisions

### 1. Relocation to a New Top-Level DRUMS Tab (Option B), Not Left in Program Edit or Folded into GLOBAL (Critical Discovery #86)

Confirmed directly against `02_sysex_format.md`'s function code table: Func=52/53 are both documented "save to Internal Memory," with no Drums Write Request code anywhere (unlike Program's `0x11` or Combi's `0x1A`) — the identical persistence shape already established for Multi Setup. This ruled out leaving Drums inside Program Edit (implies a lifecycle that doesn't exist) and ruled out folding it into GLOBAL, which was deliberately built as a single flat, dump-only panel (ADR-0006 §1) — Drums' 2-kit × 60-slot live-per-note shape doesn't fit that design without reintroducing per-field-sync complexity Global was built specifically to avoid. A new standalone top-level `DRUMS` tab was the only option that matched Drums' actual persistence model without compromising an already-shipped design.

### 2. `drums.*` Dirty-Scope Exclusion Fix, Landed First and Independently (Brief #24; Critical Discoveries #87, #88; Landmine #59)

The local `setParam` wrapper (`index.html`) gained a `drums.` branch, mirroring the existing `multi.`/`global.` branches exactly — routes through `store.setParamQuiet`, never entering `dirtyParams`. Confirmed via `grep` that every drum-field write goes through the wrapper (no direct `store.setParam` bypass existed), so no second fix location was needed. This was deliberately landed and verified in isolation before the relocation work began, both because it's a pre-existing bug independent of where the Drum Editor lives, and because Brief #25's nav-gate exception (Decision 4) depends on it being in place first.

### 3. A New, Distinct `editMode` Value — `'drumsTab'`, Not the Retired Inner-Tab `'global'` (Brief #25; Landmine #60)

The DRUMS tab claims `MODE_GLOBAL` (`0x05`) on entry, the same device mode Func=53 has always required (Landmine #19) — but under its own `editMode` string, kept distinct from GLOBAL's own `'globalTab'` value, following the precedent already set when GLOBAL was built distinct from the (then-still-existing) Drum Editor inner-tab's `'global'` value. Two UI contexts sharing one underlying device mode must never share one `editMode` value — conflating them would mislabel NAK recovery (which branches on `editMode` to decide what to restore).

### 4. PROG↔DRUMS Nav-Gate Exception — Narrowly Scoped, Not a Blanket DRUMS Bypass (Brief #25 §4; Landmine #61)

The uniform `store.isDirty()` gate (every nav-tab destination checks it before proceeding) is exempted **only** for the specific PROG-origin↔DRUMS-destination edge, in both directions — every other transition into or out of DRUMS (COMBI/MULTI/GLOBAL/BROWSER) still gates normally. This is safe specifically because DRUMS structurally cannot touch `programs.*`/`combis.*` data (Decision 2 guarantees `drums.*` never enters `dirtyParams`) — unlike the old, already-removed `dest === 'prog'` blanket bypass (Landmine #32), which was unsafe because `'prog'` could be a real destination with genuine dirty Combi state at risk. Multi and Global are architecturally identical candidates for the same exception (their edits are equally exempt from `dirtyParams`) but extending it to them is a deliberate not-yet, left for a future, separate decision.

### 5. A Generic "Dirty Scope Elsewhere" Banner Component, Built for Future Reuse

`buildDirtyScopeBanner(onReturn)` is driven entirely by the existing `getDirtyScope()` return shape — no Drums-specific state. `dirtyScopeLabel(scope)` was extracted out of `showAbandonedModal` (previously inline) so both the modal and the new banner share one label-formatting path rather than two. Rendered on DRUMS-tab entry whenever a Program is dirty behind it; click-to-return triggers the identical DRUMS→PROG transition a direct PROG-tab click would. Built generically now specifically so that a future decision to extend the PROG↔DRUMS-style gate exception to Multi/Global (Decision 4's deferred item) would only need to wire up this same component, not build a new one.

### 6. `switchToAndEditSlot` Must Never Be Called for DRUMS→PROG — It Silently Discards a Dirty Prog Edit Buffer (Hardware-reported; Critical Discovery #90; Landmine #62)

The first hardware test of Brief #25 found that DRUMS→PROG, reusing the same `switchToAndEditSlot(currentProgIndex)` call that COMBI/MULTI/GLOBAL→PROG use, silently discarded a dirty Program's device-side edit buffer — the editor kept showing the dirty edit, but the device had reverted to the clean, previously-saved patch. Root cause: `switchToAndEditSlot`'s Program Change resend (needed elsewhere to catch a manual front-panel program change) causes the device to reload the program from stored memory into its edit buffer, wiping any live-edited-but-unwritten state. This had never surfaced before because the rest of the app enforces an invariant — the uniform dirty gate guarantees PROG is always already clean by the time any of those three branches runs — that Decision 4's exception deliberately breaks for one specific edge. Fixed by giving DRUMS→PROG its own branch: a bare Mode Change back to Prog Edit only, no Program Change, no re-entry delay — exactly matching the behavior the user confirmed safe by testing a manual front-panel Mode Change. Hardware-confirmed fixed.

**This is the most important lesson of the whole relocation:** a function written to guard against one specific risk can become actively harmful when a later change (Decision 4's gate exception) introduces exactly the condition that function's own guard was never designed against. Any future nav-gate exception that lets a dirty scope survive a tab transition must audit every downstream function the transition calls, not just the gate logic itself.

### 7. Drum Key Collisions: the Device Silently Reassigns Rather Than Rejects — the Editor Now Filters Instead of Trusting the Input (Hardware-reported; Critical Discovery #91; Landmine #63)

Also found during Brief #25's hardware test: assigning a slot's Key to a value already used by another slot in the same kit does not NAK or error — the device silently walks the keyboard in the direction of the requested move until it finds a free key, and assigns there instead, with no signal to detect the divergence by. Fixed per the user's own suggested approach: `getUsedKeysInKit(kitIdx, excludeNoteIdx)` scans the kit's enabled slots, and the Key `<select>`'s option list omits any key already taken — preventing the invalid input from ever being offered, rather than attempting to detect or replicate the device's undocumented collision-search direction. Hardware-confirmed fixed. Filtering the input is the general answer to any device behavior in this category (silent substitution instead of rejection) — there's no protocol-level signal to build a detection mechanism around.

### 8. Standalone Kit 1/Kit 2 Selector, Decoupled from Any Program's Own Kit Field

The DRUMS tab's Kit 1/Kit 2 buttons (`drumsTabKitIdx`) read and write nothing on any Program — they only determine which kit's slot data and cross-reference results are shown. This is deliberately independent of a Program's own `osc1.multisound` field (Decision 9's OSC-tab summary reads that field instead), consistent with Kits being a shared resource addressable from multiple Programs simultaneously, not owned by whichever Program happens to be currently loaded.

### 9. Brief #26: Read-Only OSC-Tab Kit Summary and Cross-Reference Listing, Amended Before Implementation (Critical Discovery #92)

Two independent, pure-read additions, neither sending `setParam`/`sendParamChange`/Mode Change:

- **OSC-tab Kit Summary** (`buildKitSummaryTable`) — one unified, column-major table for both User and ROM kits, reusing `buildPatchTable`'s exact fill convention (`i = c * rows + r`) rather than a fixed 5×12 grid. Row count is computed per-kit (`Math.ceil(entries.length / 5)`), not assumed — confirmed against the real `ROM_DRUM_KITS` data that 6 of 8 kits have exactly 60 entries but ROM Perc Kit has 78 and ROM Orch Kit has 61 (Landmine #65). The unified-table decision reversed the brief's own tentative fallback ("if ROM reformatting is awkward, flag it back") per an explicit user preference for Phase 3 visual consistency over a rigid cell-count assumption.
- **DRUMS-tab cross-reference ("Used By") listing** — resolves which loaded Programs, Combis (via Timbre), and Multi Tracks (via Track) reference the currently selected User Kit. The brief's own risk framing (reusing `encodeProgramNoParam`/`decodeProgramNoParam`) was corrected: those are wire-layer helpers, irrelevant here, since `workingCopy` already stores `timbre.programNo`/`bankG` and `track.programNo`/`bankG` as plain fields. The real, previously-missed risk was Bank G (Landmine #50) — resolved cleanly once confirmed that Bank G's own 8 drum-kit programs (G129–G136) are the ROM kits themselves (`BANK_G_NAMES[128..135]` matches `ROM_DRUM_KITS`'s names exactly, Landmine #64): a Bank-G-pointing Timbre/Track is a guaranteed non-match, not an unresolvable one, though the `bankG` guard is still required in code to prevent a false-positive index collision with Bank A.

Resolution logic (`getProgramsUsingKit`, `buildKitCrossReference`) was extracted into a new pure module, `src/state/drumCrossReference.js`, specifically so the one piece of this feature with real correctness risk is unit-testable — 7 new Vitest tests cover the positive case, the negative/over-inclusion case, Bank G exclusion (including the index-collision scenario specifically), and both `null`-category and `null`-array-entry handling.

### 10. BROWSER-Nav-Toggle Scope Restore Needed Its Own `'drums'` Case, Found Proactively (Brief #25; Landmine #54 amendment)

The BROWSER nav-toggle is reachable from any tab via its own separate click handler, entirely outside Decision 4's PROG↔DRUMS gate exception (which only covers the direct nav-tab edge). `openPatchBrowser`'s `priorScopeType` tracking and `cancelPatchBrowser`'s restore logic had no `'drums'` case — the same gap Critical Discovery #79 already found and fixed for MULTI. Fixed identically (mode-restore only, no buffer resync, matching Landmine #58's "Drums has no per-slot edit buffer" reasoning) before it could be hardware-reported as a bug.

---

## Alternatives Considered

- **Leave the Drum Editor inside Program Edit (Option A):** rejected — implies a Write/Discard lifecycle that doesn't exist for Func=52/53 edits (Decision 1).
- **Fold Drums into the GLOBAL tab, since both use `MODE_GLOBAL`:** rejected — GLOBAL was deliberately built as a flat, dump-only panel; Drums' live-per-note, 2-kit shape doesn't fit without reintroducing complexity Global was built to avoid (Decision 1).
- **Extend the PROG↔DRUMS nav-gate exception to Multi and Global as well, since they're architecturally identical candidates:** rejected for this round — left as a deliberate, separate future decision rather than bundling a nav-behavior change to two already-shipped modules into the Drums work (Decision 4).
- **Model the Bank G cross-reference risk via `encodeProgramNoParam`/`decodeProgramNoParam` reuse, per the original brief:** rejected — those are wire-layer helpers not needed for a `workingCopy` read; the real risk was Landmine #50, not a decode-path question (Decision 9).
- **Keep ROM kits in their existing separate list-table format rather than reformatting into 5×12, per the brief's own hedge:** rejected — user preferred one unified, column-major table for both kit types, accepting variable row counts, for Phase 3 visual consistency (Decision 9).
- **Attempt to detect or replicate the device's Drum Key collision-reassignment behavior:** rejected — no protocol signal exists to detect it by, and the device's directional search logic is undocumented; filtering the input is simpler and strictly sufficient (Decision 7).

---

## Consequences

- Any future nav-gate exception that lets a dirty scope survive a tab transition (the deferred Multi/Global extension of Decision 4, or any similar future case) must audit every downstream function the transition calls for hidden assumptions the way Decision 6 had to be discovered by hardware testing, not just review the gate logic itself.
- Any device field discovered to have silent-substitution behavior (input accepted but silently altered, no NAK) must be handled by filtering the UI's own input options, not by attempting to detect the substitution after the fact (Decision 7) — there is no protocol-level signal to build detection around.
- `ROM_DRUM_KITS` entries are not uniformly 60 per kit (Landmine #65) — any future code iterating or sizing UI around ROM kit data must read the actual array length, not assume the User Kit slot count.
- Bank G's own drum-kit programs (G129–G136) being the ROM kits themselves (Landmine #64) is a reusable fact for any future feature that needs to resolve a Bank G Program No. reference — it's a guaranteed non-match for anything requiring live Program data, not merely an unresolvable one.
- The Drum Editor relocation project (Briefs #24–#26) is now complete and fully hardware-verified (Brief #26's two features required no hardware verification, being pure reads). No open Drum Editor work remains — see the Progress Log.
