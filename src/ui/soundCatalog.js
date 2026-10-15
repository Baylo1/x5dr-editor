// Sound and effect-type categories for the browsers' filter pills, and which
// sounds only the X5D and X5DR have (Archive #222).
//
// Source of the X5D/X5DR-only ranges: the combined X5/X5D Owner's Manual —
// the X5 and 05R/W have multisounds 000–339 and drum sounds 000–163; the X5D
// and X5DR add multisounds 340–429 and drum sounds 164–214. Category
// assignments are the owner's (docs/X5DR_Editor_Sound_Compat_Draft.md).
//
// Categories are per-sound index lists, not ranges, so an extended sound can
// sit in an instrument category. Every index belongs to exactly one category
// (soundCatalog.test.js checks it).

export const MULTISOUND_COUNT = 430;
export const DRUM_SOUND_COUNT = 215;
export const X5D_FIRST_MULTISOUND = 340;
export const X5D_FIRST_DRUM_SOUND = 164;

export function isX5dMultisound(i) {
  return Number.isInteger(i) && i >= X5D_FIRST_MULTISOUND && i < MULTISOUND_COUNT;
}

export function isX5dDrumSound(i) {
  return Number.isInteger(i) && i >= X5D_FIRST_DRUM_SOUND && i < DRUM_SOUND_COUNT;
}

// [a, b] inclusive, then any further single indices or [a, b] pairs.
function indices(...parts) {
  const out = [];
  for (const part of parts) {
    if (Array.isArray(part)) {
      for (let i = part[0]; i <= part[1]; i++) out.push(i);
    } else {
      out.push(part);
    }
  }
  return out.sort((a, b) => a - b);
}

export const MULTISOUND_CATEGORIES = [
  { name: 'Piano / Keys',          indices: indices([0, 16], 340) },
  { name: 'Organ',                 indices: indices([17, 35], [341, 344]) },
  { name: 'Accordion / Harmonica', indices: indices([36, 42], [397, 400], 424) },
  { name: 'Guitar',                indices: indices([43, 81], 402) },
  { name: 'Bass',                  indices: indices([82, 105], 345, [348, 351]) },
  { name: 'Mallet / Bell',         indices: indices([106, 124], 352, 353, [372, 374]) },
  { name: 'Winds',                 indices: indices([125, 161], [358, 362]) },
  { name: 'Strings',               indices: indices([162, 171], 346, 347, 390, 391) },
  { name: 'Vocal / Choir',         indices: indices([172, 179], 363, 366) },
  { name: 'Pads / Atmosphere',     indices: indices([180, 187], 364, 365, [369, 371], 375) },
  { name: 'Percussion / Drums',    indices: indices([188, 317], [354, 357], 388, 389, [403, 406], 408, 415) },
  { name: 'Synth Waves',           indices: indices([318, 337], 367, 368, [376, 378], 401) },
  { name: 'FX & Loops',            indices: indices(338, 339, [379, 387], [392, 396], 407, [409, 414], [416, 423], [425, 429]) },
];

export const DRUM_SOUND_CATEGORIES = [
  { name: 'Kick Drums',                      indices: indices([0, 13]) },
  { name: 'Snares, Sticks & Rim',            indices: indices([14, 39], 145, 167) },
  { name: 'Crash/China/Splash Cymbals',      indices: indices([40, 47]) },
  { name: 'Hi-Hats & Ride',                  indices: indices([48, 57], 166) },
  { name: 'Toms',                            indices: indices([58, 64]) },
  { name: 'Latin & Hand Percussion',         indices: indices([65, 95], [147, 151], 196, 207) },
  { name: 'Cuica, Guiro & Scratch/Zap',      indices: indices([96, 108], [177, 179]) },
  { name: 'Tuned Mallet Percussion',         indices: indices([109, 123], 194, 195) },
  { name: 'Bells, Vibes & Chimes',           indices: indices([124, 138], 201, 202) },
  { name: 'Guitar & Spectrum FX',            indices: indices([139, 143], 146) },
  { name: 'Orchestral, Mechanical & Impact', indices: indices([152, 165], [168, 175], 197, 198) },
  { name: 'Vocal FX',                        indices: indices([181, 193]) },
  { name: 'Novelty FX',                      indices: indices(144, 176, 180, 199, 200, [203, 206], [208, 214]) },
];

