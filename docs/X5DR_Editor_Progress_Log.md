# Korg X5DR Editor — Progress Log

*Current-state reference, read in full at the start of every session. Keep it under ~1,000 words — detail lives in `X5DR_Editor_Decision_Archive.md` (read only on demand). Update at the end of every session.*

---

## How to Use This Document

Start of session: read the Project Context, Landmines and this file, then confirm you're oriented.

End of session: update **Current Status** and **Current Next Actions**; new decisions and discoveries go in the Archive, not here.

---

## Current Status

- **Feature-complete and hardware-verified:** every tab (PROG's 6 sub-tabs, COMBI, MULTI, GLOBAL, DRUMS), Initialize Patch/Combi, Write In Place / Write To A New Slot, factory Banks A and B, Discard, send timeouts, the MIDI channel selector, Help menu (Archive #51–#198; code audit #188–#198).
- **Released: `v1.0.0`, 2026-10-15** (#232). Live at `https://baylo1.github.io/x5dr-editor/` (deployed by `deploy.yml` from the GitHub Release, `dist/index.html` attached); repo `Baylo1/x5dr-editor` **public**. Unannounced until G2–G3.
- **Phase 4** (`X5DR_Editor_Release_Plan.md`, #199; no public rc, #228):
  - **Stages A–D done** (#200–#227): single-file build (Landmine #123), `file://` (Landmine #103), CI, icons/manifest, Help text, README/CHANGELOG, doc scrub, §10 allowlist; D1 hardware regression and fixes (#217–#219); D2 Edge/Mac and Windows 11 (#220, #227); D3 wording (#221); X5D/X5DR-only sounds (#222, Landmine #127); D4 RC feedback (#223, Landmines #68, #107, #128); VDF/VDA column titles (#224).
  - **Stage E done** (#229–#235): private repo frozen at `pre-public-cut` and renamed `x5dr-editor-private` (kept as its bundle, #234); noreply email; public repo from the single commit `ffe1ec8` (94 files), flipped public, `v*` tag rule on `github-pages`; `v1.0.0` published by the owner, deploy green; public repo backed up (mirror + bundle in the hardware-test Mac's `~/Backups/`, bundle in iCloud Drive). E7 first-run pass on a Mac (Chrome incognito, Edge with no profile; Pages and `file://`, incl. install as app): all passed, no friction, no `v1.0.1`. Working copy `~/Developer/x5dr-editor`; the Desktop folder is the frozen private archive (don't edit it).
- **v1.0.1 in progress** (#236): All Notes Off header button, Shift-drag on the Parametric EQ curve, sticky Combi/Multi column headings. Branch `release/v1.0.1` (combines three feature branches, version bumped). Hardware test: items 1–2 passed; item 3 reworked so rows scroll inside the table (#237), sharing one scroll position between a panel's tabs (#238), re-test passed; All Notes Off now flashes when sent (#239), awaiting check.
- **Testing:** CI on `main` passes (16 test files, 510 tests, build); `release/v1.0.1`: 16 files, 515 tests. Report the file count, not just the pass count (Landmine #80); with subagent worktrees present use `--exclude '.claude/**'` (Landmine #125).

---

## Known Outliers / Limitations

- **Deferred to v1.1** (Release Plan H2): librarian, undo, spontaneous dumps / state surviving refresh, Multisound Solo, scoped Multi/Global/Drums "Write All", single-click Program Browser audition, Copy Effects tab labels (#71), model auto-detect to hide X5D/X5DR-only sounds (#222), random patch generator and rudimentary keyboard (#225), AI patch generation (#226).
- **Bank B Combi 4 "Mr. Tone"** stores Balance L 50 / R 100; Write In Place normalises R to 50 (#205).
- **Live Parameter Changes** are fire-and-forget: a NAK is caught, silence is not (Landmine #115). Rapid bank imports can hang the X5DR until power-cycled (#217, F2; in Troubleshooting).
- **Auditioning:** the editor sends no notes; modules need a DAW (Getting Started says so). **Untested models:** X5, X5D, 05R/W. **Windows:** ports usually need choosing by hand (no "x5" in the name, #227); hardware-tested from a CI build (D2), not yet from the live site. **Linux:** Brave reported working by the RC tester (#223); Chrome/Edge on Linux unreported.
- **Layout:** fixed 1400px app shell; no responsive intent below ~1200px (#98, #137).
- **Won't Fix:** editing the device's Global MIDI Channel (front panel only, Landmine #57); B09; Live Server hot-reload.
- **Toolchain:** Avoid `git log --follow` (#213). `src/` needs a server; the built file works over `file://`.

---

## Current Next Actions

1. **Phase 4, in order** (Release Plan; the owner's PHASE 4 task list mirrors it, §9):
   - **Next: v1.0.1** — owner re-tests the Combi/Multi scrolling from the new `release/v1.0.1` CI artifact (#237), then merge, date the CHANGELOG, tag, release, refresh backups.
   - **Then G2** demo video (owner records), then **G3** announce (owner posts; Claude can draft the text). **G4** feedback routine (weekly Issues triage + mirror refresh) can be set up any time. Then H1 housekeeping and the v1.1 group (H2).
   - **Backups:** at every release, refresh the public mirror and make a new bundle in `~/Backups/` (not inside the mirror), verify it, copy it to iCloud Drive (Release Plan G4, #234).
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
| `.github/workflows/ci.yml`, `deploy.yml` | Both live; deploy proven at E6 (#232) | Tests, build, artifact on every push; Pages + Release asset on a Release (#207) |

---

## Reference Files

- **Core docs:** Project Context, Landmines (live), this file, Decision Archive, Project Plan, Release Plan, `docs/adr/ADR-0001`–`0008`.
- **MIDI references:** `docs/X5DR Manual Appendix - MIDI Implementation/00_INDEX.md`–`07`; `X5DR_Editor_Effect_Parameter_Table_Transcription.md`.
- **Private archive only:** design specs, `docs/design spec docs/`, `Setup Instructions/` (incl. `public-scrub-terms.txt`), QA punchlist, `X5DR_Editor_D2_Checklist.md`, `X5DR_Editor_Sound_Compat_Draft.md` (decisions behind #222).

---

*Last updated: 2026-10-22 — v1.0.1 on `release/v1.0.1` (#236–#239): all three items passed; button flash added, awaiting check. Then G2 demo video, G3 announce.*
