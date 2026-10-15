# Korg X5DR MIDI Implementation — System Exclusive Messages

> **Notice:** transcribed by hand from the Korg X5DR Owner's Manual. The original material is © Korg Inc. It is included as a technical reference for this editor and is not covered by the project's MIT License. This project is not affiliated with or endorsed by Korg.

Source: X5DR Owner's Manual, pp.177–179

---

## 2-4 Universal System Exclusive Message (Realtime)

| Byte [H] | Description      | Note |
| -------- | ---------------- | ---- |
| F0       | Exclusive Status |      |
| 7F       | Realtime Message |      |
| gg       | MIDI Channel     | *5   |
| 04       | Sub ID 1         |      |
| 0b       | Sub ID 2         | *7   |
| vv       | Value (LSB)      | *7   |
| mm       | Value (MSB)      | *7   |
| F7       | End of Exclusive |      |

**\*7:**
- b = 01: Master Volume (mm,vv = 00,00~7F,7F: Min~Max)
- b = 02: Master Balance (mm,vv = 00,00~40,00~7F,7F: L~Center~R)

---

## 2-5 System Exclusive Messages

### Function Code List

| Func [H] | Description                                           | G   | C   | P   | M   | No. |
| -------- | ----------------------------------------------------- | --- | --- | --- | --- | --- |
| 12       | Mode Request                                          | O   | O   | O   | O   | 42  |
| 10       | Program Parameter Dump Request                        |     |     | O   |     | 40  |
| 1C       | All Program Parameter Dump Request                    | •   | O   | O   | O   | 4C  |
| 19       | Combination Parameter Dump Request                    |     | O   |     |     | 49  |
| 1D       | All Combination Parameter Dump Request                | •   | O   | O   | O   | 4D  |
| 06       | Multi Setup Data Dump Request                         | •   | O   | O   | O   | 55  |
| 33       | Multi Setup Data (exp) Dump Request                   | •   | O   | O   | O   | 68  |
| 0E       | Global Data Dump Request                              | •   | O   | O   | O   | 51  |
| 0D       | Drums Data Dump Request                               | •   | O   | O   | O   | 52  |
| 0F       | All Data (Global, Drums, Combi, Prog, Multi) Dump Req | •   | O   | O   | O   | 50  |
| 11       | Program Write Request                                 |     |     | O   |     | 21  |
| 1A       | Combination Write Request                             |     | O   |     |     | 21  |
| 40       | Program Parameter Dump                                |     |     | O   |     | 23  |
| 4C       | All Program Parameter Dump                            | •   | O   | O   | O   | 23  |
| 49       | Combination Parameter Dump                            |     | O   |     |     | 23  |
| 4D       | All Combination Parameter Dump                        | •   | O   | O   | O   | 23  |
| 55       | Multi Setup Data Dump                                 | •   | O   | O   | O   | 23  |
| 68       | Multi Setup Data (exp) Dump                           | •   | O   | O   | O   | 23  |
| 51       | Global Data Dump                                      | •   | O   | O   | O   | 23  |
| 52       | Drums Data Dump                                       | •   | O   | O   | O   | 23  |
| 50       | All Data (Global, Drums, Combi, Prog, Multi) Dump     | •   | O   | O   | O   | 23  |
| 4E       | Mode Change                                           | O   | O   | O   | O   | 23  |
| 41       | Parameter Change                                      |     | O   | O   |     | 23  |
| 53       | Drum Kit Parameter Change                             | O   |     |     |     | 23  |

**Receive when in:**
- G = Global mode (• = Does not respond to Exclusive ENA, DIS in Data Dump Page)
- C = Combi, Combi Edit mode
- P = Prog, Prog Edit mode
- M = Multi mode

**No.** = MIDI Out Function No. (transmitted after the message has been received)


---

## 3. MIDI Exclusive Format (R=Receive, T=Transmit)

**Structure:** See 'Structure of Korg X5DR System Exclusive Messages' (top page).

**Omit Exclusive Header ([F0],[42],[3g],[36]) and state from Function Code here.**

### (1) Mode Request — R
| Byte [H] | Description |
|---|---|
| 12 | Mode Request |
| F7 | EOX |

*Receives this message, and transmits Func=42 message.*

### (2) Program Parameter Dump Request — R
| Byte [H] | Description |
|---|---|
| 10 | Program Parameter Dump Request |
| F7 | EOX |

*Receives this message, and transmits Func=40 or Func=24 message.*

### (3) All Program Parameter Dump Request — R
| Byte [H] | Description |
|---|---|
| 1C | All Program Parameter Dump Request |
| 00 | |
| F7 | EOX |

*Receives this message, and transmits Func=4C or Func=24 message.*

