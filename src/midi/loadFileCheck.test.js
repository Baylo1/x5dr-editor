import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { classifySyxFile, checkLoadFile, isCompatibleMessage, LOAD_ITEM_LABELS, checkDataFile, isCompleteDump, dataFileSaveName, dataFileSaveKind, DATA_TYPES } from './loadFileCheck.js';
import { packedLength } from './sysex.js';
import { parseSnapshot } from './parser.js';

// Hardware captures (see parser.test.js): All Data alone, and Multi Expansion alone.
const FACTORY_PATH = resolve(process.cwd(), 'reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx');
const FACTORY_MULTI_PATH = resolve(process.cwd(), 'reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (Multi Expansion).syx');

function loadSyx(path) {
  const data = readFileSync(path);
  const msgs = [];
  let i = 0;
  while (i < data.length) {
    if (data[i] !== 0xF0) { i++; continue; }
    const start = i;
    while (i < data.length && data[i] !== 0xF7) i++;
    msgs.push(new Uint8Array(data.slice(start, i + 1)));
    i++;
  }
  return msgs;
}

// A stand-in dump: only the header and Func matter to the check.
const msg = (func, channel = 0) => new Uint8Array([0xF0, 0x42, 0x30 | channel, 0x36, func, 0x00, 0x00, 0xF7]);
const file = (...funcs) => funcs.map(f => msg(f));

// One file per Load item's own type, as the app saves them.
const FILES = {
  'all-data': file(0x50, 0x68),
  'all-data-no-68': file(0x50),
  'all-programs': file(0x4C),
  'all-combis': file(0x4D),
  '1-program': file(0x40),
  '1-combi': file(0x49),
  'multi': file(0x55, 0x68),
  'drums': file(0x52),
  'global': file(0x51),
  'roland': [new Uint8Array([0xF0, 0x41, 0x10, 0x42, 0x12, 0x40, 0x00, 0x7F, 0x00, 0x41, 0xF7])],
};

// The spec's table (findings doc, B12) for the two items still checked this
// way: file → outcome. Everything else is Load → Data File… (checkDataFile).
const SINGLE_ITEMS = ['1-program', '1-combi'];
const EXPECTED = {
  '1-program': { '1-program': 'match', 'all-programs': 'possible', 'all-data': 'possible', 'all-data-no-68': 'possible' },
  '1-combi': { '1-combi': 'match', 'all-combis': 'possible', 'all-data': 'possible', 'all-data-no-68': 'possible' },
};

describe('isCompatibleMessage', () => {
  it('accepts F0 42 3g 36 on every channel', () => {
    for (let g = 0; g < 16; g++) expect(isCompatibleMessage(msg(0x40, g))).toBe(true);
  });
  it('rejects other manufacturers, other Korg families and short messages', () => {
    expect(isCompatibleMessage(FILES.roland[0])).toBe(false);
    expect(isCompatibleMessage(new Uint8Array([0xF0, 0x42, 0x30, 0x19, 0x40, 0x00, 0xF7]))).toBe(false); // M1 family
    expect(isCompatibleMessage(new Uint8Array([0xF0, 0x42, 0x40, 0x36, 0x40, 0x00, 0xF7]))).toBe(false); // not 3g
    expect(isCompatibleMessage(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0xF7]))).toBe(false);
  });
});

