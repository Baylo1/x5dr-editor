import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseSnapshot } from './parser.js';
import {
  DUMP_REPLY_BYTES, buildSingleProgramDump, buildSingleCombiDump, buildMultiEffectsDump,
  buildMultiExpansionDump, buildDrumsDump, buildGlobalDump,
} from './sysex.js';
import { programsToSyx, combisToSyx, snapshotToSyx } from './encoder.js';

// Guards the two bundled factory soundbanks embedded in src/index.html
// (FACTORY_SOUNDS_SYX_BASE64 = Bank A, FACTORY_SOUNDS_B_SYX_BASE64 = Bank B):
// each must be byte-identical to its hardware-capture source files and must
// parse into a full 100-program / 100-combi snapshot.

const ref = (name) => readFileSync(resolve(process.cwd(), 'reference_sysex', name));
const html = readFileSync(resolve(process.cwd(), 'src/index.html'), 'utf8');

function embedded(constName) {
  const m = html.match(new RegExp(`const ${constName} = "([^"]+)"`));
  expect(m, `${constName} not found in index.html`).not.toBeNull();
  return Buffer.from(m[1], 'base64');
}

function splitMessages(buf) {
  const msgs = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] !== 0xF0) { i++; continue; }
    const start = i;
    while (i < buf.length && buf[i] !== 0xF7) i++;
    msgs.push(new Uint8Array(buf.subarray(start, i + 1)));
    i++;
  }
  return msgs;
}

const BANKS = {
  A: {
    constName: 'FACTORY_SOUNDS_SYX_BASE64',
    files: ['X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx', 'X5dr Factory Sounds - Hardware Capture 2026-09-29 (Multi Expansion).syx'],
  },
  B: {
    constName: 'FACTORY_SOUNDS_B_SYX_BASE64',
    files: ['Factory B Bank Pt 1 dump.syx', 'Factory B Bank Pt 2 dump.syx'],
  },
};

for (const [bank, { constName, files }] of Object.entries(BANKS)) {
  describe(`embedded Factory Sounds Bank ${bank}`, () => {
    const bytes = embedded(constName);

    it('is byte-identical to its source capture files', () => {
      const expected = Buffer.concat(files.map(ref));
      expect(bytes.equals(expected)).toBe(true);
    });

    it('is an All Data (0x50) dump followed by a Multi Expansion (0x68) dump', () => {
      const msgs = splitMessages(bytes);
      expect(msgs.map(m => m[4])).toEqual([0x50, 0x68]);
    });

    it('parses into 100 programs and 100 combis', () => {
      const snap = parseSnapshot(splitMessages(bytes));
      expect(snap.programs).toHaveLength(100);
      expect(snap.combis).toHaveLength(100);
    });
  });
}

describe('factory banks', () => {
  it('Bank B differs from Bank A', () => {
    expect(embedded(BANKS.A.constName).equals(embedded(BANKS.B.constName))).toBe(false);
  });
});

// The request watchdog is sized from DUMP_REPLY_BYTES; keep it equal to what
// the encoder produces and to the device's own replies in the Bank A capture.
describe('DUMP_REPLY_BYTES', () => {
  const msgs = splitMessages(embedded(BANKS.A.constName));
  const snap = parseSnapshot(msgs);

  it('matches the encoder for every dump type', () => {
    expect({
      program: buildSingleProgramDump(snap.programs[0]).length,
      allPrograms: programsToSyx(snap).length,
      combi: buildSingleCombiDump(snap.combis[0]).length,
      allCombis: combisToSyx(snap).length,
      multiEffects: buildMultiEffectsDump(snap.multi.effects).length,
      multiTracks: buildMultiExpansionDump(snap.multi.tracks).length,
      drums: buildDrumsDump(snap.drums).length,
      global: buildGlobalDump(snap.global).length,
      allData: snapshotToSyx(snap).length,
    }).toEqual(DUMP_REPLY_BYTES);
  });

  it('matches the hardware-captured All Data and Multi Expansion replies', () => {
    expect(msgs.map(m => m.length)).toEqual([DUMP_REPLY_BYTES.allData, DUMP_REPLY_BYTES.multiTracks]);
  });
});

