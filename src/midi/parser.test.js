import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseSnapshot, parseProgram, parseGlobal, parseDrums, parseCombi, parseMulti, parseMultiEffects, parseMultiTracks } from './parser.js';
import { programsToSyx, combisToSyx } from './encoder.js';
import { buildGlobalDump, buildDrumsDump } from './sysex.js';

// Load reference SysEx dump files once
// Hardware-captured 2026-09-29 (front-panel factory-preset restore + Device >
// Import > All Data, recorded in Snoize) after a previously-used internet
// copy of the factory bank (private archive) was found to diverge from real
// factory content on Program #82 "VeloFlugel" and #97 "SopranoVox" — see src/index.html's FACTORY_SOUNDS_SYX_BASE64 comment.
// Captured as two separate device dumps, matching the app's own Load Factory
// Sounds behavior: All Data (0x50) alone covers Programs/Combis/Global/Drums;
// the standalone Multi Expansion (0x68) dump is only needed for Multi Track
// tests (FACTORY_MULTI_PATH below).
const FACTORY_PATH = resolve(process.cwd(), 'reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (All Data).syx');
const FACTORY_MULTI_PATH = resolve(process.cwd(), 'reference_sysex/X5dr Factory Sounds - Hardware Capture 2026-09-29 (Multi Expansion).syx');
// Factory Bank B, hardware-captured the same way (All Data 0x50 in Pt 1) — a
// second, independent bank for the per-section parser tests below.
const BANK_B_PATH = resolve(process.cwd(), 'reference_sysex/Factory B Bank Pt 1 dump.syx');

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

// ─── parseSnapshot — separate-message file (0x52 + 0x51 + 0x4D + 0x4C) ────────
// A file made of four separate dumps — Drums (0x52) + Global (0x51) + All
// Combis (0x4D) + All Programs (0x4C), in that order — rather than one All
// Data (0x50). Both hardware captures are All Data, so the four messages are
// assembled here from the factory capture with the app's own dump builders
// (byte lengths 967 / 39 / 15550 / 18750, same as a device-made file).

describe('parseSnapshot — separate-message file (Drums + Global + All Combis + All Programs)', () => {
  const factory = parseSnapshot(loadSyx(FACTORY_PATH));
  const msgs = [
    buildDrumsDump(factory.drums),
    buildGlobalDump(factory.global),
    combisToSyx(factory),
    programsToSyx(factory),
  ];
  const snap = parseSnapshot(msgs);

  it('programs section is not null', () => {
    expect(snap.programs).not.toBeNull();
  });

  it('has 100 programs', () => {
    expect(snap.programs).toHaveLength(100);
  });

  it('combis section is not null', () => {
    expect(snap.combis).not.toBeNull();
    expect(snap.combis).toHaveLength(100);
  });

  it('combis are real parsed objects, not null placeholders', () => {
    expect(snap.combis[0]).not.toBeNull();
    expect(typeof snap.combis[0].name).toBe('string');
    expect(snap.combis[0].timbres).toHaveLength(8);
  });

  it('global is not null', () => {
    expect(snap.global).not.toBeNull();
  });

  it('drums is not null', () => {
    expect(snap.drums).not.toBeNull();
  });

  it('multi is null (not present in file)', () => {
    expect(snap.multi).toBeNull();
  });

  it('sources reflect correct function codes', () => {
    expect(snap.sources.programs).toBe('0x4C');
    expect(snap.sources.combis).toBe('0x4D');
    expect(snap.sources.global).toBe('0x51');
    expect(snap.sources.drums).toBe('0x52');
    expect(snap.sources.multi).toBeNull();
  });

  it('every section parses to the same data as the All Data capture it was built from', () => {
    expect(snap.programs).toEqual(factory.programs);
    expect(snap.combis).toEqual(factory.combis);
    expect(snap.global).toEqual(factory.global);
    expect(snap.drums).toEqual(factory.drums);
  });
});

// ─── parseMulti — Factory Sounds hardware capture, Func=0x68 ─────────────────
// The All Data (0x50) capture plus a standalone Func=0x68 Multi
// Expansion dump is the real hardware-captured reference Brief #17 calls for.
// Ground truth (16 GM-default Tracks, matching the manual's stated GM default):
// Tracks 1-9, 11-16 = G01, enabled, Pan=CNT, Send C/D=2/2, Bend Range=+2;
// Track 10 = G129 (the GM drum kit), Pan=PRG, Send C=PRG/Send D=0, Bend Range=0.

