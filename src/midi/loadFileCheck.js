// FILE → Load file checks. Pure data: index.html shows the boxes.
// - checkDataFile (Load → Data File…, Release Plan C1c): which bank-level types
//   (Programs, Combinations, Multi, Drums, Global) a file holds, complete, and
//   the dumps to parse for each; refuses a file with none.
// - checkLoadFile (Load → Single Program/Combination, audit B12): whether the
//   file matches the item, can still supply it (Cancel/Continue box), or must
//   be refused (OK box).

// Dump Func codes the editor can load.
const F_PROGRAM = 0x40;
const F_COMBI = 0x49;
const F_ALL_PROGRAMS = 0x4C;
const F_ALL_COMBIS = 0x4D;
const F_ALL_DATA = 0x50;
const F_GLOBAL = 0x51;
const F_DRUMS = 0x52;
const F_MULTI_EFFECTS = 0x55;
const F_MULTI_EXPANSION = 0x68;
const DUMP_FUNCS = new Set([
  F_PROGRAM, F_COMBI, F_ALL_PROGRAMS, F_ALL_COMBIS, F_ALL_DATA,
  F_GLOBAL, F_DRUMS, F_MULTI_EFFECTS, F_MULTI_EXPANSION,
]);

// Load menu items, with the label the menu shows.
export const LOAD_ITEM_LABELS = {
  'all-data': 'All Data',
  'all-programs': 'All Programs',
  'all-combis': 'All Combinations',
  '1-program': 'Single Program',
  '1-combi': 'Single Combination',
  'multi': 'Multi',
  'drums': 'Drums',
  'global': 'Global',
};

// The exact set of dump types each kind of file holds. Every kind names the
// file in box text; only Single Program/Combination are still Load items.
const MATCH_SETS = {
  'all-data': [[F_ALL_DATA], [F_ALL_DATA, F_MULTI_EXPANSION]],
  'all-programs': [[F_ALL_PROGRAMS]],
  'all-combis': [[F_ALL_COMBIS]],
  '1-program': [[F_PROGRAM]],
  '1-combi': [[F_COMBI]],
  'multi': [[F_MULTI_EFFECTS, F_MULTI_EXPANSION]],
  'drums': [[F_DRUMS]],
  'global': [[F_GLOBAL]],
};

// F0 42 3g 36: KORG, any channel, the X5DR/X5/05R/W family.
export function isCompatibleMessage(m) {
  return m.length >= 6 && m[0] === 0xF0 && m[1] === 0x42 && (m[2] & 0xF0) === 0x30 && m[3] === 0x36;
}

function sameSet(set, list) {
  return set.size === list.length && list.every(f => set.has(f));
}

// Which dumps a file holds. `kind` names the file when it is exactly one Load
// item's type; 'mixed' otherwise.
export function classifySyxFile(messages) {
  const compatibleMessages = [];
  const funcs = new Set();
  for (const msg of messages) {
    const m = msg instanceof Uint8Array ? msg : new Uint8Array(msg);
    if (!isCompatibleMessage(m)) continue;
    compatibleMessages.push(m);
    if (DUMP_FUNCS.has(m[4])) funcs.add(m[4]);
  }

  let kind;
  if (compatibleMessages.length === 0) kind = 'not-compatible';
  else if (funcs.size === 0) kind = 'no-dumps';
  else kind = Object.keys(MATCH_SETS).find(item => MATCH_SETS[item].some(list => sameSet(funcs, list))) ?? 'mixed';

  return { compatibleMessages, funcs, kind, contents: describeContents(funcs) };
}

// Labels for the box text, in a fixed order.
function describeContents(funcs) {
  const out = [];
  if (funcs.has(F_ALL_DATA)) out.push(funcs.has(F_MULTI_EXPANSION) ? 'All Data' : 'All Data (no Multi track settings)');
  if (funcs.has(F_ALL_PROGRAMS)) out.push('All Programs');
  if (funcs.has(F_ALL_COMBIS)) out.push('All Combinations');
  if (funcs.has(F_PROGRAM)) out.push('Single Program');
  if (funcs.has(F_COMBI)) out.push('Single Combination');
  const fx = funcs.has(F_MULTI_EFFECTS);
  const tracks = funcs.has(F_MULTI_EXPANSION);
  if (fx && tracks) out.push('Multi');
  else if (fx) out.push('Multi effects only (no Multi track settings)');
  else if (tracks && !funcs.has(F_ALL_DATA)) out.push('Multi track settings only (no Multi effects)');
  if (funcs.has(F_DRUMS)) out.push('Drums');
  if (funcs.has(F_GLOBAL)) out.push('Global');
  return out;
}

// What a non-matching file must hold for Single Program/Combination to go
// ahead with a warning: the Funcs to parse, the first being the one the data
// comes from, or null when the item can't use the file.
function possibleFuncs(item, funcs) {
  const first = (...candidates) => candidates.find(f => funcs.has(f)) ?? null;
  const source = item === '1-program'
    ? first(F_ALL_PROGRAMS, F_ALL_DATA, F_PROGRAM)
    : first(F_ALL_COMBIS, F_ALL_DATA, F_COMBI);
  return source === null ? null : [source];
}

