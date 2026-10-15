# Korg X5DR MIDI Implementation — Master Reference

> **Notice:** transcribed by hand from the Korg X5DR Owner's Manual. The original material is © Korg Inc. It is included as a technical reference for this editor and is not covered by the project's MIT License. This project is not affiliated with or endorsed by Korg.

Transcribed from X5DR Owner's Manual, pp.175–183, 205–206.  
Source PDF: X5DR_Manual.pdf (copy-protected; transcribed via visual render).  
Transcription date: May 2026.  
Operational notes added: May 2026 (from live testing).

---

## File Index

| File | Contents | Manual Pages |
|---|---|---|
| `01_channel_messages.md` | Transmitted & received channel messages, CC map, RPN, Program Change, Active Sensing, Device Inquiry | 175–176 |
| `02_sysex_format.md` | SysEx function code list, all message formats (requests, dumps, writes, ACK/NAK), data packing format (NOTE 1–12) | 177–179 |
| `03_program_parameters.md` | Program Parameter Table 1 (all OSC, EG, MG, VDF, VDA params), TABLE 7 PARAM CHANGE cross-ref, Effect offset table (TABLE 7-1) | 180–181, 183 |
| `04_combi_multi_global_drums.md` | Combination TABLE 2 & TABLE 8, Multi Setup TABLE 3 & TABLE 4 & TABLE 9, Global TABLE 5, Drums TABLE 6 & TABLE 10 | 180, 183 |
| `05_effect_parameters.md` | All 47 effect types with full parameter detail, Dynamic Mod sources, MG Status bits, waveform tables | 181–182 |
| `06_multisound_names.md` | Complete Multisound name list (entries 000–429) for OSC1/OSC2 selection in Program Edit | 205–206 |
| `07_drum_sound_names.md` | Complete Drum Sound name list (entries 000–214) for Drums Edit note assignment | 206 |

---

## Key Architecture Summary

### SysEx Header Structure
```
F0  — Exclusive Status
42  — KORG ID (Manufacturer)
3g  — 0x30 + MIDI Global Channel (g = 0~F)
36  — X5DR ID (Family Code)
[Function Code]
[Data...]
F7  — End of Exclusive
```

### Primary Function Codes

| Func (Hex) | Direction | Description |
|---|---|---|
| 40 | R/T | Program Parameter Dump |
| 4C | R/T | All Program Parameter Dump |
| 49 | R/T | Combination Parameter Dump |
| 4D | R/T | All Combination Parameter Dump |
| 55 | R/T | Multi Setup Data Dump |
| 68 | R/T | Multi Setup Data (Expansion) Dump |
| 51 | R/T | Global Data Dump |
| 52 | R/T | Drums Data Dump |
| 50 | R/T | All Data Dump |
| 41 | R/T | Parameter Change |
| 53 | R/T | Drum Kit Parameter Change |
| 4E | R/T | Mode Change |
| 42 | T | Mode Data |
| 12 | R | Mode Request |
| 23 | T | Data Load Completed (ACK) |
| 24 | T | Data Load Error (NAK) |
| 21 | T | Write Completed |
| 22 | T | Write Error |
| 26 | T | Received Data Format Error |

### Device Identity
- Manufacturer ID: `42` (KORG)
- Family Code (LSB): `36` (X5DR / 05R/W / X5 family)
- Member Code: `14` (X5DR) — `00`=05R/W, `09`=X5

### MIDI Modes
| Mode Code | Description |
|---|---|
| 0 | Combination |
| 1 | Combi Edit |
| 2 | Program |
| 3 | Prog Edit |
| 4 | Multi |
| 5 | Global |

### Data Packing
All dump data is packed from 8-bit to 7-bit MIDI bytes (see NOTE 1 in `02_sysex_format.md`).  
7 bytes of 8-bit data → 8 bytes of 7-bit MIDI data.