describe('classifySyxFile', () => {
  it('names each single-type file after its Load item', () => {
    for (const item of Object.keys(LOAD_ITEM_LABELS)) expect(classifySyxFile(FILES[item]).kind).toBe(item);
    expect(classifySyxFile(FILES['all-data-no-68']).kind).toBe('all-data');
  });
  it('a non-Korg file is not compatible', () => {
    const c = classifySyxFile(FILES.roland);
    expect(c.kind).toBe('not-compatible');
    expect(c.compatibleMessages).toHaveLength(0);
  });
  it('an empty file is not compatible', () => {
    expect(classifySyxFile([]).kind).toBe('not-compatible');
  });
  it('a compatible file with no dumps (e.g. Parameter Changes) is no-dumps', () => {
    expect(classifySyxFile(file(0x41, 0x4E)).kind).toBe('no-dumps');
  });
  it('mixed files are mixed, and foreign messages are dropped', () => {
    const c = classifySyxFile([...file(0x4C, 0x4D), ...FILES.roland]);
    expect(c.kind).toBe('mixed');
    expect(c.compatibleMessages).toHaveLength(2);
    expect(c.contents).toEqual(['All Programs', 'All Combinations']);
  });
  it('a single dump on a non-zero channel classifies the same', () => {
    expect(classifySyxFile([msg(0x52, 5)]).kind).toBe('drums');
  });
  it('labels partial Multi files', () => {
    expect(classifySyxFile(file(0x55)).contents).toEqual(['Multi effects only (no Multi track settings)']);
    expect(classifySyxFile(file(0x68)).contents).toEqual(['Multi track settings only (no Multi effects)']);
    expect(classifySyxFile(file(0x50)).contents).toEqual(['All Data (no Multi track settings)']);
    expect(classifySyxFile(file(0x50, 0x68)).contents).toEqual(['All Data']);
  });
  it('classifies the hardware-captured factory dumps', () => {
    const allData = loadSyx(FACTORY_PATH);
    const expansion = loadSyx(FACTORY_MULTI_PATH);
    expect(classifySyxFile(allData).kind).toBe('all-data');
    expect(classifySyxFile([...allData, ...expansion]).kind).toBe('all-data');
  });
});

describe('checkLoadFile: the spec table', () => {
  for (const item of SINGLE_ITEMS) {
    for (const name of Object.keys(FILES)) {
      const expected = EXPECTED[item][name] ?? 'refuse';
      it(`${LOAD_ITEM_LABELS[item]} ← ${name}: ${expected}`, () => {
        const r = checkLoadFile(item, FILES[name]);
        expect(r.outcome).toBe(expected);
        if (expected === 'match') {
          expect(r.box).toBeNull();
        } else {
          expect(r.box.title).toBeTruthy();
          expect(r.box.body).toBeTruthy();
        }
        if (expected === 'refuse') {
          expect(r.loadMessages).toEqual([]);
          expect(r.box.okLabel).toBe('OK');
          expect(r.status).toBe(`Load refused: ${r.box.body}`);
        } else {
          expect(r.loadMessages.length).toBeGreaterThan(0);
        }
      });
    }
  }

  it('throws on an unknown Load item, including the retired bank items', () => {
    expect(() => checkLoadFile('everything', FILES.drums)).toThrow();
    for (const item of ['all-data', 'all-programs', 'all-combis', 'multi', 'drums', 'global']) {
      expect(() => checkLoadFile(item, FILES.drums)).toThrow();
    }
  });
});

