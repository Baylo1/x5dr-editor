import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './store.js';

const sampleSnapshot = {
  programs: [
    { name: 'Init Program', osc: { mode: 0 }, osc1: { level: 50 } },
    { name: 'Patch Two',    osc: { mode: 1 }, osc1: { level: 75 } },
  ],
  combis: null,
  global: null,
  drums: null,
  multi: null,
  sources: { programs: 'test.syx', combis: null, global: null, drums: null, multi: null },
};

const sampleSnapshotWithCombis = {
  ...sampleSnapshot,
  combis: [
    { name: 'Combi One', timbres: [] },
    { name: 'Combi Two', timbres: [] },
  ],
};

describe('createStore', () => {
  let store;

  beforeEach(() => {
    store = createStore();
  });

  describe('loadSnapshot', () => {
    it('creates a deep clone — mutating original does not affect working copy', () => {
      const snap = JSON.parse(JSON.stringify(sampleSnapshot));
      store.loadSnapshot(snap);
      snap.programs[0].name = 'MUTATED';
      expect(store.getParam('programs.0.name')).toBe('Init Program');
    });

    it('clears dirty params on load', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc.mode', 2);
      store.loadSnapshot(sampleSnapshot);
      expect(store.isDirty()).toBe(false);
    });
  });

  describe('getParam', () => {
    it('reads a top-level value', () => {
      store.loadSnapshot(sampleSnapshot);
      expect(store.getParam('programs.0.name')).toBe('Init Program');
    });

    it('reads a nested value', () => {
      store.loadSnapshot(sampleSnapshot);
      expect(store.getParam('programs.0.osc.mode')).toBe(0);
    });

    it('reads an array element by index', () => {
      store.loadSnapshot(sampleSnapshot);
      expect(store.getParam('programs.1.osc1.level')).toBe(75);
    });

    it('returns undefined for a missing path', () => {
      store.loadSnapshot(sampleSnapshot);
      expect(store.getParam('programs.0.nonexistent')).toBeUndefined();
    });

    it('returns undefined if no snapshot loaded', () => {
      expect(store.getParam('programs.0.name')).toBeUndefined();
    });
  });

  describe('setParam', () => {
    it('updates the working copy', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc.mode', 2);
      expect(store.getParam('programs.0.osc.mode')).toBe(2);
    });

    it('adds path to dirtyParams', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc1.level', 99);
      expect(store.getDirtyParams().has('programs.0.osc1.level')).toBe(true);
    });

    it('returns previousValue and newValue', () => {
      store.loadSnapshot(sampleSnapshot);
      const result = store.setParam('programs.0.osc1.level', 99);
      expect(result.previousValue).toBe(50);
      expect(result.newValue).toBe(99);
    });

    it('throws if no snapshot loaded', () => {
      expect(() => store.setParam('programs.0.name', 'X')).toThrow();
    });
  });

  describe('isDirty', () => {
    it('returns false on fresh load', () => {
      store.loadSnapshot(sampleSnapshot);
      expect(store.isDirty()).toBe(false);
    });

    it('returns true after setParam', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc.mode', 1);
      expect(store.isDirty()).toBe(true);
    });

  });

  describe('getCleanProgram', () => {
    it('returns the original program data', () => {
      store.loadSnapshot(sampleSnapshot);
      expect(store.getCleanProgram(0).name).toBe('Init Program');
    });

    it('is not affected by setParam calls', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.name', 'CHANGED');
      expect(store.getCleanProgram(0).name).toBe('Init Program');
    });

    it('returns null if no snapshot loaded', () => {
      expect(store.getCleanProgram(0)).toBeNull();
    });
  });

  describe('revertProgram', () => {
    it('restores workingCopy program to clean state', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc.mode', 2);
      store.setParam('programs.0.osc1.level', 99);
      store.revertProgram(0);
      expect(store.getParam('programs.0.osc.mode')).toBe(0);
      expect(store.getParam('programs.0.osc1.level')).toBe(50);
    });

    it('clears dirty paths for the reverted program', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc.mode', 2);
      store.setParam('programs.0.osc1.level', 99);
      store.revertProgram(0);
      expect(store.getDirtyParams().has('programs.0.osc.mode')).toBe(false);
      expect(store.getDirtyParams().has('programs.0.osc1.level')).toBe(false);
    });

    it('does not affect dirty paths for other programs', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc.mode', 2);
      store.setParam('programs.1.osc.mode', 2);
      store.revertProgram(0);
      expect(store.getDirtyParams().has('programs.1.osc.mode')).toBe(true);
    });

    it('leaves isDirty true if other programs still dirty', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc.mode', 2);
      store.setParam('programs.1.osc.mode', 2);
      store.revertProgram(0);
      expect(store.isDirty()).toBe(true);
    });

    it('sets isDirty false when the only dirty program is reverted', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc.mode', 2);
      store.revertProgram(0);
      expect(store.isDirty()).toBe(false);
    });
  });

  describe('replaceProgram', () => {
    it('bulk-replaces the working copy program at the given index', () => {
      store.loadSnapshot(sampleSnapshot);
      store.replaceProgram(1, { name: 'Imported', osc: { mode: 2 }, osc1: { level: 10 } });
      expect(store.getParam('programs.1.name')).toBe('Imported');
      expect(store.getParam('programs.1.osc.mode')).toBe(2);
    });

    it('deep clones the replacement data — mutating the original does not affect the working copy', () => {
      store.loadSnapshot(sampleSnapshot);
      const incoming = { name: 'Imported', osc: { mode: 2 }, osc1: { level: 10 } };
      store.replaceProgram(1, incoming);
      incoming.name = 'MUTATED';
      expect(store.getParam('programs.1.name')).toBe('Imported');
    });

    it('does not affect other programs', () => {
      store.loadSnapshot(sampleSnapshot);
      store.replaceProgram(1, { name: 'Imported', osc: { mode: 2 }, osc1: { level: 10 } });
      expect(store.getParam('programs.0.name')).toBe('Init Program');
    });

    it('does not touch dirtyParams', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc.mode', 1);
      store.replaceProgram(1, { name: 'Imported', osc: { mode: 2 }, osc1: { level: 10 } });
      expect(store.getDirtyParams().has('programs.0.osc.mode')).toBe(true);
      expect(store.getDirtyParams().has('programs.1.name')).toBe(false);
    });

    it('throws if no snapshot loaded', () => {
      expect(() => store.replaceProgram(0, { name: 'X' })).toThrow();
    });
  });

  describe('commitProgram', () => {
    it('bulk-replaces the working copy program at the given index', () => {
      store.loadSnapshot(sampleSnapshot);
      store.commitProgram(1, { name: 'Written', osc: { mode: 2 }, osc1: { level: 10 } });
      expect(store.getParam('programs.1.name')).toBe('Written');
    });

    it('also updates the clean baseline, unlike replaceProgram', () => {
      store.loadSnapshot(sampleSnapshot);
      store.commitProgram(1, { name: 'Written', osc: { mode: 2 }, osc1: { level: 10 } });
      expect(store.getCleanProgram(1).name).toBe('Written');
    });

    it('clears dirty paths for the committed program', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.0.osc.mode', 2);
      store.commitProgram(0, { name: 'Init Program', osc: { mode: 2 }, osc1: { level: 50 } });
      expect(store.getDirtyParams().has('programs.0.osc.mode')).toBe(false);
      expect(store.isDirty()).toBe(false);
    });

    it('does not affect dirty paths for other programs', () => {
      store.loadSnapshot(sampleSnapshot);
      store.setParam('programs.1.osc.mode', 2);
      store.commitProgram(0, { name: 'Init Program', osc: { mode: 0 }, osc1: { level: 50 } });
      expect(store.getDirtyParams().has('programs.1.osc.mode')).toBe(true);
    });

    it('a later edit+revert on the committed slot reverts to the just-committed data, not the pre-commit baseline', () => {
      store.loadSnapshot(sampleSnapshot);
      store.commitProgram(1, { name: 'Written', osc: { mode: 2 }, osc1: { level: 10 } });
      store.setParam('programs.1.name', 'Renamed');
      store.revertProgram(1);
      expect(store.getParam('programs.1.name')).toBe('Written');
    });

    it('deep clones so workingCopy and cleanSnapshot never share a reference', () => {
      store.loadSnapshot(sampleSnapshot);
      const incoming = { name: 'Written', osc: { mode: 2 }, osc1: { level: 10 } };
      store.commitProgram(1, incoming);
      incoming.name = 'MUTATED';
      expect(store.getParam('programs.1.name')).toBe('Written');
      expect(store.getCleanProgram(1).name).toBe('Written');
    });

    it('throws if no snapshot loaded', () => {
      expect(() => store.commitProgram(0, { name: 'X' })).toThrow();
    });
  });

  describe('replaceCombi', () => {
    it('bulk-replaces the working copy combi at the given index', () => {
      store.loadSnapshot(sampleSnapshot);
      store.replaceCombi(1, { name: 'Imported', timbres: [] });
      expect(store.getParam('combis.1.name')).toBe('Imported');
    });

    it('creates a 100-slot combis array when combis was null', () => {
      store.loadSnapshot(sampleSnapshot);
      expect(store.getParam('combis')).toBeNull();
      store.replaceCombi(5, { name: 'Imported', timbres: [] });
      expect(store.getParam('combis.5.name')).toBe('Imported');
      expect(store.getParam('combis.0')).toBeNull();
    });

    it('deep clones the replacement data — mutating the original does not affect the working copy', () => {
      store.loadSnapshot(sampleSnapshot);
      const incoming = { name: 'Imported', timbres: [] };
      store.replaceCombi(1, incoming);
      incoming.name = 'MUTATED';
      expect(store.getParam('combis.1.name')).toBe('Imported');
    });

    it('does not affect other combi slots', () => {
      store.loadSnapshot(sampleSnapshot);
      store.replaceCombi(1, { name: 'Imported', timbres: [] });
      expect(store.getParam('combis.0')).toBeNull();
    });

    it('throws if no snapshot loaded', () => {
      expect(() => store.replaceCombi(0, { name: 'X' })).toThrow();
    });
  });

  describe('commitCombi', () => {
    it('bulk-replaces the working copy combi at the given index', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.commitCombi(1, { name: 'Written', timbres: [] });
      expect(store.getParam('combis.1.name')).toBe('Written');
    });

    it('also updates the clean baseline, unlike replaceCombi', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.commitCombi(1, { name: 'Written', timbres: [] });
      expect(store.getCleanCombi(1).name).toBe('Written');
    });

    it('creates a 100-slot combis array when combis was null', () => {
      store.loadSnapshot(sampleSnapshot);
      store.commitCombi(5, { name: 'Written', timbres: [] });
      expect(store.getParam('combis.5.name')).toBe('Written');
      expect(store.getCleanCombi(5).name).toBe('Written');
    });

    it('clears dirty paths for the committed combi', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.setParam('combis.0.name', 'CHANGED');
      store.commitCombi(0, { name: 'Written', timbres: [] });
      expect(store.getDirtyParams().has('combis.0.name')).toBe(false);
      expect(store.isDirty()).toBe(false);
    });

    it('does not affect dirty paths for other combis', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.setParam('combis.1.name', 'CHANGED');
      store.commitCombi(0, { name: 'Written', timbres: [] });
      expect(store.getDirtyParams().has('combis.1.name')).toBe(true);
    });

    it('a later edit+revert on the committed slot reverts to the just-committed data, not the pre-commit baseline', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.commitCombi(1, { name: 'Written', timbres: [] });
      store.setParam('combis.1.name', 'Renamed');
      store.revertCombi(1);
      expect(store.getParam('combis.1.name')).toBe('Written');
    });

    it('deep clones so workingCopy and cleanSnapshot never share a reference', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      const incoming = { name: 'Written', timbres: [] };
      store.commitCombi(1, incoming);
      incoming.name = 'MUTATED';
      expect(store.getParam('combis.1.name')).toBe('Written');
      expect(store.getCleanCombi(1).name).toBe('Written');
    });

    it('throws if no snapshot loaded', () => {
      expect(() => store.commitCombi(0, { name: 'X' })).toThrow();
    });
  });

  describe('getCleanCombi', () => {
    it('returns the original combi data', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      expect(store.getCleanCombi(0).name).toBe('Combi One');
    });

    it('is not affected by setParam calls', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.setParam('combis.0.name', 'CHANGED');
      expect(store.getCleanCombi(0).name).toBe('Combi One');
    });

    it('returns null if no snapshot loaded', () => {
      expect(store.getCleanCombi(0)).toBeNull();
    });
  });

  describe('revertCombi', () => {
    it('restores workingCopy combi to clean state', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.setParam('combis.0.name', 'CHANGED');
      store.revertCombi(0);
      expect(store.getParam('combis.0.name')).toBe('Combi One');
    });

    it('clears dirty paths for the reverted combi', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.setParam('combis.0.name', 'CHANGED');
      store.revertCombi(0);
      expect(store.getDirtyParams().has('combis.0.name')).toBe(false);
    });

    it('does not affect dirty paths for other combis', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.setParam('combis.0.name', 'CHANGED');
      store.setParam('combis.1.name', 'ALSO CHANGED');
      store.revertCombi(0);
      expect(store.getDirtyParams().has('combis.1.name')).toBe(true);
    });

    it('leaves isDirty true if other combis still dirty', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.setParam('combis.0.name', 'CHANGED');
      store.setParam('combis.1.name', 'ALSO CHANGED');
      store.revertCombi(0);
      expect(store.isDirty()).toBe(true);
    });

    it('sets isDirty false when the only dirty combi is reverted', () => {
      store.loadSnapshot(sampleSnapshotWithCombis);
      store.setParam('combis.0.name', 'CHANGED');
      store.revertCombi(0);
      expect(store.isDirty()).toBe(false);
    });
  });

  describe('replaceMulti', () => {
    it('sets workingCopy.multi when it was null', () => {
      store.loadSnapshot(sampleSnapshot);
      store.replaceMulti({ effects: { eff1Type: 1 }, tracks: [{ programNo: 0 }] });
      expect(store.getParam('multi.effects.eff1Type')).toBe(1);
      expect(store.getParam('multi.tracks.0.programNo')).toBe(0);
    });

    it('merges effects-only data without wiping previously-loaded tracks (two independent dump messages)', () => {
      store.loadSnapshot(sampleSnapshot);
      store.replaceMulti({ effects: { eff1Type: 1 }, tracks: [{ programNo: 0 }] });
      store.replaceMulti({ effects: { eff1Type: 2 } }); // tracks key omitted
      expect(store.getParam('multi.effects.eff1Type')).toBe(2);
      expect(store.getParam('multi.tracks.0.programNo')).toBe(0); // preserved
    });

    it('merges tracks-only data without wiping previously-loaded effects', () => {
      store.loadSnapshot(sampleSnapshot);
      store.replaceMulti({ effects: { eff1Type: 1 }, tracks: [{ programNo: 0 }] });
      store.replaceMulti({ tracks: [{ programNo: 5 }] }); // effects key omitted
      expect(store.getParam('multi.effects.eff1Type')).toBe(1); // preserved
      expect(store.getParam('multi.tracks.0.programNo')).toBe(5);
    });

    it('deep clones the replacement data — mutating the original does not affect the working copy', () => {
      store.loadSnapshot(sampleSnapshot);
      const incoming = { effects: { eff1Type: 1 }, tracks: [] };
      store.replaceMulti(incoming);
      incoming.effects.eff1Type = 99;
      expect(store.getParam('multi.effects.eff1Type')).toBe(1);
    });

    it('throws if no snapshot loaded', () => {
      expect(() => store.replaceMulti({ effects: {}, tracks: [] })).toThrow();
    });
  });

  describe('replaceDrums', () => {
    it('sets workingCopy.drums (always a full replace — one Func=52 dump, no per-key merge like replaceMulti)', () => {
      store.loadSnapshot(sampleSnapshot);
      const kits = [{ notes: [{ key: 36 }] }, { notes: [{ key: 38 }] }];
      store.replaceDrums(kits);
      expect(store.getParam('drums.0.notes.0.key')).toBe(36);
      expect(store.getParam('drums.1.notes.0.key')).toBe(38);
    });

    it('deep clones the replacement data — mutating the original does not affect the working copy', () => {
      store.loadSnapshot(sampleSnapshot);
      const kits = [{ notes: [{ key: 36 }] }, { notes: [{ key: 38 }] }];
      store.replaceDrums(kits);
      kits[0].notes[0].key = 99;
      expect(store.getParam('drums.0.notes.0.key')).toBe(36);
    });

    it('throws if no snapshot loaded', () => {
      expect(() => store.replaceDrums([{ notes: [] }, { notes: [] }])).toThrow();
    });
  });
});