// "an All Data file", "a Drums file", "a mixed file".
function fileNoun(kind) {
  if (kind === 'mixed') return 'a file of mixed data';
  const label = LOAD_ITEM_LABELS[kind];
  return `${/^[AEIOU]/.test(label) ? 'an' : 'a'} ${label} file`;
}

// Continue-box wording: [title, question, okLabel].
// A file that is exactly a bank (All Programs into Single Program) has no
// "rest" to ignore.
function possibleWording(item, source, kind, noun) {
  const ignore = kind === 'all-programs' || kind === 'all-combis' ? '' : ' and ignore the rest';
  if (item === '1-program') {
    return source === F_PROGRAM
      ? [`Load a program from ${noun}?`, `Load its program and ignore the rest?`, 'Choose Program']
      : [`Load a program from ${noun}?`, `Choose one of its 100 programs to load${ignore}?`, 'Choose Program'];
  }
  return source === F_COMBI
    ? [`Load a combination from ${noun}?`, `Load its combination and ignore the rest?`, 'Choose Combination']
    : [`Load a combination from ${noun}?`, `Choose one of its 100 combinations to load${ignore}?`, 'Choose Combination'];
}

// The FILE → Load item that loads a kind of file.
function menuItemFor(kind) {
  return kind === '1-program' || kind === '1-combi' ? LOAD_ITEM_LABELS[kind] : 'Data File…';
}

// The decision and box text for Single Program/Combination. `box` is null for a match.
// `loadMessages` are the messages the Load flow parses (only the dumps the item
// uses, so a stray dump elsewhere in the file can't override them); empty on a
// refusal.
export function checkLoadFile(item, messages) {
  if (item !== '1-program' && item !== '1-combi') throw new Error(`Unknown Load item: ${item}`);
  const classification = classifySyxFile(messages);
  const { kind, funcs, contents } = classification;
  const itemLabel = LOAD_ITEM_LABELS[item];

  const pick = (list) => classification.compatibleMessages.filter(m => list.includes(m[4]));

  if (kind === item) return { outcome: 'match', classification, loadMessages: pick([...funcs]), box: null, status: null };

  if (kind === 'not-compatible') {
    const body = `This file can't be loaded as ${itemLabel}: it isn't a compatible SysEx file.`;
    return { outcome: 'refuse', classification, loadMessages: [], box: { title: 'Not a compatible file', body, okLabel: 'OK' }, status: `Load refused: ${body}` };
  }

  const parseFuncs = kind === 'no-dumps' ? null : possibleFuncs(item, funcs);
  if (parseFuncs !== null) {
    const noun = fileNoun(kind);
    const [title, question, okLabel] = possibleWording(item, parseFuncs[0], kind, noun);
    const body = `This is ${noun}, not ${fileNoun(item)}. ${question}`;
    return { outcome: 'possible', classification, loadMessages: pick(parseFuncs), box: { title, body, okLabel }, status: null };
  }

  let body = `This file can't be loaded as ${itemLabel}.`;
  if (kind === 'no-dumps') {
    body += ' It contains no Program, Combination, Multi, Drums or Global data.';
  } else {
    body += ` It contains: ${contents.join(', ')}.`;
    if (kind !== 'mixed') body += ` Use File → Load → ${menuItemFor(kind)} instead.`;
  }
  return { outcome: 'refuse', classification, loadMessages: [], box: { title: `Can't load this file as ${itemLabel}`, body, okLabel: 'OK' }, status: `Load refused: ${body}` };
}

// ─── FILE → Load/Save → Data File… (Release Plan C1c) ─────────────────────────

// The bank-level types, in dialog order, with their checkbox labels.
export const DATA_TYPES = ['programs', 'combis', 'multi', 'drums', 'global'];
export const DATA_TYPE_LABELS = {
  programs: 'Programs',
  combis: 'Combinations',
  multi: 'Multi',
  drums: 'Drums',
  global: 'Global',
};

// Unpacked size of each dump, and where its 7-bit payload starts (Func 40, 49
// and 68 have no 00 byte after the Func).
const SIZE_GLOBAL = 28;
const SIZE_DRUMS = 840;
const SIZE_ALL_COMBIS = 13600;
const SIZE_ALL_PROGRAMS = 16400;
const SIZE_MULTI_EFFECTS = 29;
const DUMP_SIZES = {
  [F_ALL_DATA]: SIZE_GLOBAL + SIZE_DRUMS + SIZE_ALL_COMBIS + SIZE_ALL_PROGRAMS + SIZE_MULTI_EFFECTS,
  [F_ALL_PROGRAMS]: SIZE_ALL_PROGRAMS,
  [F_ALL_COMBIS]: SIZE_ALL_COMBIS,
  [F_GLOBAL]: SIZE_GLOBAL,
  [F_DRUMS]: SIZE_DRUMS,
  [F_MULTI_EFFECTS]: SIZE_MULTI_EFFECTS,
  [F_MULTI_EXPANSION]: 208,
};
const PAYLOAD_START = { [F_MULTI_EXPANSION]: 5 };

