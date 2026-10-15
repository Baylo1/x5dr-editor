import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseSnapshot } from '../midi/parser.js';
import {
  MULTISOUND_COUNT, DRUM_SOUND_COUNT, X5D_FIRST_MULTISOUND, X5D_FIRST_DRUM_SOUND,
  isX5dMultisound, isX5dDrumSound,
  MULTISOUND_CATEGORIES, DRUM_SOUND_CATEGORIES, EFFECT_TYPE_CATEGORIES,
  filterCategoryIndices, drumKitUsesX5dSounds, programUsesX5dSounds, combiUsesX5dSounds,
} from './soundCatalog.js';

function expectPartition(categories, first, count) {
  const seen = new Map();
  for (const cat of categories) {
    for (const i of cat.indices) {
      expect(seen.has(i), `index ${i} is in both "${seen.get(i)}" and "${cat.name}"`).toBe(false);
      seen.set(i, cat.name);
    }
    expect([...cat.indices]).toEqual([...cat.indices].sort((a, b) => a - b));
  }
  for (let i = first; i < count; i++) expect(seen.has(i), `index ${i} has no category`).toBe(true);
  expect(seen.size).toBe(count - first);
}

describe('category lists', () => {
  it('every multisound 000–429 is in exactly one category', () => {
    expectPartition(MULTISOUND_CATEGORIES, 0, MULTISOUND_COUNT);
  });
  it('every drum sound 000–214 is in exactly one category', () => {
    expectPartition(DRUM_SOUND_CATEGORIES, 0, DRUM_SOUND_COUNT);
  });
  it('every effect type 1–47 is in exactly one category', () => {
    expectPartition(EFFECT_TYPE_CATEGORIES, 1, 48);
  });
  it('carries the owner\'s decisions (spot checks)', () => {
    const catOf = (cats, i) => cats.find(c => c.indices.includes(i))?.name;
    expect(catOf(MULTISOUND_CATEGORIES, 340)).toBe('Piano / Keys');        // M1 Piano
    expect(catOf(MULTISOUND_CATEGORIES, 338)).toBe('FX & Loops');          // DJ Kit 1
    expect(catOf(MULTISOUND_CATEGORIES, 397)).toBe('Accordion / Harmonica'); // MouthHarp1
    expect(catOf(DRUM_SOUND_CATEGORIES, 150)).toBe('Latin & Hand Percussion'); // Whistle S
    expect(catOf(DRUM_SOUND_CATEGORIES, 177)).toBe('Cuica, Guiro & Scratch/Zap'); // Scratch a
    expect(catOf(DRUM_SOUND_CATEGORIES, 144)).toBe('Novelty FX');          // Stadium
    expect(catOf(DRUM_SOUND_CATEGORIES, 185)).toBe('Vocal FX');            // COOSH
    expect(DRUM_SOUND_CATEGORIES.map(c => c.name)).not.toContain('Bells, Gongs & Ambient FX');
  });
});

describe('X5D/X5DR-only ranges', () => {
  it('multisounds 340–429, drum sounds 164–214', () => {
    expect(X5D_FIRST_MULTISOUND).toBe(340);
    expect(X5D_FIRST_DRUM_SOUND).toBe(164);
    expect(isX5dMultisound(339)).toBe(false);
    expect(isX5dMultisound(340)).toBe(true);
    expect(isX5dMultisound(429)).toBe(true);
    expect(isX5dMultisound(430)).toBe(false);
    expect(isX5dMultisound(null)).toBe(false);
    expect(isX5dDrumSound(163)).toBe(false);
    expect(isX5dDrumSound(164)).toBe(true);
    expect(isX5dDrumSound(214)).toBe(true);
  });
});

