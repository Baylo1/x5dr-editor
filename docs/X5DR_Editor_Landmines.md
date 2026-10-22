# Korg X5DR Editor — Landmines

*Non-obvious, code-affecting facts that cause a regression if forgotten. **This file is live**: new Landmines and corrections go here (one terse entry), with the narrative in a new Decision Archive entry. The unedited pre-2026-09-30 text, with every amendment chain, is frozen in `X5DR_Editor_Landmines_Full.md` (private archive only) — read it on demand when an entry needs its history.*

**Conventions**
- **Numbers are stable.** Never renumber; a fixed or obsolete entry becomes `RETIRED — <one line>` and keeps its number.
- **Evidence tag** on every entry: `HW` hardware-confirmed · `MANUAL` from the Korg manual only · `INFERRED` reasoned, not tested · `CODE` a rule about this codebase, checked against current source.
- **⚑ CONTRACT** — behavior the refactor/audit must not change. Any change touching one needs a hardware re-test.
- **Corrected** notes record where an earlier version of the entry was wrong, so it isn't re-derived.
- Byte sequences, formulas and thresholds are exact — never paraphrase them.

---

## Topic Index

| # | Topic | Landmines |
|---|---|---|
| 1 | Device modes, ACK/NAK, timeouts, MIDI channel | 1, 2, 3, 4, 6, 7, 18, 19, 21, 24, 38, 41, 43, 48, 54, 57, 60, 62, 104, 112, 114, 115, 116, 118, 119, 120, 121, 126, 129 |
| 2 | Wire formats, dump layout, packing, encodings | 5, 10, 12, 13, 14, 17, 20, 22, 23, 25, 35, 42, 44, 45, 47, 53, 55, 56, 111, 122 |
| 3 | Effects (layout, Balance, MG Status) | 9, 11, 16, 52, 89, 90, 93, 94, 108, 109 |
| 4 | Store, dirty state, write/discard | 26, 27, 32, 36, 37, 51, 59, 61, 110, 113 |
| 5 | Program / Combi / Multi / Global / Drums specifics | 33, 39, 40, 46, 49, 50, 58, 63, 64, 65, 75, 76, 88, 102 |
| 6 | UI components and CSS layout | 15, 28, 29, 30, 31, 34, 66, 67, 68, 70, 71, 72, 73, 74, 77, 78, 79, 81, 82, 83, 84, 85, 86, 87, 91, 92, 96, 97, 98, 99, 100, 101, 105, 106, 107, 117, 124, 127, 128, 130 |
| 7 | Tooling (routing, dev server, tests, git, build) | 8, 69, 80, 95, 103, 123, 125 |

---

## 1. Device modes, ACK/NAK, timeouts, MIDI channel