describe('checkLoadFile: wording', () => {
  it('possible: Single Program from All Programs has no "rest" to ignore', () => {
    expect(checkLoadFile('1-program', FILES['all-programs']).box).toEqual({
      title: 'Load a program from an All Programs file?',
      body: 'This is an All Programs file, not a Single Program file. Choose one of its 100 programs to load?',
      okLabel: 'Choose Program',
    });
  });
  it('possible: Single Combination from All Data', () => {
    expect(checkLoadFile('1-combi', FILES['all-data']).box).toEqual({
      title: 'Load a combination from an All Data file?',
      body: 'This is an All Data file, not a Single Combination file. Choose one of its 100 combinations to load and ignore the rest?',
      okLabel: 'Choose Combination',
    });
  });
  it('refuse: names the contents and the right menu item', () => {
    expect(checkLoadFile('1-program', FILES.drums).box).toEqual({
      title: "Can't load this file as Single Program",
      body: "This file can't be loaded as Single Program. It contains: Drums. Use File → Load → Data File… instead.",
      okLabel: 'OK',
    });
    expect(checkLoadFile('1-program', FILES['1-combi']).box.body)
      .toBe("This file can't be loaded as Single Program. It contains: Single Combination. Use File → Load → Single Combination instead.");
    expect(checkLoadFile('1-combi', FILES['all-programs']).box.body)
      .toBe("This file can't be loaded as Single Combination. It contains: All Programs. Use File → Load → Data File… instead.");
  });
  it('refuse: a non-compatible file', () => {
    const r = checkLoadFile('1-program', FILES.roland);
    expect(r.box).toEqual({
      title: 'Not a compatible file',
      body: "This file can't be loaded as Single Program: it isn't a compatible SysEx file.",
      okLabel: 'OK',
    });
    expect(r.status).toBe("Load refused: This file can't be loaded as Single Program: it isn't a compatible SysEx file.");
  });
  it('refuse: a compatible file with no dumps', () => {
    expect(checkLoadFile('1-combi', file(0x41)).box.body)
      .toBe("This file can't be loaded as Single Combination. It contains no Program, Combination, Multi, Drums or Global data.");
  });
  it('refuse: a mixed file suggests no single menu item', () => {
    expect(checkLoadFile('1-program', file(0x4D, 0x52)).box.body)
      .toBe("This file can't be loaded as Single Program. It contains: All Combinations, Drums.");
  });
});

describe('checkLoadFile: mixed files and loadMessages', () => {
  it('Single Program from a mixed bank file parses only the All Programs dump', () => {
    const r = checkLoadFile('1-program', file(0x4C, 0x4D));
    expect(r.outcome).toBe('possible');
    expect(r.loadMessages.map(m => m[4])).toEqual([0x4C]);
  });
  it('a foreign message alongside a match is dropped from loadMessages', () => {
    const r = checkLoadFile('1-program', [...FILES.roland, ...FILES['1-program']]);
    expect(r.outcome).toBe('match');
    expect(r.loadMessages).toHaveLength(1);
  });
  it('Single Program from a mixed file with a Single Program dump is possible', () => {
    const r = checkLoadFile('1-program', file(0x40, 0x49));
    expect(r.outcome).toBe('possible');
    expect(r.box.body).toBe('This is a file of mixed data, not a Single Program file. Load its program and ignore the rest?');
  });
});

describe('checkLoadFile on real dumps parses to the expected data', () => {
  const full = [...loadSyx(FACTORY_PATH), ...loadSyx(FACTORY_MULTI_PATH)];
  it('Single Program ← factory All Data: 100 programs to choose from', () => {
    expect(parseSnapshot(checkLoadFile('1-program', full).loadMessages).programs).toHaveLength(100);
  });
  it('Single Combination ← factory All Data: 100 combinations to choose from', () => {
    expect(parseSnapshot(checkLoadFile('1-combi', full).loadMessages).combis).toHaveLength(100);
  });
});

// ─── Load → Data File… ──────────────────────────────────────────────────────

// A complete stand-in dump: the right header and payload length, zero data.
const UNPACKED = { 0x50: 30897, 0x4C: 16400, 0x4D: 13600, 0x51: 28, 0x52: 840, 0x55: 29, 0x68: 208 };
function dump(func, { channel = 0, short = false } = {}) {
  const pad = func === 0x68 ? [] : [0x00];
  let len = packedLength(UNPACKED[func]);
  if (short) len -= 16;
  return new Uint8Array([0xF0, 0x42, 0x30 | channel, 0x36, func, ...pad, ...new Array(len).fill(0), 0xF7]);
}
const dumps = (...funcs) => funcs.map(f => dump(f));
const available = (r) => DATA_TYPES.filter(t => r.types[t].available);
const sources = (r, t) => r.types[t].messages.map(m => m[4]);

