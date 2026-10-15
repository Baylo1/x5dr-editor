# ADR-0006 — Global Editor: Cross-Cutting Architecture

**Date:** July 2026
**Status:** Accepted — Global editor complete and hardware-tested (Brief #23, plus two post-test fixes)
**Scope:** Cross-cutting decisions specific to the Global Editor — data layer, wire format, debounced sync, navigation, dirty-state handling, and file I/O. This document does **not** cover:
- The generic `createDebouncer(delayMs)` utility itself (extracted from `sendBalancePair`'s original inline pattern, first generalized for Multi's CONFIG tab) — that's ADR-0005 §3. This ADR only covers Global's own instantiation of it.
- The project-wide SysEx-channel-addressing risk (the app's assumed outgoing channel must match the device's real configured channel, or every exchange silently fails) — that's Project Context Landmine #57, discovered during this editor's design phase but applicable to every editor, not scoped here.

*Written following ADR-0002/ADR-0003/ADR-0004/ADR-0005's established precedent: each module gets its own ADR rather than appending to an earlier one. Source material: `X5DR_Global_Editor_Design_Spec.md` (Revisions 1–4), `Brief-23-Global-Editor.md`, and the Decision Archive's Critical Discoveries #81–#85.*

---

## Context

Unlike Multi (six briefs, interleaved implementation and hardware verification) or Combi (seven briefs, built then tested once), the Global editor was designed across one extended session (the spec went through four revisions as hardware captures corrected two of its central assumptions) and then implemented as a single brief (#23), on the explicit reasoning that Global has no live-vs-dump-only divide to split along the way Multi's SOUND/CONFIG tabs did. Implementation was followed by one hardware test pass, which found one bug and prompted one design reversal — both closed out in the same session before this ADR was written.

---

## Decisions

### 1. Global Has No Live Parameter Change Path at All — the Entire Editor Is Dump-Based (Critical Discovery #81)

Program has TABLE 7, Combination has TABLE 8, Multi has TABLE 9 — there is no equivalent Parameter Change table for Global anywhere in the reference material (`00_INDEX.md`, `01_channel_messages.md`, `02_sysex_format.md` all confirmed this independently). Only Func=`0E` (Dump Request) and Func=`51` (Global Data Dump) exist. This means Global's every field behaves the way Multi's CONFIG-tab fields do — not a subset needing a live/dump split, the *entire* editor. `workingCopy.global` updates immediately on every edit; the device only hears about it via a debounced full Func=`51` send (Decision 5).

Global settings are also confirmed non-volatile directly from the manual's own chapter opening: *"Settings made in this mode are memorized even when the power is turned off."* Combined with Decision 1, this is why Global has no Write Request function code and no Device Write menu entry (Decision 8) — persistence isn't something this app needs to trigger at all.

### 2. Wire Format: One Leading Pad Byte, 28 Raw Bytes Packing Evenly to 32 (Design Spec §4.1)

`F0 42 3g 36 51 [00] [32 packed bytes] F7` — a single `0x00` pad byte precedes the packed payload (confirmed present and always `0x00` across every hardware capture this session), the same leading-pad shape Multi's Func=`55` uses (unlike Func=`68`'s no-pad shape). TABLE 5's 28 raw bytes are evenly divisible by 7, so the packed payload is always exactly 32 bytes with no partial trailing group — `buildGlobalDump`/`encodeGlobalToBytes` (`src/midi/sysex.js`) implement this directly, reusing the existing `pack7bit`/`packedLength` helpers rather than any new packing logic. `parseGlobal` (`src/midi/parser.js`) was written during the design session, ahead of the rest of the data layer, and needed no changes during implementation — it already matched TABLE 5's confirmed layout exactly.

Bytes 02–04 and 23–27 are confirmed genuinely reserved/unused — `00` in every hardware capture across eight single-field-change tests (Critical Discovery #83) — not a documentation gap hiding undiscovered fields, refuting an earlier hypothesis from the design session's Revision 2 (Decision 3 explains where those hypothesized fields actually turned out to live, or not live at all).

### 3. MIDI Global Channel Lives in the SysEx Header, Not the Dump — and Is Not Editable via This App (Critical Discoveries #83, #84; Landmine #57)

Revision 2 of the design spec hypothesized that four fields named in the manual's Preset Data Load description (MIDI Global Channel, Note Receive Filter, External Out Select, and the four MIDI Filter sub-fields) lived in TABLE 5's "reserved" bytes. A hardware capture refuted this: those bytes are genuinely unused, and six of the seven hypothesized fields (everything but MIDI Channel) produced **zero** SysEx traffic change anywhere, on any test — they have no SysEx representation at all and are permanently out of scope (Design Spec §6.1).

**MIDI Channel is real, but lives in the SysEx header's own channel byte (`3g`)** — changing it on the front panel changes every subsequent outgoing message's header, never any dump content. A follow-up live addressing test confirmed the device **silently ignores any SysEx message not addressed to its currently-configured channel** — no NAK, no response of any kind — meaning there's no way to provisionally address a not-yet-adopted channel either. MIDI Global Channel therefore has no safe SysEx write path at all and is permanently excluded from this editor's UI. This also surfaced as a project-wide risk (Landmine #57, not scoped to Global): every SysEx exchange this app performs depends on its assumed channel matching the device's real one, with total silent failure as the consequence of any mismatch. The accepted v1.0 scoping decision is channel-1-only (`SYSEX_HEADER` hardcodes `0x30`), deferred to v1.1 or until a real multi-device need appears.

### 4. User Scale's Byte Range Is ±99, Not TABLE 5's Transcribed ±50 (Critical Discoveries #82, #83)

TABLE 5's transcription gave User Scale a `0xCE`–`0x32` (±50) signed byte range. Cross-referencing the manual's own Global Parameters chapter suggested ±99 instead; a hardware capture then confirmed it directly — Note C set to +60 cents decoded to exactly `0x3C` (60), and Note C# set to -99 cents decoded to exactly `0x9D` (two's-complement -99), both well outside the transcribed ±50 range and exactly matching TABLE 5's predicted byte offsets (07=C, 08=C#). `parseGlobal`/`encodeGlobalToBytes` use the standard signed-8-bit helper already established for Combi/Multi's Detune/Transpose fields — this is a plain two's-complement value, not a novel encoding, just a wider range than originally transcribed. The two boundary-value wire fixtures from this capture are used as literal Vitest round-trip test cases (`src/midi/sysex.test.js`), specifically chosen because a bug that silently clamped or wrapped at ±50 would fail them but pass on any narrower ad hoc test.

### 5. Debounced Auto-Sync Reuses Multi's `createDebouncer` Directly — Same Naming Convention, Separate Instance (Design Spec §5.2)

`scheduleGlobalSync()`/`flushGlobalSync()`/`cancelGlobalSync()`, 400ms, mirror Multi's `scheduleConfigSync`/`flushConfigSync`/`cancelConfigSync` naming exactly, instantiated as a second call to the same `createDebouncer(delayMs)` utility (ADR-0005 §3) rather than a parallel implementation. On fire: defensively resend Mode Change to Global (matching every other dump-send helper's "no device-mode tracker exists to check 'already in the right mode'" reasoning) with a 100ms settling delay (Landmine #18/#41's pattern, since this fires from an async debounce continuation, never a direct click) before sending `buildGlobalDump(workingCopy.global)`. Always sends the full current state — a new edit before the timer fires resets the timer, never queues a second pending send. A small `#global-sync-status` indicator (pending/syncing/synced/error+Retry) mirrors Multi CONFIG's existing status widget pattern.

### 6. `setParam`'s Fifth Scope Branch: `global.` Routes Through `setParamQuiet`, Never Dirty

Global has no Write/Discard action bar (same reasoning as Multi, Decision 6 of ADR-0005) — nothing here is ever genuinely "abandonable" since a pending edit always gets flushed to the device before navigating away (Decision 7). The local `setParam` wrapper (the sole write choke point, Landmine #26) was given an **explicit** `path.startsWith('global.')` branch, not left to an implicit ternary default — this exact failure shape (a new scope silently falling through to an existing one) has bitten this codebase twice already extending from 2-way to 3-way (Combi) and 3-way to 4-way (Multi, Landmine #36/ADR-0005 Decision 9). The branch routes to `store.setParamQuiet` and calls `scheduleGlobalSync()`.

### 7. Navigation: a Distinct `editMode` Value (`'globalTab'`) to Avoid Colliding with an Existing Use of `'global'`

The pre-existing `editMode = 'global'` value already means "device is in Global mode for Drum Editor purposes" (Landmine #19 — the Drum Editor inner-tab inside PROG, active when OSC Mode = Drums, sends Mode Change to Global before editing drum note parameters). Both that context and the new top-level GLOBAL tab point at the same underlying device mode (`MODE_GLOBAL`, `0x05`), but they are different UI contexts with different exit-transition needs — the nav-tab click handler's `dest === 'prog'` branch, for instance, decides whether to resync Prog Edit based on what `editMode` was when leaving. Conflating the two under one value would make that branch ambiguous about which context it's actually leaving. Kept as two distinct string values sharing one physical device mode, per Landmine #38's general warning about careless `editMode` ownership across mode-entry points.

Leaving GLOBAL flushes any pending debounced sync immediately, before the destination tab's own Mode Change is sent (same rationale as Multi's CONFIG flush, ADR-0005 §6.5/§12.1) — and correspondingly, `dest === 'prog'`'s exit-transition condition was widened to include `editMode === 'globalTab'`, alongside the pre-existing `'combiEdit'`/`'multi'` checks, so leaving GLOBAL→PROG properly resyncs Prog Edit rather than leaving the device stranded in Global mode.

### 8. Global Has No Non-Volatile Slot for This App's Purposes — the Dump *Is* the Write (Design Spec §5.1)

Mirrors Multi's Decision 6 (ADR-0005) exactly, for the same underlying reason: no Write Request function code exists, and no destination-slot concept applies. `write-global` was removed from the Device menu markup entirely (not left as a disabled stub) — a menu entry would misleadingly imply a persistence step that doesn't exist. Load (`doLoadGlobalFlow`) has no destination picker either; it merges directly into the one `workingCopy.global` and auto-pushes to the device with Retry on failure, cancelling any pending debounce first to avoid a stale-timer race (same Load-vs-debounce protection Multi's Load auto-push established).

### 9. User Scale Is Not Mode-Gated — Always Editable Regardless of Main Scale Type (Critical Discovery #85)

The initial implementation gated the 12-row User Scale grid's editability on `mainScaleType === 10`, following the Design Spec §2.2 language calling for "the same enable/disable pattern as any other mode-gated control elsewhere in the app." Hardware testing surfaced two problems with this, addressed together: the gating never actually took effect after the first render (the Main Scale Type dropdown's `onChange` never re-rendered the grid, so it stayed stuck in whichever state it had on first load — disabled, since the device default is Equal Temp), and once that bug was fixed, the gating concept itself turned out to be wrong. `GlobalSettings.userScale` is one shared 12-note table addressable independently from either Main Scale Type or Sub Scale Type — the device's own factory default proves this concretely, shipping with Sub Scale Type = User Scale while Main Scale Type = Equal Temp simultaneously. Gating edits behind Main Scale Type specifically would have made that exact, real, default configuration's User Scale unreachable without a spurious detour. **This supersedes Design Spec §2.2** — User Scale is always editable now, with no conditional messaging.

### 10. Scoped Import/Load Never Calls `loadSnapshot()` for a Global-Only Operation (Landmine #42/#56)

`store.replaceGlobal(settings)` fully replaces `workingCopy.global` only — following the same rule already established for every other scoped import in this codebase (Multi's `replaceMulti`, Program/Combi's `replaceProgram`/`replaceCombi`). Both `doLoadGlobalFlow` (file Load) and the `isGlobalDump` branch in `scheduleDumpSettle` (Import from Device, Func=`51` response) use it, never the generic `loadSnapshot()`, which would otherwise wholesale-replace `workingCopy` and silently wipe out whatever Program/Combi/Multi state was already loaded in the same session.

---

## Alternatives Considered

- **Model `midiChannel`/`noteReceiveFilter`/`externalOutSelect`/`filters` as fields in `GlobalSettings`, per Revision 2's initial hypothesis:** rejected after a hardware capture found none of them belong there — six produced zero SysEx traffic on change (no path exists at all), and MIDI Channel turned out to live in the header, not the dump (Decision 3).
- **Gate User Scale's editability by Main Scale Type, per the original implementation and the Design Spec's own §2.2 language:** rejected after hardware testing and user feedback — the device's own default configuration directly disproves the premise that User Scale "belongs" to whichever scale-type slot currently points at it (Decision 9).
- **Give Global its own new debounce implementation, distinct from Multi's:** rejected — `createDebouncer` is already a generic, path-agnostic utility; a second implementation would duplicate the cancel/flush/trigger semantics for no benefit (Decision 5).
- **Reuse the existing `editMode = 'global'` value for the top-level GLOBAL nav tab:** rejected — already claimed by the Drum Editor inner-tab for a different UI context sharing the same device mode; conflating them would make exit-transition logic ambiguous (Decision 7).
- **Expose MIDI Global Channel as an editable field, deferred rather than removed:** rejected — a live addressing test proved there is no SysEx sequence that could safely write a new value in, not merely that the wire offset was unknown (Decision 3). This is a permanent structural fact about the device, not a v1.0 scope gap.

---

## Consequences

- Any future correction to the signed-8-bit dump-byte helper Global reuses (shared with Combi/Multi's Detune/Transpose) must be checked against all three call sites.
- Any future top-level nav tab that claims its own `editMode` value must check whether that value (or a similar-sounding one) is already in use by a different UI context sharing the same underlying device mode — Decision 7's `'globalTab'` vs. pre-existing `'global'` collision is the second time this project has had to reason carefully about `editMode` ownership (the first being Combi/Multi/Drums in ADR-0004/0005's lineage, Landmine #38).
- Any future control whose value gates another control's enabled/disabled state must re-render (or otherwise explicitly propagate) on every change — a `disabled` attribute set once at render time does not update itself. Global's User Scale bug (Critical Discovery #85) is the concrete instance; the general risk applies to any future mode-gated field in this app, including Phase 3 rotary controls if any gain conditional enablement.
- Design-spec language should be treated as a starting hypothesis to verify against the actual data model, not a literal instruction to implement unexamined — "same pattern as any other mode-gated control" read naturally as applicable until the device's own default configuration proved it wasn't (Decision 9).
- The Global editor is now feature-complete and hardware-verified end-to-end: all 9 fields (Master Tune, Key Transpose, Velocity/After Touch Curve, Main/Sub Scale Type/Key, 12×User Scale), debounced sync with Retry, navigation (Mode Change entry/exit, Patch Browser Cancel), and File I/O (Load with auto-push, Save, Import from Device). No open Global-editor work remains — see the Progress Log.
