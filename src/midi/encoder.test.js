import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseSnapshot, parseProgram } from './parser.js';
import { snapshotToSyx, programsToSyx, combisToSyx } from './encoder.js';
import {
  buildProgramWriteRequest,
  buildSingleProgramDump,
  encodeProgramToBytes,
  isWriteCompleted,
  isWriteError,
} from './sysex.js';

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

// Hardware-captured 2026-09-29 (front-panel factory-preset restore + Device >
// Import > All Data, recorded in Snoize) after a previously-used internet
// copy of the factory bank (private archive) was found to diverge from real
// factory content on Program #82 "VeloFlugel" and #97 "SopranoVox" — see src/index.html's FACTORY_SOUNDS_SYX_BASE64 comment.
const FACTORY_PATH = resolve(process.cwd(), 'reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx');
// Factory Bank B (All Data, hardware-captured): a second, independent bank
// for the whole-bank round trips below.
const BANK_B_PATH = resolve(process.cwd(), 'reference_sysex/Factory B Bank Pt 1 dump.syx');

// ─── encodeProgramToBytes — name padding ─────────────────────────────────────

describe('encodeProgramToBytes — name padding', () => {
  const factoryMsgs = loadSyx(FACTORY_PATH);
  const factorySnap = parseSnapshot(factoryMsgs);

  function nameBytes(p) {
    const b = encodeProgramToBytes(p);
    return Array.from(b.slice(0, 10));
  }

  it('encodes a full 10-character name without padding', () => {
    const prog = structuredClone(factorySnap.programs[0]);
    prog.name = 'Rock On!!!';
    expect(nameBytes(prog)).toEqual([...'Rock On!!!'].map(c => c.charCodeAt(0)));
  });

  it('pads a short name with 0x20 (space) to 10 bytes', () => {
    const prog = structuredClone(factorySnap.programs[0]);
    prog.name = 'Hi';
    const expected = [0x48, 0x69, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20];
    expect(nameBytes(prog)).toEqual(expected);
  });

  it('pads an empty name with 10 space bytes', () => {
    const prog = structuredClone(factorySnap.programs[0]);
    prog.name = '';
    expect(nameBytes(prog)).toEqual(Array(10).fill(0x20));
  });

  it('pads a null/undefined name with 10 space bytes', () => {
    const prog = structuredClone(factorySnap.programs[0]);
    prog.name = null;
    expect(nameBytes(prog)).toEqual(Array(10).fill(0x20));
  });

  it('truncates a name longer than 10 characters', () => {
    const prog = structuredClone(factorySnap.programs[0]);
    prog.name = 'TooLongNameHere';
    const bytes = nameBytes(prog);
    expect(bytes).toHaveLength(10);
    expect(bytes).toEqual([...'TooLongNam'].map(c => c.charCodeAt(0)));
  });
});

// ─── buildProgramWriteRequest ─────────────────────────────────────────────────

describe('buildProgramWriteRequest', () => {
  it('produces the correct byte sequence with padding byte', () => {
    const msg = buildProgramWriteRequest(42);
    expect(Array.from(msg)).toEqual([0xF0, 0x42, 0x30, 0x36, 0x11, 0x00, 42, 0xF7]);
  });

  it('has padding byte at position 5 and slotIndex at position 6', () => {
    const msg = buildProgramWriteRequest(0);
    expect(msg[4]).toBe(0x11);
    expect(msg[5]).toBe(0x00);
    expect(msg[6]).toBe(0);
    expect(msg[7]).toBe(0xF7);
  });

  it('masks slotIndex to 7 bits', () => {
    const msg = buildProgramWriteRequest(0xFF);
    expect(msg[6]).toBe(0x7F);
  });
});

// ─── isWriteCompleted ─────────────────────────────────────────────────────────

describe('isWriteCompleted', () => {
  it('returns true for exact match', () => {
    expect(isWriteCompleted(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x21, 0xF7]))).toBe(true);
  });

  it('returns false for ACK (Func=23)', () => {
    expect(isWriteCompleted(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x23, 0xF7]))).toBe(false);
  });

  it('returns false for wrong length', () => {
    expect(isWriteCompleted(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x21, 0x00, 0xF7]))).toBe(false);
  });
});

// ─── isWriteError ─────────────────────────────────────────────────────────────

describe('isWriteError', () => {
  it('returns true for exact match', () => {
    expect(isWriteError(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x22, 0xF7]))).toBe(true);
  });

  it('returns false for Write Completed (Func=21)', () => {
    expect(isWriteError(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x21, 0xF7]))).toBe(false);
  });

  it('returns false for NAK (Func=24)', () => {
    expect(isWriteError(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x24, 0xF7]))).toBe(false);
  });
});

// ─── buildSingleProgramDump ───────────────────────────────────────────────────