### (4) Combination Parameter Dump Request — R
| Byte [H] | Description |
|---|---|
| 19 | Combination Parameter Dump Request |
| F7 | EOX |

*Receives this message, and transmits Func=49 or Func=24 message.*

### (5) All Combination Parameter Dump Request — R
| Byte [H] | Description                            |
| -------- | -------------------------------------- |
| 1D       | All Combination Parameter Dump Request |
| 00       |                                        |
| F7       | EOX                                    |

*Receives this message, and transmits Func=4D or Func=24 message.*

### (6) Multi Setup Data Dump Request — R
| Byte [H] | Description |
|---|---|
| 06 | Multi Setup Data Dump Request |
| 00 | |
| F7 | EOX |

*Receives this message, and transmits Func=55 or Func=24 message.*

### (7) Multi Setup Data (Expansion) Dump Request — R
| Byte [H] | Description |
|---|---|
| 33 | Multi Setup Data (exp) Dump Request |
| 00 | |
| F7 | EOX |

*Receives this message, and transmits Func=68 or Func=24 message.*

### (8) Global Data Dump Request — R
| Byte [H] | Description |
|---|---|
| 0E | Global Data Dump Request |
| 00 | |
| F7 | EOX |

*Receives this message, and transmits Func=51 or Func=24 message.*

### (9) Drums Data Dump Request — R
| Byte [H] | Description |
|---|---|
| 0D | Drums Data Dump Request |
| 00 | |
| F7 | EOX |

*Receives this message, and transmits Func=52 or Func=24 message.*

### (10) All Data (Glob, Drum, Combi, Prog, Multi) Dump Request — R
| Byte [H] | Description |
|---|---|
| 0F | All Data (GLB, DRM, CMB, PRG, MLT) Dump Req |
| 00 | |
| F7 | EOX |

*Receives this message, and transmits Func=50 or Func=24 message.*

### (11) Program Write Request — R
| Byte [H] | Description |
|---|---|
| 11 | Program Write Request |
| 00 | |
| pp | Write Destination Program No. (0–99) — If pp > 99 then pp ← pp-100 |
| F7 | EOX |

*Receives this message, writes the data and transmits Func=21 or Func=22 message.*

### (12) Combination Write Request — R
| Byte [H] | Description |
|---|---|
| 1A | Combination Write Request |
| 00 | |
| pp | Write Destination Combination No. (0–99) — If pp > 99 then pp ← pp-100 |
| F7 | EOX |

*Receives this message, writes the data and transmits Func=21 or Func=22 message.*

### (13) Program Parameter Dump — R, T
| Byte [H] | Description |
|---|---|
| 40 | Program Parameter Dump |
| dd | Data (NOTE 1, 2) |
| ⋮ | ⋮ |
| F7 | EOX |

*Receives this message & data, saves them to Edit Buffer and transmits Func=23 or Func=24 message.*  
*Receives Func=10 message, and transmits this message & data from Edit Buffer.*  
*When enter the PROGRAM EDIT Mode, transmits this message & data from Edit Buffer.*

### (14) All Program Parameter Dump — R, T
| Byte [H] | Description |
|---|---|
| 4C | All Program Parameter Dump |
| 00 | |
| dd | Data (NOTE 1, 3) |
| ⋮ | ⋮ |
| F7 | EOX |

*Receives this message & data, saves them to Internal Memory and transmits Func=23 or Func=24 message.*  
*Receives Func=1C message, and transmits this message & data from Internal Memory.*  
*When DATA DUMP is executed, transmits this message & data from Internal Memory.*

### (15) Combination Parameter Dump — R, T
| Byte [H] | Description |
|---|---|
| 49 | Combination Parameter Dump |
| dd | Data (NOTE 1, 4) |
| ⋮ | ⋮ |
| F7 | EOX |

*Receives this message & data, saves to Edit Buffer and transmits Func=23 or Func=24 message.*  
*Receives Func=19 message, and transmits this message & data from Edit Buffer.*  
*When the Combi No. is changed by SW, transmits this message & data from Edit Buffer.*

### (16) All Combination Parameter Dump — R, T
| Byte [H] | Description |
|---|---|
| 4D | All Combination Parameter Dump |
| 00 | |
| dd | Data (NOTE 1, 5) |
| ⋮ | ⋮ |
| F7 | EOX |

*Receives this message & data, saves to Internal Memory and transmits Func=23 or Func=24 message.*  
*Receives Func=1D message, and transmits this message & data from Internal Memory.*  
*When DATA DUMP is executed, transmits this message & data from Internal Memory.*

