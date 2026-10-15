# ADR-0005 — Multi Setup Editor: Cross-Cutting Architecture

**Date:** July 2026
**Status:** Accepted — Multi editor complete and hardware-tested (Briefs #17–#22, plus follow-up fixes through 2026-07-09)
**Scope:** Cross-cutting decisions specific to the Multi Setup Editor — data layer, Parameter Change addressing, tab structure, dirty-state handling, file I/O, and the hardware-discovered fixes that followed. This document does **not** cover:
- The EFFECT panel engine Multi shares with Program/Combi (parameterized `buildEffectContent`/`buildEffectColumn`/`isEffectTypeAllowed`, the `-11` param offset) beyond what's needed to explain Multi's participation in it — the engine itself is ADR-0003's scope, amended for Combi in ADR-0004 §3.
- The Combi data model (`Timbre` shape, pan/send sentinels) — that's ADR-0001 (Amendments C and D). Multi's `Track` reuses it directly; see Decision 1.

*Written following ADR-0002/ADR-0003/ADR-0004's established precedent: each module gets its own ADR rather than appending to an earlier one. Source material: Briefs #17–#22 (`Setup Instructions/Claude Prompts/`, private archive) and the Decision Archive's Critical Discoveries #60–#80.*

---

## Context

The Multi editor was built across six briefs: #17 (data layer), #18 (SOUND tab — Track editing, Mode/NAK routing), #19 (EFFECT panel reuse + Copy Effects), #20 (CONFIG tab — debounced full-dump sync), #21 (22A Copy from Combination), and #22 (navigation, dirty-state, file I/O). Unlike Combi, which was built then hardware-tested once at the end, Multi's implementation and hardware verification were interleaved across the session — several corrections (Critical Discoveries #61–#67) came from live hardware capture *during* Brief #18/#19 planning, not after the fact. Briefs #21/#22 and four bugs found immediately after them were hardware-tested together on 2026-07-09, along with two further bugs (Critical Discoveries #79, #80) found during that same pass.

---

## Decisions

### 1. Data Layer: Track Reuses Timbre's Wire Format Directly (Brief #17)

`parseMulti` is split into two entry points matching the device's two independent dump messages: `parseMultiEffects` (Func=0x55, 29 bytes — type, sub-type, time signature, tempo, effects, bend) and `parseMultiTracks` (Func=0x68, 208 bytes — 16 Track records per TABLE 4). The encoder mirrors this: `buildMultiEffectsDump`/`buildMultiExpansionDump`.

**Track and Combi's Timbre are the same wire format**, confirmed against a real captured Func=0x68 dump, not assumed from manual-table similarity (Critical Discovery #68): Track's 12-byte record (TABLE 4) is byte-identical to Timbre's (TABLE 2, offset `40+12n`) — same field order, same bank-flag bit position (bit 7 of the Control Filter byte), same enable-bit position. `parseMultiTracks`/`encodeMultiTracksToBytes` call `decodeTimbre`/`encodeTimbre` directly, with zero Track-specific variant — the only addition is `bendRange`, appended from TABLE 4's separate trailing 16-byte block, which Timbre has no equivalent of. This is a wire-format fact, not a modeling choice: a future correction to `decodeTimbre`/`encodeTimbre` for a Combi-specific reason will affect Multi's Track parsing too, and should be checked against both call sites (Landmine #49).

**Program No. has two unrelated wire encodings for the same conceptual field** (Critical Discovery #62): the Parameter Change layer reuses Combi's already-verified combined encoding (`encodeProgramNoParam`/`decodeProgramNoParam` — 0=Off, 1–100=A00–A99, 101–236=G01–G136); the dump-byte layer uses a bank-relative, zero-indexed scheme (0–99/0–135 plus a separate bank bit), structurally parallel to Combi's own dump layer but not value-identical to Multi's Parameter Change formula. `parseMulti`/`encodeMulti` must not conflate them.

**Track SW / Program independence** (Critical Discovery #63): confirmed via direct dump-byte manipulation that Track SW (the enable bit) gates MIDI reception entirely, not merely audio output, and is fully independent of the Program byte — modeled identically to Combi's Timbre (`Track.enabled: boolean`, `Track.programNo: number`, never a sentinel "off" value on the Program field itself).

### 2. Multi Mode and Parameter Change Addressing (Brief #18)

`MODE_MULTI = 0x04`. Func=0x41 (Parameter Change) is confirmed **live and bidirectional** for Multi (Critical Discovery #61) — contradicting the Function Code List's blank "M" column — addressing the nine TABLE 9 fields (Program, Level, Pan, Send C, Send D, Transpose, Detune, Bend Range, Prog Change Filter) at `16n + offset` for Track `n`. Verified via front-panel-to-Snoize capture, an absence test on the six fields TABLE 9 does *not* list (which produced zero traffic), and a live send-and-ACK round trip. The Function Code List's blank column is a documentation error, not a hardware restriction — worth remembering if a future table lookup suggests a field "isn't live" without an equivalent capture-based check.

`sendParamChange` and its NAK-recovery handler were generalized from a 3-way (drum/combi/program) to a 4-way scope switch, with Multi routing NAK recovery through `MODE_MULTI` rather than falling back to Program.

**Effects Parameter Change offset is `Program − 11`**, confirmed via two independent hardware captures on different effect types/slots (Critical Discovery #64) — structurally parallel to Combi's `−19` offset (ADR-0004 §3), letting Multi reuse the same hardware-verified `EFFECT_TYPES` per-type table.

**Send C/D's PRG sentinel is `0x0A`**, corroborated independently on Multi (Track 10, the GM drum kit default) after Combi first established it (Critical Discovery #50, #65) — a device-wide convention, not mode-specific.

### 3. Tab Structure: Duplicate Combi's Pattern, Not a Parameterization (Briefs #18–#20)

Multi's SOUND tab (`buildTrackRow`, `buildTrackPanCtrl`, `buildTrackSendCtrl`, `sendTrackActive`) is a **duplicate** of Combi's Timbre row implementation, not a shared parameterized function — consistent with this project's established convention (ADR-0004 §Alternatives: "duplicate rather than abstract across component families"). One deliberate behavioral divergence from Combi: selecting a new Program on a Track always sets `Track.enabled = true` (Combi's Timbre picker preserves existing Mute state instead), specified explicitly to prevent silently disabling a track a user is actively trying to turn on.

**CONFIG tab fields have no live Parameter Change path at all** — TABLE 9 documents zero Parameter Change numbers for Key/Vel Window, the four Control Filters, or MIDI Channel. This was confirmed by front-panel capture producing zero SysEx traffic for these fields (same absence test as Decision 2). CONFIG edits write to `workingCopy` immediately but only reach the device via a debounced Func=0x68 (Multi Setup Expansion) send — `scheduleConfigSync()` (400ms debounce via a newly-extracted `createDebouncer(delayMs)` utility, generalizing `sendBalancePair`'s prior inline pattern), `flushConfigSync()` (fired unconditionally at the top of the nav-tab click handler), and `cancelConfigSync()` (clears a pending send, called on Load/Import to prevent a stale timer from firing after fresher data lands).

**The EFFECT panel is the literal same engine Program/Combi use**, not a duplicate — per ADR-0003/ADR-0004's precedent for this one component, which is treated as a narrow, deliberate exception to the duplicate-don't-abstract convention because it's the same device engine at a shifted address, not three similar-but-distinct things. Brief #19 centralized what would otherwise be a third leg on every existing Program/Combi ternary into four dispatch helpers (`effectsStorePath`, `effectsParamOffset`, `effectsScope`, `rerenderModePanel`) — chosen specifically because Landmine #36 already flags incomplete-parameterization as a recurring risk in this codebase, and centralizing means a future fourth scope requires editing four functions, not re-discovering every inline ternary.

**Copy Effects is a cross-mode feature, not Multi-specific** (Critical Discovery #67): the manual's own Multi Setup chapter describes 21A as copying "the effect parameter settings from a Program, Combination, or song to the currently selected Program, Combination, or Multi setup" — one operation, no per-mode scoping. Implemented as a single `buildCopyEffectsControl`/`copyEffectsFrom` pair called identically from all three editors' Effect panels, closing Combi's previously-deferred "14A Copy Eff" gap in the same work.

### 4. Two Post-Ship Corrections to Copy Effects, Both Hardware-Discovered

**Routing was wrongly excluded** (Critical Discovery #76): the original decision treated Placement/OUT3-4 Pan/Level as a separate "Routing" concern because the UI presents them in a distinct ROUTING section — but `03_program_parameters.md` TABLE 7-1 groups them in the same contiguous "Effect Parameters" block as Effect 1/2's own params, with no routing/effect-chain split anywhere in the manual, and 21A's own description matches. Fixed by including params 159–165 in the copy. Channel Enable remains excluded on unrelated, still-valid grounds (Landmine #16 — no live Parameter Change number exists for it at all).

**The Effect 1/2 On/Off Switch was wrongly excluded** (Critical Discovery #71): originally reasoned as "not part of the dump schema" — true, but not a reason to skip a field the UI always shows some value for. Fixed by copying it via the existing `swParamNo`.

**The device itself resets OUT3/4 Pan/Level across the Parallel-3 Placement boundary** (Critical Discovery #77) — not merely "unpersisted," a genuine firmware behavior: entering Parallel 3 resets all four Level channels to `4`; leaving it resets Pan to `1`/`101` (L/R); Serial/Parallel-1/Parallel-2 transitions among themselves preserve Pan, hardware-confirmed. The editor had never sent anything for Pan/Level at a Placement change and never re-synced afterward, silently drifting from device state on every toggle. Fixed via `resetRoutingOnPlacementChange(base, paramOffset, scope, oldPlacement, newPlacement)`, wired into both Placement `<select>` handlers (Program's EASY tab and the shared EFFECT-tab ROUTING section) — deliberately re-sending values the device likely already applied itself, consistent with the Core Design Axiom's "never passively trust, always resync" bias. The Level display default was corrected from `?? 5` to `?? 4` to match.

### 5. Multi Is Never Dirty — a Write-Layer Exclusion, Not a Dirty-Scope Branch (Brief #22)

Multi has no action bar and no Write button of its own (Multi has no on-device slot to write to at all — see Decision 6). Brief #22's original plan was to add a fourth branch to `getDirtyScope()` so Multi edits wouldn't spuriously dirty PROG/COMBI's Write buttons or pop the Abandoned Edits modal. Re-reading the actual call graph ahead of implementation found this wouldn't have worked (Critical Discovery #73): `getDirtyScope()` is not a per-scope dirty dispatcher — it takes no argument and only runs *after* `store.isDirty()` (a single unscoped `dirtyParams.size > 0` flag) has already gated the modal. Adding a branch there changes nothing about whether the modal fires in the first place.

**Corrected mechanism:** a new `store.setParamQuiet(path, value)` — identical to `setParam` except it never adds to `dirtyParams` — is called by the local `setParam` wrapper (the sole write choke point, Landmine #26) for every `multi.*` path instead of `store.setParam`. `multi.*` never enters the shared dirty-tracking Set at all, so no scope-branch anywhere downstream needed to change.

### 6. Multi Has No Non-Volatile Memory — the Dump *Is* the Write (Critical Discovery #60)

The manual states Multi Setup settings are lost on power-off and must be saved externally; there is no Multi Write Request function code (unlike Program's 0x11, Combi's 0x1A) and no persistent on-device slot. This is the single fact that shapes every file-I/O and mode-entry decision below:

- **No destination-slot concept exists for Multi** — unlike Program/Combi's Patch-Browser-select-a-slot-then-write pattern, Multi's Load flow (`doLoadMultiFlow`) has nothing to pick a destination for; it merges directly into the one `workingCopy.multi` and pushes.
- **Mode Change entry/exit alone constitutes "entering Multi edit state.**" There is no separate edit buffer to dump into first — `sendMultiExpansionDumpAndAwaitAck`/`sendMultiEffectsDumpAndAwaitAck` defensively resend `buildModeChange(MODE_MULTI)` before every send (documented in-code as "no device-mode tracker exists anywhere in this app to check 'already in Multi mode' instead"), and `cancelPatchBrowser`'s Multi branch (Decision 8 below) only needs to resend the Mode Change, with no buffer resync step.
- **Load auto-pushes to the device unconditionally**, with no "write to device?" confirm gate the way Program/Combi/All-Data Loads now have (see the Progress Log's post-Load write-prompt feature) — a deliberate, explicit exception, since for Multi the dump *is* the only way the loaded data reaches the device at all, not an optional extra step.

### 7. File I/O — Multi's 208-Byte Expansion Is Structurally Separate From "All Data" (Critical Discovery #78)

Func=0x50 ("All Data") can only ever carry Multi's 29-byte Effects block (NOTE 10's byte-count formula) — never the 208-byte Expansion (Track assignments). `snapshotToSyx` was always correctly scoped to this limit; the bug was in its callers treating the output as complete. Both `sendAllDataDumpAndAwaitAck` (Write All Data) and `doSaveAllDataFlow` (Save All Data) now separately follow up with the Expansion half (`sendMultiExpansionDumpAndAwaitAck`/`buildMultiExpansionDump`), and the read-side mirror (`doRequestAllDataDumpFlow`) now requests Func=0x33 alongside Func=0x0F. `Write/Save All Programs/Combinations` were deliberately left untouched — their own dialogs never claimed Multi coverage.

The factory reference file (`X5dr Factory Sounds.syx`) turned out to already carry this same two-message shape as a **trailing standalone Func=0x68 message** appended after its Func=0x50 payload (Critical Discovery #75) — explaining why a third-party SysEx utility sending the same raw file resets Multi's Tracks correctly while our own freshly-*built* Func=0x50 never did (it never had a Func=68 companion to begin with). `doSaveMultiFlow` (FILE → Save → Multi) uses the identical two-message-per-file shape directly.

**Load requires both halves present**, rejecting an incomplete file with a clear status message — `store.replaceMulti` treats a present-but-null key as a real overwrite (by design, for the two-independent-arriving-dumps case), so a file with only one half would silently wipe the other half of whatever Multi Setup is already loaded. Import-from-Device has no equivalent guard, since it always requests both together in the same flow (`doRequestMultiDumpFlow`) — the risk there is structural, not needing a runtime check.

### 8. Patch Browser Must Track Multi as a Real Prior Scope, Even With No Browsable List of Its Own (Critical Discovery #79)

Multi has no per-slot browsable patch list — the Patch Browser's sub-panel display always falls back to showing Programs when opened from the MULTI tab. This made it easy to also conflate "no list to browse" with "nothing to restore on Cancel": `openPatchBrowser`'s original scope ternary had no MULTI case at all, so `browserState.priorScopeType` was silently recorded as `'program'`, and Cancelling a MULTI-tab-opened browser (e.g. after a file Load) re-entered Prog Edit mode instead of restoring Multi mode — hardware-reproduced as subsequent Track edits changing the device's OSC Mode/OSC Assign parameter instead of the intended Track fields.

Fixed by separating the two concerns explicitly: `priorScopeType` (what to restore on Cancel — now three-way, including `'multi'`) from `displayType` (what sub-panel to show — still two-way, Multi falls back to Program display). `cancelPatchBrowser`'s new `'multi'` branch just resends `buildModeChange(MODE_MULTI)`, per Decision 6 — no buffer resync needed.

### 9. NAK Recovery and Action-Bar Routing Extended to a Fourth Scope (Brief #18)

Both `sendParamChange`'s NAK-recovery Mode Change and `setParam`'s action-bar dirty-state routing (`updateActionButtons(path.startsWith('combis.') ? 'combi' : 'prog')`) had **implicit ternary defaults with no explicit `else`** — extending either to a fourth ('multi') scope required noticing that any path not matching the earlier branches silently fell through to Program, not just adding an obviously-analogous new branch (Critical Discovery #69, generalizing Landmine #36's original Combi-era lesson). `setParam` now checks `path.startsWith('multi.')` explicitly and calls `store.setParamQuiet` (Decision 5) rather than falling through.

### 10. Unsolicited Func=0x41 on Multi Mode Entry Is Structurally Inert (Critical Discovery #74)

The X5DR spontaneously transmits one unrequested Func=0x41 (Track 1's current Program) immediately on entering Multi mode. Rather than adding runtime filtering, this was closed via code-level proof: `isAck`/`isNak`/`isFormatError`/`isWriteCompleted`/`isWriteError` all require exactly 6 bytes (a real Func=0x41 is 10), and `dumpFuncs` excludes 0x41 — so the unsolicited message cannot match any pending-request handler by construction, not merely "hasn't been observed to cause a problem yet."

---

## Alternatives Considered

- **Write a Track-specific `decodeTrack`/`encodeTrack` rather than reusing Combi's Timbre functions:** rejected — the wire format is byte-identical, confirmed against a real hardware capture; writing a parallel implementation would duplicate ~200 lines that would need to independently absorb every future Timbre correction, with no compensating benefit.
- **Add the fourth `getDirtyScope()` branch as Brief #22 originally planned:** rejected after re-reading the call graph — that function isn't the actual gate; the fix belongs at the write layer (`setParamQuiet`), a smaller change that needed no downstream branch at all (Decision 5).
- **Give Multi its own Write-destination-picker UI, mirroring Program/Combi:** rejected — there is no on-device slot to write to (Decision 6); building picker UI around a destination concept that doesn't exist would be pure busywork.
- **Filter the unsolicited Func=0x41 defensively at the input handler:** rejected — proven structurally inert by message-length/func-code exclusion (Decision 10); adding a filter would be defensive code against a risk that provably doesn't exist.
- **Parameterize Multi's SOUND/CONFIG tabs as a third leg of Combi's existing functions, rather than duplicating them:** rejected, consistent with this project's standing convention (ADR-0004) — the EFFECT panel remains the sole, deliberate exception because it's the literal same engine, not a similar-but-distinct feature.

---

## Consequences

- Any future correction to `decodeTimbre`/`encodeTimbre` must be checked against both call sites (`parseCombi`/`encodeCombiToBytes` and `parseMultiTracks`/`encodeMultiTracksToBytes`) — Landmine #49.
- Any future top-level tab that comes to claim its own device mode should budget for the same three things Multi (and Combi before it) required: an entry transition, a settling-delay-aware re-entry if reachable from an async continuation, and — per Decision 8 — an explicit `priorScopeType` case in the Patch Browser even if that scope has no browsable list of its own.
- Any future scoped bulk import or Load flow must merge per-slot rather than blind-`loadSnapshot`, and that check must be run against *every* current code path performing the same underlying operation, not just hypothetical future ones — Landmine #42, amended after this session's Critical Discovery #80 recurrence.
- Multi's "the dump is the write" model (Decision 6) means Multi will never gain a Write menu entry, a destination picker, or a Write-button dirty state — this is a permanent structural fact about the device, not a v1.0 scope gap to close later.
- The Multi editor is now feature-complete and hardware-verified end-to-end: SOUND tab (Track editing, Program picker, EFFECT panel, Copy Effects, 22A Copy from Combination), CONFIG tab (debounced sync, Retry), navigation (Mode Change entry/exit, Patch Browser Cancel), and File I/O (Load with auto-push, Save, Import from Device, All Data's Effects+Expansion split). Remaining open items are pre-existing and out of this ADR's scope: the Global editor (entirely unbuilt), the Channel Enable full-dump-write retest, and the Copy Effects Source Browser's Phase 3 tab-label rename.
