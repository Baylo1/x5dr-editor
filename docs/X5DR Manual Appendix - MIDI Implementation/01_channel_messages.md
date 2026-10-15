# Korg X5DR MIDI Implementation — Channel Messages

> **Notice:** transcribed by hand from the Korg X5DR Owner's Manual. The original material is © Korg Inc. It is included as a technical reference for this editor and is not covered by the project's MIT License. This project is not affiliated with or endorsed by Korg.

Source: X5DR Owner's Manual, pp.175–176

---

## 1. Transmitted Data

### 1-1 Channel Messages `[D]=Decimal [H]=Hex`

| Status [Hex] | Second [D][H] | Third [D][H] | Description       | Transmitted when…       | Note | ENA |
| ------------ | ------------- | ------------ | ----------------- | ----------------------- | ---- | --- |
| Bg           | 00 (00)       | mm (mm)      | Bank Select (MSB) | select a Prog/Combi     | *1   | P   |
| Bg           | 06 (06)       | vv (vv)      | Data Entry (MSB)  | use Skip Value Function |      | E   |
| Bg           | 32 (20)       | bb (bb)      | Bank Select (LSB) | select a Program        | *1   | P   |
| Bg           | 38 (26)       | vv (vv)      | Data Entry (LSB)  | use Skip Value Function |      | E   |
| Bg           | 96 (60)       | 00 (00)      | Data Increment    | use a Value Up key      |      | E   |
| Bg           | 97 (61)       | 00 (00)      | Data Decrement    | use a Value Down key    |      | E   |
| Cg           | pp (pp)       | —            | Program Change    | select a Prog/Combi     | *1   | P   |

**g** = Always Global Channel No. (0–F)  
**vv** = Value

**ENA:**
- `P` = Enabled when Program Filter in GLOBAL mode is ENA, PRG (NUM)
- `E` = Enabled when Exclusive Filter in GLOBAL mode is ENA

**\*1 :

| Program       | MIDI Out [Hex]         |
| ------------- | ---------------------- |
| Bank A 00-99  | mm,bb,pp = 00,00,00~63 |
| Bank G 01~128 | mm,bb,pp = 38,00,00~7F |
| Bank G 129    | mm,bb,pp = 3E,00,00    |
| Bank G 130    | mm,bb,pp = 3E,00,10    |
| Bank G 131    | mm,bb,pp = 3E,00,19    |
| Bank G 132    | mm,bb,pp = 3E,00,20    |
| Bank G 133    | mm,bb,pp = 3E,00,28    |
| Bank G 134    | mm,bb,pp = 3E,00,40    |
| Bank G 135    | mm,bb,pp = 3E,00,18    |
| Bank G 136    | mm,bb,pp = 3E,00,30    |

### 1-2 System Realtime Messages

| Status [H] | Description    |
| ---------- | -------------- |
| FE         | Active Sensing |

### 1-3 Universal System Exclusive Messages (Device Inquiry Reply)

| Byte [H] | Description                                                      |
| -------- | ---------------------------------------------------------------- |
| F0       | Exclusive Status                                                 |
| 7E       | Non Realtime Message                                             |
| 0g       | MIDI Global Channel (DEVICE ID)                                  |
| 06       | Inquiry Message                                                  |
| 02       | Identity Reply                                                   |
| 42       | KORG ID (Manufacturers ID)                                       |
| 36       | X5DR ID (Family Code LSB) — 05R/W and X5 series are family       |
| 00       | X5DR ID (Family Code MSB)                                        |
| 14       | X5DR ID (Member Code LSB) — Member code 00=05R/W, 09=X5, 14=X5DR |
| 00       | X5DR ID (Member Code MSB)                                        |
| **       | ROM No. 1~ (Minor Ver. LSB)                                      |
| 00       | ROM No. 1~ (Minor Ver. MSB)                                      |
| **       | Soft Ver. 1~ (Major Ver. LSB)                                    |
| 00       | Soft Ver. 1~ (Major Ver. MSB)                                    |
| F7       | End of Exclusive                                                 |

*Transmits when Inquiry Message Request received.*

### 1-4 Transmits Function Code List

| Func [H] | Description                                       | R   | D   | E   | C   |
| -------- | ------------------------------------------------- | --- | --- | --- | --- |
| 42       | Mode Data                                         | O   |     |     |     |
| 4E       | Mode Change                                       |     |     |     | O*2 |
| 41       | Parameter Change                                  |     |     |     | O*3 |
| 53       | DrumKit Parameter Change                          |     |     |     | O*4 |
| 40       | Program Parameter Dump                            | O   |     |     | O*5 |
| 4C       | All Program Parameter Dump                        | O   | O   |     |     |
| 49       | Combination Parameter Dump                        | O   |     |     | O*6 |
| 4D       | All Combination Parameter Dump                    | O   | O   |     |     |
| 55       | Multi Setup Data Dump                             | O   | O*7 |     |     |
| 68       | Multi Setup Data (Exp) Dump                       | O   | O*7 |     |     |
| 51       | Global Data Dump                                  | O   | O   |     |     |
| 52       | Drums Data Dump                                   | O   | O   |     |     |
| 50       | All Data (Global, Drums, Combi, Prog, Multi) Dump | O   | O*8 |     |     |
| 26       | Received Message Format Error                     | O   |     | O   |     |
| 23       | Data Load Completed (ACK)                         |     |     | O   |     |
| 24       | Data Load Error (NAK)                             |     |     | O   |     |
| 21       | Write Completed                                   |     |     | O   |     |
| 22       | Write Error                                       |     |     | O   |     |

