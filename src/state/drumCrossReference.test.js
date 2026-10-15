import { describe, it, expect } from 'vitest';
import { getProgramsUsingKit, buildKitCrossReference } from './drumCrossReference.js';

function makeProgram({ mode = 0, kit = 0 } = {}) {
  return { osc: { mode }, osc1: { multisound: kit } };
}

function makeSnapshot({ programs = [], combis = null, multiTracks = null } = {}) {
  return {
    programs,
    combis,
    multi: multiTracks ? { tracks: multiTracks } : null,
  };
}

describe('getProgramsUsingKit', () => {
  it('returns an empty set when programs is missing', () => {
    expect(getProgramsUsingKit(null, 0)).toEqual(new Set());
    expect(getProgramsUsingKit({}, 0)).toEqual(new Set());
  });

  it('includes only Drums-mode programs whose kit matches', () => {
    const programs = [
      makeProgram({ mode: 2, kit: 0 }), // matches kit 0
      makeProgram({ mode: 2, kit: 1 }), // wrong kit
      makeProgram({ mode: 0, kit: 0 }), // not Drums mode
      makeProgram({ mode: 2, kit: 0 }), // matches kit 0
    ];
    expect(getProgramsUsingKit(makeSnapshot({ programs }), 0)).toEqual(new Set([0, 3]));
  });
});

describe('buildKitCrossReference', () => {
  it('resolves Programs, Combi Timbres, and Multi Tracks that reference the kit (positive case)', () => {
    const programs = [
      makeProgram({ mode: 2, kit: 0 }), // index 0 — qualifies
      makeProgram({ mode: 0, kit: 0 }), // index 1 — does not qualify (not Drums)
    ];
    const combis = [
      { name: 'ComboA', timbres: [{ programNo: 0, bankG: false }] }, // references qualifying program 0
      { name: 'ComboB', timbres: [{ programNo: 1, bankG: false }] }, // references non-qualifying program 1
    ];
    const multiTracks = [
      { programNo: 0, bankG: false }, // track 0 — qualifies
      { programNo: 1, bankG: false }, // track 1 — does not qualify
    ];
    const snap = makeSnapshot({ programs, combis, multiTracks });

    const { programRows, combiRows, multiRows } = buildKitCrossReference(snap, 0);

    expect(programRows).toEqual([{ index: 0 }]);
    expect(combiRows).toEqual([{ index: 0 }]);
    expect(multiRows).toEqual([{ track: 0, programNo: 0 }]);
  });

  it('does not over-include Programs/Combis/Tracks that do not reference the kit (negative case)', () => {
    const programs = [
      makeProgram({ mode: 2, kit: 1 }), // wrong kit
      makeProgram({ mode: 0, kit: 0 }), // wrong mode
    ];
    const combis = [
      { name: 'ComboA', timbres: [{ programNo: 0, bankG: false }] },
    ];
    const multiTracks = [
      { programNo: 1, bankG: false },
    ];
    const snap = makeSnapshot({ programs, combis, multiTracks });

    const { programRows, combiRows, multiRows } = buildKitCrossReference(snap, 0);

    expect(programRows).toEqual([]);
    expect(combiRows).toEqual([]);
    expect(multiRows).toEqual([]);
  });

  it('skips Bank G Timbres/Tracks unconditionally, even when programNo numerically collides with a qualifying Bank A slot', () => {
    const programs = [
      makeProgram({ mode: 2, kit: 0 }), // index 0 qualifies
    ];
    const combis = [
      { name: 'ComboA', timbres: [{ programNo: 0, bankG: true }] }, // Bank G "program 0" — must NOT match Bank A program 0
    ];
    const multiTracks = [
      { programNo: 0, bankG: true },
    ];
    const snap = makeSnapshot({ programs, combis, multiTracks });

    const { combiRows, multiRows } = buildKitCrossReference(snap, 0);

    expect(combiRows).toEqual([]);
    expect(multiRows).toEqual([]);
  });

  it('returns null (not an empty array) for combiRows/multiRows when those categories are not loaded', () => {
    const programs = [makeProgram({ mode: 2, kit: 0 })];
    const snap = makeSnapshot({ programs, combis: null, multiTracks: null });

    const { combiRows, multiRows } = buildKitCrossReference(snap, 0);

    expect(combiRows).toBeNull();
    expect(multiRows).toBeNull();
  });

  it('ignores null combi/track entries within a loaded array without throwing', () => {
    const programs = [makeProgram({ mode: 2, kit: 0 })];
    const combis = [null, { name: 'ComboA', timbres: [{ programNo: 0, bankG: false }] }];
    const multiTracks = [null, { programNo: 0, bankG: false }];
    const snap = makeSnapshot({ programs, combis, multiTracks });

    const { combiRows, multiRows } = buildKitCrossReference(snap, 0);

    expect(combiRows).toEqual([{ index: 1 }]);
    expect(multiRows).toEqual([{ track: 1, programNo: 0 }]);
  });
});