// Effect types 1–47 (0 = No Effect sits outside the grid).
export const EFFECT_TYPE_CATEGORIES = [
  { name: 'Reverb',               indices: indices([1, 12]) },
  { name: 'Delay',                indices: indices([13, 18]) },
  { name: 'Chorus',               indices: indices([19, 27]) },
  { name: 'Distortion',           indices: indices([28, 31]) },
  { name: 'Phaser',               indices: indices([32, 36]) },
  { name: 'Parametric EQ',        indices: indices(37) },
  { name: 'Combination Serial',   indices: indices([38, 39]) },
  { name: 'Combination Parallel', indices: indices([40, 47]) },
];

/**
 * The indices a browser shows: the union of the selected categories (none
 * selected = every index from `first` to `count - 1`), in number order,
 * minus those `hide` rejects — except the ones in `keep` (the patch's current
 * sound stays visible even when hidden).
 * @param {{ first?: number, count: number, categories: {name: string, indices: number[]}[],
 *   selected?: Set<string>, hide?: (i: number) => boolean, keep?: (number|null|undefined)[] }} opts
 * @returns {number[]}
 */
export function filterCategoryIndices({ first = 0, count, categories, selected = new Set(), hide = null, keep = [] }) {
  let list;
  if (selected.size === 0) {
    list = [];
    for (let i = first; i < count; i++) list.push(i);
  } else {
    const set = new Set();
    for (const cat of categories) {
      if (selected.has(cat.name)) cat.indices.forEach(i => set.add(i));
    }
    list = [...set].sort((a, b) => a - b);
  }
  if (!hide) return list;
  const kept = new Set(keep.filter(Number.isInteger));
  return list.filter(i => kept.has(i) || !hide(i));
}

/** A user drum kit ({ notes: [{ enabled, instNo }] }) uses an X5D/X5DR-only sound. */
export function drumKitUsesX5dSounds(kit) {
  return !!kit?.notes?.some(n => n?.enabled && isX5dDrumSound(n.instNo));
}

/**
 * A program uses an X5D/X5DR-only sound: an oscillator it plays (OSC-1 in
 * Single, both in Double) has a multisound ≥ 340, or it is a Drums-mode
 * program whose User Kit (osc1.multisound 0/1) uses a drum sound ≥ 164.
 * ROM kits (2 and up) are the same on every model.
 * @param {object} program  - a parsed program
 * @param {object[]} drumKits - snapshot.drums (User Kit 1, 2)
 */
export function programUsesX5dSounds(program, drumKits) {
  const mode = program?.osc?.mode;
  if (mode === 0) return isX5dMultisound(program.osc1?.multisound);
  if (mode === 1) return isX5dMultisound(program.osc1?.multisound) || isX5dMultisound(program.osc2?.multisound);
  if (mode === 2) {
    const kit = program.osc1?.multisound;
    return (kit === 0 || kit === 1) && drumKitUsesX5dSounds(drumKits?.[kit]);
  }
  return false;
}

/**
 * A combination uses an X5D/X5DR-only sound through an enabled timbre on a
 * Bank A program that does (Bank G is the same on every model).
 * @param {object} combi
 * @param {object[]} programs - snapshot.programs (Bank A)
 * @param {object[]} drumKits - snapshot.drums
 */
export function combiUsesX5dSounds(combi, programs, drumKits) {
  return !!combi?.timbres?.some(t =>
    t?.enabled && !t.bankG && programUsesX5dSounds(programs?.[t.programNo], drumKits));
}