describe('parseMulti — Factory Sounds (Func=0x68 expansion dump)', () => {
  const msgs = [...loadSyx(FACTORY_PATH), ...loadSyx(FACTORY_MULTI_PATH)];
  const snap = parseSnapshot(msgs);

  it('populates multi.tracks with 16 entries', () => {
    expect(snap.multi).not.toBeNull();
    expect(snap.multi.tracks).toHaveLength(16);
  });

  it('Track 10 (index 9) is the GM drum kit, G129', () => {
    const t = snap.multi.tracks[9];
    expect(t.bankG).toBe(true);
    expect(t.programNo).toBe(128); // 0-indexed Bank G -> display G129
  });

  it('Track 10 Pan is the PRG sentinel', () => {
    expect(snap.multi.tracks[9].pan).toBe('prg');
  });

  it('Track 10 Send C is PRG, Send D is 0', () => {
    expect(snap.multi.tracks[9].sendC).toBe(10); // SEND_PRG_RAW
    expect(snap.multi.tracks[9].sendD).toBe(0);
  });

  it('Track 10 Bend Range is 0, all other tracks are +2', () => {
    snap.multi.tracks.forEach((t, n) => {
      expect(t.bendRange).toBe(n === 9 ? 0 : 2);
    });
  });

  it('all other tracks are G01, enabled, Pan=CNT (0x0F)', () => {
    snap.multi.tracks.forEach((t, n) => {
      if (n === 9) return;
      expect(t.bankG).toBe(true);
      expect(t.programNo).toBe(0);
      expect(t.enabled).toBe(true);
      expect(t.pan).toBe(0x0F);
    });
  });

  it('every track has a real (never-null) programNo', () => {
    for (const t of snap.multi.tracks) {
      expect(typeof t.programNo).toBe('number');
    }
  });

  it('every track exposes boolean filter flags', () => {
    for (const t of snap.multi.tracks) {
      expect(typeof t.filters.programChange).toBe('boolean');
      expect(typeof t.filters.damper).toBe('boolean');
      expect(typeof t.filters.afterTouch).toBe('boolean');
      expect(typeof t.filters.controlChange).toBe('boolean');
    }
  });
});

// ─── parseMultiEffects / parseMultiTracks / parseMulti — direct unit tests ──

describe('parseMultiEffects', () => {
  it('decodes a real captured 29-byte Multi Effects block (from the All Data dump)', () => {
    // Captured from the factory bank's Func=0x50 payload, Multi offset.
    const bytes = [
      0x01, 0x13, 0x64, 0x64, 0x64, 0x64, 0x44, 0x44, 0x3f,
      0x12, 0x00, 0x1f, 0x3c, 0x3e, 0x00, 0xff, 0xfd,
      0x00, 0x00,
      0x63, 0x0a, 0x03, 0x00, 0x1a, 0x00, 0x04, 0x04,
      0x00, 0x00,
    ];
    const effects = parseMultiEffects(bytes);
    expect(effects.eff1Type).toBe(1);
    expect(effects.eff2Type).toBe(0x13);
    // effNParams are in Parameter Change order (effectLayout.js). Eff1 Hall:
    // Reverb Time 18, Pre Delay 60, E.R Level 62, Hi Damp 31, EQ Low -3,
    // EQ High -1 — matching the manual's own Hall defaults exactly.
    expect(effects.eff1Params).toEqual([18, 60, 62, 31, -3, -1, 0]);
    // Eff2 Stereo Chorus 1: Delay Time 26, Mod Speed 10, Mod Depth 99,
    // Tri (MG Status 3 = bit0 Tri + hardwired bit1), EQ Low 4, EQ High 4.
    expect(effects.eff2Params).toEqual([26, 10, 99, 1, 4, 4, 0]);
    // The raw dump blocks are kept alongside for byte-exact re-encoding.
    expect(effects.eff1DumpParams).toEqual([0x12, 0x00, 0x1f, 0x3c, 0x3e, 0x00, 0xff, 0xfd]);
    expect(effects.eff2DumpParams).toEqual([0x63, 0x0a, 0x03, 0x00, 0x1a, 0x00, 0x04, 0x04]);
  });
});

describe('parseMultiTracks', () => {
  it('throws nothing and returns 16 tracks for an all-zero block', () => {
    const tracks = parseMultiTracks(new Uint8Array(208));
    expect(tracks).toHaveLength(16);
    expect(tracks[0].programNo).toBe(0);
    expect(tracks[0].enabled).toBe(true); // Track SW bit4=0 -> ON
    expect(tracks[0].bendRange).toBe(0);
  });
});