### (17) Multi Setup Data Dump — R, T
| Byte [H] | Description |
|---|---|
| 55 | Multi Setup Data Dump |
| 00 | |
| dd | Data (NOTE 1, 6) |
| ⋮ | ⋮ |
| F7 | EOX |

*Receives this message & data, save to Edit Buffer and transmits Func=23 or Func=24 message.*  
*Receives Func=06 message, and transmits this message & data from Edit Buffer.*  
*When DATA DUMP is executed, transmits this message & data and Func=68 message from Edit Buffer.*

### (18) Multi Setup Data (Expansion) Dump — R, T
*These messages and data are not compatible with 05R/W.*

| Byte [H] | Description |
|---|---|
| 68 | Multi Setup Data (expansion) Dump |
| dd | Data (NOTE 1, 7) |
| ⋮ | ⋮ |
| F7 | EOX |

*Receives this message & data, save to Edit Buffer and transmits Func=23 or Func=24 message.*  
*Receives Func=33 message, and transmits this message & data from Edit Buffer.*  
*When DATA DUMP is executed, transmits Func=55 message and this message & data from Edit Buffer.*

### (19) Global Data Dump — R, T
| Byte [H] | Description |
|---|---|
| 51 | Global Data Dump |
| 00 | |
| dd | Data (NOTE 1, 8) |
| ⋮ | ⋮ |
| F7 | EOX |

*Receives this message & data, save to Internal Memory and transmits Func=23 or Func=24 message.*  
*Receives Func=0E message, and transmits this message & data from Internal Memory.*  
*When DATA DUMP is executed, transmits this message & data from Internal Memory.*

### (20) Drums Data Dump — R, T
| Byte [H] | Description |
|---|---|
| 52 | Drums Data Dump |
| 00 | |
| dd | Data (NOTE 1, 9) |
| ⋮ | ⋮ |
| F7 | EOX |

*Receives this message & data, save to Internal Memory and transmits Func=23 or Func=24 message.*  
*Receives Func=0D message, and transmits this message & data from Internal Memory.*  
*When DATA DUMP is executed, transmits this message & data from Internal Memory.*

### (21) All Data (Global, Drums, Combi, Prog, Multi) Dump — R, T
| Byte [H] | Description |
|---|---|
| 50 | All Data (GLBL, DRUM, COMB, PROG, MULT) Dump |
| 00 | |
| dd | Data (NOTE 1, 10) |
| ⋮ | ⋮ |
| F7 | EOX |

*Receives this message & data, save to Internal Memory and transmits Func=23 or Func=24 message.*  
*Receives Func=0F message, and transmits this message & data from Internal Memory.*  
*When DATA DUMP is executed, transmits this message & data from Internal Memory and Func=68 message.*

### (22) Mode Change — R, T
| Byte [H] | Description |
|---|---|
| 4E | Mode Change |
| 0m | Mode Data (NOTE 11) |
| 00 | |
| F7 | EOX |

*Receives this message & data, changes the Mode, and transmits Func=23 or Func=24.*  
*When the Mode is changed by SW, transmits this message & data.*

### (23) Parameter Change — R, T
| Byte [H] | Description |
|---|---|
| 41 | Parameter Change |
| pp | Parameter No. (LSB bit6~0) — (TABLE 7~9) |
| pp | Parameter No. (MSB bit13~7) — (TABLE 7~9) |
| vv | Value (LSB bit6~0) — (NOTE 12) |
| vv | Value (MSB bit13~7) — (NOTE 12) |
| F7 | EOX |

*Receives this message & data, select & change a Parameter and transmits Func=23 or Func=24 message.*  
*When the Parameter No. is changed by SW, transmits this message & data.*

### (24) Drum Kit Parameter Change — R, T
| Byte [H] | Description |
|---|---|
| 53 | Drum Kit Parameter Change |
| 00 | |
| ss | Index No. (ss=00~59, 60~119: DK1, 2) |
| 0p | Parameter No. — (TABLE 10) |
| vv | Value (LSB bit6~0) — (NOTE 12) |
| vv | Value (MSB bit13~7) — (NOTE 12) |
| F7 | EOX |

*Receives this message & data, select & change a Parameter and transmits Func=23 or Func=24 message.*  
*When the Parameter No. is changed by SW, transmits this message & data.*

### (25) Mode Data — T
| Byte [H] | Description |
|---|---|
| 42 | Mode Data |
| 0m | Mode Data (NOTE 11) |
| 00 | |
| 04 | |
| F7 | EOX |

*Receives Func=12 message, and transmits this message & data.*

### (26) Received Data Format Error — T
| Byte [H] | Description |
|---|---|
| 26 | Received Data Format Error |
| F7 | EOX |

*When found an error in the received message (e.g. data length), transmits this message.*

