# Korg X5DR Editor — Phase 4 Release Plan

*Written 2026-10-05 (planning session, no code changed). Decisions are recorded in Decision Archive #199. This plan **supersedes** `X5DR_Editor_Public_Release_Plan.md` (2026-09-30 proposal), whose file inventory it reuses. It merges every open task in the owner's task list under "PHASE 4 — Distribution & Release"; the task list now has one task per step (§9) and Optimization Plan Workstream D.*

*Execute one step at a time, in order, unless a step says it can run in parallel. Each step lists **What**, **Why**, **Depends on**, **Verify** and **Decision**. "Decision: none" means the step was settled in Archive #199; otherwise the owner decides before work starts.*

---

## 1. Decisions (summary of Archive #199)

| # | Topic | Decision |
|---|---|---|
| D1 | Repo and email | The current repo is renamed `x5dr-editor-private`, stays private with full history, and becomes a read-only archive. A **new public `x5dr-editor`** starts from a **single initial commit**, authored with the GitHub noreply address. Development continues in the public repo. No history rewriting (`git filter-repo` is not used). |
| D2 | Public docs | Public after a scrub: `CLAUDE.md`, Project Context, Landmines, ADRs, Progress Log, Decision Archive, Project Plan, this plan. Private archive only: `Setup Instructions/`, `Claude Grill With Docs Instructions/`, `Reference Images/`, `.claude/projects/`, `.claude/worktrees/`, `docs/design spec docs/`, `Landmines_Full`, Optimization Plan, Code Audit Findings, Landmines Condensation Proposal, Phase 3 QA Punchlist, the old Public Release Plan, all PDFs. `S1 Editor/` is already gitignored. |
| D3 | Korg material | Ship the hand-transcribed MIDI `.md` tables, with a "transcribed from the Korg X5DR manual, © Korg" header. Ship embedded Factory Banks A/B, with About/README stating they are Korg's data, not MIT-licensed. "Not affiliated with or endorsed by Korg" goes in README and About. *Amended 2026-10-07 (Archive #212): the "removed on request" line was dropped; it had no legal effect.* |
| D4 | Third-party `.syx` | `<identified user>_X5D.syx`, `X5DR_SendCD.syx` and the internet `X5dr Factory Sounds.syx` stay private. Tests are retargeted to the hardware captures before the cut, using `describe.skipIf(file missing)` only where non-factory data is genuinely needed. The identified user's file can come back later with permission and credit. |
| D5 | Deploy | `dist/` stays gitignored. **CI** (tests + build) runs on every push and PR to `main`. **Deploy** runs on a published GitHub Release: test → build → GitHub Pages → attach `dist/index.html` to the Release. The live site always equals the latest release. |
| D6 | Address | `https://baylo1.github.io/x5dr-editor/` — no custom domain. Final: changing the origin later loses users' installs, MIDI permission and saved settings. |
| D7 | Versioning | SemVer tags `vX.Y.Z`; `CHANGELOG.md` (Keep a Changelog); `APP_VERSION` must equal the `package.json` version, enforced by `build.test.js`. Launch: **`v1.0.0-rc.1` unannounced beta**, then `v1.0.0` and the announcement. *Amended 2026-10-10 (owner, Archive #223): changes from feedback on pre-release builds fold into rc.1 (D4); no bump until rc.1 is released.* *Amended 2026-10-15 (owner, Archive #228): the rc.1 testing (Stage F) is complete — the RC tester's feedback was folded in by D4 — so no rc is released publicly. The first public release is **`v1.0.0`**, at E6, followed by the announcement.* |
| D8 | Offline | No service worker in v1.0. The installed app loads from Pages. For offline use, download `dist/index.html` from the Release, if the `file://` test (§3, A2) passes. |
| D9 | Fonts | Embedded in the build as base64 Latin-subset WOFF2 (Inter 400/500/600/700, IBM Plex Mono 400/500), with the SIL OFL text shipped alongside. `src/` keeps the CDN link for development. |
| D10 | Icons / manifest | Icons via a Claude Design handoff. `manifest.json` stays an external file next to `index.html`; a `data:` URI gains nothing, since Chrome ignores manifests on `file://`. |
| D11 | v1.0 scope | Gates v1.0: the **Edge + Windows check** and a **light UX pass** (wording only). **Amended 2026-10-09 (owner, Archive #222):** v1.0 also gets `feature/x5-sound-compat` — X5D/X5DR-only sounds marked (and hideable) in the sound browsers, the Drums tab and the Patch/Program browsers, per-sound categories, and multi-select filter pills; UI only, no device-protocol change. **Amended 2026-10-10 (owner, Archive #223):** v1.0 also gets the RC tester's usability items (D4): browsers numbered in rows, one-at-a-time category pills with Shift to add, draggable EG stage numbers, Shift-drag axis lock on EG curves, EQ Low above High. Moved to v1.1: keyboard accessibility review, donation/support links, service worker, plus the already-deferred items (librarian, undo, spontaneous dumps, Multisound Solo, scoped Write All, single-click Program Browser audition). |
| D12 | Test machines | Owner: second Mac (fresh Chrome profile) and a Windows PC with the X5DR. Hoped-for RC tester, an identified user: Windows and Linux. *2026-10-10: the RC tester reported Brave on Linux working on a pre-release build (Archive #223).* |
| D13 | Announcement | Korg-specific forums/groups, general synth forums (Gearspace, Vintage Synth Explorer, KVR), Reddit (r/synthesizers, r/Korg), and a 1–2 min demo video. |
| D14 | Feedback | GitHub Issues only (Discussions off). Templates: bug report (exists), device compatibility report, feature request. PRs by discussion: open an issue first, and the owner hardware-verifies any MIDI change. Emailed reports are copied into Issues without the sender's details. `main` is protected. |

---

## 2. Overview and order

```
Stage A  Build            A1 single-file build → A2 file:// test → A3 CI + deploy workflows
Stage B  PWA              B1 icons + manifest → B2 local install test
Stage C  Content          C1 test fixtures → C1b MIDI-denied box → C1c Data File dialog → C2 in-app text → C3 repo files → C4 docs scrub → C5 publish list
Stage D  Pre-release      D1 hardware regression (Mac, Chrome) → D2 Edge + Windows → D3 UX wording fixes → D4 rc.1 feedback round
Stage E  Public cut       E1 freeze/backup → E2 rename → E3 email settings → E4 new repo → E5 configure → E6 v1.0.0 → E7 fresh-machine pass
Stage F  RC beta          complete (owner, 2026-10-15): rc.1 feedback folded in by D4; no public rc
Stage G  Launch           G1 (folded into E6) → G2 demo video → G3 announce → G4 feedback routine
Stage H  After release    H1 housekeeping → H2 v1.1 backlog
```

*Amended 2026-10-15 (Archive #228):* Stage F is complete and G1's release moved into E6, so the public cut ships `v1.0.0` directly.

Stages A–D happen in the **current (private) repo**, one branch per step, with the usual Archive/Progress Log updates and "ask before merging". B1 and C1 can run in parallel with A. **Stage E is the only irreversible stage**: everything that must not be public has to be gone from the publish list before E4.

---

## 3. Stage A — Single-file build (Optimization Plan Workstream D)

### A1. `build/single-file` — `scripts/build.mjs` and `scripts/build.test.js`

**What.** Workstream D items 1–4, plus the extras the decisions add:
1. `scripts/build.mjs`, using Node built-ins only (`fs`, `path`):
   - Read `src/index.html` and parse the import graph from its inline module script.
   - Topologically order the modules (`src/midi/*.js`, `src/state/*.js`, `src/ui/controls.js`; exclude `*.test.js`).
   - Wrap each module in an IIFE that returns its exports (`const __m_sysex = (() => { …; return { a, b }; })();`).
   - Rewrite every `import { a, b as c } from './x.js'` to `const { a, b: c } = __m_x;` and strip `export`.
   - Emit one inline `<script type="module">` (strict mode, no fetch).
   - **Fail loudly** on default, namespace or dynamic imports, `export *`, `import.meta`, `new URL` or `fetch(`. §2.7 found none today, so this guards future code.
   - **Fonts (D9):** replace the three Google Fonts `<link>`s (two `preconnect` plus the stylesheet) with an inline `<style>` of `@font-face` rules whose `src` is `url(data:font/woff2;base64,…)`. Read the WOFF2 files from a new `src/fonts/` folder (committed, with `OFL.txt` per family). The build fails if a font file is missing.
   - **Copy** `src/manifest.json` and `src/icons/*` (once they exist, B1) into `dist/`. Keep the relative `<link rel="manifest" href="manifest.json">` (§2.7).
   - Write `dist/index.html`. Add a `<!-- built from <git short hash> on <date> -->` comment for diagnostics.
2. `package.json`: `"build": "node scripts/build.mjs"`. `.gitignore`: `dist/`.
3. `scripts/build.test.js` (Vitest) runs the build, then asserts:
   - No `import`/`export` statements remain, and no `./midi/`, `./state/` or `./ui/` paths.
   - Exactly one module script, and `node --check` passes on it.
   - Both factory-bank base64 constants are present and byte-identical to `src/`.
   - No `fonts.googleapis.com`/`fonts.gstatic.com` reference remains, and six `@font-face` blocks are present.
   - `APP_VERSION` in `dist/index.html` equals `package.json`'s `version` (D7).
   - `dist/manifest.json` exists and parses; every icon it lists exists in `dist/`.
   - The SPDX line and LICENSE notice survive.

**Why.** The app must be one self-contained file for Pages, for the Release download and for `file://`. The tests plus D5's CI are the drift guard: `dist/` is never committed or hand-edited; it is always rebuilt from `src/`.

**§2.7 hazards and how each is handled:**
- Name collisions (`svgEl`, `u8`, `encode*ToBytes`) are kept apart by the IIFE scope. X1/X10 already removed the duplicates; the test still passes either way.
- Blocking patterns: none exist today; the build refuses them if they appear.
- Google Fonts: embedded (D9).
- Relative manifest: copied next to the page and asserted by the test.

**Depends on.** Audit complete (done). Font files downloaded from the official Inter and IBM Plex releases (OFL); they are not taken from the Google CDN.

**Verify.**
- `npx vitest run`, listing the files that ran (Landmine #80 rule).
- Browser: serve `dist/` on a **different port** from `src/` (Landmine #69). Every tab renders, there are no console errors, fonts render without network (DevTools offline), and Factory Bank A/B load, Save, and the Help menu work. Compare a side-by-side screenshot with `src`.
- **Owner hardware smoke test on `dist/`** (pushed branch): port auto-select, Import From Device, a live parameter edit, Write In Place, the send-timeout modal with SysEx disabled.

**Decision.** None. Optional: write ADR-0009 "Distribution build and hosting" to capture build, deploy and the `file://` result. Recommended, because ADR-0002 §6a only covers the old 3-file picture.

### A2. Landmine #103 — `file://` test of `dist/index.html`

**What.** Open `dist/index.html` directly from disk in Chrome (Mac), then Edge and Windows when D2 happens. Record each result:
1. `isSecureContext`.
2. `navigator.requestMIDIAccess({sysex: true})`: the prompt appears, ports are listed, and SysEx round-trips with the X5DR (Import From Device + a live edit + Write In Place).
3. `showOpenFilePicker`/`showSaveFilePicker` (FILE → Load/Save).
4. `navigator.clipboard` (Copy Diagnostics).
5. `localStorage` persists across reloads (theme, port, channel, Getting Started dismissal). Note that all `file://` pages may share one storage origin.
6. Fonts render (embedded).
7. Denying the MIDI permission gives a usable message, not a dead UI. Check this on Pages too.

**Why.** Decides whether the Release offers a downloadable file and what Getting Started says. It also settles a claim that is currently wrong. Correction: the "`file://` will not work" claim is in the **Project Plan Phase 4 text**, not ADR-0002 §6a; §6a already assumes `file://` works and asks for verification.

**Depends on.** A1.

**Verify.** Owner hardware run over `file://`; results table in a new Archive entry.

**Docs afterwards:**
- Landmine #103: rewrite with the result as `HW` (or `RETIRED`).
- ADR-0002 §6a: dated amendment with the result, pointing to ADR-0009 if written.
- Project Plan Phase 4: replace the stale build bullet (it says "inline sysex.js and store.js"; there are now 11 modules) and the `file://` claim; drop "Windows setup notes (loopMIDI)", which is obsolete because the editor talks to the interface directly (Archive "IAC not required").

**Decision.** If any of 2–5 fails over `file://`, the owner decides: drop the download offer, or ship it with a stated limitation.

### A3. `ci/workflows` — GitHub Actions

**What.**
- `.github/workflows/ci.yml`: on a push to **any branch** (amended 2026-10-06, Archive #207: the test computer has no npm, so every pushed branch needs a build), on PRs to `main` and by hand, run `npm ci`, `npx vitest run` and `npm run build`. Upload `dist/` as a workflow artifact (`x5dr-editor-<branch>-<sha7>`, 30 days), so a branch's build can be downloaded and hardware-tested on the other computer.
- `.github/workflows/deploy.yml`: on `release: published` (includes pre-releases), run tests → build → `actions/upload-pages-artifact` (`dist/`) → `actions/deploy-pages`, then `gh release upload` of `dist/index.html`. Permissions: `pages: write`, `id-token: write`, `contents: write`.
- Fail the deploy if the tag (minus `v`) ≠ `package.json` version.

**Why.** D5: no drift, and no way to publish an untested or unbuilt file.

**Depends on.** A1. `ci.yml` can be proven in the private repo (Actions minutes are free at this volume). `deploy.yml` can only be proven after E5, because Pages needs the public repo.

**Verify.** CI green on the PR. `deploy.yml` is verified at E6.

**Decision.** None.

---

## 4. Stage B — PWA / installability

### B1. `feature/app-icons` — icons and manifest

**What.**
- Write a short Claude Design brief: theme tokens (Warm Graphite default), M1-inspired, legible at 16px, an "X5DR"/rack-front motif, no Korg logo or trademark styling.
- The owner picks one. Export it to `src/icons/`: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (safe zone), `favicon.svg` or `favicon-32.png`, `apple-touch-icon.png` (180).
- Add an `icons` array (with `purpose: "maskable"` on the maskable one), `id: "./"` and a `categories` entry to `manifest.json`. Add `<link rel="icon">` and `<link rel="apple-touch-icon">` to `src/index.html`. `theme_color`/`background_color` already match the default theme, and the live title-bar colour (`theme-color-meta`) is done.

**Why.** Chrome won't offer Install without icons (task list). The manifest decision is closed (D10).

**Depends on.** None; can run in parallel with A. Its icon assets feed A1's copy step.

**Verify.** DevTools → Application → Manifest shows no errors or warnings, and the icons render, including the maskable preview. Owner review of the artwork.

**Decision.** Owner picks the artwork.

### B2. Local installability test

**What.** Serve `dist/` on localhost. Chrome and Edge offer Install. Check that the installed window has the right title-bar colour, follows theme changes, keeps MIDI working, opens from the Dock/Start Menu, and uninstalls cleanly.

**Why.** First half of the task-list item "Test installing the PWA from both a local server and the real GitHub Pages URL". The second half is E7. A localhost install is a separate app with separate storage from the github.io install (task-list note).

**Depends on.** A1, B1.

**Verify.** Owner, on the Mac with hardware.

**Decision.** None.

---

## 5. Stage C — Content and repo readiness

### C1. `test/retarget-fixtures` — remove third-party fixtures from tests (D4)

**What.** Repoint every test that reads `<identified user>_X5D.syx` (`encoder.test.js` ~20 uses, `parser.test.js`, `sysex.test.js`) or `X5DR_SendCD.syx` (`effectLayout.test.js`) to the hardware captures (`X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data|Multi Expansion).syx`, `Factory B Bank Pt 1/Pt 2 dump.syx`). Where a test genuinely depends on non-factory content (e.g. a value only the identified user's patches contain), either build a synthetic message in the test or use `describe.skipIf(!existsSync(path))`, and list each such case. Also drop the comment-only mentions of the internet factory file, or reword them to say "private archive".

**Why.** Those files won't exist in the public repo, so the tests would fail in CI and for anyone cloning.

**Depends on.** None (parallel with A).

**Verify.**
- Vitest before and after: report files run and counts, and explain any drop.
- Temporarily move the three files out of `reference_sysex/` and re-run: everything passes or skips as listed.
- Confirm `effectLayout`'s "~1,100 stored effects" coverage (Landmine #108) is still meaningful on factory data alone.

**Decision.** Owner approves any test reported as skipped or removed.

### C1b. `fix/midi-permission-denied` — MIDI permission refused (added 2026-10-06, Archive #203)

**What.**
- When `requestMIDIAccess({sysex: true})` is refused, show a **warning box**, not only the status bar (the failures-in-a-box rule). It says MIDI is blocked and how to allow it (the icon in the address bar, or the site settings).
- Watch `navigator.permissions.query({ name: 'midi', sysex: true })` and re-request MIDI access when the state changes to `granted`, so the ports appear without a reload.
- If the permission change can't be detected (check over `file://`), the box offers **Reload** instead.

**Why.** A2 check 4: after Block, the editor sits at "— Web MIDI unavailable —" with no explanation, and re-allowing from the address bar does nothing until a reload.

**Depends on.** None. Before C2, whose Getting Started/Troubleshooting text should describe the result.

**Verify.**
- The Browser pane (MIDI is denied there): the box appears.
- Owner on the built file: Block → box; re-allow → ports appear (or Reload works), over both `file://` and `http://localhost`, in Chrome and Edge.

**Decision.** None (approved 2026-10-06).

### C1c. `feature/file-data-dialog` — FILE → Load/Save "Data File…" checkbox dialog (added 2026-10-06, Archive #204)

**What.** Replace FILE → Load and Save → All Data, All Programs, All Combinations, Multi, Drums and Global with **one item each: "Data File…"**. Factory Sounds Bank A/B and Single Program/Combination stay as they are.

- **Load → Data File…** picks a `.syx` file and checks it, then opens a dialog with one checkbox per type: Programs, Combinations, Multi, Drums, Global.
  - A type the file lacks is greyed out and can't be selected. A tooltip gives the reason; for Multi this includes "Multi effects only, no track settings" when the file has Func 50 without 68.
  - Every available type starts ticked.
  - Multi, Drums and Global are marked as written to the device on load (they have no separate editor copy, Landmine #58). They are pushed as today, with mode restore (Landmine #112).
  - Programs and Combinations merge per type (Landmine #42). Afterwards, the Write / Not Now prompt covers **only the Programs/Combinations actually loaded**, sent as All Programs and/or All Combinations dumps. It never builds an All Data dump from a mix of file and editor contents.
  - The unsaved-edits check runs only if Programs or Combinations is ticked.
  - A non-Korg file, or one with no bank-level dumps (e.g. a single program), is refused with a box. The single-program case points to Single Program.
- **Save → Data File…** opens the same dialog. Types the editor holds no data for are greyed out.
  - All five ticked: save Func 50 + 68 (the standard All Data file, as today).
  - Fewer ticked: one dump per type (4C, 4D, 55 + 68, 52, 51).
  - Suggested filename: `X5DR_bank.syx` when all five are ticked, otherwise named after the selection.
- **Data layer:** `loadFileCheck.js` becomes "which bank-level types does this file contain, and is each complete?", with Vitest coverage. The test fixture for a 4C + 4D + 52 + 51 file (like the identified user's) is assembled from the factory captures. Landmine #122 is rewritten.

**Why.** Owner's proposal (Archive #204). It came from `<identified user>_X5D.syx` (Programs, Combinations, Drums and Global, no Multi) being refused by Load → All Data. One dialog covers every combination and replaces ten menu items with two.

**Depends on.** None; must land before C2, whose Help text describes the menu.

**Verify.**
- Vitest, listing the files that ran.
- Browser: each checkbox combination on Load and Save, greyed-out states, the refusal boxes, and saved bytes. With all five ticked, Save must be byte-identical to today's Save → All Data.
- Owner hardware checklist on the built file:
  - a full All Data file;
  - a four-type file (4C + 4D + 52 + 51);
  - a Drums + Global only selection;
  - Not Now keeps the device untouched for Programs/Combinations;
  - Multi/Drums/Global reach the device;
  - mode restore after the load.

**Decision.** Wording of the dialog and boxes: owner approves before merge. Device menu (Import From Device / Write To Device) keeps its per-type items for v1.0; the same treatment is a v1.1 item.

### C2. `feature/release-text` — in-app text

**What.**
- **Getting Started:**
  - Three ways to run it: the website, installing it as an app, and (if A2 passes) the downloaded file. Covers the task-list items "Update Help menu…" and "Update getting started if file can be run locally".
  - Windows: port names usually don't contain "x5", so choose the port manually. Most Windows MIDI drivers allow only one app to use a port at a time, so close the DAW or use a multi-client driver; verify the current Windows MIDI Services behaviour on the Windows PC in D2.
  - Linux: Chrome only.
- **Troubleshooting:** add the Windows port-sharing and permission-denied cases.
- **About:**
  - Version.
  - MIT licence text.
  - "Not affiliated with or endorsed by Korg"; "Korg" and "X5DR" are Korg's trademarks.
  - Factory banks are Korg's data, not MIT-licensed (D3).
  - Fonts under SIL OFL (D9).
  - Repo and Issues links.
- **Version:** `APP_VERSION` and `package.json` → `1.0.0-rc.1` (D7). Copy Diagnostics already includes it. *(Now `1.0.0`, 2026-10-15, Archive #228.)*
- **Report a Problem:** confirm the Issues link opens the template chooser (`/issues/new/choose`). Keep the feedback email as `x5dr-editor-feedback@baylisconsulting.com`.

**Why.** First-run guidance is where new users get stuck. The Korg and licence notices follow D3/D9.

**Depends on.** A2 (which run modes exist).

**Verify.** `node --check` on the extracted module (Landmine #116); browser check of each Help item in all three themes; owner text review.

**Decision.** Owner approves the wording.

### C3. `docs/public-repo-files` — repo-facing files

**What.**
- `README.md`:
  - What it is, with screenshots and a link to the live site.
  - **Requirements:** Chrome or Edge on Mac/Windows/Linux; Safari and Firefox are not supported.
  - **Supported devices:** X5DR verified on hardware. X5, X5D and 05R/W are untested — device reports wanted. Note the Device Member Codes.
  - **Setup:** MIDI interface connected both ways; the editor's channel matches the device's Global MIDI Channel; SysEx reception enabled on the device; choose the port; use a DAW for notes (the editor sends none).
  - **Run / install / download** (from A2).
  - Troubleshooting pointer.
  - **Korg notice** and **licence** (MIT for code; factory banks and fonts excepted).
  - **Feedback:** Issues and email.
  - **For developers:** `npm install`, `npx vitest run`, `npm run build`, `npx serve src`; `CLAUDE.md`/docs pointer.
- Screenshots live in `docs/images/`, taken from the app, not from `Reference Images/`.
- `CHANGELOG.md`: a `1.0.0-rc.1` entry summarising the feature set. *(Now the `1.0.0` entry, Archive #228.)*
- `CONTRIBUTING.md` (D14).
- `.github/ISSUE_TEMPLATE/`:
  - `device_report.md` (model, firmware, OS, browser and version, MIDI interface, what worked or failed, Copy Diagnostics).
  - `feature_request.md`.
  - `config.yml` with `blank_issues_enabled: false` and a contact link to the feedback email.
  - Review the existing `bug_report.md`.
- `package.json`:
  - `name` → `x5dr-editor`.
  - `description`.
  - `author: "Mark Baylis"`, with no email.
  - `"private": true` (prevents an accidental npm publish).
  - `homepage` → the Pages URL.
  - Drop `main`/`directories`.
- **Notice headers** on each `docs/X5DR Manual Appendix - MIDI Implementation/*.md` and `X5DR_Editor_Effect_Parameter_Table_Transcription.md` (D3).
- `.claude/launch.json`: keep (helps Claude Code contributors).

**Why.** Public-facing basics; device reports are how the untested models get verified.

**Depends on.** C2 (README text mirrors Getting Started); B1 (README icon/screenshot).

**Verify.** Markdown preview; every link resolves (repo links resolve once public, so re-check at E5); owner review.

**Decision.** Owner approves the README.

### C4. `docs/public-scrub` — docs ready for the public

**What.**
- **Scrub the docs listed public in D2** of machine and personal references. Current hits:
  - The task-list app: Archive, Progress Log, Project Plan.
  - The Macs' model names and the MIDI interface's brand and model: Archive, Project Plan, `00_INDEX.md`.
  - iCloud: Progress Log, Archive, Landmines #95.
  - The notes app: Progress Log, Archive, Project Plan.

  Replace with neutral wording ("the owner's MIDI interface", "the hardware-test machine"). The Project Plan's "MIDI Routing — hardware-test Mac Setup Reference" becomes a generic routing example. Re-grep for the personal email address, `/Users/`, and the username before the cut; none were found on 2026-10-05.
- **Append-only exception.** Editing old Archive entries breaks the Archive's append-only rule. Make it a single, recorded **redaction-only** pass: substitutions only, no meaning changes. A new Archive entry lists what was replaced, and the owner reviews the diff.
- **Hash note.** Add a line to the Archive header and `CLAUDE.md`: "commit hashes before v1.0.0-rc.1 refer to the private archive repository `x5dr-editor-private`." *(Now "before v1.0.0", Archive #228.)*
- `CLAUDE.md`: add the build command, the release process (tag → Release → deploy), "`src/` is the only editing source; never edit `dist/`", and the new repo/remote. Remove the `Setup Instructions/` and `Claude Grill…/` lines (they won't exist in the public repo).
- **Progress Log / Context:** update Toolchain (public repo, Pages live, CI). Mark the old `X5DR_Editor_Public_Release_Plan.md` superseded; it stays private.
- **Landmine #95** (git hangs = iCloud): keep it while the working copy lives in iCloud; see E4's location decision.

**Why.** D2 publishes the working docs; they shouldn't carry home-setup details or broken workflow pointers.

**Depends on.** A2/A3 (so build/release text is final); ideally last before D, so later doc edits are minimal.

**Verify.** `grep` sweep (commands recorded in the Archive entry) returns nothing for each term in the files on the publish list; owner diff review.

**Decision.** Owner approves the redaction exception and the substitution wording.

### C5. Publish list (allowlist) for the cut

**What.** A reviewed list, in this plan's §10 and finalised at this step, of exactly which paths go into the public repo's first commit. E4 copies **only** these from a clean `git archive` of `main`, so anything not listed (including future additions) stays private by default.

**Why.** Allowlisting is safer than deleting known-bad paths: a forgotten folder is excluded, not leaked.

**Depends on.** C1–C4.

**Verify.** Owner signs off the list; E4 re-checks the result against it.

**Decision.** Owner approves the final list.

---

## 6. Stage D — Pre-release test pass (private repo, built file)

### D1. Full hardware regression — Mac, Chrome, `dist/` served locally

**What.** Owner checklist, run on the built file (and repeated over `file://` for the starred items if A2 passed). Record pass/fail in an Archive entry.

1. **Connection:** port auto-select ("x5"); manual port choice kept across reload and hot-plug (Landmine #118); channel selector on a non-default device channel; status pill states (Disconnected, Connected, No response, Rejected).*
2. **Import From Device:** All Data, All Programs, All Combinations, single Program/Combination, Multi, Global, Drums.*
3. **PROG**, each of Easy, OSC, VDF, VDA, Control, Effect: live edits audible; effect type change resets parameters; Dual-Balance types (15, 40–43, 46–47); Copy Effects; Initialize Patch.*
4. **COMBI** Timbres/Control/Effect, **MULTI** Tracks/Control/Effect (CONFIG debounced sync), **GLOBAL**, **DRUMS** (key collision dropdown, "used by" list).
5. **Patch Browser:** audition, confirm, cancel; Program and Combi scopes; the Abandoned Edits modal (Write / Discard and Continue / Stay).
6. **Writes:** Write In Place, Write To A New Slot (PROG/COMBI); Discard (header button and modal); Write All Data/Programs/Combinations; tab switches after each (mode restore, Landmine #38).*
7. **FILE:** every Load item with a matching, a possible and a refused file (Landmine #122); Save each type; Factory Sounds Bank A and B, then write to device.*
8. **Failure paths:** SysEx reception disabled → the "No response from device" modal (Retry/OK); channel mismatch; NAK recovery (edit an OSC-2 parameter in single-OSC mode → format error handled).
9. **Help menu:** Getting Started (first launch auto-opens), Troubleshooting, Report a Problem, Copy Diagnostics, About; all three themes; title-bar colour.*

**Why.** The last full check before strangers use it. The audit touched most flows.

**Depends on.** A1–A2, B1, C1–C4 merged.

**Verify.** Owner on hardware.

**Decision.** None. Any failure → a fix branch with its own hardware check.

### D2. Edge (Mac) and Windows PC with the X5DR

**What.**
- Edge on Mac: checklist items 1, 2, 3 (one tab), 6 and 9.
- Windows PC (Chrome **and** Edge), from a local copy of `dist/` (localhost or `file://`): items 1, 2, 6, 7, 8 and 9. Also record:
  - the interface's port name;
  - whether the auto-select matches;
  - whether a DAW can share the port;
  - driver notes.

  This feeds the Windows text in C2/README; patch them if reality differs. *Added 2026-10-10 (Archive #223):* if Chrome and Edge pass, add Windows to Getting Started's "verified on macOS" sentence and the README Requirements line.

**Why.** D11 gate: we advertise Chrome and Edge, and Windows is the largest likely audience.

**Depends on.** D1.

**Verify.** Owner on hardware; results in the Archive entry.

**Decision.** None, unless Windows reveals a blocker. Then the owner chooses fix-before-rc or a documented limitation.

**Done (2026-10-14).** Part 1 (Edge, Mac) passed (Archive #220); Part 2 (Windows 11, Chrome and Edge) passed with no blocker (Archive #227). The Windows port needed choosing by hand, hot-plug reselected it on its own, and a DAW shared the port. Windows added to Getting Started and the README.

### D3. `fix/release-wording` — light UX pass

**What.** Label and wording fixes collected during D1/D2 (and later F2): no layout work (D11).

**Why.** Phase 3.3 "Final UX pass", scoped down.

**Depends on.** D1, D2.

**Verify.** Browser check; owner review.

**Decision.** Owner picks which items to fix.


### D4. rc.1 pre-release feedback round (added 2026-10-10, Archive #223)

**What.** The RC tester's feedback on a pre-release build (Brave on Linux), folded into `1.0.0-rc.1` with no version bump (D7 amendment). One branch per change, each pushed and checked by the owner on the hardware-test Mac from its CI artifact:
1. `fix/linux-help-text` — Getting Started "1. Use a Chromium-based browser" (Chrome and Edge verified on macOS, Brave on Linux; Safari and Firefox not supported; other combinations welcome), matched in README and Troubleshooting. *Done, `84d8c89`.*
2. `fix/browser-row-order` (`4822ca0`) — every grid browser (Multisound, Drum Sound, Effect Type, Program picker, Copy Effects, Copy Combi **and the Patch Browser**) numbers in rows: 000 001 002 003 004 across. Left/Right step one number and wrap to the next/previous row; Up/Down move a row.
3. `fix/category-pill-select` (`02415ae`) — a plain click on a category pill shows only that category; Shift-click (also Ctrl/Cmd) adds or removes one; "All" clears. A short footer hint. Getting Started's pill bullet updated.
4. `feature/eg-field-drag` (`4d23e65`) — vertical drag on the EG stage numbers (OSC Pitch EG, VDF and VDA, all built by `buildEgField`) changes that one value; a click without movement still opens typing. Opt-in for EG fields only; uses `beginPointerDrag` (Landmines #68, #107).
5. `feature/eg-axis-lock` (`732f917`, based on branch 4: merge 4 first) — Shift-drag on an EG curve marker locks to the axis moved first (time-only or level-only).
6. `fix/effect-eq-order` (`5d5664a`) — EQ Low above EQ High in the Effect tab's PARAMETERS grid, wherever the pair shares the col3 column.

7. `fix/drums-grid-row-order` (`46ab605`) — the OSC-tab Kit Summary and the Drums tab slot grid read in rows too (owner follow-up).
8. `feature/grid-arrow-wrap` (`899226d`, based on branch 2) — `src/ui/gridNav.js`: Up/Down past the bottom/top of a column continue at the top/bottom of the next/previous column, in every browser.
9. `feature/drums-grid-arrow-keys` (`2112a44`, based on branch 8 with branch 7 merged in) — arrow keys in the Drums tab slot grid, same rules.

10. `feature/readout-drag-all` (`810f682`, test fix `8559ca5`; based on branch 4) — every knob, fader and field number drags (knobs at the ring's scale) and opens typing on a single click, including numbers inside a knob ring (owner: consistency). Branch 9 also gains `a5e6386`: the Drums slot grid takes keyboard focus when shown.

11. `fix/edit-field-blur` (`7130df4`, from `main`; also merged into branch 10) — an open number editor closes on any press elsewhere, including a knob drag (owner's bug report; also on `main`).

Merge order: 2 → 8 → 7 → 9, and 4 → 5 and 10 (11 first, or with 10); the others are independent. Branch 10 changes every knob: the owner's hardware check includes a dragged knob number heard on the X5DR on PROG, COMBI and DRUMS.

Each branch also updates the rc.1 CHANGELOG entry and Getting Started where the described behaviour changes.

**Why.** First outside feedback. Items 2–5 are the owner's v1.0 additions (D11 amendment); all are UI-only.

**Depends on.** None among themselves; can run before or after D2 Part 2. E1 waits for both.

**Verify.**
- `node --check`; CI on each branch (full suite; locally, iCloud may block test files, Landmine #95); built file on port 5520.
- Owner on the hardware-test Mac: each change, plus a live edit on hardware for 4 and 5 (a dragged value is sent and heard).
- **No Linux re-test:** the RC tester isn't available for more testing; the owner's checks are taken as sufficient unless later reports say otherwise (Archive #223).

**Decision.** Made (owner, 2026-10-10, Archive #223).

**Done (2026-10-10).** All eleven branches combined in `test/d4-hardware`, hardware-tested by the owner (pass) and merged to `main`.

---

## 7. Stage E — Public cut (irreversible from E5 on)

### E1. Freeze and back up

**What.**
- Merge everything; `main` is green in CI.
- Tag `pre-public-cut` in the private repo and push.
- **Back up the private repo** (policy below; added 2026-10-07, Archive #216). On the development Mac, outside the project folder:
  - `git clone --mirror git@github.com:Baylo1/x5dr-editor.git x5dr-editor-private.git`
  - `git -C x5dr-editor-private.git bundle create ../x5dr-editor-private-pre-public-cut.bundle --all`
  - Copy the `.bundle` file to the **hardware-test Mac** (AirDrop is fine; that Mac needs no GitHub login) and to the **off-machine copy** (an external drive, or iCloud Drive as that single file). Delete the temporary mirror on the development Mac afterwards; its checkout already has the history.
  - On the hardware-test Mac, unpack it into a browsable mirror, outside iCloud: `git clone --mirror x5dr-editor-private-pre-public-cut.bundle ~/Backups/x5dr-editor-private.git`.
- **Hardware-test Mac, its existing working clone:** once the bundle there passes `git bundle verify`, check the old clone for anything that exists only there:
  - `git status` (uncommitted changes)
  - `git stash list` (stashed work)
  - `git log --branches --not --remotes --oneline` (commits never pushed)

  If any of them shows something, push it before the `pre-public-cut` tag. Don't turn this clone into the backup: it's a working copy with some branches only, and would need a GitHub login. The bundle mirror is the backup. The clone is retired in E2.

**Backup policy (both repos, from E1 on).** GitHub is not the only copy.
- **Three copies:** GitHub; a mirror on the hardware-test Mac, which is a different machine from the working copies on the development Mac; and one off-machine `git bundle` file (external drive, or iCloud Drive as a single file).
- **Never** put a backup inside the iCloud-synced project folder. Sync copies deletions, and many small git files trigger the Landmine #95 stall; a single bundle file is fine.
- **Bundles** (`git bundle create <file> --all`) are single, self-checking files holding every branch and tag. `git bundle verify <file>` checks one; `git clone <file>` restores it anywhere.
- **Private repo:** frozen after E1, so a one-time backup. Refresh it only if the private repo is ever changed again.
- **Public repo:** first backup at E6, then refreshed at every release and by the G4 weekly routine.
- **Not in git:** Issues and Release notes. Export Issues with `gh issue list --state all --limit 1000 --json number,title,body,state,labels,comments,createdAt > issues-<date>.json` and keep the file beside the public bundle. Release files are rebuilt from their tags.

**Why.** A rollback point, and the private archive's last state. Once E2–E4 run, GitHub would otherwise hold the only copy that isn't on the development Mac.

**Depends on.** Stages A–D.

**Verify.**
- `git bundle verify` passes on both copies of the bundle.
- On the hardware-test Mac, `git -C ~/Backups/x5dr-editor-private.git log --oneline -3` matches `main`, and `git tag` includes `pre-public-cut`.

**Decision.** Owner confirms the backup locations. Recommended: the hardware-test Mac, plus one off-machine copy (Archive #216).

### E2. Rename the private repo

**What.**
- `gh repo rename x5dr-editor-private` (or Settings → Rename). It stays **private**.
- In the old local folder: `git remote set-url origin git@github.com:Baylo1/x5dr-editor-private.git`.
- Optional: Settings → Archive the repo (read-only) once E6 succeeds.
- **Hardware-test Mac:** retire the old working clone before the rename. Delete the folder, or rename it (e.g. `x5dr-editor-OLD`) and delete it after E6. After E4 its `origin` would point at the new public repo, whose history is unrelated. If Live Server pointed at that folder, point it at the unzipped CI artifact folder instead. A fresh working clone, if wanted, comes after E5: `git clone https://github.com/Baylo1/x5dr-editor.git` (no login needed). Keep it separate from the `~/Backups/` mirror, which is never worked in.

**Why.** Frees the `x5dr-editor` name, so the app's `REPO_URL`, `package.json` and the Pages URL are unchanged (D1, D6). Creating a new repo with the old name deliberately overrides GitHub's rename redirect.

**Depends on.** E1.

**Verify.** `gh repo view Baylo1/x5dr-editor-private --json visibility` → PRIVATE.

**Decision.** None.

### E3. Email privacy settings

**What.**
- GitHub → Settings → Emails: tick **Keep my email addresses private** and **Block command line pushes that expose my email**.
- `git config --global user.email 72567542+Baylo1@users.noreply.github.com`. Global, so every future repo is covered.
- **Hardware-test Mac:** don't commit from it. If it ever must, set the same noreply `user.email` there first, or GitHub will reject the push.

**Why.** D1. From now on, nothing pushed can carry the personal email address.

**Depends on.** E1. After this, pushes of old commits authored with the personal email address to the private repo are blocked, which is fine because it's frozen.

**Verify.** `git config user.email` shows the noreply address; a test commit's `git log -1 --format=%ae` matches.

**Decision.** None.

### E4. Create the public repo (single initial commit)

**What.**
1. **Working-copy location.** Recommended: `~/Developer/x5dr-editor`, outside iCloud. That ends the git-hang problem (Landmine #95, which can then be retired). The Claude Code project memory is keyed to the folder path, so it would need a one-time copy.
2. `mkdir` the folder, then extract only the allowlist from the private repo with the two `git archive` commands in §10.
3. Check the folder against §10: nothing extra, nothing missing.
4. `git init -b main`; `npm install`; `npx vitest run`; `npm run build`.
5. Run the leak checks (below).
6. `git add -A`; `git commit -m "X5DR Editor v1.0.0 — initial public commit"`.
7. `gh repo create Baylo1/x5dr-editor --private --source . --push`. Create it private first; it is flipped to public in E5.

**Leak checks (step 5):**
- `grep -rIl -i -E -f "<private archive>/Setup Instructions/public-scrub-terms.txt" --exclude-dir=node_modules --exclude-dir=dist .` (the term file stays private; Archive #214). It must list only the four expected files in §10's dry run; read any new match before going on.
- `find . -path ./node_modules -prune -o \( -iname '*.pdf' -o -iname '*_X5D.syx' -o -iname '*SendCD*' -o -name 'X5dr Factory Sounds.syx' \) -print` must print nothing.
- `ls "Setup Instructions" "Reference Images"` fails (folders absent)

Also run `npx gitleaks detect` (or `trufflehog filesystem .`) on the single commit.

**Why.** D1: no history means no email in history and no old objects reachable by hash.

**Depends on.** E2, E3.

**Verify.**
- `git log --format='%ae %ce'` → noreply only.
- Files match the allowlist.
- Tests pass and the build passes on the fresh clone.
- The repo is small (expect a few MB).

**Decision.** Owner confirms the working-copy location (recommended: outside iCloud). The old Desktop folder then becomes the private archive checkout.

### E5. Configure the repo and go public

**What.**
- Ruleset on `main`: no force-push, no deletion. Requiring PRs is optional for a solo project; recommended **off**, so you can still push docs directly.
- Issues on; Discussions, Wiki and Projects off (D14).
- Description, topics (`korg`, `x5dr`, `05rw`, `web-midi`, `sysex`, `synthesizer`, `editor`), social preview image (from B1/C3).
- Dependabot alerts, secret scanning and private vulnerability reporting on.
- Labels: `bug`, `device-report`, `enhancement`, `needs-info`, `v1.1`.
- **Flip visibility to public.**
- Settings → Pages → Source: **GitHub Actions**.

**Why.** Pages on the free plan needs a public repo. Last chance to stop before exposure.

**Depends on.** E4.

**Verify.**
- The anonymous view (a logged-out browser) shows only the allowlisted files.
- README links resolve (re-check C3).
- `ci.yml` runs green on the public repo.

**Decision.** Owner flips visibility, a final go/no-go.

### E6. Release `v1.0.0`

*Amended 2026-10-15 (owner, Archive #228): was the unannounced `v1.0.0-rc.1` pre-release; Stage F is complete, so this is the 1.0.0 release (formerly G1). The version bump to `1.0.0` (`package.json`, `package-lock.json`, `APP_VERSION`) and the CHANGELOG entry are already merged.*

**What.**
- In `CHANGELOG.md`, replace "unreleased" in the `[1.0.0]` heading with the release date; commit and push `main`.
- `git tag v1.0.0` and push the tag.
- `gh release create v1.0.0 --notes-file <CHANGELOG excerpt>` (**not** `--prerelease`). `deploy.yml` runs.
- Close the Phase 4 checkboxes in the Project Plan.

**Why.** D7. The live URL now serves 1.0.0. It stays unannounced until E7 has passed and G2–G3 are done.

**Depends on.** E5.

**Verify.**
- The workflow is green, and `dist/index.html` is attached to the Release.
- `https://baylo1.github.io/x5dr-editor/` loads: About shows `1.0.0` (with no pre-release line), the manifest loads, the MIDI/SysEx prompt appears, and Help links (repo, Issues template chooser, email) work.

**Backup (E1 policy).** First public-repo backup. The repo is public now, so the hardware-test Mac needs no login:
- `git clone --mirror https://github.com/Baylo1/x5dr-editor.git ~/Backups/x5dr-editor.git`
- `git -C ~/Backups/x5dr-editor.git bundle create x5dr-editor-v1.0.0.bundle --all`, then copy the bundle to the off-machine copy.

**Decision.** Owner publishes the Release (CLAUDE.md: only the owner publishes Releases).

### E7. Fresh-machine / first-run pass

**What.** On the **second Mac (new Chrome profile)** and the **Windows PC with the X5DR**, from the Pages URL:
1. The SysEx permission prompt appears; check both allow and deny.
2. Getting Started auto-opens on first launch and stays dismissed after reload.
3. Port auto-select, or manual choice on Windows.
4. Import From Device, a live edit, Write In Place.
5. **Install as app** from Pages (second half of the task-list PWA task): Dock/Start Menu icon, title bar, then uninstall.
6. If offered: download the Release's `index.html` and run it over `file://`.
7. Report a Problem and Copy Diagnostics.

Note every point of friction.

**Why.** Task-list item "Test on a clean machine". Your own machine has every permission and preference already set.

**Depends on.** E6.

**Verify.** Owner; results in an Archive entry. Friction goes to D3-style wording fixes, which ship as `v1.0.1` (before the announcement) if needed.

**Decision.** None.

---

## 8. Stages F–H — Beta, release, announcement, after release

### F. RC beta — complete (owner, 2026-10-15, Archive #228)

The owner considers rc.1 testing complete: the RC tester's pre-release feedback (Brave on Linux) was triaged and folded into the code by D4 (Archive #223), and D2 covered Windows (Archive #227). No public `rc` is released and no beta invitations go out.
- **F1 (invitations)** — dropped. Owners of an X5, X5D or 05R/W are reached through the announcement (G3) and the device-report template; reports update the README table (G4). Asking the identified user for permission to publish their file stays in H2.
- **F2 (triage and fix)** — becomes the post-release routine (G4). Fixes found after E6 ship as `v1.0.x`.

### G1. Release `v1.0.0` — folded into E6

The bump to `1.0.0` and the CHANGELOG entry are merged (Archive #228); tagging and publishing the Release, and closing the Project Plan's Phase 4 checkboxes, are now E6. An installed app picks up later releases on relaunch (no service worker).

### G2. Demo video

**What.** A 1–2 minute screen recording with device audio:
- connect;
- Import From Device;
- turn a knob → hear the change;
- envelope drag;
- Patch Browser audition;
- Write.

Upload to YouTube; embed a link and GIF in the README.

**Why.** D13. A hardware editor is most convincing when you can hear it.

**Depends on.** E6 (shows the released version). It can be recorded before E6 if the UI is stable.

**Verify.** Owner review.

**Decision.** Owner records it; it's the owner's channel and voice.

### G3. Announce

**What.** One post per channel, with a screenshot or GIF, the live URL, supported/untested models, a feedback request and the video link. Before posting, **check each venue is still active** and read its self-promotion rules:
- Korg-specific forums and owner groups (KORG Forums legacy sections; X5DR/05R/W or AI² groups you know of).
- Gearspace (Electronic Music Instruments).
- Vintage Synth Explorer forum.
- KVR.
- r/synthesizers and r/Korg.

Draft the post text once, adapt per venue, and keep the drafts in `docs/` (public) or private notes.

**Why.** D13.

**Depends on.** E6, E7, G2.

**Verify.** Posts live; links work.

**Decision.** Owner posts; it's your accounts and voice. I can draft the text.

### G4. Feedback routine

**What.**
- Watch the repo (Issues), and set a weekly triage habit (e.g. a repeating task in the owner's task list).
- Copy emailed reports into Issues; reply on the Issue so the thread stays in one place.
- Label `needs-info` when waiting on a reporter, and close stale `needs-info` issues after about 30 days.
- Device reports update the README "Supported devices" table.
- **Weekly, with triage:** on the hardware-test Mac, `git -C ~/Backups/x5dr-editor.git remote update --prune`, plus the Issues export (E1 policy).
- **At each release:** a new `x5dr-editor-vX.Y.Z.bundle` to the off-machine copy. Keep the last few, and always keep the bundles for `v1.0.0` and `pre-public-cut`.

**Why.** D14; backups per the E1 policy.

**Decision.** None.

### H1. Housekeeping after 1.0.0

- Archive the private repo read-only on GitHub. Its E1 bundle and the hardware-test Mac mirror stay the offline copies; check that `git bundle verify` still passes.
- Mark the task list's "PHASE 4" complete. Create a "v1.1" task-list group from H2.
- Progress Log: Current Status → released; Next Actions → v1.1.
- Retire Landmine #95 if the working copy moved out of iCloud (E4). *(Done 2026-10-15, Archive #230.)*

### H2. v1.1 backlog (from D11 and the Progress Log)

- Librarian (ADR-0001).
- Undo (via the `setParam` gateway).
- Spontaneous device dumps and state surviving refresh.
- Keyboard accessibility review.
- Donation/support links (the private `add-support-links.md`; `.github/FUNDING.yml`).
- Optional service worker / offline install.
- Multisound Solo: in Double mode, silence one oscillator on the device only (never in the store), and restore it on unmute (Archive #225).
- Scoped Multi/Global/Drums "Write All".
- Single-click Program Browser audition.
- Device menu (Import From Device / Write To Device) as a checkbox dialog, matching FILE's "Data File…" (Archive #204).
- Copy Effects tab labels / CONFIG flush (#71).
- `<identified user>_X5D.syx` back in, if permission is given.
- **Random patch generator** (owner, 2026-10-12): a Randomize modal for the Easy tab's panels, with bounded ranges and "Back to previous" (Archive #225).
- **AI patch generation** (owner, 2026-10-12): first Export/Import Patch as JSON plus an "AI patch kit" for any AI chat; later, perhaps an in-editor chat tab (Archive #226).
- **Rudimentary keyboard** (owner, from the task list): send Note On/Off so modules can be auditioned without a DAW.
- **Detect the connected model and filter sounds automatically** (owner, 2026-10-09): the Device Member Code in SysEx replies (`14` X5DR, `09` X5, `00` 05R/W; X5D to confirm) could drive the "Hide X5D/X5DR-only sounds" setting without the user ticking it (Archive #222).

---

## 9. Task list "PHASE 4 — Distribution & Release"

**Restructured 2026-10-05.** The owner's task list now mirrors this plan, so there is one list:
- PHASE 4 holds eight action groups, **Stage A … Stage H**.
- Each group holds **one task per step**, named with the step ID (e.g. "A1 — Single-file build (branch build/single-file)"). Each task's note points to its section here.
- Each stage group is sequential. PHASE 4 itself is parallel, so B1 and C1 can run alongside Stage A.
- When a step is done, tick its task. Change scope here first, then mirror it in the task list.

The tasks open before the restructure were **dropped**, not deleted (they can be restored in the task list). Their content now lives in these steps:

| Former task-list task | Now | Status |
|---|---|---|
| Set up GitHub repository and GitHub Pages hosting | E2–E6 (A3 for the workflows) | Dropped |
| Write user-facing README and setup documentation | C3 (its IAC/loopMIDI/MIDIflow note is obsolete: the editor talks to the interface directly) | Dropped |
| Update Help menu to describe installing locally / web app / website | C2 | Dropped |
| Update getting started if file can be run locally | A2 → C2 | Dropped |
| Get an identified user's email address | F1 (beta invite + fixture permission); F dropped 2026-10-15, fixture permission in H2 | Dropped |
| Test on a clean machine and tag v1.0 release | E7, E6 (G1 folded in, 2026-10-15) | Dropped |
| Design and add real app icons for manifest.json | B1 | Dropped |
| Decide: manifest external vs `data:` URI | Decided: external (D10) | **Completed** |
| Verify `file://` works for `dist/index.html` (Web MIDI + SysEx) | A2 | Dropped |
| Test installing the PWA from local server and Pages URL | B2 (local), E7 (Pages) | Dropped |
| MIT licence; merge titlebar-theme-color | — | Already done |

---

## 10. Publish list (final, C5 — Archive #215)

*Finalised 2026-10-07 against the tracked tree of `main` at `4fffdb6` (C4 merged), pending the owner's sign-off. Anything not listed here stays private, including files added later: a new path joins the public repo only by being added to this list.*

**Include (exact paths):**
- **Root files:** `.gitignore`, `LICENSE`, `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `package.json`, `package-lock.json`.
- **`.claude/launch.json`** only (not the rest of `.claude/`).
- **`src/`, all of it:** `index.html`, `manifest.json`, `midi/` and `state/` (modules and tests), `ui/`, `fonts/` (3 WOFF2 plus 2 OFL texts), `icons/` (10 files, including `README.md`, `icon-master.svg` and `social-preview-1280x640.png`; the social preview is uploaded in E5). No `src/__h_*.html` harness or `src/index-phase1.html` is tracked any more, so the earlier exclusion has nothing to act on.
- **`scripts/`:** `build.mjs`, `build.test.js`, `screenshots.mjs`.
- **`.github/`:** `workflows/ci.yml`, `workflows/deploy.yml`, and `ISSUE_TEMPLATE/` (`bug_report.md`, `device_report.md`, `feature_request.md`, `config.yml`).
- **`reference_sysex/`:** only the four hardware captures, which are the only `.syx` files any test or script reads:
  - `X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx`
  - `X5dr Factory Sounds - Hardware Capture 2026-09-29 (Multi Expansion).syx`
  - `Factory B Bank Pt 1 dump.syx`
  - `Factory B Bank Pt 2 dump.syx`
- **`docs/`:**
  - `X5DR_Editor_Progress_Log.md`, `X5DR_Editor_Project_Context.md`, `X5DR_Editor_Landmines.md`, `X5DR_Editor_Decision_Archive.md`, `X5DR_Editor_Project_Plan.md`, `X5DR_Editor_Release_Plan.md`, `X5DR_Editor_Effect_Parameter_Table_Transcription.md`;
  - `adr/` (ADR-0001 to ADR-0008);
  - `images/` (`prog-easy.png`, `combi-timbres.png`).
- **`docs/X5DR Manual Appendix - MIDI Implementation/`:** the 10 `*.md` files only, each with its © Korg notice: `00_INDEX.md` to `07_drum_sound_names.md`, `Bank_G_Program_Names.md` and `effect_param_capture_sheet.md`.

**Exclude (private archive only):** everything else. That includes:
- `Setup Instructions/` (including the scrub term file `public-scrub-terms.txt`), `Claude Grill With Docs Instructions/`, `Reference Images/`;
- `.claude/projects/` (two tracked memory files) and `.claude/worktrees/`;
- `docs/design spec docs/`;
- the 7 PDFs in the MIDI appendix folder;
- the three third-party `.syx` files (the identified user's X5D file, `X5DR_SendCD.syx`, the internet `X5dr Factory Sounds.syx`);
- these docs: `Landmines_Full`, `Optimization_Plan`, `Code_Audit_Findings`, `Landmines_Condensation_Proposal`, `Phase3_Design_QA_Punchlist`, `Public_Release_Plan`, and (owner, 2026-10-10) `D2_Checklist` and `Sound_Compat_Draft` — references to them say "private archive", and the Archive's header covers its citations of both (#220, #222);
- untracked or ignored local folders (`S1 Editor/`, `node_modules/`, `dist/`, `.obsidian/`, `.vscode/`), which `git archive` never includes.

**Extraction for E4** (replaces "archive everything, then delete"): run from the private checkout into an empty folder.

```bash
git archive main src scripts .github .gitignore LICENSE README.md CHANGELOG.md CONTRIBUTING.md CLAUDE.md package.json package-lock.json .claude/launch.json "reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx" "reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (Multi Expansion).syx" "reference_sysex/Factory B Bank Pt 1 dump.syx" "reference_sysex/Factory B Bank Pt 2 dump.syx" docs/X5DR_Editor_Progress_Log.md docs/X5DR_Editor_Project_Context.md docs/X5DR_Editor_Landmines.md docs/X5DR_Editor_Decision_Archive.md docs/X5DR_Editor_Project_Plan.md docs/X5DR_Editor_Release_Plan.md docs/X5DR_Editor_Effect_Parameter_Table_Transcription.md docs/adr docs/images | tar -x -C <new folder>
```

```bash
git ls-files -z "docs/X5DR Manual Appendix - MIDI Implementation/*.md" | xargs -0 git archive main | tar -x -C <new folder>
```

**Dry run (C5, 2026-10-07)**, into a scratch folder with the commands above:
- 90 files.
- `npx vitest run`: 474/474 across 14 files.
- `npm run build`: `dist/index.html` 948 KB, 11 modules.
- The E4 `find` for PDFs and third-party `.syx` files returns nothing.
- The scrub-term grep matches only four files, all expected:
  - `.gitignore` (`.obsidian/`, kept by the owner);
  - `X5DR_Editor_Decision_Archive.md` and `X5DR_Editor_Release_Plan.md`, which name `/Users/` as a search term in prose;
  - `src/index.html`, a chance match inside the base64 factory-bank data.

  E4 compares its result against this list rather than expecting an empty result.

**Doc cross-references to excluded files:** fixed in C4 (Archive #214); each now says "private archive".