describe('parseMulti (combining wrapper)', () => {
  it('combines effects and tracks when both are supplied', () => {
    const multi = parseMulti(new Uint8Array(29), new Uint8Array(208));
    expect(multi.effects).not.toBeNull();
    expect(multi.tracks).toHaveLength(16);
  });

  it('leaves tracks null when only effects bytes are supplied', () => {
    const multi = parseMulti(new Uint8Array(29));
    expect(multi.effects).not.toBeNull();
    expect(multi.tracks).toBeNull();
  });

  it('leaves effects null when only expansion bytes are supplied', () => {
    const multi = parseMulti(undefined, new Uint8Array(208));
    expect(multi.effects).toBeNull();
    expect(multi.tracks).toHaveLength(16);
  });
});

// ─── parseSnapshot — X5dr Factory Sounds (hardware capture) ────────────────
// Captured as two separate device dumps — All Data (0x50) plus a standalone
// Multi Expansion (0x68) — so both files are loaded together here.

describe('parseSnapshot — X5dr Factory Sounds (hardware capture)', () => {
  const msgs = [...loadSyx(FACTORY_PATH), ...loadSyx(FACTORY_MULTI_PATH)];
  const snap = parseSnapshot(msgs);

  it('programs section is not null', () => {
    expect(snap.programs).not.toBeNull();
    expect(snap.programs).toHaveLength(100);
  });

  it('combis section is not null', () => {
    expect(snap.combis).not.toBeNull();
    expect(snap.combis).toHaveLength(100);
  });

  it('global is not null', () => {
    expect(snap.global).not.toBeNull();
  });

  it('drums is not null', () => {
    expect(snap.drums).not.toBeNull();
  });

  it('multi is populated — effects from 0x50, tracks from the standalone 0x68', () => {
    expect(snap.multi).not.toBeNull();
    expect(snap.multi.effects).not.toBeNull();
    expect(snap.multi.tracks).toHaveLength(16);
  });

  it('sources.multi reflects both function codes (0x50 for effects, 0x68 appended for tracks)', () => {
    expect(snap.sources.multi).toBe('0x50+0x68');
  });

  it('sources.programs comes from 0x50', () => {
    expect(snap.sources.programs).toBe('0x50');
  });
});

// ─── parseProgram — Factory Bank B, program 00 ───────────────────────────────

describe('parseProgram — Factory Bank B 00', () => {
  const msgs  = loadSyx(BANK_B_PATH);
  const snap  = parseSnapshot(msgs);
  const prog0 = snap.programs[0];

  it('name is "Sunrise"', () => {
    expect(prog0.name).toBe('Sunrise');
  });

  it('OSC mode is 1 (Double)', () => {
    expect(prog0.osc.mode).toBe(1);
  });

  it('has osc1 and osc2 objects', () => {
    expect(prog0.osc1).toBeDefined();
    expect(prog0.osc2).toBeDefined();
  });

  it('osc1.multisound is in valid range (0-429)', () => {
    expect(prog0.osc1.multisound).toBeGreaterThanOrEqual(0);
    expect(prog0.osc1.multisound).toBeLessThanOrEqual(429);
  });

  it('osc1.level is in valid range (0-99)', () => {
    expect(prog0.osc1.level).toBeGreaterThanOrEqual(0);
    expect(prog0.osc1.level).toBeLessThanOrEqual(99);
  });
});

// ─── parseProgram — Factory Sounds, program A00 ──────────────────────────────

describe('parseProgram — Factory A00', () => {
  const msgs  = loadSyx(FACTORY_PATH);
  const snap  = parseSnapshot(msgs);
  const prog0 = snap.programs[0];

  it('name is "PipeDreams"', () => {
    expect(prog0.name).toBe('PipeDreams');
  });

  it('OSC mode is in valid range (0-2)', () => {
    expect(prog0.osc.mode).toBeGreaterThanOrEqual(0);
    expect(prog0.osc.mode).toBeLessThanOrEqual(2);
  });
});

// ─── parseCombi — Factory Bank B, combi 00 ───────────────────────────────────

