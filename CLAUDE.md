# Korg X5DR Editor — Claude Code Instructions

## What This Project Is
A browser-based real-time parameter editor for the Korg X5DR rack-mount synthesizer.
Single HTML/CSS/JS file. Web MIDI API. Chrome and Edge only (no Safari, no Firefox).
No frameworks without explicit discussion. No npm build pipeline beyond `npm run build`, which inlines `src/` into one self-contained `dist/index.html` (Node built-ins only).

Repository: `github.com/Baylo1/x5dr-editor` (remote `origin`). Site: `https://baylo1.github.io/x5dr-editor/`, deployed from GitHub Releases (see Releases below; live from Release Plan E6).
Commit hashes cited in the docs from before `v1.0.0` refer to the private archive repository `x5dr-editor-private`; they don't exist in the public repo.

## Project Structure
- `src/` — all editor source code lives here; the only place to edit the app (`src/fonts/` holds the embedded fonts and their OFL licences). `src/` is the only editing source: never edit `dist/`
- `scripts/` — `build.mjs` (single-file build) and its tests; `screenshots.mjs` (`npm run screenshots`: README images in `docs/images/`)
- `dist/` — build output, gitignored; never edit or commit it
- `docs/` — project reference documents (read on session start; see below)
- `docs/X5DR Manual Appendix - MIDI Implementation/` — SysEx reference files 00–07 (read when relevant; see below)
- `.github/` — CI and Deploy workflows, issue templates
- `Reference Images/` — UI design reference images; private archive only; ignore if present; do not modify
- `Setup Instructions/` — developer environment notes; private archive only; ignore if present
- `Claude Grill With Docs Instructions/` — planning templates; private archive only; ignore if present

## Session Orientation
At the start of every session, read these three files to orient yourself:
- `docs/X5DR_Editor_Progress_Log.md` — current build status and next actions
- `docs/X5DR_Editor_Project_Context.md` — platform, architecture, MIDI routing, patch-selection flow
- `docs/X5DR_Editor_Landmines.md` — non-obvious, regression-causing facts, grouped by topic (⚑ CONTRACT = must not change behavior)

Read on demand only: `docs/X5DR_Editor_Decision_Archive.md` (append-only history) and
`docs/X5DR_Editor_Landmines_Full.md` (frozen pre-condensation Landmines text with every
amendment chain — never update it; new Landmines and corrections go in the live file).
`X5DR_Editor_Landmines_Full.md` is private archive only; ignore if present. Other docs the
Archive cites (Optimization Plan, Code Audit Findings, Phase 3 QA Punchlist, `docs/design spec docs/`,
the old Public Release Plan) are also private archive only; ignore if present.

When starting a new Phase 3 tab retrofit (rebuilding a pre-Phase-3 tab against the shared
component library), also read `docs/adr/ADR-0008-phase3-tab-retrofit-process.md` first —
it's the repeatable five-stage process (inventory doc → Claude Design handoff → brief →
implement/verify → docs update) and the two pitfall categories already hit twice (VDA, VDF).

## MIDI Reference Files
Read these only when the task requires it — do not load all of them speculatively.
All are in `docs/X5DR Manual Appendix - MIDI Implementation/`.

| File | Read when… |
|---|---|
| `00_INDEX.md` | Starting any MIDI-related task (master reference) |
| `01_channel_messages.md` | Working with CC, RPN, or Program Change |
| `02_sysex_format.md` | Building or parsing any SysEx message |
| `03_program_parameters.md` | Working with Program Edit parameters or Parameter Change |
| `04_combi_multi_global_drums.md` | Working with Combination, Multi, Global, or Drums |
| `05_effect_parameters.md` | Working with effect type parameters |
| `06_multisound_names.md` | Populating OSC1/OSC2 sound selection dropdowns |
| `07_drum_sound_names.md` | Populating Drums Edit sound selection |

## Critical MIDI Facts — Read Before Writing Any MIDI Code

### 1. Mode Change is required before Parameter Change
The X5DR NAKs all Parameter Change messages (Func=`41`) unless the computer has first sent
a SysEx Mode Change (Func=`4E`) to the correct edit mode. The front panel Edit button does NOT
satisfy this requirement. Send it automatically when the user selects a program to edit.