// Bytes a packed payload unpacks to: 8 wire bytes carry 7, and a final
// partial group of n wire bytes carries n − 1.
function unpackedLength(packedBytes) {
  return Math.floor(packedBytes / 8) * 7 + Math.max(0, (packedBytes % 8) - 1);
}

// A dump is complete when its payload unpacks to at least the dump's size.
export function isCompleteDump(m) {
  const size = DUMP_SIZES[m[4]];
  if (size === undefined) return false;
  const start = PAYLOAD_START[m[4]] ?? 6;
  return m[m.length - 1] === 0xF7 && unpackedLength(m.length - start - 1) >= size;
}

// Where each type's data can come from, preferred first: a type's own dump
// wins over the All Data dump.
const TYPE_SOURCES = {
  programs: [F_ALL_PROGRAMS, F_ALL_DATA],
  combis: [F_ALL_COMBIS, F_ALL_DATA],
  drums: [F_DRUMS, F_ALL_DATA],
  global: [F_GLOBAL, F_ALL_DATA],
};

// Load → Data File…: for each type, whether the file can supply it (complete),
// the reason when not (the greyed-out checkbox's tooltip), and the messages to
// parse for it. outcome 'refuse' (with box text) when no type is available.
export function checkDataFile(messages) {
  const classification = classifySyxFile(messages);
  const { compatibleMessages, funcs, kind, contents } = classification;

  // The last complete dump of each Func (parseSnapshot also lets a later one win).
  const complete = new Map();
  for (const m of compatibleMessages) if (isCompleteDump(m)) complete.set(m[4], m);
  const incomplete = (f) => funcs.has(f) && !complete.has(f);

  const types = {};
  for (const type of ['programs', 'combis', 'drums', 'global']) {
    const source = TYPE_SOURCES[type].find(f => complete.has(f));
    types[type] = source !== undefined
      ? { available: true, reason: null, messages: [complete.get(source)] }
      : { available: false, reason: TYPE_SOURCES[type].some(incomplete) ? `This file's ${DATA_TYPE_LABELS[type]} data is incomplete.` : 'Not in this file.', messages: [] };
  }

  // Multi needs its effects (Func 55, or the All Data dump) and its track
  // settings (Func 68, never part of All Data — Landmine #53).
  const fx = [F_MULTI_EFFECTS, F_ALL_DATA].find(f => complete.has(f));
  const tracks = complete.get(F_MULTI_EXPANSION);
  if (fx !== undefined && tracks) {
    types.multi = { available: true, reason: null, messages: [complete.get(fx), tracks] };
  } else {
    let reason = 'Not in this file.';
    if (incomplete(F_MULTI_EFFECTS) || incomplete(F_MULTI_EXPANSION) || (incomplete(F_ALL_DATA) && !complete.has(F_MULTI_EFFECTS))) reason = "This file's Multi data is incomplete.";
    else if (fx !== undefined) reason = 'This file has Multi effects only, no Multi track settings.';
    else if (tracks) reason = 'This file has Multi track settings only, no Multi effects.';
    types.multi = { available: false, reason, messages: [] };
  }

  if (DATA_TYPES.some(t => types[t].available)) return { outcome: 'ok', classification, types, box: null, status: null };

  let title = "Can't load this file";
  let body;
  if (kind === 'not-compatible') {
    title = 'Not a compatible file';
    body = "This file can't be loaded: it isn't a compatible SysEx file.";
  } else if (kind === 'no-dumps') {
    body = 'This file contains no Program, Combination, Multi, Drums or Global data.';
  } else if (kind === '1-program' || kind === '1-combi') {
    const what = kind === '1-program' ? 'a single program' : 'a single combination';
    body = `This file holds ${what}, not a bank. Use File → Load → ${LOAD_ITEM_LABELS[kind]} instead.`;
  } else {
    body = `This file has no complete Programs, Combinations, Multi, Drums or Global data. It contains: ${contents.join(', ')}.`;
  }
  return { outcome: 'refuse', classification, types, box: { title, body, okLabel: 'OK' }, status: `Load refused: ${body}` };
}

// Save → Data File…: the suggested filename for the ticked types.
const SAVE_NAME_PARTS = { programs: 'programs', combis: 'combis', multi: 'multi', drums: 'drums', global: 'global' };
export function dataFileSaveName(selected) {
  const picked = DATA_TYPES.filter(t => selected.includes(t));
  if (picked.length === DATA_TYPES.length) return 'X5DR_bank.syx';
  return `X5DR_${picked.map(t => SAVE_NAME_PARTS[t]).join('_')}.syx`;
}

// Save → Data File…: all five ticked saves the standard All Data file (Func 50
// + 68); fewer saves one dump per type, in this order (Func 4C, 4D, 55 + 68,
// 52, 51).
export function dataFileSaveKind(selected) {
  return DATA_TYPES.every(t => selected.includes(t)) ? 'all-data' : 'per-type';
}