**Transmitted when:**
- R = Request Message is received
- D = Data dump by SW (Don't respond to Exclusive ENA, DIS)
- E = After EX Message received
- C = Mode or No. is changed by SW

*Some Request Messages cannot be received in some mode. See 2-5.*

**Notes:**
- *\** When transmitting series of EX Messages to X5DR, wait until [DATA LOAD COMPLETED] or [WRITE COMPLETED] of Several Messages are received or enough time.*
- *\*2* Transmits when change a mode.
- *\*3* Transmits when select a parameter in PROGRAM EDIT, COMBINATION EDIT, MULTI mode.
- *\*4* Transmits when select a DrumKit's parameter in GLOBAL mode.
- *\*5* Transmits when enter the PROGRAM EDIT mode.
- *\*6* Transmits when change a Combination No.
- *\*7* At first, transmits [MULTI SETUP DATA], and next transmits [MULTI SETUP DATA (exp)].
- *\*8* At first, transmits [ALL DATA], and next transmits [MULTI SETUP DATA (exp)].

---

## 2. Recognized Receive Data

### 2-1 Channel Messages `[D]=Decimal [H]=Hex`

| Status [Hex] | Second [D][H] | Third [D][H]          | Description           | Use for                | Note | ENA |
| ------------ | ------------- | --------------------- | --------------------- | ---------------------- | ---- | --- |
| 8n           | kk (kk)       | xx (xx)               | Note Off              | Note Off               |      | A   |
| 9n           | kk (kk)       | 00/vv (00/vv)         | Note Off/On vv=1~127  | Note Off/On            |      | A   |
| Bn           | 00 (00)       | mm (mm)               | Bank Select (MSB)     | Bank Select            | *1   | P   |
| Bn           | 01 (01)       | vv (vv)               | Modulation1 Depth     | Pitch MG modulation    |      | C   |
| Bn           | 02 (02)       | vv (vv)               | Modulation2 Depth     | VDF MG modulation      |      | C   |
| Bn           | 04 (04)       | <=63/>=64 (<=3F/>=40) | Foot Pedal Off/On     | Select Main/Sub Scale  |      | C   |
| Bn           | 06 (06)       | vv (vv)               | Data Entry (MSB)      | RPM, EX Param Change   |      | C,E |
| Bn           | 07 (07)       | vv (vv)               | Volume                | Volume                 |      | C   |
| Bn           | 10 (0A)       | vv (vv)               | Panpot                | A:B Panpot             |      | C   |
| Bn           | 11 (0B)       | vv (vv)               | Expression            | Volume                 |      | C   |
| Bg           | 12 (0C)       | vv (vv)               | Effect Control        | FX Dyna Mod Src=PEDAL1 |      | C   |
| Bg           | 13 (0D)       | vv (vv)               | Effect Control        | FX Dyna Mod Src=PEDAL2 |      | C   |
| Bn           | 32 (20)       | bb (bb)               | Bank Select (LSB)     | Bank Select            | *1   | P   |
| Bn           | 38 (26)       | vv (vv)               | Data Entry (LSB)      | RPM, EX Param Change   |      | C,E |
| Bn           | 64 (40)       | <=63/>=64 (<=3F/>=40) | Hold1 Off/On          | Damper Off/On          |      | C   |
| Bn           | 72 (48)       | vv (vv)               | Release Time          | VDF,VDA Rel Time mod   | *2   | C   |
| Bn           | 73 (49)       | vv (vv)               | Attack Time           | VDA Attack Time mod    | *2   | C   |
| Bn           | 74 (4A)       | vv (vv)               | Brightness            | VDF Cutoff Freq mod    | *2   | C   |
| Bn           | 91 (5B)       | vv (vv)               | Reverb Level          | Send C Level           |      | C   |
| Bg           | 92 (5C)       | 00/>=1 (00/>=01)      | Effect1 Level         | FX1 Off/On             |      | C   |
| Bn           | 93 (5D)       | vv (vv)               | Chorus Level          | Send D Level           |      | C   |
| Bg           | 94 (5E)       | 00/>=1 (00/>=01)      | Effect2 Level         | FX2 Off/On             |      | C   |
| Bn           | 96 (60)       | 00 (00)               | Data Increment        | RPM, EX Param Change   |      | C,E |
| Bn           | 97 (61)       | 00 (00)               | Data Decrement        | RPM, EX Param Change   |      | C,E |
| Bn           | 100 (64)      | rr (0r)               | RPN Param No. (LSB)   | RPN Param Select       | *3   | A   |
| Bn           | 101 (65)      | 00 (00)               | RPN Param No. (MSB)   | RPN Param Select       | *3   | A   |
| Bn           | 120 (78)      | 00 (00)               | All Sound Off         | All Sound Off          |      | C   |
| Bn           | 121 (79)      | 00 (00)               | Reset All Controllers | Reset All Controllers  |      | C   |
| Bn           | 123 (7B)      | 00 (00)               | All Notes Off         | All Notes Off          |      | A   |
| Bn           | 124 (7C)      | 00 (00)               | Omni mode Off         | All Notes Off          |      | A   |
| Bn           | 125 (7D)      | 00 (00)               | Omni mode On          | All Notes Off          |      | A   |
| Bn           | 126 (7E)      | <=16 (<=10)           | Mono mode On          | All Notes Off          |      | A   |
| Bn           | 127 (7F)      | 00 (00)               | Poly mode On          | All Notes Off          |      | A   |
| Cn           | pp (pp)       | —                     | Program Change        | Prog, Comb Change      | *1,4 | P   |
| Dn           | vv (vv)       | —                     | Channel Pressure      | After Touch            |      | T   |
| En           | bb (bb)       | bb (bb)               | Bender Change         | Pitch Bend             |      | C   |

**n** = MIDI Channel No. (0~15) — Usually Global Channel. When in Combi/Multi mode, each timbre's/track's channel.  
**g** = Always Global Channel No. (0~15)  
**x** = Random

**ENA:**
- A = Always Enabled
- C = Enabled when Control Filter in GLOBAL mode is ENA
- P = Enabled when Program Filter in GLOBAL mode is ENA, (NUM, PRG)
- T = Enabled when After Touch Filter in GLOBAL mode is ENA
- E = Enabled when Exclusive Filter in GLOBAL mode is ENA

**\*1:**

| MIDI In (Hex)          | Program                               | Note |
| ---------------------- | ------------------------------------- | ---- |
| mm,bb,pp = 00,00,00~63 | Bank A 00~99                          |      |
| mm,bb,pp = 00,00,64~7F | Bank A 00~27                          |      |
| mm,bb,pp = 38,xx,00~7F | Bank G 01~128                         |      |
| mm,bb,pp = 39,xx,00~7F | Bank G 01~128                         |      |
| mm,bb,pp = 3A~3D,xx,xx | OFF                                   | *1-1 |
| mm,bb,pp = 3E,xx,00~0F | Bank G 129                            |      |
| mm,bb,pp = 3E,xx,10~17 | Bank G 130                            |      |
| mm,bb,pp = 3E,xx,18    | Bank G 135                            |      |
| mm,bb,pp = 3E,xx,19    | Bank G 131                            |      |
| mm,bb,pp = 3E,xx,1A~1F | Bank G 135 — xx:Random                |      |
| mm,bb,pp = 3E,xx,20~27 | Bank G 132 - *1-1: Only in MULTI mode |      |
| mm,bb,pp = 3E,xx,28~2F | Bank G 133                            |      |
| mm,bb,pp = 3E,xx,30~37 | Bank G 136                            |      |
| mm,bb,pp = 3E,xx,38~9F | Bank G 129                            |      |
| mm,bb,pp = 3E,xx,40~47 | Bank G 134                            |      |
| mm,bb,pp = 3E,xx,48~7F | Bank G 129                            | *1-1 |
| mm,bb,pp = 3F,xx,xx    | OFF                                   | *1-1 |

| MIDI In (Hex) | Combination |
| ------------- | ----------- |
| pp = 00~63    | 00~99       |
| pp = 64~7F    | 00~27       |


**\*2:** vv <=3F = Fast or Dark / =40 Doesn't change / >=41 Slow or Bright

**\*3:** rr=0: Each Track's Pitch Bend Sens (only in MULTI mode)  
rr=1: Each Track's Detune (when Received Ch = Global Ch)  
rr=2: Each Track's Transpose (only in MULTI mode, acts as Master Tune in other mode)

**\*4:** After Processing (while Exclusive is ENA), transmits Exclusive Message [DATA LOAD COMPLETED] or [DATA LOAD ERROR].

### 2-2 System Realtime Messages

| Status [H] | Description |
|---|---|
| FE | Active Sensing |

### 2-3 Universal System Exclusive Message (Non Realtime)

| Byte [H] | Description          | Note |
| -------- | -------------------- | ---- |
| F0       | Exclusive Status     |      |
| 7E       | Non Realtime Message |      |
| gg       | MIDI Channel         | *5   |
| 0a       | Sub ID 1             | *6   |
| 0b       | Sub ID 2             | *6   |
| F7       | End of Exclusive     |      |

**\*5:** gg = 0~F: Receive if Global Channel / =7F: Receive all Channel  
**\*6:** a,b = 06,01: Inquiry Message Request / = 09,01: General MIDI System Mode On