Correct sequence for Program editing:
```
F0 42 3g 36 4E 03 00 F7   ← Mode Change to Prog Edit (send once)
F0 42 3g 36 41 pp pp vv vv F7   ← Parameter Change (send freely after)
```
`g` = MIDI global channel (0-indexed; channel 1 = g=0, header byte = `0x30`). The editor has a header channel selector (default channel 1): build headers with `sysexHeader()`, never a literal `0x30`, and send Program Change/notes on `getSysexChannel()`.

Mode codes: `00`=Combi, `01`=Combi Edit, `02`=Program, `03`=Prog Edit, `04`=Multi, `05`=Global

### 2. SysEx header
`F0 42 3g 36` — KORG ID (`42`), channel byte (`3g`), X5DR family code (`36`)

### 3. Port selection
Select MIDI ports by name, not numeric ID. IDs are not stable across restarts.
Use `port.name.toLowerCase().includes('x5')` or equivalent (case-insensitive, so X5, X5D and X5DR all match). Provide a user-facing port selector.

### 4. Active Sensing filtering
The X5DR transmits `FE` continuously. Filter it immediately:
```javascript
input.onmidimessage = (e) => {
  if (e.data[0] === 0xFE) return;
  // handle message
};
```

### 5. ACK de-duplication
Chrome reports multiple ACKs (`F0 42 30 36 23 F7`) per message — typically 3–4 — due to
multiple logical input ports for the same physical device. Treat the first ACK as confirmation.

### 6. 7-bit data packing
All dump data is packed from 8-bit to 7-bit MIDI bytes (7 bytes → 8 MIDI bytes).
See NOTE 1 in `02_sysex_format.md` for the exact algorithm before implementing.

## Build Phases — Do Not Skip Ahead
- **Phase 1**: SysEx communication layer only. No UI beyond what's needed to test.
- **Phase 2**: Full structural UI with all controls wired to real parameters. Functional, not styled.
- **Phase 3**: Visual design (M1-inspired aesthetic). Purely additive — no structural changes.
Do not apply visual styling during Phase 1 or Phase 2.

## Testing
- Vitest for unit tests on the communication/data layer (message builder, 7-bit packing, ACK/NAK handler, dump parser)
- No automated tests for UI or visual work
- Run tests before committing any communication layer changes
- Build: `npm run build` → `dist/index.html` (+ `manifest.json`, icons, font licences). `scripts/build.test.js` checks the output; the build fails loudly on any import/export form it can't inline, on `fetch`/`new URL`/`import.meta`, and if `APP_VERSION` ≠ `package.json` version (Landmine #123)
- Preview the build with the `x5dr-dist` launch config (port 5520), never the `src` port (Landmine #69)
- CI (`.github/workflows/ci.yml`) runs the tests and the build on every pushed branch and uploads `dist/` as an artifact

## Releases
- Process: bump the version in `package.json`, `package-lock.json` and `APP_VERSION` together → update `CHANGELOG.md` → merge to `main` (with the owner's approval) → tag `vX.Y.Z` → publish a GitHub Release from the tag.
- Publishing the Release runs `.github/workflows/deploy.yml`: it checks the tag equals the `package.json` version, tests, builds, deploys `dist/` to GitHub Pages, then attaches `dist/index.html` to the Release. The live site always equals the latest release.
- Only the owner publishes Releases. Step-by-step: `docs/X5DR_Editor_Release_Plan.md`.

## Branches and Merging
- Every code change goes on its own branch, never directly on `main`. Use the branch name given in `docs/X5DR_Editor_Release_Plan.md` where the step names one.
- When a branch is ready for review or hardware testing, push it (`git push -u origin <branch>`); the owner tests on another computer.
- Never merge to `main` or push `main` without the owner's explicit approval in that session.
- Doc-only changes follow the same rule unless the owner says otherwise in that session.

## Don'ts
- Do not add JS frameworks (React, Vue, Svelte, etc.) without explicit discussion
- Do not style before Phase 2 structural work is complete
- Do not select MIDI ports by numeric ID
- Do not skip the Mode Change before sending Parameter Changes
- Do not ignore Active Sensing — filter it at the input handler level
