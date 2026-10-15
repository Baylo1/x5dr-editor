// Working copy state store — pure ES module, no DOM references.

// ─── Parameter subscription bus ──────────────────────────────────────────────
const _subscribers = new Map();
let _notifying = false;

export function subscribeTo(path, callback) {
  if (!_subscribers.has(path)) _subscribers.set(path, new Set());
  _subscribers.get(path).add(callback);
}

export function clearAllSubscribers() {
  _subscribers.clear();
}

function _notify(path, value) {
  if (_notifying) return;
  _notifying = true;
  const subs = _subscribers.get(path);
  if (subs) subs.forEach(cb => cb(value));
  _notifying = false;
}

function resolvePath(obj, parts) {
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function setPath(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

export function createStore() {
  let workingCopy = null;
  let cleanSnapshot = null;
  const dirtyParams = new Set();

  return {
    loadSnapshot(snapshot) {
      workingCopy = JSON.parse(JSON.stringify(snapshot));
      cleanSnapshot = JSON.parse(JSON.stringify(snapshot));
      dirtyParams.clear();
    },

    getParam(path) {
      if (workingCopy == null) return undefined;
      return resolvePath(workingCopy, path.split('.'));
    },

    setParam(path, value) {
      if (workingCopy == null) throw new Error('No snapshot loaded');
      const parts = path.split('.');
      const previousValue = resolvePath(workingCopy, parts);
      setPath(workingCopy, parts, value);
      dirtyParams.add(path);
      _notify(path, value);
      return { previousValue, newValue: value };
    },

    // setParam without dirty-marking, for Multi/Global/Drums — they write
    // straight to the device and have no Write/Discard (Landmine #26).
    setParamQuiet(path, value) {
      if (workingCopy == null) throw new Error('No snapshot loaded');
      const parts = path.split('.');
      const previousValue = resolvePath(workingCopy, parts);
      setPath(workingCopy, parts, value);
      _notify(path, value);
      return { previousValue, newValue: value };
    },

    isDirty() {
      return dirtyParams.size > 0;
    },

    getSnapshot() {
      return workingCopy;
    },

    getDirtyParams() {
      return dirtyParams;
    },

    getCleanProgram(index) {
      if (cleanSnapshot == null) return null;
      return cleanSnapshot.programs[index];
    },

    revertProgram(index) {
      if (cleanSnapshot == null || workingCopy == null) return;
      workingCopy.programs[index] = JSON.parse(JSON.stringify(cleanSnapshot.programs[index]));
      for (const path of dirtyParams) {
        if (path.startsWith(`programs.${index}.`)) dirtyParams.delete(path);
      }
    },

    replaceProgram(index, programData) {
      if (workingCopy == null) throw new Error('No snapshot loaded');
      workingCopy.programs[index] = JSON.parse(JSON.stringify(programData));
    },

    // New clean baseline for `index`, after a confirmed device write — unlike
    // replaceProgram, a later Discard reverts to this data (Landmine #113).
    // workingCopy and cleanSnapshot get separate clones, never a shared reference.
    commitProgram(index, programData) {
      if (workingCopy == null) throw new Error('No snapshot loaded');
      workingCopy.programs[index] = JSON.parse(JSON.stringify(programData));
      if (cleanSnapshot) cleanSnapshot.programs[index] = JSON.parse(JSON.stringify(programData));
      for (const path of dirtyParams) {
        if (path.startsWith(`programs.${index}.`)) dirtyParams.delete(path);
      }
    },

    replaceCombi(index, combiData) {
      if (workingCopy == null) throw new Error('No snapshot loaded');
      if (workingCopy.combis == null) workingCopy.combis = new Array(100).fill(null);
      workingCopy.combis[index] = JSON.parse(JSON.stringify(combiData));
    },

    // Combi equivalent of commitProgram.
    commitCombi(index, combiData) {
      if (workingCopy == null) throw new Error('No snapshot loaded');
      if (workingCopy.combis == null) workingCopy.combis = new Array(100).fill(null);
      workingCopy.combis[index] = JSON.parse(JSON.stringify(combiData));
      if (cleanSnapshot) {
        if (cleanSnapshot.combis == null) cleanSnapshot.combis = new Array(100).fill(null);
        cleanSnapshot.combis[index] = JSON.parse(JSON.stringify(combiData));
      }
      for (const path of dirtyParams) {
        if (path.startsWith(`combis.${index}.`)) dirtyParams.delete(path);
      }
    },

    getCleanCombi(index) {
      if (cleanSnapshot == null) return null;
      return cleanSnapshot.combis[index];
    },

    revertCombi(index) {
      if (cleanSnapshot == null || workingCopy == null) return;
      workingCopy.combis[index] = JSON.parse(JSON.stringify(cleanSnapshot.combis[index]));
      for (const path of dirtyParams) {
        if (path.startsWith(`combis.${index}.`)) dirtyParams.delete(path);
      }
    },

    // One Multi Setup; effects and tracks arrive in separate dumps (Func=55/68),
    // so a key missing from multiData keeps its current value.
    replaceMulti(multiData) {
      if (workingCopy == null) throw new Error('No snapshot loaded');
      const existing = workingCopy.multi || { effects: null, tracks: null };
      workingCopy.multi = {
        effects: 'effects' in multiData
          ? JSON.parse(JSON.stringify(multiData.effects))
          : existing.effects,
        tracks: 'tracks' in multiData
          ? JSON.parse(JSON.stringify(multiData.tracks))
          : existing.tracks,
      };
    },

    // Global always arrives whole (Func=51); never loadSnapshot() a Global-only import (Landmine #42).
    replaceGlobal(settings) {
      if (workingCopy == null) throw new Error('No snapshot loaded');
      workingCopy.global = JSON.parse(JSON.stringify(settings));
    },

    // Drums (2 kits) always arrives whole (Func=52).
    replaceDrums(kits) {
      if (workingCopy == null) throw new Error('No snapshot loaded');
      workingCopy.drums = JSON.parse(JSON.stringify(kits));
    },
  };
}
