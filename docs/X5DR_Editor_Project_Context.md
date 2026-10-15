# Korg X5DR Editor — Project Context

*Read at the start of every session, together with `X5DR_Editor_Landmines.md` (non-obvious, regression-causing facts) and the Progress Log (current status). Full history lives in `X5DR_Editor_Decision_Archive.md` — read on demand. Build status per file is in the Progress Log, not here.*

---

## What This Project Is

A browser-based, real-time parameter editor and patch loader/saver for the **Korg X5DR** — a mid-1990s rack-mount GM multitimbral synth with a rich parameter set (Programs, Combinations, Multi Setup, Global, Drums, 47 effect types) and a very limited front panel. Dedicated X5DR editors are rare. Intended for public release: clean code, good UX, minimal setup.

## Platform

**Browser app: HTML/CSS/JS + Web MIDI API, Chrome and Edge only** (Safari/Firefox lack Web MIDI — accepted for this audience). Chosen over Python for distribution ("open a web page" vs installers that antivirus flags), CSS design freedom, and native SysEx support. To be hosted on GitHub Pages (`https://` secure context, from Release Plan E5); the built single file also works opened from disk (`file://`, Landmine #103). No frameworks; npm is used only for tests and `npm run build`, which inlines `src/` into one self-contained `dist/index.html` (Landmine #123). CI (GitHub Actions) tests and builds every pushed branch.

**Design reference:** the Korg M1 VST plugin — dark panel, tabbed sections, envelope displays.

## Core Design Axiom

**The editor should always reflect the state of the device as closely as possible.** This drives eager Mode Change at slot selection, resetting effect params on type change (mirroring the device), NAK recovery, and resyncs wherever device behavior is known. When in doubt, keep the editor consistent with what the device is actually doing.

## Architecture Principles

- Parameter changes are sent live as controls move. Fields with a live Parameter Change path are never debounced (throttle with a guaranteed final send if needed); only dump-only fields (Global, Multi CONFIG) use a debounced full-dump sync.
- SysEx dumps save and restore data, from the device or from `.syx` files.
- UI follows the device's own structure: Program, Combination, Multi, Global, Drums.
- Full patch librarian deferred to v1.1 (ADR-0001); the data model already supports it.

## MIDI Routing

The editor talks to the MIDI interface directly via Web MIDI — no IAC Driver or virtual port is needed. A DAW can share the same interface port for note data (the interface merges in hardware), but cannot sit between the editor and the X5DR because Reason drops SysEx (Landmine #8). Ports are chosen **by name, never numeric ID**; the default auto-select matches any output whose name contains `x5`, case-insensitive (Archive #180). The owner's machine-specific port names are in the Archive.

## MIDI Reference Files

In `docs/X5DR Manual Appendix - MIDI Implementation/`, transcribed by hand from the Korg manual (pp.175–183). `CLAUDE.md` lists when to read each.

- `00`–`04`, `06`, `07`: reliable.
- `03_program_parameters.md` TABLE 7-1 is authoritative for Parameter Change numbers.
- `05_effect_parameters.md`: labels and ranges reliable; **per-type parameter slot order is not** (Landmine #9).
- `04`'s TABLE 5 (Global) has one hardware-corrected range (Landmine #56).

**Key SysEx facts:** header `F0 42 3g 36` (KORG, channel `g`, X5DR family); Device Member Code `14` (X5DR; `00` = 05R/W, `09` = X5); `g` comes from the editor's channel selector, which must match the device's Global MIDI Channel (Landmines #57, #116). Function codes: `41` Parameter Change, `4E` Mode Change, `0F` All Data request, `10` Program request (no padding byte). Mode Change must precede Parameter Change (Landmine #1).

## Development Toolchain

| Tool | Use |
|---|---|
| Claude Code | Primary build tool |
| VS Code | Editor / file browser |
| `npx serve src` | Local dev server, port 5510 (`.claude/launch.json`). Beware stale module caching (Landmine #69) |
| Chrome / Edge | Test browser |
| Git / GitHub | `github.com/Baylo1/x5dr-editor` — started from a single commit (`ffe1ec8`, Release Plan E4); still private until E5 flips it public. Working copy `~/Developer/x5dr-editor`, outside iCloud. The pre-cut history is the private archive `Baylo1/x5dr-editor-private` (frozen at tag `pre-public-cut`; its Desktop checkout is not edited). Commit hashes cited before `v1.0.0` refer to that archive. Commits use the GitHub noreply email (E3) |
| GitHub Actions | CI: tests + build + `dist/` artifact on every pushed branch. Deploy: on a published Release, GitHub Pages at `https://baylo1.github.io/x5dr-editor/` plus `dist/index.html` attached to the Release (live from E5–E6) |
| Vitest | Unit tests for the communication/data layer only (`npx vitest run`) |
| Snoize MIDI Monitor | Mac-only hardware capture — ground truth for parameter slots and device behavior |

---

## Phase 2 Architecture

### State management (`src/state/store.js`)
- `workingCopy`: a deep clone of the loaded Snapshot; one per session. File load and device dump both go through `loadSnapshot(snapshot)` (scoped imports merge instead, Landmine #42).
- **Single write gateway:** every control writes through the local `setParam(path, value)` wrapper (Landmine #26) — the future insertion point for undo (deferred to v1.1).
- **Dirty tracking:** a `Set` of changed paths (`dirtyParams`); Multi/Global/Drums never enter it (they write straight to device memory).
- **Clean baseline:** `cleanSnapshot`, advanced only by a confirmed write (`commitProgram`/`commitCombi`, Landmine #113); Discard reverts to it (Landmine #114).

### File load/save
File System Access API: `showOpenFilePicker()` → check → parse → load; `showSaveFilePicker()` → serialize `workingCopy` to `.syx`. The SysEx function byte identifies the dump type (e.g. `40` program, `4C` all programs, `49` combi, `50` all data). FILE → Load/Save offer Factory Sounds A/B (Load only), **Data File…** and Single Program/Combination. Data File… opens a checkbox dialog of the five bank-level types (Programs, Combinations, Multi, Drums, Global), with the types the file (Load) or the editor (Save) lacks greyed out. On Load, Multi/Drums/Global are written to the device straight away; Programs/Combinations merge and get their own Write / Not Now prompt. Save with all five ticked writes the standard All Data file (Func 50 + 68). Every load checks the file first (`loadFileCheck.js`) — Landmine #122.

### Navigation
`BROWSER | PROG | COMBI | DRUMS | MULTI | GLOBAL`
- **BROWSER** — a toggle that opens the Patch Browser overlay, not a content pane (Landmine #67).
- **PROG** — Easy, OSC, VDF, VDA, Control, Effect. **COMBI** — Timbres, Control, Effect. **MULTI** — Tracks, Control, Effect.
- **DRUMS** — Drum Kit editor (Func=`53`, Global mode, Landmines #19, #58); a "used by" cross-reference lists the Programs/Combis using each kit (`drumCrossReference.js`).
- **GLOBAL** — dump-based only (Landmine #55).

### Patch selection flow
The **BROWSER** toggle opens the Patch Browser (`openPatchBrowser()` → `enterBrowserMode()`), scoped to Programs or Combinations; the device is put in Program or Combi mode to match, every time that changes (Landmine #43).
- **Single click (audition):** Program Change only; no dirty check, no change of current slot.
- **Double-click / OK (confirm):** if dirty, the Abandoned Edits modal (Write / Discard and Continue / Stay) appears first. Then the slot becomes current and `switchToAndEditSlot`/`switchToAndEditCombiSlot` sends the Program Change and re-enters edit mode after the settling delay (Landmine #41). This is the only way into Prog Edit (Landmine #39).
- **Cancel:** `cancelPatchBrowser()` resyncs the device to the scope active before the browser opened (Landmine #54).
- **Discard** (header button and modal) share `discardEditsAndResync()` (Landmine #114).
- **Device sends** wait for ACK/NAK with a size-scaled timeout; silence brings up the Retry/OK "No response from device" modal (Landmine #115).
- **NAK handler:** sets `editMode = null`, shows `showAlertModal()`, then re-sends the scope's Mode Change and, after 100ms, the failed parameter read fresh from `pendingParam` (Landmines #4, #18, #104).

---

*This file keeps exactly one footer entry, replaced each session it's touched.*

*Last updated: 2026-10-15 — Toolchain: GitHub row now describes the public repo (private until E5), the working copy outside iCloud and the private archive `x5dr-editor-private`. Release Plan E1–E4, Archive #230.*