describe('filterCategoryIndices', () => {
  const cats = [
    { name: 'A', indices: [0, 1, 7] },
    { name: 'B', indices: [2, 3] },
    { name: 'C', indices: [4, 5, 6] },
  ];
  it('no selection shows everything from first to count-1', () => {
    expect(filterCategoryIndices({ count: 8, categories: cats })).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(filterCategoryIndices({ first: 1, count: 4, categories: cats })).toEqual([1, 2, 3]);
  });
  it('several selected categories give their union in number order', () => {
    expect(filterCategoryIndices({ count: 8, categories: cats, selected: new Set(['C', 'A']) })).toEqual([0, 1, 4, 5, 6, 7]);
  });
  it('hide removes indices but keeps the current one', () => {
    const hide = i => i >= 5;
    expect(filterCategoryIndices({ count: 8, categories: cats, hide })).toEqual([0, 1, 2, 3, 4]);
    expect(filterCategoryIndices({ count: 8, categories: cats, hide, keep: [6, null] })).toEqual([0, 1, 2, 3, 4, 6]);
    expect(filterCategoryIndices({ count: 8, categories: cats, selected: new Set(['C']), hide, keep: [6] })).toEqual([4, 6]);
  });
});

describe('program and combination marking', () => {
  const kits = [
    { notes: [{ enabled: true, instNo: 10 }, { enabled: false, instNo: 200 }] }, // disabled slot doesn't count
    { notes: [{ enabled: true, instNo: 164 }] },
  ];
  const prog = (mode, ms1, ms2) => ({ osc: { mode }, osc1: { multisound: ms1 }, osc2: { multisound: ms2 } });

  it('drum kits', () => {
    expect(drumKitUsesX5dSounds(kits[0])).toBe(false);
    expect(drumKitUsesX5dSounds(kits[1])).toBe(true);
    expect(drumKitUsesX5dSounds(undefined)).toBe(false);
  });
  it('Single mode looks at OSC-1 only', () => {
    expect(programUsesX5dSounds(prog(0, 10, 400), kits)).toBe(false);
    expect(programUsesX5dSounds(prog(0, 340, 0), kits)).toBe(true);
  });
  it('Double mode looks at both oscillators', () => {
    expect(programUsesX5dSounds(prog(1, 10, 400), kits)).toBe(true);
    expect(programUsesX5dSounds(prog(1, 10, 20), kits)).toBe(false);
  });
  it('Drums mode looks at the User Kit; ROM kits never count', () => {
    expect(programUsesX5dSounds(prog(2, 0), kits)).toBe(false);
    expect(programUsesX5dSounds(prog(2, 1), kits)).toBe(true);
    expect(programUsesX5dSounds(prog(2, 5), kits)).toBe(false);
  });
  it('combinations: an enabled Bank A timbre on a marked program', () => {
    const programs = [prog(0, 10), prog(0, 350)];
    const combi = (timbres) => ({ timbres });
    expect(combiUsesX5dSounds(combi([{ enabled: true, bankG: false, programNo: 1 }]), programs, kits)).toBe(true);
    expect(combiUsesX5dSounds(combi([{ enabled: false, bankG: false, programNo: 1 }]), programs, kits)).toBe(false);
    expect(combiUsesX5dSounds(combi([{ enabled: true, bankG: true, programNo: 1 }]), programs, kits)).toBe(false);
    expect(combiUsesX5dSounds(combi([{ enabled: true, bankG: false, programNo: 0 }]), programs, kits)).toBe(false);
  });
});

describe('factory banks (hardware captures)', () => {
  const ref = (name) => readFileSync(resolve(process.cwd(), 'reference_sysex', name));
  function split(buf) {
    const out = []; let s = -1;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 0xF0) s = i;
      else if (buf[i] === 0xF7 && s >= 0) { out.push(new Uint8Array(buf.subarray(s, i + 1))); s = -1; }
    }
    return out;
  }
  const load = (...files) => parseSnapshot(files.flatMap(f => split(ref(f))));
  const count = (snap) => ({
    programs: snap.programs.filter(p => programUsesX5dSounds(p, snap.drums)).length,
    combis: snap.combis.filter(c => combiUsesX5dSounds(c, snap.programs, snap.drums)).length,
  });

  it('Bank A: 45 programs and 61 combinations use X5D/X5DR-only sounds (Archive #221)', () => {
    const snap = load('X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx',
      'X5dr Factory Sounds - Hardware Capture 2026-09-29 (Multi Expansion).syx');
    expect(count(snap)).toEqual({ programs: 45, combis: 61 });
  });
  it('Bank B (the X5/05R/W set) uses none', () => {
    const snap = load('Factory B Bank Pt 1 dump.syx', 'Factory B Bank Pt 2 dump.syx');
    expect(count(snap)).toEqual({ programs: 0, combis: 0 });
  });
});
