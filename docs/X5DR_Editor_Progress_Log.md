# Korg X5DR Editor — Progress Log

*Current-state reference, read in full at the start of every session. Keep it under ~1,000 words — detail lives in `X5DR_Editor_Decision_Archive.md` (read only on demand). Update at the end of every session.*

---

## How to Use This Document

Start of session: read the Project Context, Landmines and this file, then confirm you're oriented.

End of session: update **Current Status** and **Current Next Actions**; new decisions and discoveries go in the Archive, not here.

---

## Current Status

- **Feature-complete and hardware-verified:** every tab (PROG's 6 sub-tabs, COMBI, MULTI, GLOBAL, DRUMS), Initialize Patch/Combi, Write In Place / Write To A New Slot, factory Banks A and B, Discard, send timeouts, the MIDI channel selector, Help menu (Archive #51–#198; code audit #188–#198).
- **Phase 4** (`X5DR_Editor_Release_Plan.md`, decisions #199): new public repo from one commit; site at `baylo1.github.io/x5dr-editor` deployed from GitHub Releases; first public release `v1.0.0` (owner, 2026-10-15: rc.1 testing, Stage F, is complete, its feedback folded in by D4; no public rc, #228). Version in code: `1.0.0`.
  - **Stages A–C done** (#200–#215): single-file build (Landmine #123), `file://` (Landmine #103), CI on every branch, icons/manifest, release Help text, README/CHANGELOG, public-doc scrub, §10 publish allowlist.
  - **D1** hardware regression passed (#217); fixes F1/F5 (#218), F3/F4 (#219). **D2 Part 1** (Edge, Mac) passed and found the write-caret bug, fixed (#220); **D2 Part 2** (Windows 11, Chrome and Edge) passed, Windows added to Getting Started and README (#227). **D3** release wording done (#221).
  - **X5D/X5DR-only sounds** (D11 amended): marked ᴰ and hideable in the sound browsers, Drums kit list and Patch/Program browsers; per-sound categories; multi-select pills (#222, Landmine #127).
  - **D4 done** (#223): RC tester feedback (Brave on Linux works) folded into rc.1, no version bump. Merged after the owner's hardware pass: one Chromium-based browser note; browsers and Drums grids in rows with column-wrapping arrows (`gridNav.js`, Landmine #128); Drums grid arrow keys and focus; pills click = one, Shift adds; every number drags (knobs at ring scale) and single-click types, incl. in-ring (Landmine #68); EG Shift-drag axis lock; EQ Low above High; an open editor closes on a press elsewhere (Landmine #107). VDF/VDA column titles name each oscillator's sound (#224).
  - **E1–E4 done** (#229, #230): private repo frozen at `pre-public-cut` and backed up (three copies, bundles verified), renamed `x5dr-editor-private`; email privacy on (noreply address); public repo `Baylo1/x5dr-editor` created from the single commit `ffe1ec8` (94 files, leak checks clean).
  - **E5 done** (#231): the repo is **public**; settings, labels, ruleset, security features and social preview set; Pages source = GitHub Actions, with a `v*` tag rule on the `github-pages` environment so the Release deploy is allowed. The site is a 404 until E6. Working copy now `~/Developer/x5dr-editor`, outside iCloud; the Desktop folder is the frozen private archive (don't edit it).
- **Testing:** CI on `main` passes (16 test files, 510 tests, build). Report the file count, not just the pass count (Landmine #80); with subagent worktrees present use `--exclude '.claude/**'` (Landmine #125).

---

## Known Outliers / Limitations

- **Deferred to v1.1** (Release Plan H2): librarian, undo, spontaneous dumps / state surviving refresh, Multisound Solo, scoped Multi/Global/Drums "Write All", single-click Program Browser audition, Copy Effects tab labels (#71), model auto-detect to hide X5D/X5DR-only sounds (#222), random patch generator and rudimentary keyboard (#225), AI patch generation (#226).
- **Bank B Combi 4 "Mr. Tone"** stores Balance L 50 / R 100; Write In Place normalises R to 50 (#205).
- **Live Parameter Changes** are fire-and-forget: a NAK is caught, silence is not (Landmine #115). Rapid bank imports can hang the X5DR until power-cycled (#217, F2; in Troubleshooting).
- **Auditioning:** the editor sends no notes; modules need a DAW (Getting Started says so). **Untested models:** X5, X5D, 05R/W. **Windows:** ports usually need choosing by hand (no "x5" in the name, #227). **Linux:** Brave reported working by the RC tester (#223); Chrome/Edge on Linux unreported.
- **Layout:** fixed 1400px app shell; no responsive intent below ~1200px (#98, #137).
- **Won't Fix:** editing the device's Global MIDI Channel (front panel only, Landmine #57); B09; Live Server hot-reload.
- **Toolchain:** Avoid `git log --follow` (#213). `src/` needs a server; the built file works over `file://`.

---

## Current Next Actions

1. **Phase 4, in order** (Release Plan; the owner's PHASE 4 task list mirrors it, §9):
   - **E6 next:** date the CHANGELOG, tag `v1.0.0`, the owner publishes the Release; `deploy.yml`'s first run (Pages + Release asset); first public-repo backup. Then E7 (fresh-machine pass), then G2–G4 (demo video, announce, feedback routine). Merge `docs/e5-record` first, with the owner's approval.
2. **Habits:** hardware tests use CI artifacts (the test Mac has no npm); push each branch for testing and ask before merging to `main`; never write the RC tester's name in docs (public-doc scrub, #214).

---

## Current Build State

| File | Status | Notes |
|---|---|---|
| `src/index.html` | Complete | All tabs; Help; send timeouts; Data File… dialog; embedded Banks A/B; sound browsers (#222) |
| `src/midi/sysex.js`, `parser.js`, `encoder.js` | Complete | Builders, parsers, `.syx` encoders (#171, #174) |
| `src/midi/effectLayout.js` | Complete, tested | Dump ↔ live effect layouts (Landmines #108–#109) |
| `src/midi/loadFileCheck.js` | Complete, tested | FILE → Load checks (#198, #208, Landmine #122) |
| `src/state/store.js` + `theme.js`, `drumCrossReference.js`, `initProgram.js`, `initCombi.js` | Complete, tested | Store, commits (#175), Initialize data (#172) |
| `src/ui/controls.js` | Complete | Control library; `beginPointerDrag` (Landmine #107) |
| `src/ui/soundCatalog.js` | Complete, tested | Categories; X5D/X5DR-only rules (#222, Landmine #127) |
| `src/ui/gridNav.js` | Complete, tested | Arrow keys for row-major grids (#223, Landmine #128) |
| `scripts/build.mjs`, `screenshots.mjs` | Complete, tested | Single-file build (#200, Landmine #123); README images (#213) |
| `.github/workflows/ci.yml`, `deploy.yml` | CI live; deploy unproven until E6 | Tests, build, artifact on every push; Pages + Release asset on a Release (#207) |

---

## Reference Files

- **Core docs:** Project Context, Landmines (live), this file, Decision Archive, Project Plan, Release Plan, `docs/adr/ADR-0001`–`0008`.
- **MIDI references:** `docs/X5DR Manual Appendix - MIDI Implementation/00_INDEX.md`–`07`; `X5DR_Editor_Effect_Parameter_Table_Transcription.md`.
- **Private archive only:** design specs, `docs/design spec docs/`, `Setup Instructions/` (incl. `public-scrub-terms.txt`), QA punchlist, `X5DR_Editor_D2_Checklist.md`, `X5DR_Editor_Sound_Compat_Draft.md` (decisions behind #222).

---

*Last updated: 2026-10-15 — E5 done: repo public and configured (#231). Next: E6.*
