# ADR-0008 — Phase 3 Tab Retrofit: The Repeatable Process

**Date:** July 2026
**Status:** Accepted — process followed twice (VDA, Brief 3; VDF, Brief 4), both landed via the same shape. Not yet stress-tested on a tab with materially different structure (Easy, OSC, Control, Effect all remain).
**Scope:** The repeatable *process* by which a pre-Phase-3 tab (still on `numCtrl`/`selCtrl`/ad hoc CSS) gets rebuilt against the shared Phase 3 component library (`src/ui/controls.js`) and color token set — the sequence of documents produced, the non-negotiables every implementation brief carries, and the verification discipline that has twice caught real bugs before they shipped. This document does **not** cover:
- The component taxonomy itself (variants A–H, the EG curve widget, sizing tokens) — that's `X5DR_Editor_Phase3_Control_Component_Spec.md`.
- The color/token layer — that's `X5DR_Editor_Phase3_Color_Token_Spec.md`.
- Any one tab's own field-by-field decisions — those live in that tab's own inventory doc, brief, and the Decision Archive entries citing it (VDA: Archive #94–#103; VDF: Archive #104–#105 plus the not-yet-numbered inventory/brief entries in the 2026-07-25 Decisions Made rows).

*Written after two tabs (VDA, VDF) had gone through the identical process shape, surfacing the same two pitfall categories independently on both — the pattern was worth writing down before a third tab re-derives it, or re-hits either pitfall, from scratch.*

---

## Context

Phase 3's plan (Project Context, "Build Phases") is a tab-by-tab rebuild against a shared component library, not a single big-bang rewrite. VDA (Brief 3) was the pilot; VDF (Brief 4) followed immediately after. Both went through the same five-stage sequence, produced the same shape of documents, and — independently — ran into the same two categories of bug during their respective review passes. That repetition, on only the second tab, is the signal this process is worth fixing in writing now rather than after a third or fourth accidental re-confirmation.

---

## The Process

### 1. Inventory doc (design input, not a brief)

A field-by-field table of every control currently on the tab, its current implementation, and its target component-library variant (A–H, per the Control Component Spec) — written *for Claude Design*, not for Claude Code. Purpose: Claude Design's job becomes placement/grouping/sizing, not inventing what the tab needs or re-deriving the component taxonomy per tab.

**Once a second tab of a similar shape exists, model its inventory doc on the first tab's *shipped* reality, not the first tab's own inventory doc.** VDF's inventory doc cited VDA's actual built layout (KBD/VEL panel grouping, `readoutMode` conventions, the resolved KBD Track Key picker) as settled precedent, rather than re-opening questions VDA's own inventory doc had left open before VDA was built. Every open question in a new inventory doc should be a genuinely new one, not a repeat of one the previous tab already answered.

### 2. Claude Design handoff (README + static HTML reference)

Returned as a canvas/design-reference export (a static HTML file at one point in time, plus a written README of intent and decisions) — not the interactive zip export, which this project tried once and found the HTML+README shape cleaner to work from (see the VDA Design README's own note on this).

**Verify the handoff's own claims before treating it as ground truth**, especially anything about pixel alignment between elements — load it in a browser and check with `getBoundingClientRect()`, not by eye. Both VDA's and VDF's returned mockups made specific alignment claims that held up exactly on inspection, but that was confirmed, not assumed (Landmine #70's "mockup vs. paraphrase" lesson extends to "mockup's own prose vs. the mockup's own rendered pixels" — a design doc's claims about itself still deserve the same skepticism as a brief's paraphrase of someone else's mockup).

### 3. Implementation brief

Written for Claude Code, referencing the inventory doc and the Design handoff as its two source specs. Every Phase 3 tab brief so far has carried the same non-negotiable framing, worth stating explicitly as the standing rule rather than re-deriving per brief:

- **This is a rendering-layer change, not a data-layer change.** Every Parameter Change number and store path is copied forward unchanged; the brief must include the literal param-number tables so implementation and review can both audit against them directly, and the verification plan must include an explicit before/after diff confirming no `sendParamChange` call site's second argument changed.
- **Reuse already-proven shared helpers directly** when a second tab needs identical behavior a prior tab already built as the deliberate Phase-3 replacement for old shared code (e.g. VDF calling VDA's `buildEgTimeModToggles` directly, once VDF had also migrated off the pre-Phase-3 `buildEgTimeMods` both tabs used to share) — this is not the same thing as modifying a still-shared pre-Phase-3 helper in place while another not-yet-migrated tab still depends on it (ADR-0002; ADR-0002 continues to govern the latter case unchanged).
- **Audit cross-tab `data-sync` mirrors explicitly**, not just the tab's own internal wiring. The Easy tab's condensed sections mirror several fields from every Phase-3-eligible tab live, in both directions, via a shared `syncByKey` helper — a tab's brief must enumerate exactly which of its fields are mirrored and confirm the new component's container exposes whatever the sync mechanism needs (`_setValue`, currently — Critical Discovery #100 already made `syncByKey` itself polymorphic across both native `.value` and `_setValue`-exposing elements, so this step is now "wire the right `data-sync` key onto the new element," not "fix the sync helper again").

### 4. Implementation and in-browser verification

Verified against **real data**, not synthetic placeholder values — this project's factory soundbank (`reference_sysex/*.syx`) loaded via a temporary, session-scoped debug hook (exposing just `store`/`renderProgPanel`/`switchTab` behind a URL-gated flag, removed before the session ends) has proven necessary twice: synthetic test data with uniform, convenient values can mask alignment and layout bugs that only appear with a real patch's actual field lengths and value ranges (e.g. "Sustain Level"/"Release Time" wrapping onto two lines only became visible once real label text, not a synthetic guess, was measured).

**Verify layout claims — especially alignment between two elements — at more than one browser-pane width**, not just the width the session happened to be using. `getBoundingClientRect()` comparisons at roughly 1100px/1300px/1500px/1900px is the spot-check this project has settled on. A single-width check cannot distinguish "genuinely fixed" from "coincidentally correct at this width" — see Critical Discovery #104, which is exactly this failure mode.

### 5. Docs update

Per the standing three-file discipline (see the always-read Progress Log's own "How to Use This Document" section, and the memory note it's sourced from): Progress Log (current-state summary only), Decision Archive (append-only, full rationale), `X5DR_Editor_Landmines.md` (only if a Landmine-grade fact emerged — rewrite the existing entry in place with a one-line *Corrected* note if the new finding supersedes it, rather than always minting a new number).

---

## The Two Pitfall Categories (found independently, on both tabs so far)

### A. Mockup-vs-paraphrase drift (Landmine #70)

A written brief or spec's *description* of a mockup is not the mockup. This bit VDA twice in one session (nav-tab pills-vs-underline, Write/Discard Dirty solid-vs-outline) and generalizes to the Design handoff's own prose about itself (§2 above) — always re-check the actual rendered artifact, not a description of it, for anything specific enough to get wrong (shape, case, color, exact alignment).

### B. A control's exact-match sizing requirement fighting a "responsive by default" instinct

VDA's `egCurveWidget` container shipped responsive (Critical Discovery #103) — the reasonable default per Control Component Spec §5/§6. VDF then needed that same widget's width to exactly equal a sibling row's width elsewhere in the same panel, which a responsive/`aspect-ratio` container cannot guarantee at every window width simultaneously (Critical Discovery #104). The fix (fixed dimensions, derived from the same shared tokens the sibling uses) then exposed a second-order bug: a `min-width` converted to a fixed `width` without re-measuring the content it bounds silently wrapped text onto two lines (Critical Discovery #105). See Control Component Spec §6 for the resulting rule.

Both of these are now written down (Landmine #70; Landmine #74 as amended; Control Component Spec §6) specifically so a third tab doesn't rediscover either one the hard way a third time.

---

## Alternatives Considered

- **A horizontal sweep — migrate one control type across every tab at once, rather than one tab fully end-to-end:** rejected before VDA started (Archive, 2026-07-23) — cuts across every scope's own write-behavior/Landmine boundaries (Program/Combi live, Global debounced, Drums direct-write) in a single pass, with no single tab fully reviewable in isolation.
- **A controls-then-layout split within one tab:** rejected — wires new controls into a layout already known to be temporary, guaranteeing rework.
- **Treat each tab's alignment/sizing choices as tab-local, with no shared write-up:** implicitly what happened between VDA and VDF — the same two pitfall categories recurring independently on the very next tab is the direct evidence against this; hence this document.

---

## Consequences

- Any future Phase 3 tab brief (Easy, OSC, Control, Effect) should follow the five-stage sequence above and explicitly check both pitfall categories before implementation, not just during review.
- Control Component Spec §6 is now the authoritative rule for the fixed-vs-responsive sizing question — any new control needing to match a sibling's size should default to fixed-and-token-derived from the start, not discover the need via a second tab's hardware/visual review.
- The temporary-debug-hook-plus-real-factory-data verification pattern (§4) is now expected practice for any tab whose layout depends on real field content (label length, value range) — synthetic placeholder data is insufficient for catching content-driven layout bugs.
- If a third tab's retrofit surfaces a *third* independently-discovered pitfall category, that's the signal to fold it into this document rather than letting the pattern remain implicit again.