### Parameter Change Format (Func=41)
```
41  — Function Code
pp  — Parameter No. LSB (bits 6~0)
pp  — Parameter No. MSB (bits 13~7)
vv  — Value LSB (bits 6~0)
vv  — Value MSB (bits 13~7)
```
Parameter numbers vary by mode — see TABLE 7 (Program), TABLE 8 (Combination), TABLE 9 (Multi).

### Effect System
- 47 effect types total (Type 1~47; Type 0 = OFF)
- 2 independent effect processors (Effect 1 and Effect 2)
- Each effect has up to 8 parameters (offset 00~07)
- Dynamic modulation source per effect (6 sources available)
- Balance and placement controls per effect

---

## Critical Operational Notes (from live testing, May 2026)

These notes are not in the manual. They were discovered through direct testing with the X5DR connected to Chrome via Web MIDI API.

### Mode Change is required before Parameter Change

**The X5DR will NAK (Func=`24`) all incoming Parameter Change messages (Func=`41`) unless the computer has first sent a SysEx Mode Change (Func=`4E`) to the appropriate edit mode.**

This is not documented explicitly in the MIDI implementation appendix. It was discovered by testing — the device accepts bulk dumps (Func=`40`, `4C`, `50` etc.) without this prerequisite, but rejects Parameter Changes until the mode is set via SysEx.

Pressing the Edit button on the front panel does NOT satisfy this requirement from the computer's perspective. The Mode Change must be sent as a SysEx message.

**Correct sequence for Program editing:**
```
Step 1 — Send Mode Change to Prog Edit:
F0 42 3g 36 4E 03 00 F7

Step 2 — Send Parameter Changes freely:
F0 42 3g 36 41 pp pp vv vv F7
```

The Mode Change only needs to be sent once per session. The device remains in Prog Edit mode and accepts all subsequent Parameter Changes until the mode changes again.

**Editor implementation note:** Send the Mode Change automatically when the user selects a program to edit — before any UI controls become interactive.

### What the X5DR transmits on Edit entry

When the X5DR enters Prog Edit mode (whether via front panel or SysEx Mode Change), it transmits:
1. Mode Change (`4E 03 00`) — announcing the new mode
2. Program Parameter Dump (`40`) — the full current program edit buffer
3. Parameter Change (`41`) for the currently selected parameter — with current value

These can be used to initialise the editor's state when a session begins.

### Multiple ACKs per message

When receiving SysEx responses from the X5DR via Web MIDI in Chrome, each response may appear multiple times (typically 3–4). This is because Chrome enumerates multiple logical input ports for the same physical MIDI interface. Only one ACK represents the actual X5DR response. The editor's ACK handler should de-duplicate or treat the first ACK as confirmation.

### Active Sensing

The X5DR transmits Active Sensing (`FE`) continuously on its MIDI Out. Always filter this in the MIDI input handler to prevent log/console flooding:

```javascript
input.onmidimessage = (e) => {
  if (e.data[0] === 0xFE) return;
  // handle message
};
```

### Port selection

Chrome's Web MIDI API enumerates MIDI ports by name. On the hardware-test Mac, the X5DR is accessible as:
- Output: `Korg X5DR <interface>` (the interface's port 2)
- Input: `Korg X5DR <interface>`

Port names may differ on other machines. The editor must provide a user-facing port selector and should select by name match, not by numeric ID (IDs are not stable across restarts).

---

## Notes on This Transcription

- The source PDF is copy-protected (AES encrypted, copy:no). All text was read visually from rasterised page images.
- Tables with many repeated structures (e.g. OSC-2 mirroring OSC-1, Timbres 2–8 mirroring Timbre 1) are noted as such rather than fully duplicated, to keep files manageable.
- Some bit-field descriptions in the original use dense notation; these have been preserved as closely as possible.
- Effect parameter offsets (00)–(07) correspond to positions within each effect's 8-byte parameter block.
- For the full data size calculations and byte-count formulas, see NOTE 2–10 in `02_sysex_format.md`.
- `05_effect_parameters.md` — Tables 11-1, 11-2, and 11-3 manually verified against original manual (June 2026). Accuracy confirmed pending live testing
