// DRUMS "used by" cross-reference: which Programs/Combis/Multi use each User Kit.
// Pure (no DOM/MIDI) so the Program No. resolution and Bank G exclusion
// (Landmine #64) are unit-testable.

/**
 * Programs (by index into snap.programs) whose OSC Mode is Drums and whose
 * selected kit (osc1.multisound) matches kitIdx (0 or 1 — User Kit 1/2).
 * @param {object} snap - Snapshot (or null)
 * @param {number} kitIdx
 * @returns {Set<number>}
 */
export function getProgramsUsingKit(snap, kitIdx) {
  const result = new Set();
  if (!snap?.programs) return result;
  snap.programs.forEach((p, i) => {
    if (p?.osc?.mode === 2 && p?.osc1?.multisound === kitIdx) result.add(i);
  });
  return result;
}

/**
 * Resolves which loaded Programs/Combinations/Multi Tracks reference the
 * given User Kit. Combi Timbres and Multi Tracks are resolved one hop
 * through their Program No. — Bank G references are skipped unconditionally
 * (never a match: Bank G's own drum-kit programs G129-G136 ARE the ROM
 * kits, so no Bank G program can reference a User Kit — see Brief #26
 * amendment / Archive #92) rather than treated as unresolvable, but the skip
 * itself is still required: without it a Bank G programNo (0-135) could
 * numerically collide with a real Bank A slot index (0-99) and silently
 * resolve against the wrong program's data, since Bank G program data does
 * not exist in the Snapshot at all (Landmine #50).
 *
 * combiRows/multiRows are `null` when the corresponding category isn't
 * loaded at all (distinct from loaded-but-empty) — callers should render
 * that as "not checked", not "unused" (Brief #26 §3.3).
 *
 * @param {object} snap - Snapshot (or null)
 * @param {number} kitIdx - 0 or 1 (User Kit 1/2)
 * @returns {{ programRows: Array<{index:number}>, combiRows: Array<{index:number}>|null, multiRows: Array<{track:number, programNo:number}>|null }}
 */
export function buildKitCrossReference(snap, kitIdx) {
  const qualifyingPrograms = getProgramsUsingKit(snap, kitIdx);

  const programRows = [...qualifyingPrograms].sort((a, b) => a - b).map(index => ({ index }));

  let combiRows = null;
  if (snap?.combis) {
    combiRows = [];
    snap.combis.forEach((c, i) => {
      if (!c) return;
      const refs = (c.timbres || []).some(t => t && !t.bankG && qualifyingPrograms.has(t.programNo));
      if (refs) combiRows.push({ index: i });
    });
  }

  let multiRows = null;
  if (snap?.multi?.tracks) {
    multiRows = [];
    snap.multi.tracks.forEach((t, i) => {
      if (!t || t.bankG) return;
      if (qualifyingPrograms.has(t.programNo)) {
        multiRows.push({ track: i, programNo: t.programNo });
      }
    });
  }

  return { programRows, combiRows, multiRows };
}