describe('buildSingleProgramDump', () => {
  const factoryMsgs = loadSyx(FACTORY_PATH);
  const factorySnap = parseSnapshot(factoryMsgs);

  it('starts with correct header and Func=40', () => {
    const msg = buildSingleProgramDump(factorySnap.programs[0]);
    expect(msg[0]).toBe(0xF0);
    expect(msg[1]).toBe(0x42);
    expect(msg[2]).toBe(0x30);
    expect(msg[3]).toBe(0x36);
    expect(msg[4]).toBe(0x40);
  });

  it('ends with F7', () => {
    const msg = buildSingleProgramDump(factorySnap.programs[0]);
    expect(msg[msg.length - 1]).toBe(0xF7);
  });

  it('round-trips program 0 through parse', () => {
    const original = factorySnap.programs[0];
    const msg = buildSingleProgramDump(original);
    const reparsed = parseSnapshot([msg]);
    expect(reparsed.programs[0]).toEqual(original);
  });

  it('round-trips all 100 factory programs', () => {
    for (let i = 0; i < 100; i++) {
      const original = factorySnap.programs[i];
      const msg = buildSingleProgramDump(original);
      const reparsed = parseSnapshot([msg]);
      expect(reparsed.programs[0]).toEqual(original);
    }
  });

  it('round-trips all 100 Factory Bank B programs', () => {
    const bankBMsgs = loadSyx(BANK_B_PATH);
    const bankBSnap = parseSnapshot(bankBMsgs);
    for (let i = 0; i < 100; i++) {
      const original = bankBSnap.programs[i];
      const msg = buildSingleProgramDump(original);
      const reparsed = parseSnapshot([msg]);
      expect(reparsed.programs[0]).toEqual(original);
    }
  });
});

// ─── snapshotToSyx ────────────────────────────────────────────────────────────

describe('snapshotToSyx', () => {
  const factoryMsgs = loadSyx(FACTORY_PATH);
  const factorySnap = parseSnapshot(factoryMsgs);

  it('starts with correct header and Func=50', () => {
    const syx = snapshotToSyx(factorySnap);
    expect(syx[0]).toBe(0xF0);
    expect(syx[1]).toBe(0x42);
    expect(syx[2]).toBe(0x30);
    expect(syx[3]).toBe(0x36);
    expect(syx[4]).toBe(0x50);
    expect(syx[5]).toBe(0x00);
  });

  it('ends with F7', () => {
    const syx = snapshotToSyx(factorySnap);
    expect(syx[syx.length - 1]).toBe(0xF7);
  });

  it('round-trips all programs through parse', () => {
    const syx = snapshotToSyx(factorySnap);
    const reparsed = parseSnapshot([syx]);
    expect(reparsed.programs).toHaveLength(100);
    for (let i = 0; i < 100; i++) {
      expect(reparsed.programs[i]).toEqual(factorySnap.programs[i]);
    }
  });

  it('round-trips global through parse', () => {
    const syx = snapshotToSyx(factorySnap);
    const reparsed = parseSnapshot([syx]);
    expect(reparsed.global).toEqual(factorySnap.global);
  });

  it('round-trips drums through parse', () => {
    const syx = snapshotToSyx(factorySnap);
    const reparsed = parseSnapshot([syx]);
    expect(reparsed.drums).toEqual(factorySnap.drums);
  });

  it('writes a zeroed Drums block when no drums are loaded', () => {
    const full = snapshotToSyx(factorySnap);
    const syx = snapshotToSyx({ ...factorySnap, drums: null });
    expect(syx.length).toBe(full.length);
    const reparsed = parseSnapshot([syx]);
    for (const kit of reparsed.drums) {
      expect(kit.notes.every(n => !n.enabled && n.key === 0 && n.tune === 0)).toBe(true);
    }
    expect(reparsed.programs).toEqual(parseSnapshot([full]).programs);
  });

  it('round-trips all combis through parse', () => {
    const syx = snapshotToSyx(factorySnap);
    const reparsed = parseSnapshot([syx]);
    expect(reparsed.combis).toHaveLength(100);
    for (let i = 0; i < 100; i++) {
      expect(reparsed.combis[i]).toEqual(factorySnap.combis[i]);
    }
  });

  it('round-trips Factory Bank B snapshot programs', () => {
    const bankBMsgs = loadSyx(BANK_B_PATH);
    const bankBSnap = parseSnapshot(bankBMsgs);
    const syx = snapshotToSyx(bankBSnap);
    const reparsed = parseSnapshot([syx]);
    for (let i = 0; i < 100; i++) {
      expect(reparsed.programs[i]).toEqual(bankBSnap.programs[i]);
    }
  });

  it('round-trips Factory Bank B snapshot combis', () => {
    const bankBMsgs = loadSyx(BANK_B_PATH);
    const bankBSnap = parseSnapshot(bankBMsgs);
    const syx = snapshotToSyx(bankBSnap);
    const reparsed = parseSnapshot([syx]);
    for (let i = 0; i < 100; i++) {
      expect(reparsed.combis[i]).toEqual(bankBSnap.combis[i]);
    }
  });

  // All Data (Func=50) only carries Multi's 29-byte Effects block, never the
  // 208-byte expansion (NOTE 10) — Brief #17 replaced the old zero-filled stub.
  it('round-trips Multi Effects through parse (tracks stay null, not part of All Data)', () => {
    const syx = snapshotToSyx(factorySnap);
    const reparsed = parseSnapshot([syx]);
    expect(reparsed.multi.effects).toEqual(factorySnap.multi.effects);
    expect(reparsed.multi.tracks).toBeNull();
  });

  it('writes zeros for Multi Effects when no snapshot has ever loaded Multi data', () => {
    const noMultiSnap = { ...factorySnap, multi: null };
    const syx = snapshotToSyx(noMultiSnap);
    const reparsed = parseSnapshot([syx]);
    expect(reparsed.multi.effects.eff1Type).toBe(0);
  });
});