describe('parseCombi — Factory Bank B 00', () => {
  const msgs   = loadSyx(BANK_B_PATH);
  const snap   = parseSnapshot(msgs);
  const combi0 = snap.combis[0];

  it('has a trimmed name string', () => {
    expect(typeof combi0.name).toBe('string');
    expect(combi0.name).toBe(combi0.name.trimEnd());
  });

  it('has an effects object', () => {
    expect(combi0.effects).toBeDefined();
    expect(combi0.effects.eff1Type).toBeGreaterThanOrEqual(0);
  });

  it('has exactly 8 timbres', () => {
    expect(combi0.timbres).toHaveLength(8);
  });

  it('each timbre has a valid midiChannel (0-15)', () => {
    for (const t of combi0.timbres) {
      expect(t.midiChannel).toBeGreaterThanOrEqual(0);
      expect(t.midiChannel).toBeLessThanOrEqual(15);
    }
  });

  it('each timbre pan is a number or the sentinel strings "prg"/"off"', () => {
    for (const t of combi0.timbres) {
      expect(['prg', 'off'].includes(t.pan) || typeof t.pan === 'number').toBe(true);
    }
  });

  it('each timbre exposes boolean filter flags', () => {
    for (const t of combi0.timbres) {
      expect(typeof t.filters.programChange).toBe('boolean');
      expect(typeof t.filters.damper).toBe('boolean');
      expect(typeof t.filters.afterTouch).toBe('boolean');
      expect(typeof t.filters.controlChange).toBe('boolean');
    }
  });
});

// ─── parseCombi — Factory Sounds, combi A00 ──────────────────────────────────

describe('parseCombi — Factory A00', () => {
  const msgs   = loadSyx(FACTORY_PATH);
  const snap   = parseSnapshot(msgs);
  const combi0 = snap.combis[0];

  it('has 8 timbres with programNo in valid range', () => {
    expect(combi0.timbres).toHaveLength(8);
    for (const t of combi0.timbres) {
      expect(t.programNo).toBeGreaterThanOrEqual(0);
      expect(t.programNo).toBeLessThanOrEqual(135);
    }
  });

  it('bankG is a boolean on every timbre', () => {
    for (const t of combi0.timbres) {
      expect(typeof t.bankG).toBe('boolean');
    }
  });
});

// ─── parseGlobal — Factory Bank B ────────────────────────────────────────────

describe('parseGlobal — Factory Bank B', () => {
  const msgs = loadSyx(BANK_B_PATH);
  const snap = parseSnapshot(msgs);
  const g    = snap.global;

  it('masterTune is in valid range (-50 to +50)', () => {
    expect(g.masterTune).toBeGreaterThanOrEqual(-50);
    expect(g.masterTune).toBeLessThanOrEqual(50);
  });

  it('keyTranspose is in valid range (-12 to +12)', () => {
    expect(g.keyTranspose).toBeGreaterThanOrEqual(-12);
    expect(g.keyTranspose).toBeLessThanOrEqual(12);
  });

  it('velocityCurve is in valid range (0-7)', () => {
    expect(g.velocityCurve).toBeGreaterThanOrEqual(0);
    expect(g.velocityCurve).toBeLessThanOrEqual(7);
  });
});

// ─── parseDrums — Factory Bank B ─────────────────────────────────────────────

describe('parseDrums — Factory Bank B', () => {
  const msgs = loadSyx(BANK_B_PATH);
  const snap = parseSnapshot(msgs);
  const drums = snap.drums;

  it('drums is an array of 2 kits', () => {
    expect(drums).toHaveLength(2);
  });

  it('drums[0].notes has length 60', () => {
    expect(drums[0].notes).toHaveLength(60);
  });

  it('drums[1].notes has length 60', () => {
    expect(drums[1].notes).toHaveLength(60);
  });

  it('notes with enabled=true have instNo in valid range (0-214)', () => {
    for (const kit of drums) {
      for (const note of kit.notes) {
        if (note.enabled) {
          expect(note.instNo).toBeGreaterThanOrEqual(0);
          expect(note.instNo).toBeLessThanOrEqual(214);
        }
      }
    }
  });

  it('notes with enabled=false have instNo = 0', () => {
    for (const kit of drums) {
      for (const note of kit.notes) {
        if (!note.enabled) {
          expect(note.instNo).toBe(0);
        }
      }
    }
  });

  it('first note has valid fields', () => {
    const note = drums[0].notes[0];
    expect(typeof note.enabled).toBe('boolean');
    expect(note.instNo).toBeGreaterThanOrEqual(0);
    expect(note.pan).toBeGreaterThanOrEqual(0);
    expect(note.pan).toBeLessThanOrEqual(30);
  });
});