**1. ⚑ CONTRACT — Parameter Change needs a prior Mode Change.** Func=`41` NAKs unless the computer first sent Func=`4E` to the matching edit mode; the front-panel Edit button does not count. `F0 42 3g 36 4E 03 00 F7` (Prog Edit), then `F0 42 3g 36 41 pp pp vv vv F7`. Mode codes: `00` Combi, `01` Combi Edit, `02` Program, `03` Prog Edit, `04` Multi, `05` Global. `HW` *(Archive #1)*

**2. ⚑ CONTRACT — Program Change is ignored in Prog Edit.** Sequence: Mode Change Program (`0x02`) → Program Change → Mode Change Prog Edit (`0x03`) — as `switchToAndEditSlot` does (with the #41 delay). `HW` *(Archive #7)*

**3. ⚑ CONTRACT — Enter edit mode eagerly, when the user commits to a slot — never lazily on the first edit.** Lazy entry makes the device display jump to OSC Mode. Today the trigger is Patch Browser confirm (`switchToAndEditSlot`/`switchToAndEditCombiSlot`) and the nav-tab restores (#38). *Corrected:* the original trigger was the Edit button, since removed (#39). `HW` *(Archive #8)*

**4. ⚑ CONTRACT — A NAK means the device has left edit mode.** The NAK handler sets `editMode = null`. PROG/COMBI (the scope in `pendingParam`) then recover with `restoreDeviceModeForTab(scope, { resync: true })`: play mode → Program Change to the editor's slot → 100 ms (#41) → edit mode → the editor's whole `40`/`49` buffer, so every unsaved edit returns even if another slot was selected on the front panel. Drum/Multi (no edit buffer, #58) re-send the scope's Mode Change and the last parameter after 100 ms (#18). Leaving Prog Edit on the front panel keeps the edit buffer; only selecting another program discards it. *Corrected 2026-10-08:* recovery used to resend only the last parameter for every scope (F5). *Corrected 2026-09-30:* earlier text named a `modeChangeSent` flag that no longer exists. `HW` *(Archive #9, #217, #218)*

**6. Filter Active Sensing (`FE`) at the MIDI input handler** — the device sends it continuously. `HW` *(Archive #4)*

**7. Chrome delivers 3–4 copies of each ACK** (several enumerated input ports for one device). Treat the first as confirmation: write flows settle on the first ACK and clear their callbacks; the status-bar ACK display ignores repeats within 100ms (`lastAckTime`). `HW` *(Archive #3)*

**18. ⚑ CONTRACT — Wait 100ms after re-entering edit mode from a non-edit state before sending a Parameter Change.** The device needs a settling window. It also sends several NAKs per failure — `ignoringNaks` suppresses the duplicates until the resend. Human-paced first entry needs no delay. `HW` *(Archive #17)*

**19. ⚑ CONTRACT — Drum kit parameters (Func=`53`) need Global mode (`0x05`).** Program parameters (Func=`41`) NAK in Global mode; drum parameters NAK in Prog Edit. The DRUMS tab enters `0x05` on entry and restores the destination's mode on exit. `HW` *(Archive #20)*

**21. Out-of-range parameter numbers get Func=`26` (Received Data Format Error), not a NAK (`24`).** Typical cause: editor and device disagree on OSC mode, so OSC-2/VDF-2/VDA-2 params (88–154) are rejected. `isNak` does not match it; use `isFormatError`, or the error is invisible. On a PROG param 88–154 the handler shows one box at a time (`oscMismatchBoxOpen`) offering "Resend to device" (`restoreDeviceModeForTab('prog', { resync: true })`, which pushes the editor's OSC Mode); every other `26` stays status-only/silent — effect type changes, Copy Effects and single-control Balance R produce benign ones. `HW` *(Archive #22, #217, #219)*

**24. Async device-send helpers resolve, never reject, when hardware is absent** — return a sentinel (`'no-output'`, alongside `'nak'`/`'timeout'`) that callers branch on. Rejecting threw in every `await` without `try/catch` and froze modals/buttons on machines with no output selected. `CODE` *(Archive #26)*

**38. ⚑ CONTRACT — `editMode` is one shared variable, claimed by whichever mode-entry runs last — every mode-entry point needs a matching exit that restores the previous tab's device mode.** COMBI↔PROG resync both ways via `switchToAndEditSlot`/`switchToAndEditCombiSlot` (Program Change + mode, with the #41 delay). PROG's idle/browse-only state is deliberate; don't make every PROG click enter edit mode. Every nav-tab switch restores the destination's mode through `restoreDeviceModeForTab(dest)`, never by inspecting `editMode`, which a port/channel change leaves `null`. *Corrected:* the original text referred to the since-removed Edit button (#39). `HW` *(Archive #47, #54, #192)*

**41. ⚑ CONTRACT — A Mode Change (exit) → Program Change → Mode Change (re-entry) burst must delay the re-entry Mode Change, and the `editMode` assignment, by 100ms.** With no delay it works from a fresh click but fails silently when reached from an async continuation (after an ACK or Write Completed): the device drops out of edit mode and the next Parameter Change gets `0x26`. Applies to `switchToAndEditSlot`/`switchToAndEditCombiSlot` and any future function of this shape. `HW` *(Archive #54)*

**43. ⚑ CONTRACT — The device's current mode decides whether Program Change (`Cn pp`) selects a Program or a Combi.** Any browse/audition UI must send the matching Mode Change every time the browsed category changes — including switching sub-panels inside an already-open Patch Browser, not just at open. `HW` *(Archive #52)*

**48. Entering Multi mode makes the device send an unsolicited Func=`41`** (Track 1's Program), unprompted. Incoming-message code must never assume a message answers an editor request. `handleSysexMessage` currently ignores it (Func=`41` is not in its dump set); spontaneous dumps in general are ignored (v1.1). *Corrected 2026-09-30:* previously flagged "needs an explicit test"; current code verified to ignore it. `HW` *(Archive #61)*

**54. Scopes with no patch list (MULTI, GLOBAL, DRUMS) still need explicit cases in `openPatchBrowser`'s `priorScopeType` and in `cancelPatchBrowser`** (which maps it to a tab for `restoreDeviceModeForTab`). Falling through defaults to Program and re-enters Prog Edit. "Nothing to browse" ≠ "nothing to restore." `CODE` *(Archive #79, #89, #192)*

**57. ⚑ CONTRACT — The device silently ignores any SysEx whose header channel (`3g`) ≠ its Global MIDI Channel** — no NAK, no reply, indistinguishable from a bad cable. The device's channel is settable only on its front panel ([GLOBAL] page 02A, CH); the editor's header Ch 1–16 selector must be set to match. A mismatch now surfaces only as the send-timeout modal (#115). `HW` *(Archive #84, #186, #195)*

**60. DRUMS claims `MODE_GLOBAL` under `editMode = 'drumsTab'`, GLOBAL under `'globalTab'`** — same device mode, deliberately distinct values; NAK recovery depends on telling them apart. `CODE` *(Archive #89)*

**62. ⚑ CONTRACT — `switchToAndEditSlot`'s Program Change discards the device's Prog Edit buffer — only call it when PROG is clean.** DRUMS→PROG, exempt from the dirty gate (#61), must send a bare Mode Change when PROG is dirty: `restoreDeviceModeForTab`'s select mode checks for `programs.*` dirty paths. *Corrected 2026-10-02:* DRUMS→PROG used to send the bare Mode Change even when clean; now a clean PROG gets the full select. `HW` *(Archive #90, #192)*

**104. Native `confirm()`/`alert()` are gone — use `showConfirmModal({title, body, warning, okLabel, cancelLabel})` → `Promise<boolean>` / `showAlertModal({title, body})` → `Promise<void>`.** A caller awaiting one inside `handleSysexMessage` (which is `async`) must re-read state such as `pendingParam` *after* the `await`: the modal is non-blocking and a pointer-captured knob drag keeps updating that state behind it. Only one `#modal-confirm` box shows at a time: a call made while one is open waits in `confirmModalQueue` until it closes (before 2026-10-08 the second call overwrote the first and both settled on one click). `HW` *(Archive #166, #218)*

**112. ⚑ CONTRACT — A function that sends a Mode Change as a side effect of pushing data must restore the active tab's mode afterward.** `sendAllDataDumpAndAwaitAck` pushes Multi's Track data via `sendMultiExpansionDumpAndAwaitAck`, leaving the device in Multi; the Write All Data flow then calls `resyncDeviceToActiveTab()`. Without it, the next edit landed on a Multi Track parameter. The Multi/Global/Drums pushes all go through `sendDumpAndAwaitAckOnce(buildMsg, {mode, editModeAs})`, which leaves the device in that mode — the caller restores via `restoreActiveTabModeIfChanged(editModeBefore)` (Write All Data, FILE → Load Multi/Global/Drums), even when the push failed. `HW` *(Archive #173, #191, #192)*

**114. ⚑ CONTRACT — Discard is local and never gated on the device — every discard path uses `discardEditsAndResync`.** It reverts the store first, unconditionally, then resyncs the device best-effort, bounded by `RESYNC_TIMEOUT_MS` (3000). Callers that navigate afterward still `await` it so its Mode Change/dump can't overlap the destination's (#18, #41). Write flows are the opposite: they wait for a real ACK. `HW` *(Archive #183)*

**115. ⚑ CONTRACT — Every send-and-await helper arms its reply through `armAckReply`/`armWriteReply`, never a bare `awaitingWriteAck = true`.** With SysEx reception disabled the device answers nothing, not even a NAK. Dump timeout = `ACK_TIMEOUT_BASE_MS` (5000) + `ACK_TIMEOUT_PER_BYTE_MS` (0.4) × bytes — an All Data dump takes ~11s just to transmit. Helpers resolve `'timeout'`; each caller must not mislabel it (e.g. as "No data loaded"). Expose each via `withTimeoutRetry` (a `…Once` function is one attempt) for the Retry/OK modal, and hide the freeze overlay while that modal is up. Live Parameter Changes are fire-and-forget: a NAK is detected, silence is not. `HW` *(Archive #185)*

**116. ⚑ CONTRACT — Every MIDI send takes its channel from the selector: `sysexHeader()` for SysEx, `0xC0 | getSysexChannel()` (etc.) for channel messages — never a literal `0x30` header or bare `0xC0`/`0x90`/`0x80`.** Response checkers (`isAck`, `isNak`, …) accept any `3g`. `SYSEX_HEADER` is the channel-1 constant for tests only. After editing a JS string in `index.html`, run `node --check` on the extracted module script — one unescaped apostrophe takes down the whole page. `HW` *(Archive #186)*

**118. `midiAccess.onstatechange` fires on an output's first `send()` (implicit open) as well as on hot-plug, so rebuilding the port list must keep the current selection.** `populatePortSelect` keeps the user's choice by name (`preferredPortName`, localStorage `x5dr-midi-port`) and falls back to the "x5" auto-select only when the user hasn't chosen; `setSelectedOutput` resets `editMode`/`pendingParam` only when the output really changes. Chrome keeps unplugged ports in the map with `state === 'disconnected'` (sending throws), so they're filtered out. Chrome doesn't pick up a port *renamed* in Audio MIDI Setup until it is restarted (no `statechange`). `HW` *(Archive #190)*

**119. A Program Change (`Cn pp`) must follow a Mode Change to Program (`02`) or Combi (`00`), never be sent in whatever mode the device is in.** In Prog/Combi Edit it is ignored (#2); in Multi mode it most likely retunes the Multi Track on that channel, a change stored directly in device memory. `selectSlotOnDevice` and both resync helpers (`resyncDeviceProgramBuffer`/`resyncDeviceCombiBuffer`) send play mode → Program Change → 100ms (#41) → edit mode. Confirmed: Write All Data's old resync (`C0 00` in Multi mode) retuned the channel's Multi Track to G01. `HW` *(Archive #192)*

**120. A flushed debounced sync (Multi CONFIG Func=68, Global Func=51) must complete before the next Mode Change.** It sends its own Mode Change and then the dump 100ms later, so a destination Mode Change sent meanwhile makes the dump land in the wrong mode. The nav handler awaits `flushConfigSync()`/`flushGlobalSync()` (which return the sync's promise) under the freeze overlay before `restoreDeviceModeForTab`. `CODE` *(Archive #192)*

**121. The header pill shows device health and is set only through `setDeviceHealth(state)`** (`disconnected`/`connected`/`no-response`/`rejected`). The amber states come only from awaited exchanges (`armAckReply`/`armWriteReply` timeouts and NAKs, the dump-request watchdog) and from NAK/format-error replies, never from a live-edit path (#115). Any answer from the device clears them. `setSelectedOutput` resets them only on a real port change, because port-list rebuilds fire on hot-plug and implicit open (#118). `CODE` *(Archive #196)*

**126. A NAK can answer a dump request, not just a Parameter Change.** Single Program (Func=`10`) is answered only in Program/Prog Edit and Single Combination (Func=`19`) only in Combination/Combi Edit; in another mode the device sends `24` (a power cycle can leave it elsewhere). `handleSysexMessage` routes a NAK that arrives while `awaitingDump` to `refuseDumpRequest()` (ends the request, its own box) and ignores further NAKs for `DUMP_NAK_IGNORE_MS` (500, Chrome repeats them, #7); it must never reach the Parameter Change recovery (#4). `HW` *(Archive #217, #218)*

**129. All Notes Off is the one deliberate exception to #116: `buildAllNotesOff()` (`sysex.js`) sends on all 16 channels, not `getSysexChannel()`.** Combi timbres and Multi tracks each listen on their own channel, so the selected channel alone misses most of them. Per channel: CC 64 = 0, CC 120, CC 123, in one `send()`. CC 123 is always received; CC 64/120 only with the Control Filter enabled (Global, or a timbre/track's DM/CC filter), otherwise ignored. `MANUAL` *(Archive #236)*

---

## 2. Wire formats, dump layout, packing, encodings

**5. Func=`10` (Program dump request) takes no padding byte** — most other dump requests do (#47). Use `buildDumpRequest(0x10, false)`. `HW` *(Archive #6)*

**10. `(L)`/`(H)` byte-split entries are a dump-layout artifact only.** A value >127 occupies two dump bytes but is one Parameter Change parameter at one offset — never create separate controls for `(L)`/`(H)`. `MANUAL` *(Archive #12)*

**12. OUT3/OUT4 Pan: dump and Parameter Change encodings are mirrored.** Dump: `0`=OFF, `1`=R, `101`=L. Parameter Change: `0`=OFF, `1`=L, `101`=R. Parser converts: `PC = dump === 0 ? 0 : 102 - dump`. The reference table's "65" is hex `0x65` = decimal 101 — no extended range. `HW` *(Archive #14)*

**13. EG Time Mod encoding (NOTE 12 signed): `0` off → `00 00`, `+` = `1` → `01 00`, `−` = `-1` → `7F 7F`.** A bitmask/compact encoding silently fails on hardware. `HW` *(Archive #10)*

**14. Multisound number from a dump: `((b[13] & 0x03) << 8) | b[12]`** — the MSB shift is `<< 8` (groups of 256), not `<< 7`; do not mask the LSB. `HW` *(Decisions table, June 2026)*

**17. Multi-record dumps are packed as one continuous 7-bit block, not per record.** Unpack the whole payload first, then split into fixed records (164 bytes/program, 136 bytes/combi). `HW` *(Decisions table, June 2026)*

**20. `encodeParamValue(undefined)` silently returns `{lsb:0, msb:0}`** (NaN bitwise coercion), so a `sendParamChange` with an undefined param number sends param 0 (OSC Mode). Guard against undefined param numbers in loops over parameter arrays. `CODE` *(Archive #21)*

**22. Func=`11` (Program Write Request) needs a `00` padding byte:** `F0 42 3g 36 11 00 pp F7`, not `11 pp F7` — without it the device returns `0x26`. `HW` *(Archive #24)*

**23. `pack7bit` output must be trimmed before sending.** It pads the last partial group to 8 bytes and the device rejects the extra zeros as `0x26`. Compute the wire length with `packedLength()` and `.slice()` to it. `HW` *(Archive #25)*

**25. A Func=`40` (single-program) dump response goes through `store.replaceProgram(currentProgIndex, snap.programs[0])`, never `store.loadSnapshot`** — which truncates `workingCopy.programs` to one element (99 empty rows; a later save writes zeroed programs). `scheduleDumpSettle` detects this case via `dumpBuffer[0][4] === 0x40`. `CODE` *(Archive #27)*

**35. Combi Timbre `bankG` is bit 7 of the Control Filter byte (`t+10`), not bit 6.** TABLE 8's footnote reads `"0, 1"` (b6=0, b7=1), not a range. Also applies to Multi Tracks (shared codec, #49). Round-trip tests can't catch this kind of error — only the primary source or hardware can. `HW` *(Archive #44)*

**42. Scoped "All X" imports merge per slot; never `store.loadSnapshot()` a scoped result.** Func=`4C` All Programs, `4D` All Combinations and FILE → Load → All Programs/All Combinations all loop `store.replaceProgram`/`replaceCombi` into the loaded snapshot; `loadSnapshot` fully replaces `workingCopy`, wiping every other category. Fall back to `loadSnapshot` only on a cold start. When fixing one path, check every path doing the same operation. The cold-start fallback runs only after the file check (#122) and keeps only that category (`onlyCategory`). `CODE` *(Archive #56, #80, #197, #198)*

**44. A dump sentinel is not automatically the live Parameter Change value.** Signed 14-bit fields (NOTE 12) send their off state as `-1` (→ `7F 7F`); Pan's dump `0xFF` sent as 255 encodes `7F 01` and is silently ignored. Relatedly, `syncByKey` must translate `null` to `selCtrl`'s `'__null__'` marker for `<select>` elements, or the synced control shows blank. `HW` *(Archive #58, #59)*

**45. Multi's Program No. has two encodings.** Parameter Change: combined 0–236 (same as Combi's `encodeProgramNoParam`/`decodeProgramNoParam`). Dump: bank-relative 0–99 / 0–135 plus a separate bank bit. `parseMulti`/`encodeMulti` need their own dump handling — don't reuse one function for both. `HW` *(Archive #62)*

**47. Dump Requests need a trailing `00` before `F7`** (confirmed for Func=`06`/`33`): `F0 42 3g 36 33 00 F7`; without it the device returns `0x26`. Exception: Func=`10` (#5). `HW` *(Archive #66)*

**122. Every FILE → Load path checks the file before touching the store, and parses only the dumps the check selects.** Load → Data File… uses `checkDataFile` (`src/midi/loadFileCheck.js`). It gives a per-type `available`/`reason`/`messages` for Programs, Combinations, Multi, Drums and Global. A type's own dump wins over Func 50. Multi needs 68 plus 55 or 50. A cut-short dump (`isCompleteDump`) makes its type unavailable. A file with no available type is refused with a box. Single Program/Combination use `checkLoadFile` via `pickAndCheckSyxFile` (match / Cancel-Continue box / refusal box). `parseSnapshot` ignores the `F0 42 3g 36` header and lets a later dump win, so parsing the whole file once let any file empty the editor (Archive #197). Files are picked and checked *before* the dirty check (`afterDirtyCheck`), and Data File runs that check only when Programs or Combinations are ticked. Its Write / Not Now prompt sends only the loaded Programs/Combinations (4C/4D); it never builds a Func 50 dump from mixed file and editor contents. User-facing text says "compatible", not "X5DR". *Corrected 2026-10-06:* the eight per-type Load items became "Data File…" (Release Plan C1c). `CODE` *(Archive #198, #208)*

**53. Func=`50` "All Data" carries Multi's 29-byte Effects block but never its 208-byte Expansion (Track assignments).** Both the write (`sendAllDataDumpAndAwaitAck`) and read (`doRequestAllDataDumpFlow`) sides handle the Expansion separately. `HW` *(Archive #78)*

**55. Global has no Parameter Change table — the Global editor is dump-only.** Only Func=`0E` (Dump Request) and Func=`51` (Global Data Dump, 28 bytes) exist. Every Global field syncs via a debounced full-dump send (`createDebouncer`, `scheduleGlobalSync`), never `sendParamChange`. Don't assume Global mirrors Multi's live/dump split. `HW` *(Archive #81)*

**56. TABLE 5 (Global): the "(RESERVE)" bytes are genuinely unused, and User Scale's range is `0x9D`–`0x63` (±99), not `0xCE`–`0x32` (±50).** The manual-prose Global fields (Note Receive Filter, External Out Select, MIDI Filter, etc.) have no SysEx representation at all; MIDI Global Channel exists only as the header's `3g` byte (#57). *Corrected:* a hypothesis that these fields live in the reserved bytes was refuted by hardware capture — manual prose narrows the search but is not confirmation. `HW` *(Archive #82, #83)*

**111. A record pushed into `workingCopy.programs[i]` (or any dump-encoded record) must omit fields the encoder doesn't read** — the preserved raw bytes (`eff{1,2}DumpType`/`eff{1,2}DumpParams`) and derived fields (`effects.io`). Session-only fields with no dump representation (`out3/4LLevel`, `out3/4RLevel`) never survive `encodeProgramToBytes → parseProgram`; round-trip tests exclude them explicitly. *Corrected 2026-09-30:* `eff1Switch`/`eff2Switch` now do round-trip (they drive the Effect I/O bits, #16). `CODE` *(Archive #172, #174)*

---

## 3. Effects

**9. `05_effect_parameters.md`: labels and value ranges are reliable, per-type parameter slot order is not.** TABLE 7-1 base offsets are correct. The hardware-captured live order lives in `EFFECT_TYPES`; verify any new ordering by Snoize capture. `HW` *(Archive #11)*

**11. Dry:FX Balance by type group:** types 1–39 except 15: one control, `balL` = wet, `balR = 100 − balL`. Types 44–45: one control; `balR` has no device effect and is not sent. Types 15, 40–43, 46–47: two independent values (#93). *Corrected 2026-08-13:* the claim "types 40–43/46–47: `balL` = dry, UI inverts" was never hardware-tested and was wrong. `HW` *(Archive #13, #133)*

**16. "Channel Enable" (the Effect I/O L/R bits) is the same feature as Effect 1/2 On/Off (live PC 157/158).** In every real dump (400 programs + 400 combis) `eff1IoL === eff1IoR` and `eff2IoL === eff2IoR`; `decodeEffects`/`encodeEffects` treat the Switch as authoritative for both bits (the hidden Channel Enable UI is removed). *Corrected 2026-09-26:* earlier text claimed it was non-functional, then untested with no live PC — both wrong; the gap caused Write In Place to revert Effect On/Off. `HW` *(Archive #36, #71, #174)*

**52. TABLE 7-1 puts Routing (Placement, OUT3/4 Pan/Level) in the same "Effect Parameters" block as the effect params — no split.** The device resets Level to `4` and Pan to `1`/`101` when Placement crosses the Parallel-3 boundary; mirrored by `copyEffectsFrom` and `resetRoutingOnPlacementChange`. `HW` *(Archive #76, #77)*

**89. MG Status (`*11-3-3`) is one byte shared by types 19, 20, 32, 33, 35, 36, 42, 43:** one bit is user-facing (Sin/Tri); the other one or two are per-type hardwired constants (Phase 0°/180°, Wave Shape). See #90 for what the device actually honors. `MANUAL` *(Archive #127)*

**90. Live Parameter Change honors only MG Status `bit0`; any nonzero value = Tri.** The front panel itself only transmits `0`/`1`. `sinTri` sends the raw `0`/`1` — no bit-packing. Stored dumps can hold raw non-0/1 values (factory A00 PipeDreams, Phaser 1 = `99`); `buildSinTriCtrl` displays any nonzero as Tri (display-only; stored value untouched until edited). *Corrected 2026-08-03:* #89's bit-packing fix (`fix/effect-mg-status`) was implemented and hardware-refuted — don't retry without a new hypothesis. `HW` *(Archive #128, #131)*

**93. Effect types 15, 40–43, 46–47 have two independent Balance values — never reintroduce `balR = 100 − balL` for them.** TABLE 7-1 names PN 175/176 (Eff 1) and 186/187 (Eff 2) "Balance 1/2", not "L/R". `isDualBalanceType` covers exactly `{15, 40, 41, 42, 43, 46, 47}` — audit all seven. Labels: "Dry/Wet 1/2", except type 15 "Dry/Wet L/R" (stereo split). Easy and Effect tabs both render via `buildEffectBalanceControl`. *Corrected 2026-09-30:* the Easy tab's separate `rebuildBal` copy of the old bug no longer exists. `HW` *(Archive #133, #134)*

**94. `EFFECT_TYPE_RESET_DEFAULTS` stores each Dry:FX Balance as the second number of the manual's ratio** (`80:20` → raw `20`). On type change the editor sends these defaults for offsets 0–6 (`0` where the type lists none) plus Balance. `HW` *(Archive #135, #136)*

**108. ⚑ CONTRACT — every effect parameter crossing the dump boundary goes through `src/midi/effectLayout.js`** (`decodeEffectParams`/`encodeEffectParams`/`decodeEffectBalance`/`encodeEffectBalance`): Write In Place, Save, cross-slot write, Copy Effects, loading. The dump's 8-byte per-type layout differs from the Effect tab's Parameter Change order (confirmed on ~1,100 stored effects). Single-control types store Balance as wet-in-both-bytes in dumps but wet/100−wet live. `HW` *(Archive #171)*

**109. ⚑ CONTRACT — live sends of per-type effect params go through `liveEffectParamValue(type, offset, value)`.** A raw-unit scale can apply on the live wire too: Chorus/Flanger-Delay (types 38–39, offset 4) Delay Time is 2ms steps both in dumps and live (`00~E1` = 0–450ms). Never assume the displayed value is what the wire expects. `HW` *(Archive #171)*

---

## 4. Store, dirty state, write/discard

**26. ⚑ CONTRACT — all UI parameter writes go through the local `setParam(path, value)` wrapper in `index.html`, never `store.setParam()` directly** (its only direct call is inside the wrapper). The wrapper routes `multi.*`/`global.*`/`drums.*` to `store.setParamQuiet` (never dirty; `global.*` also schedules its dump sync) and everything else to `store.setParam` + `updateActionButtons(scope)`. *Corrected:* earlier text named `updateProgActions`, since generalized. `CODE` *(July 2026 decision, Archive #73, #88)*

**27. When editing the `setParam` wrapper itself, confirm its inner call is `store.setParam`, not `setParam`.** A `replace_all` once made it call itself — infinite recursion that silently blocked all Parameter Change output while dumps and Program Change still worked. `HW` *(Archive #29)*

**32. A nav-tab shortcut that skips the dirty check is safe only if nothing else can be dirty at the same time.** The old `dest === 'prog'` bypass broke once Combi became editable. Re-check the condition before adding any such shortcut (the current exception is #61). `CODE` *(Archive #37)*

**36. When extending a shared function to a new scope, check every helper it calls for internal sends that default to Program's scope/index** (`buildPerTypeParams`, `openEffectTypeBrowser` both did), **and every bare `? a : b` default** (e.g. `updateActionButtons(path.startsWith('combis.') ? 'combi' : 'prog')` silently sends any other scope to `'prog'`). `CODE` *(Archive #45, #69)*

**37. Anything that calls `store.loadSnapshot()` (file load, Request Dump, future bulk loads) must then call `refreshActiveEditorPanel()`** — loading the store does not re-render the visible panel. `CODE` *(Archive #46)*

**51. RETIRED — `multi.*` writes no longer dirty PROG/COMBI; they go through `store.setParamQuiet` (see #26).** *(Archive #72, #73)*

**59. RETIRED — same fix for `drums.*` (see #26).** *(Archive #87, #88)*

**61. PROG↔DRUMS is the only nav-tab pair exempt from the dirty-check gate (both directions)** — safe because `drums.*` never enters `dirtyParams`. Every other DRUMS transition gates normally; not extended to Multi/Global by choice. See #62 for its consequence. `CODE` *(Archive #89)*

**110. "Apply a whole record" flows (Initialize, presets, templates) apply field by field through `setParam`** (`flattenObjectPaths`, `src/state/initProgram.js`), never one `store.replaceProgram`/`replaceCombi` — a wholesale replace marks nothing dirty, so Write/Discard stay disabled and Discard has nothing to revert. `CODE` *(Archive #172)*

**113. ⚑ CONTRACT — after a confirmed device write, call `store.commitProgram`/`commitCombi`** (also updates the clean baseline `cleanSnapshot`), never `clearDirty()` plus a manual `replaceProgram`/`replaceCombi`. The same applies to every import whose data then matches the device (Import From Device, a loaded slot or bank once written) and to Device → Write All Data/Programs/Combinations: they commit (`commitAllPrograms`/`commitAllCombis` for whole banks). `replaceProgram`/`replaceCombi` are only for merges that must stay discardable ("Not Now", a failed write). The old way left a cross-slot write's edit showing on the source slot, and let a later Discard revert past a successful write. `HW` *(Archive #175, #193)*

---

## 5. Program / Combi / Multi / Global / Drums specifics

**33. Bank G program display is one-indexed (`G01`–`G136`); the raw byte stays zero-indexed (0–135): `display = raw + 1`.** Bank A is `A00`–`A99`. `MANUAL` *(Archive #38)*

**39. There is no Edit Program button (`#edit-btn` was removed) — don't re-add it.** Prog Edit is entered only by confirming in the Patch Browser and by the COMBI→PROG restore (#38). Cancelling the Browser without a pick leaves PROG idle — deliberate. The `editMode` variable is still load-bearing (NAK recovery, scope, DRUMS). `CODE` *(Archive #48)*

**40. `TIMBRE_PARAM_BASE`'s flat `filter*` keys are Parameter Change lookup names only; the store path is `timbres.n.filters.{programChange,damper,afterTouch,controlChange}`.** (Key/Vel Window do use their flat name as the path — filters are the exception.) `CODE` *(Archive #49)*

**46. Track SW (Multi) / Timbre SW (Combi) is the only on/off; the Program/Bank bytes are never an "Off" sentinel** — `programNo`/`bankG` are never null. On Multi, Track SW off leaves the Program bytes untouched and appears to gate MIDI reception entirely; whether Combi's Timbre SW does the same is unconfirmed. `HW` *(Archive #62, #63)*

**49. `decodeTimbre`/`encodeTimbre` are shared by Combi Timbres and Multi Tracks** (TABLE 4's layout is byte-identical to TABLE 2's, confirmed on a real dump). Any fix affects both — check `parseCombi`/`encodeCombiToBytes` and `parseMultiTracks`/`encodeMultiTracksToBytes`. `openProgramBrowser` is also shared; its `combiIndex`/`timbreIndex` fields are informational only. `HW` *(Archive #68)*

**50. Bank G program data (including Effects) does not exist in `workingCopy`.** `BANK_G_NAMES` is names only (ROM presets, not in any dump). Any feature that needs a Bank G slot's parameters has nothing to read (e.g. Bank G can't be a Copy Effects source). `CODE` *(Archive #70)*

**58. Drum Kit Parameter Change (Func=`53`) and Drums Data Dump (Func=`52`) write straight to the device's Internal Memory** — no Edit Buffer, no Write Request, so no Discard lifecycle: a sent drum edit is already permanent. Same shape as Multi Setup. `HW` *(Archive #86)*

**63. The device doesn't reject a Drum Key that collides with another slot — it silently moves it to the nearest free key in the direction of movement, with no NAK.** The Key dropdown must offer only free keys (`getUsedKeysInKit`, enabled slots in the current kit). `HW` *(Archive #91)*

**64. Bank G's G129–G136 are the 8 ROM drum kits** (`BANK_G_NAMES[128..135]` match `ROM_DRUM_KITS`). No Bank G program can reference a User Kit, but cross-reference code must still skip `bankG` entries explicitly: Bank G's `programNo` (0–135) collides with Bank A indices and has no data (#50). `CODE` *(Archive #92)*

**65. `ROM_DRUM_KITS` sizes vary:** six kits have 60 entries, Kit 6 (Perc) 78, Kit 8 (Orch) 61. Compute sizes from the array length. `CODE` *(Archive #92)*

**75. Pitch EG's Decay always ramps to the centerline (level `0`, the played pitch), never to Start Level.** `buildOscPitchEgPanel` hardcodes the decay stage `level: 0, levelEditable: false`. *Corrected:* an approved Claude Design mockup described it otherwise. `HW` *(Archive #106)*

**76. `osc{1,2}.level` and `vda{1,2}.level` are two store fields parsed from the same dump byte** (`decodeOscBlock`/`decodeVdaBlock`), so their sync is a bespoke `subscribeTo` pair in `renderProgPanel`, not `syncByKey`. Don't "simplify" it without first merging the store paths (a parser/encoder change to hardware-verified code). `CODE` *(Archive #107)*

**88. Control tab "VDF MG Intensity" (`modWheel.vdfMgInt`, param 21) is driven by Breath Controller (#2), not the Mod Wheel** — it sits in the "Breath Control / Joystick -" panel. A store-path prefix reflects the manual's table grouping, not the physical controller. *Corrected 2026-08-18:* the fix was documented on 2026-07-30 but never committed; re-fixed and checked against the diff. `HW` *(Archive #126, #140)*

**102. A `<select>` built from a documented valid range must still include the current stored value as an option, even if out of range;** the *assignable* range stays clamped to the manual (DRUMS Key: C0–G8, 12–115). *Corrected 2026-09-29:* the original evidence (Kit 1 slot 0 key=0 in the internet-sourced factory file) is likely corrupted data — the hardware capture has no out-of-range key. The rule stands as defensive practice. `INFERRED` *(Archive #158, #176)*

---

## 6. UI components and CSS layout

**15. SVG elements need `setAttribute('class', …)`, not `.className =`** — `className` is a read-only `SVGAnimatedString` and assignment throws. `CODE` *(Decisions table, June 2026)*

**28. A `position: fixed; inset: 0` overlay dims and click-blocks every element without its own `z-index`.** Current tiers: `.browser-overlay` 100 < `#nav` 120 < `#header` = `.sound-browser-overlay` 150 (tie resolves to the overlay, later in DOM) < `.modal-overlay` 200 < freeze overlay 300. Give any new overlay an explicit tier in this scheme. `CODE` *(Archive #31)*

**29. Two elements tied on `z-index` trap each other's descendants.** `#header`'s dropdowns were clipped behind `#nav` until `#nav` dropped to 120. When either element hosts dropdowns/popovers that must escape the other, use strict ordering, not a tie. `CODE` *(Archive #32)*

**30. In `buildSoundGridTable` browsers, never wire `onSelect` (click) and `onConfirm` (dblclick/Enter) to the same function unless it closes the modal** — use a `confirm*Selection(v)` wrapper that applies then closes; `onSelect` never closes. If `onSelect` rebuilds the table, `render*BrowserList()` must call `table.focus({ preventScroll: true })` on the new table or Enter stops working. Test keys by dispatching to `document.activeElement` after a real `.click()`. `HW` *(Archive #33, #34)*

**31. `.patch-table` hover is `td:hover`, never `tr:hover td`** — the row form has higher specificity than `td.selected` and hides the selection highlight. `CODE` *(Archive #35)*

**34. Never interpolate a device-sourced or user-entered string (patch names) into `innerHTML`** — real names like `<The West>` get parsed as tags. Build cells with `createElement`/`textContent`. `sanitizeName` allows `<`/`>`, so any future rename UI needs the same care. `HW` *(Archive #41)*

**66. `.prog-actions` and `.combi-actions` CSS are duplicated on purpose (ADR-0002)** — apply changes to both; don't merge them. `CODE` *(Archive #93)*

**67. BROWSER is a real nav tab** (`data-tab="browser"`, `.nav-toggle`), excluded from tab switching via `.nav-tab:not(.nav-toggle)` because it opens a modal. Style it like the other tabs plus its own toggle state. *Corrected:* a Design handoff claimed there was no Browser tab. `CODE` *(Archive #95)*

**68. A number inside a knob ring both drags the knob and opens typing on a click — detect the click as a press released without moving ≥ 3 px (`DRAG_THRESHOLD_PX`), watched on `window` in the capture phase**, because the knob's `beginPointerDrag` captures the pointer and retargets the `pointerup` (no `click` reaches the number). The ring ignores moves under the same threshold so the click doesn't nudge the value. Open the editor via `setTimeout`, never by focusing an input inside a pointer handler. Non-centred readouts drag on the number itself (`buildReadout` `drag`, default on; knobs pass their ring scale, `knobPxPerUnit`) and use a normal `click`, suppressed after a real drag. Tests must mount the knob in the document, or the `pointerup` never reaches `window`. *Corrected 2026-10-10 (Archive #223):* the in-ring number used to need a double-click, detected by timing `pointerdown`s. `CODE` *(Archive #96, #223)*

**70. A written brief paraphrases a Claude Design mockup — re-check the mockup itself at implementation time.** Shape, case and state colors are lost first (bit twice: nav pills vs underline; Dirty state fill vs outline). `CODE` *(Archive #99)*

**71. Cross-tab `data-sync` mirrors (`syncByKey`, the OSC↔VDA Level block) must be shape-agnostic:** component-library controls expose `_setValue(v)`, and `el.value = v` on them is a silent no-op. Use `el._setValue ? el._setValue(v) : el.value = v`. `CODE` *(Archive #100)*

**72. During the Phase 3 retrofit, shared pre-Phase-3 helpers were duplicated rather than edited in place (ADR-0002)**, so a not-yet-migrated tab couldn't change silently. The retrofit is complete; the resulting duplicates are audit candidates, but each consolidation must be checked against every caller. `CODE` *(Archive #101)*

**73. For hover-revealed children use `visibility: hidden/visible`, not `display: none`** — `display: none` removes the child's width from the hover area that is supposed to reveal it. `CODE` *(Archive #102)*

**74. `egCurveWidget` takes explicit, non-responsive `width`/`height` from every caller.** VDA/VDF compute `width` from the same CSS tokens that size the sibling stage-field columns. Omitting `width` does not fill the container — it falls back to `stages.length × timeMax × pxPerTimeUnit`. *Corrected 2026-07-25:* an earlier rule made it responsive, which broke alignment at other window widths. `CODE` *(Archive #103–#105, #121)*

**77. Never write `*/` inside a CSS comment by accident** (e.g. `.foo-*/.bar-*`) — it closes the comment and silently drops one rule. Write `.foo-* and .bar-*`. If a correct-looking rule doesn't apply, check `document.styleSheets`. `CODE` *(Archive #109)*

**78. All-`auto` grid tracks still absorb leftover width** — add `justify-content: start` when trailing empty space is intended. Verify with `getComputedStyle(el).gridTemplateColumns`. `CODE` *(Archive #112)*

**79. A negative margin that cancels an ancestor's padding couples two rules silently** (`.prog-header`/`.combi-header` vs `#content`'s side padding). When changing a container's padding, find every negative margin that cancels it. `CODE` *(Archive #113)*

**81. `egCurveWidget`'s SVG needs all three together: `preserveAspectRatio="none"`, `vector-effect="non-scaling-stroke"` on every stroke, and x-scale-compensated ellipse markers** — plus `overflow="visible"` and window padding, since the trace is drawn flush to the data extremes. Removing any one brings back inconsistent stroke/marker weight or letterboxing. `CODE` *(Archive #117, #118)*

**82. A flex container's `gap` and a child's margin on the same axis add up** (a panel label's `margin-bottom` + parent `gap` doubled to ~19px). Check when reusing a label class inside a flex column. `CODE` *(Archive #119)*

**83. `align-items: center` centers the margin box** — a one-sided margin moves visible content by half; the fix needs double the measured offset (7px needed 14px). `CODE` *(Archive #120)*

**84. An inset `box-shadow`/`outline` follows the child's own `border-radius`, not an ancestor's clip.** `buildFusedToggleGroup` gives the first/last buttons their outer corner radii. Only a screenshot shows this bug. `CODE` *(Archive #122)*

**85. All seven browser-like modals (Patch, Write, Multisound, Drum Sound, Effect Type, Program, Copy Effects) share one inner chrome set** (`.browser-overlay-panel`/`-header`/`-title`/`-close`/`-footer`) across both wrapper families (`.browser-overlay`, `.sound-browser-overlay`). Scope restyles by searching `.browser-overlay-panel` app-wide. `CODE` *(Archive #123)*

**86. An explicit color on a descendant beats an inherited color regardless of the ancestor's specificity** — target the descendant (`td.selected .num-col`). `CODE` *(Archive #124)*

**87. Equal character counts don't mean equal rendered widths** in a proportional font; gap/column values from a static mockup are unverified until measured on real content. `CODE` *(Archive #125)*

**91. A `readoutMode:'beside'` knob shrinks when its label overflows** (the ring is a `flex-shrink:1` child). The Effect tab's PARAMETERS grid fixes it with `flex-shrink:0` on `.ctrl-knob` plus label ellipsis, scoped to its own cells — any other long-label `'beside'` knob needs the same. `CODE` *(Archive #130)*

**92. Markers in a `preserveAspectRatio="none"` SVG whose width is CSS-sized need their x-scale measured after insertion** (`getBoundingClientRect()`, `requestAnimationFrame` at minimum), as the EQ curve (`.effect-eq-curve-outer`) does. `egCurveWidget` compensates synchronously only because every caller passes a numeric `width`. `CODE` *(Archive #132)*

**96. Measure a shared component's real rendered width before trusting mockup arithmetic** — mockups draw components decoratively (e.g. `dualHandleRangeSlider` fields as ~18px text; the real `numericField` uses 40px inputs). `knobWithOverride` accepts `bidirectional`/`format`/`readoutMode` (generalized for A:B Pan). `CODE` *(Archive #144)*

**97. `subscribeTo` syncs don't skip the element that caused the change** — a callback that maps a sentinel to a placeholder can clobber the originating control's own value. `knobWithOverride._setValue` adopts an incoming value only when no override is active; any component whose `_setValue` can be re-entered by its own change needs the same guard. `CODE` *(Archive #147)*

**98. A grid child's `width: 100%` fills its grid item, not the track, unless it also has `justify-self: stretch`** (these grids use `justify-items: center`). Example: `combi-full-cell-program`. `CODE` *(Archive #145)*

**99. `.combi-full-grid`-family rows (`max-content` columns + `minmax(0, 1fr)` spacers) overflow silently once the fixed columns exceed the container** — spacers collapse to `0px` and the last column spills out. Adding a column requires measuring total row width (`getBoundingClientRect`/`gridTemplateColumns`). Multi CONTROL's `trackLength` is 128 (Combi's stays 170) for this reason. `CODE` *(Archive #153)*

**100. Adjacent vertical margins collapse to the larger, not the sum** — use `padding-top` for an additive offset. `CODE` *(Archive #156)*

**101. `min-height` on a `border-box` element includes padding** — set it to the full box height (content + both paddings). `CODE` *(Archive #156)*

**105. `.browser-overlay` (z 100) sits below `#header`/`#nav`, so its `padding-top` must clear their footprint (`max(6vh, 132px)`)** — don't copy `.sound-browser-overlay`'s `6vh`. Diagnose overlap with `document.elementFromPoint()`, not geometry. `CODE` *(Archive #167)*

**106. `buildFusedToggleGroup` reserves each button's width with an invisible always-bold ghost `<span>`** — keep it, or long-label toggle groups jitter when the active label turns bold. `CODE` *(Archive #169)*

**107. Every custom pointer-drag control starts its drag with `beginPointerDrag(e, captureEl, onMove, listenEl?)` (`controls.js`), never a hand-rolled `pointermove`/`pointerup` pair.** It is primary-button-only and ends on `pointerup`/`pointercancel`/`lostpointercapture` or any buttonless `pointermove`; hand-rolled drags caused the "knob grabs itself on hover" bug. The readout stepper's hold-to-repeat (`makeStepBtn`, not a drag) mirrors the same exits plus window `blur`, so a swallowed release can't keep sending. Its `preventDefault()` also stops the browser moving focus, so it blurs a focused `input`/`select`/`textarea` first, and an open `buildReadout` editor ends on any `pointerdown` outside it (document, capture phase) — otherwise the editor stayed focused during another knob's drag and later typing changed the first parameter. `HW` *(Archive #170, #189, #223)*


**117. Escape closes only `topmostVisibleOverlay()`, via the `ESCAPE_ACTIONS` map keyed by overlay `id`** — a new `.modal-overlay`/`.browser-overlay`/`.sound-browser-overlay` needs an entry there, or Escape silently does nothing while it's on top. `#modal-confirm` handles its own Escape (map entry is a no-op); Escape on Abandoned Edits = Stay; nothing closes while the freeze overlay (`#writing-overlay`) is visible. Topmost = highest `z-index`, ties to the later element in the DOM (#28). `CODE` *(Archive #189)*

**127. Sound and effect-type categories, and the X5D/X5DR-only rules, live in `src/ui/soundCatalog.js` — never re-add range-based categories to `index.html`.** Categories are per-sound index lists; `soundCatalog.test.js` requires every multisound 000–429, drum sound 000–214 and effect type 1–47 in exactly one category, so moving a sound means removing it from its old list. X5D/X5DR-only = multisounds ≥ 340, drum sounds ≥ 164 (combined X5/X5D manual). A program is marked by the oscillators it plays (OSC-1 in Single, both in Double) or, in Drums mode, its User Kit (`osc1.multisound` 0/1; ROM kits 2+ never count); a combination by its enabled Bank A timbres; Bank G is never marked. The browsers' filter state is `browserState.categories` (a Set; empty = All). Hiding keeps the patch's current sound (`filterCategoryIndices` `keep`). Patch Browser marks are recomputed when it opens (`refreshPatchBrowserMarks`), so edits show. `CODE` *(Archive #222)*

**128. Item grids are row-major, and their arrow keys go through `src/ui/gridNav.js`.** `buildSoundGridTable`, `buildPatchTable`, `buildKitSummaryTable` and the Drums tab slot grid place item `i` at row `floor(i / cols)`, column `i % cols` — never `c * rows + r` (a scrolled 430-item column order looked like missing numbers). Keyboard moves use `gridArrowTarget` (`gridArrowTargetSkipping` for disabled cells): Left/Right ±1 wrapping rows; Up/Down ±cols, continuing at the top/bottom of the adjacent column; `null` at the ends. A new grid reuses it rather than hand-rolling deltas. `CODE` *(Archive #223)*

**124. An inline SVG that defines an `id` (a `<marker>`, gradient, clipPath) and references it with `url(#id)` must get a unique id per copy.** `url(#id)` resolves to the *first* element with that id in the whole page, and a marker inside a hidden (`display: none`) tab draws nothing — so PROG, COMBI and MULTI showing the same placement diagram left the later copies without arrows. `buildPlacementDiagram` suffixes every `arrow-eff-*` id with a per-call counter; any new id-bearing SVG template needs the same. `CODE` *(Archive #201)*
**130. Combi/Multi grids (Timbres, Tracks, both Controls) scroll inside themselves, not in `#content`.** `.combi-full-grid` is `overflow-y: auto`; `fitFullGridsToContent()` (a `ResizeObserver` on `#content` and on each grid from `buildCombiFullGridShell`) sets each visible grid's `max-height` so it ends at `#content`'s bottom, so nothing above it moves (min 240px, then the page scrolls). A classic scrollbar's width goes into a negative `margin-right` (into the panel's padding) so the 1fr spacers don't shrink (#99). One scroll position per panel (`fullGridScrollTops`, keyed by panel id), shared by its grids and applied each time a grid is shown (tab switch, nav return, a re-render's new grid), so Timbres↔Control and Tracks↔Control keep the same row at the same place on screen, as the page scroll did — this relies on the paired grids having equal row heights and the same top. A hidden grid's scroll events are ignored (it reads 0). Column headings are `position: sticky; top: 0` in the grid; the 1fr spacers' headings are empty `fullHdr(grid, '')` cells so the backing is continuous; each heading's `::before` covers half the column gap (1.75rem) each side, none past the grid's edges, and redraws the rule 1px below, exactly over the first `.combi-full-sep`. *Corrected 2026-10-22:* the first version stuck the headings under the page-level `.combi-header`, so the area above the table still scrolled away (owner's hardware test). `CODE` *(Archive #236, #237)*
---

## 7. Tooling

**8. Reason drops SysEx and can't be an intermediary** — the editor addresses the MIDI interface directly (the interface merges the DAW's note data in hardware). `HW` *(Archive #5)*

**69. The dev server (`npx serve`) + Browser pane can serve stale JS across reloads,** and ES-module imports are cached across tabs of the same origin. Check `read_network_requests` for `304`s; if a new export still isn't visible in a fresh tab, restart the server on a **different port** before concluding the code is broken. `HW` *(Archive #97, #110)*

**80. RETIRED — `controls.test.js` no longer times out; all 12 test files ran on 2026-09-30 (385/385).** The rule stays: when reporting test results, state which files actually ran, not just the pass count. *(Archive #116)*

**95. RETIRED — the working copy moved out of iCloud to `~/Developer/x5dr-editor` (Release Plan E4).** Only the frozen private-archive checkout on the Desktop is still in iCloud: if `git` or tests stall there, it is evicted files — Finder "Download Now" on the folder, then check `find .git node_modules -flags +dataless | wc -l` is 0. *(Archive #138, #220, #230)*

**103. Web MIDI with SysEx works over `file://` for the single-file build** (Chrome and Edge, macOS) — `dist/index.html` opened from disk does SysEx both ways (port auto-select, Import From Device, live edits, Write In Place, send-timeout modal); FILE → Load/Save pickers, clipboard and `localStorage` work too. Two limits: Chrome asks for MIDI permission on **every** `file://` load (it doesn't keep permissions for file pages; the hosted site and installed app do), and after a blocked prompt is re-allowed from the address bar the ports appeared only on reload. C1b (Archive #206, #210) adds a box on denial and re-requests access when the permission changes. That works over `http(s)`, but over `file://` the change made from the address-bar icon is never reported to the page, so the `file://` box sends the user to Reload. `src/index.html` can't run from `file://` (module imports are blocked there); only the built file can. *Corrected 2026-10-06:* the old claim that `file://` couldn't work was in the Project Plan's Phase 4 text (since fixed), not ADR-0002 §6a. `HW` *(Archive #163, #202, #203, #206, #210)*

**123. `dist/index.html` is generated by `npm run build` (`scripts/build.mjs`) — edit `src/` only.** Each module becomes an IIFE returning its exports; named imports become `const { … } = __m_<path>`. The build refuses (fails loudly) default/namespace/side-effect/dynamic imports, `export default`/`export *`/`export { … }`/destructuring exports, `fetch(`, `new URL(`, `import.meta` and `</script` in code — so keep every module to top-level `export function`/`export const` and named relative imports. It also fails if `APP_VERSION` ≠ `package.json` `version`, or if the Google Fonts `<link>` block in `src/index.html` no longer matches `FONT_LINKS_RE` (it is swapped for embedded `@font-face` from `src/fonts/`). A new module needs no build change — `build.test.js` expects one inlined module per non-test `.js` under `src/` (*Corrected 2026-10-09:* it hard-coded 11 and failed on the first new module, `ui/soundCatalog.js`; only CI caught it, Archive #222). Icons: only the files `manifest.json` lists and the `<link rel="icon">`/`<link rel="apple-touch-icon">` hrefs reach `dist/` (`appIconPaths`; fails if one is missing or not a relative path inside `src/`). `src/icons/` also holds the masters, README and GitHub social preview, which must not ship. `CODE` *(Archive #200, #209)*

**125. `npx vitest run` from the repo root also runs the test copies inside `.claude/worktrees/`** (subagent worktrees), inflating counts (42 files / 1,551 tests instead of 14 / 517) and mixing in other branches' tests. Run `npx vitest run --exclude '.claude/**'` while worktrees exist, and check the file count when reporting (#80). `CODE` *(Archive #209)*