// ─── combisToSyx ──────────────────────────────────────────────────────────────

describe('combisToSyx', () => {
  const factoryMsgs = loadSyx(FACTORY_PATH);
  const factorySnap = parseSnapshot(factoryMsgs);

  it('starts with correct header and Func=4D', () => {
    const syx = combisToSyx(factorySnap);
    expect(syx[0]).toBe(0xF0);
    expect(syx[1]).toBe(0x42);
    expect(syx[2]).toBe(0x30);
    expect(syx[3]).toBe(0x36);
    expect(syx[4]).toBe(0x4D);
    expect(syx[5]).toBe(0x00);
  });

  it('ends with F7', () => {
    const syx = combisToSyx(factorySnap);
    expect(syx[syx.length - 1]).toBe(0xF7);
  });

  it('round-trips all combis through parse', () => {
    const syx = combisToSyx(factorySnap);
    const reparsed = parseSnapshot([syx]);
    expect(reparsed.combis).toHaveLength(100);
    for (let i = 0; i < 100; i++) {
      expect(reparsed.combis[i]).toEqual(factorySnap.combis[i]);
    }
  });

  it('parses back via Func=4D (sources.combis === "0x4D")', () => {
    const syx = combisToSyx(factorySnap);
    const reparsed = parseSnapshot([syx]);
    expect(reparsed.sources.combis).toBe('0x4D');
  });

  it('round-trips Factory Bank B snapshot combis', () => {
    const bankBMsgs = loadSyx(BANK_B_PATH);
    const bankBSnap = parseSnapshot(bankBMsgs);
    const syx = combisToSyx(bankBSnap);
    const reparsed = parseSnapshot([syx]);
    for (let i = 0; i < 100; i++) {
      expect(reparsed.combis[i]).toEqual(bankBSnap.combis[i]);
    }
  });
});

// ─── programsToSyx ────────────────────────────────────────────────────────────

describe('programsToSyx', () => {
  const factoryMsgs = loadSyx(FACTORY_PATH);
  const factorySnap = parseSnapshot(factoryMsgs);

  it('starts with correct header and Func=4C', () => {
    const syx = programsToSyx(factorySnap);
    expect(syx[0]).toBe(0xF0);
    expect(syx[1]).toBe(0x42);
    expect(syx[2]).toBe(0x30);
    expect(syx[3]).toBe(0x36);
    expect(syx[4]).toBe(0x4C);
    expect(syx[5]).toBe(0x00);
  });

  it('ends with F7', () => {
    const syx = programsToSyx(factorySnap);
    expect(syx[syx.length - 1]).toBe(0xF7);
  });

  it('round-trips all programs through parse', () => {
    const syx = programsToSyx(factorySnap);
    const reparsed = parseSnapshot([syx]);
    expect(reparsed.programs).toHaveLength(100);
    for (let i = 0; i < 100; i++) {
      expect(reparsed.programs[i]).toEqual(factorySnap.programs[i]);
    }
  });

  it('parses back via Func=4C (sources.programs === "0x4C")', () => {
    const syx = programsToSyx(factorySnap);
    const reparsed = parseSnapshot([syx]);
    expect(reparsed.sources.programs).toBe('0x4C');
  });

  it('round-trips Factory Bank B snapshot programs', () => {
    const bankBMsgs = loadSyx(BANK_B_PATH);
    const bankBSnap = parseSnapshot(bankBMsgs);
    const syx = programsToSyx(bankBSnap);
    const reparsed = parseSnapshot([syx]);
    for (let i = 0; i < 100; i++) {
      expect(reparsed.programs[i]).toEqual(bankBSnap.programs[i]);
    }
  });
});