describe('isCompleteDump', () => {
  it('accepts every full-size dump, on any channel', () => {
    for (const f of Object.keys(UNPACKED)) {
      expect(isCompleteDump(dump(Number(f)))).toBe(true);
      expect(isCompleteDump(dump(Number(f), { channel: 9 }))).toBe(true);
    }
  });
  it('rejects a cut-short dump, a missing F7 and non-bank Funcs', () => {
    for (const f of Object.keys(UNPACKED)) expect(isCompleteDump(dump(Number(f), { short: true }))).toBe(false);
    expect(isCompleteDump(dump(0x52).slice(0, -1))).toBe(false);
    expect(isCompleteDump(msg(0x40))).toBe(false);
    expect(isCompleteDump(msg(0x49))).toBe(false);
  });
  it('accepts the hardware captures', () => {
    for (const m of [...loadSyx(FACTORY_PATH), ...loadSyx(FACTORY_MULTI_PATH)]) expect(isCompleteDump(m)).toBe(true);
  });
});

describe('checkDataFile: which types are available', () => {
  it('All Data + Multi Expansion: all five', () => {
    const r = checkDataFile(dumps(0x50, 0x68));
    expect(r.outcome).toBe('ok');
    expect(available(r)).toEqual(DATA_TYPES);
    expect(sources(r, 'programs')).toEqual([0x50]);
    expect(sources(r, 'multi')).toEqual([0x50, 0x68]);
  });
  it('All Data without Multi Expansion: Multi greyed, effects only', () => {
    const r = checkDataFile(dumps(0x50));
    expect(available(r)).toEqual(['programs', 'combis', 'drums', 'global']);
    expect(r.types.multi.reason).toBe('This file has Multi effects only, no Multi track settings.');
  });
  it('a four-type file (4C + 4D + 52 + 51): everything but Multi', () => {
    const r = checkDataFile(dumps(0x52, 0x51, 0x4D, 0x4C));
    expect(r.outcome).toBe('ok');
    expect(available(r)).toEqual(['programs', 'combis', 'drums', 'global']);
    expect(r.types.multi.reason).toBe('Not in this file.');
    expect(sources(r, 'programs')).toEqual([0x4C]);
    expect(sources(r, 'drums')).toEqual([0x52]);
  });
  it('each single-type file offers only its own type', () => {
    expect(available(checkDataFile(dumps(0x4C)))).toEqual(['programs']);
    expect(available(checkDataFile(dumps(0x4D)))).toEqual(['combis']);
    expect(available(checkDataFile(dumps(0x55, 0x68)))).toEqual(['multi']);
    expect(available(checkDataFile(dumps(0x52)))).toEqual(['drums']);
    expect(available(checkDataFile(dumps(0x51)))).toEqual(['global']);
  });
  it("a type's own dump wins over the All Data dump", () => {
    const r = checkDataFile(dumps(0x50, 0x68, 0x4C, 0x52, 0x55));
    expect(sources(r, 'programs')).toEqual([0x4C]);
    expect(sources(r, 'combis')).toEqual([0x50]);
    expect(sources(r, 'drums')).toEqual([0x52]);
    expect(sources(r, 'multi')).toEqual([0x55, 0x68]);
  });
  it('Multi track settings alone are not enough', () => {
    const r = checkDataFile(dumps(0x68, 0x52));
    expect(available(r)).toEqual(['drums']);
    expect(r.types.multi.reason).toBe('This file has Multi track settings only, no Multi effects.');
  });
  it('an incomplete dump greys out its type with a reason, and a complete one elsewhere still counts', () => {
    const r = checkDataFile([dump(0x4C, { short: true }), dump(0x52)]);
    expect(available(r)).toEqual(['drums']);
    expect(r.types.programs.reason).toBe("This file's Programs data is incomplete.");
    const r2 = checkDataFile([dump(0x50, { short: true }), dump(0x4D)]);
    expect(available(r2)).toEqual(['combis']);
    expect(r2.types.programs.reason).toBe("This file's Programs data is incomplete.");
    expect(r2.types.multi.reason).toBe("This file's Multi data is incomplete.");
    expect(checkDataFile([dump(0x55), dump(0x68, { short: true })]).types.multi.reason).toBe("This file's Multi data is incomplete.");
  });
  it('single program/combination and foreign messages are ignored next to bank data', () => {
    const r = checkDataFile([...FILES.roland, msg(0x40), dump(0x51)]);
    expect(r.outcome).toBe('ok');
    expect(available(r)).toEqual(['global']);
  });
});

