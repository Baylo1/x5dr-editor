import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  SYSEX_HEADER, setSysexChannel, getSysexChannel, sysexHeader,
  buildModeChange, buildParamChange, buildDrumParamChange, buildDumpRequest,
  buildProgramWriteRequest, buildCombiWriteRequest, buildSingleProgramDump, buildSingleCombiDump,
  buildMultiEffectsDump, buildMultiExpansionDump, buildGlobalDump, buildDrumsDump,
  isAck, isNak, isFormatError, isWriteCompleted, isWriteError,
} from './sysex.js';
import { parseSnapshot } from './parser.js';
import { snapshotToSyx, programsToSyx, combisToSyx } from './encoder.js';

// The X5DR ignores SysEx whose `3g` byte doesn't match its Global MIDI Channel
// (Landmine #57), so every builder must follow the selected channel and every
// response checker must accept any channel (Archive #186).

afterEach(() => setSysexChannel(0)); // module state: never leak into other tests

const FACTORY = resolve(process.cwd(), 'reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx');
function splitMessages(buf) {
  const msgs = []; let i = 0;
  while (i < buf.length) {
    if (buf[i] !== 0xF0) { i++; continue; }
    const s = i; while (i < buf.length && buf[i] !== 0xF7) i++;
    msgs.push(new Uint8Array(buf.subarray(s, i + 1))); i++;
  }
  return msgs;
}
const FACTORY_MULTI = resolve(process.cwd(), 'reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (Multi Expansion).syx');
const snap = parseSnapshot([...splitMessages(readFileSync(FACTORY)), ...splitMessages(readFileSync(FACTORY_MULTI))]);

describe('default channel', () => {
  it('is MIDI channel 1 and matches the legacy header constant', () => {
    expect(getSysexChannel()).toBe(0);
    expect(sysexHeader()).toEqual(SYSEX_HEADER);
    expect([...buildModeChange(3)].slice(0, 4)).toEqual([0xF0, 0x42, 0x30, 0x36]);
  });
});

describe('setSysexChannel', () => {
  it('masks to 0-15', () => {
    setSysexChannel(16); expect(getSysexChannel()).toBe(0);
    setSysexChannel(9);  expect(getSysexChannel()).toBe(9);
  });

  for (const ch of [1, 4, 15]) {
    it(`every builder addresses channel ${ch + 1} (byte 0x${(0x30 | ch).toString(16)})`, () => {
      setSysexChannel(ch);
      const prog = snap.programs[0];
      const combi = snap.combis[0];
      const builders = {
        buildModeChange: buildModeChange(3),
        buildParamChange: buildParamChange(1, 0, 2, 0),
        buildDrumParamChange: buildDrumParamChange(0, 0, 0),
        buildDumpRequest: buildDumpRequest(0x0F),
        buildProgramWriteRequest: buildProgramWriteRequest(0),
        buildCombiWriteRequest: buildCombiWriteRequest(0),
        buildSingleProgramDump: buildSingleProgramDump(prog),
        buildSingleCombiDump: buildSingleCombiDump(combi),
        buildMultiEffectsDump: buildMultiEffectsDump(snap.multi.effects),
        buildMultiExpansionDump: buildMultiExpansionDump(snap.multi.tracks),
        buildGlobalDump: buildGlobalDump(snap.global),
        buildDrumsDump: buildDrumsDump(snap.drums),
        snapshotToSyx: snapshotToSyx(snap),
        programsToSyx: programsToSyx(snap),
        combisToSyx: combisToSyx(snap),
      };
      for (const [name, bytes] of Object.entries(builders)) {
        const head = [...bytes].slice(0, 4);
        expect(head, name).toEqual([0xF0, 0x42, 0x30 | ch, 0x36]);
      }
    });
  }

  it('only the channel byte differs from the channel-1 output', () => {
    const ch1 = [...buildSingleProgramDump(snap.programs[0])];
    setSysexChannel(6);
    const ch7 = [...buildSingleProgramDump(snap.programs[0])];
    expect(ch7[2]).toBe(0x36);
    ch7[2] = 0x30;
    expect(ch7).toEqual(ch1);
  });

  it('a dump built on a non-default channel still parses', () => {
    setSysexChannel(9);
    const reparsed = parseSnapshot(splitMessages(Buffer.from(snapshotToSyx(snap))));
    expect(reparsed.programs).toHaveLength(100);
    expect(reparsed.programs[0].name).toBe(snap.programs[0].name);
  });
});

describe('response checkers accept any channel', () => {
  const reply = (func, g) => new Uint8Array([0xF0, 0x42, 0x30 | g, 0x36, func, 0xF7]);
  for (const g of [0, 5, 15]) {
    it(`channel ${g + 1}`, () => {
      expect(isAck(reply(0x23, g))).toBe(true);
      expect(isNak(reply(0x24, g))).toBe(true);
      expect(isFormatError(reply(0x26, g))).toBe(true);
      expect(isWriteCompleted(reply(0x21, g))).toBe(true);
      expect(isWriteError(reply(0x22, g))).toBe(true);
    });
  }
  it('still rejects other manufacturers, families and functions', () => {
    expect(isAck(new Uint8Array([0xF0, 0x41, 0x30, 0x36, 0x23, 0xF7]))).toBe(false);
    expect(isAck(new Uint8Array([0xF0, 0x42, 0x30, 0x35, 0x23, 0xF7]))).toBe(false);
    expect(isAck(new Uint8Array([0xF0, 0x42, 0x40, 0x36, 0x23, 0xF7]))).toBe(false);
    expect(isAck(new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x24, 0xF7]))).toBe(false);
  });
});