### (27) Data Load Completed (ACK) — T
| Byte [H] | Description |
|---|---|
| 23 | Data Load Completed |
| F7 | EOX |

*When DATA LOAD, PROCESSING have been completed, transmits this message.*

### (28) Data Load Error (NAK) — T
| Byte [H] | Description |
|---|---|
| 24 | Data Load Error |
| F7 | EOX |

*When DATA LOAD, PROCESSING have not been completed (e.g. protected), transmits this message.*

### (29) Write Completed — T
| Byte [H] | Description |
|---|---|
| 21 | Write Completed |
| F7 | EOX |

*When DATA WRITE MIDI has been completed, transmits this message.*

### (30) Write Error — T
| Byte [H] | Description |
|---|---|
| 22 | Write Error |
| F7 | EOX |

*When DATA WRITE MIDI has not been completed, transmits this message.*

---

## Data Format Notes

### NOTE 1: Dump Data Convert (n=0~ for NOTE 2~10)

Data is packed from 8-bit bytes to 7-bit MIDI bytes:

```
DATA (1 set = 8bit x 7Byte):
b7 ~ b0 | b7 ~ b0 | b7  ...  b0 | b7 ~ b0
7n+0      7n+1      7n+2 ... 7n+5    7n+6

MIDI DATA (1 set = 7bit x 8Byte):
0b7b7b7b7b7b7b7 | 0b6~b0 | 0b6  ...  b0 | 0b6~b0
7n+6,5,4,3,2,1,0  7n+0   7n+1 ... 7n+5   7n+6
```

### NOTE 2: Program Parameter (in current buffer) Dump Format (See TABLE 1, NOTE 1)
`[Parameter No.00], ……, [Parameter No.165]`  
164Bytes = 7×23+3 → 8×23+(1+3) = 188Bytes

### NOTE 3: All Program Parameter (in internal memory) Dump Format (See NOTE 1)
`[Prog A 00 (164Bytes)], ……, [Prog A 99 (164Bytes)]`  
164×100Bytes = 7×2342+6 → 8×2342+(1+6) = 18743Bytes (6.0 Sec)

### NOTE 4: Combination Parameter (in current buffer) Dump Format (See TABLE 2, NOTE 1)
`[Parameter No.00], ……, [Parameter No.135]`  
136Bytes = 7×19+3 → 8×19+(1+3) = 156Bytes

### NOTE 5: All Combination Parameter (in internal memory) Dump Format (See NOTE 1)
`[Combi 00 (136Bytes)], ……, [Combi 99 (136Bytes)]`  
136×100Bytes = 7×1942+6 → 8×1942+(1+6) = 15543Bytes (5.0 Sec)

### NOTE 6: Multi Setup (in internal memory) Dump Format (See TABLE 3, NOTE 1)
`[Multi parameter(Effects)(29Bytes)]`  
29Bytes = 7×4+1 → 8×4+(1+1) = 34Bytes — **[Multi parameter(expansion)(208Bytes)]**  
208Bytes = 7×29+5 → 8×29+(1+5) = 238Bytes

### NOTE 7: Multi Setup Data (expansion) (in internal memory) Dump Format (See TABLE 4, NOTE 1)
`[Multi parameter(expansion)(208Bytes)]`  
208Bytes = 7×29+5 → 8×29+(1+5) = 238Bytes

### NOTE 8: Global Data (in internal memory) Dump Format (See TABLE 5, NOTE 1)
`[Global Data (28Bytes)]`  
28Bytes = 7×4+0 → 8×4 = 32Bytes

### NOTE 9: Drums Data (in internal memory) Dump Format (See TABLE 6, NOTE 1)
`[Drum Kit Data (7×60×2Bytes)]`  
840Bytes = 7×120+0 → 8×120 = 960Bytes

### NOTE 10: All Data (Global, Drums, Combi, Prog, Multi) Dump Format (See NOTE 1, 8, 9, 5, 3, 6)
`[Global Data], [Drums Data], [All Combination Parameter Data], [All Program Parameter Data], [Multi setup Data]`  
28+840+13600+16400+29Bytes = 7×4413+6 → 8×4413+(1+6) = 35311Bytes (11.3 Sec)

### NOTE 11: mmm = 0: Combination / 1: Combi Edit / 2: Program / 3: Prog Edit / 4: Multi / 5: Global

### NOTE 12: Value Data Format (used at PARAMETER CHANGE, DRUM KIT PARAMETER CHANGE)
Bits 15~13 of Value Data are the Sign Flag; each bit has the same value.

```
Value Data: [sign][sign][sign] [bit12] ... [bit0]
MIDI Data:  [0]   [sign][sign][sign][b12]...[b7]  |  [0][b6]...[b0]
```