describe('checkDataFile: refusals', () => {
  it('a non-compatible file', () => {
    expect(checkDataFile(FILES.roland).box).toEqual({
      title: 'Not a compatible file',
      body: "This file can't be loaded: it isn't a compatible SysEx file.",
      okLabel: 'OK',
    });
  });
  it('a single program or combination points to its own menu item', () => {
    const r = checkDataFile(file(0x40));
    expect(r.outcome).toBe('refuse');
    expect(r.box).toEqual({
      title: "Can't load this file",
      body: 'This file holds a single program, not a bank. Use File → Load → Single Program instead.',
      okLabel: 'OK',
    });
    expect(r.status).toBe('Load refused: This file holds a single program, not a bank. Use File → Load → Single Program instead.');
    expect(checkDataFile(file(0x49)).box.body)
      .toBe('This file holds a single combination, not a bank. Use File → Load → Single Combination instead.');
  });
  it('a file with no dumps', () => {
    expect(checkDataFile(file(0x41, 0x4E)).box.body)
      .toBe('This file contains no Program, Combination, Multi, Drums or Global data.');
  });
  it('a file with only partial or incomplete data names its contents', () => {
    expect(checkDataFile(dumps(0x55)).box.body)
      .toBe('This file has no complete Programs, Combinations, Multi, Drums or Global data. It contains: Multi effects only (no Multi track settings).');
    expect(checkDataFile([dump(0x4C, { short: true })]).box.body)
      .toBe('This file has no complete Programs, Combinations, Multi, Drums or Global data. It contains: All Programs.');
  });
});

describe('checkDataFile on the hardware captures', () => {
  const allData = loadSyx(FACTORY_PATH);
  const expansion = loadSyx(FACTORY_MULTI_PATH);
  it('All Data + Expansion offers all five, and each parses', () => {
    const r = checkDataFile([...allData, ...expansion]);
    expect(available(r)).toEqual(DATA_TYPES);
    expect(parseSnapshot(r.types.programs.messages).programs).toHaveLength(100);
    expect(parseSnapshot(r.types.combis.messages).combis).toHaveLength(100);
    const multi = parseSnapshot(r.types.multi.messages).multi;
    expect(multi.effects).toBeTruthy();
    expect(multi.tracks).toBeTruthy();
    expect(parseSnapshot(r.types.drums.messages).drums).toBeTruthy();
    expect(parseSnapshot(r.types.global.messages).global).toBeTruthy();
  });
  it('All Data alone: Multi greyed', () => {
    expect(checkDataFile(allData).types.multi.available).toBe(false);
  });
});

describe('Save → Data File…', () => {
  it('all five: the standard All Data file and name', () => {
    expect(dataFileSaveKind(DATA_TYPES)).toBe('all-data');
    expect(dataFileSaveName(['global', 'drums', 'multi', 'combis', 'programs'])).toBe('X5DR_bank.syx');
  });
  it('fewer: one dump per type, named after the selection in dialog order', () => {
    expect(dataFileSaveKind(['programs', 'combis', 'drums', 'global'])).toBe('per-type');
    expect(dataFileSaveName(['programs'])).toBe('X5DR_programs.syx');
    expect(dataFileSaveName(['global', 'drums'])).toBe('X5DR_drums_global.syx');
    expect(dataFileSaveName(['global', 'programs', 'multi'])).toBe('X5DR_programs_multi_global.syx');
  });
});
