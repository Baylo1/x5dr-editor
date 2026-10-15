# Korg X5DR MIDI Implementation — Combination, Multi, Global & Drums Parameters

> **Notice:** transcribed by hand from the Korg X5DR Owner's Manual. The original material is © Korg Inc. It is included as a technical reference for this editor and is not covered by the project's MIT License. This project is not affiliated with or endorsed by Korg.

Source: X5DR Owner's Manual, pp.180, 183

---

## Combination Parameter (TABLE 2)

Used with: Parameter Change (Func=41), Combination Parameter Dump (Func=49/4D)

| No. | Parameters                      | DATA(Hex) : VALUE                      | Note |
| --- | ------------------------------- | -------------------------------------- | ---- |
| 00  | Combi Name (Head)               | 20~7F : ' '~'←'                        |      |
| ⋮   | ⋮                               |                                        |      |
| 09  | Combi Name (Tail)               |                                        |      |
| 10  | (RESERVE)                       | 00                                     |      |
|     | **Effect Parameters**           |                                        |      |
| 11  | *(see Effect Parameters table)* |                                        | *11  |
| ⋮   | ⋮                               |                                        |      |
| 39  | *(Effect Parameters end)*       |                                        |      |
|     | **Timbre 1 Parameters**         |                                        |      |
| 40  | Program No.                     |                                        | *7   |
| 41  | Output Level                    | 00~7F : 00~127                         |      |
| 42  | Transpose                       | E8~18 : -24~24                         |      |
| 43  | Detune                          | CE~32 : -50~50                         |      |
| 44  | A:B Pan                         | 00~1E,1F,FF                            | *6   |
| 45  | Send D Level<br>Send C Level    | bit0~3 : 0~9, PRG<br>bit4~7 : 0~9, PRG |      |
| 46  | Key Window Top                  | 00~7F : C-1~G9                         |      |
| 47  | Key Window Bottom               | 00~7F : C-1~G9                         |      |
| 48  | Vel Window Top                  | 01~7F : 01~127                         |      |
| 49  | Vel Window Bottom               | 01~7F : 01~127                         |      |
| 50  | Control Filter                  |                                        | *8   |
| 51  | MIDI Channel                    | bit0~3 : 1~16                          |      |
|     | Timbre SW                       | bit4=0:ON, =1:OFF                      |      |
|     | **Timbre 2~8 Parameters**       |                                        |      |
| 52  | Same as Timbre 1 (40~51) × 7    |                                        |      |
| ⋮   | ⋮                               |                                        |      |
| 135 | *(Timbre 8 end)*                |                                        |      |

### Combination Parameter Table 8 — PARAM No. for PARAM CHANGE

`n = 0~7 ( : Timbre 1~8 )`

| No.     | Parameters                            | Param No. in TABLE 2 |
| ------- | ------------------------------------- | -------------------- |
| 0+n     | Program No.                           | 40, 50, 51+12n *     |
| 8+n     | Output Level                          | 41+12n               |
| 16+n    | MIDI Channel                          | 51+12n b0~3          |
| 24+n    | Key Window Top                        | 46+12n               |
| 32+n    | Key Window Bottom                     | 47+12n               |
| 40+n    | Vel Window Top                        | 48+12n               |
| 48+n    | Vel Window Bottom                     | 49+12n               |
| 56+n    | Transpose                             | 42+12n               |
| 64+n    | Detune                                | 43+12n               |
| 72+n    | Program Change Filter                 | 50+12n b0            |
| 80+n    | Damper Filter                         | 50+12n b1            |
| 88+n    | After Touch Filter                    | 50+12n b2            |
| 96+n    | Control Change Filter                 | 50+12n b3            |
| 104+n   | A:B Pan                               | 44+12n               |
| 112+n   | Send C Level                          | 45+12n b4~7          |
| 120+n   | Send D Level                          | 45+12n b0~3          |
| 128~135 | (RESERVE)                             | —                    |
| 136     | *(Effect Parameters — see TABLE 7-1)* |                      |
| ⋮       | ⋮                                     |                      |
| 168     | *(Effect Parameters end)*             |                      |

**\* No. of TABLE 2:**

| Value   | 40+12n | 50+12n b6,7 | 51+12n b4 |
| ------- | ------ | ----------- | --------- |
| 00      | —      | —           | 1         |
| 01~100  | 00~99  | 0, 0        | 0         |
| 101~236 | 0~135  | 0~1         | 0         |

---

## Multi Setup Data (TABLE 3)

Used with: Multi Setup Data Dump (Func=55/68)

### Effect Parameters

| No. | Parameters                | DATA(Hex) : VALUE | Note |
| --- | ------------------------- | ----------------- | ---- |
| 00  | *(Effect Parameters)*     |                   | *11  |
| ⋮   | ⋮                         |                   |      |
| 28  | *(Effect Parameters end)* |                   |      |

## Multi Setup Data (Expanded) — TABLE 4

### Track 1 Parameters

| No. | Parameters                   | DATA(Hex) : VALUE                      | Note |
| --- | ---------------------------- | -------------------------------------- | ---- |
| 00  | Program No.                  |                                        | *7   |
| 01  | Output Level                 | 00~7F : 00~127                         |      |
| 02  | Transpose                    | E8~18 : -24~24                         |      |
| 03  | Detune                       | CE~32 : -50~50                         |      |
| 04  | A:B Pan                      | 00~1E,1F,FF                            | *6   |
| 05  | Send D Level<br>Send C Level | bit0~3 : 0~9, PRG<br>bit4~7 : 0~9, PRG |      |
| 06  | Key Window Top               | 00~7F : C-1~G9                         |      |
| 07  | Key Window Bottom            | 00~7F : C-1~G9                         |      |
| 08  | Vel Window Top               | 01~7F : 01~127                         |      |
| 09  | Vel Window Bottom            | 01~7F : 01~127                         |      |
| 10  | Control Filter               |                                        | *8   |
| 11  | MIDI Channel<br>Track SW     | bit0~3 : 1~16<br>bit4=0:ON, =1:OFF     |      |

### Track 2~16 Parameters

Same as Track 1 (00~11) × 15

### Track 1~16 Parameters (continued)

| No. | Parameters                 | DATA(Hex) : VALUE |
| --- | -------------------------- | ----------------- |
| 192 | Track 1 Pitch Bend Range   | F4~0C : -12~12    |
| 193 | Same as Track 1 (192) × 15 |                   |
| ⋮   | ⋮                          |                   |
| 207 | *(end)*                    |                   |

## Multi Parameters — PARAM No. for PARAMETER CHANGE (Func No. 41) (TABLE 9)

`n = 0~15 ( : Track 1~16 )`

| No.   | Parameters                            | Param No. in TABLE 4 |
| ----- | ------------------------------------- | -------------------- |
| 0+n   | Program No.                           | 00+12n               |
| 16+n  | Level                                 | 01+12n               |
| 32+n  | Panpot                                | 04+12n               |
| 48+n  | Send C Level                          | 05+12n b4~7          |
| 64+n  | Send D Level                          | 05+12n b0~3          |
| 80+n  | Transpose                             | 02+12n               |
| 96+n  | Detune                                | 03+12n               |
| 112+n | Pitch Bend Range                      | 192+n                |
| 128+n | Prog Change Filter                    | 10+12n b0            |
| 144   | *(Effect Parameters — see TABLE 7-1)* |                      |
| ⋮     | ⋮                                     |                      |
| 176   | *(Effect Parameters end)*             |                      |

---

## Global Parameter (TABLE 5)

Used with: Global Data Dump (Func=51)

### Global Parameters

| No.   | Parameters         | DATA(Hex) : VALUE | Note |
| ----- | ------------------ | ----------------- | ---- |
| 00    | Master Tune        | CE~32 : -50~50    |      |
| 01    | Key Transpose      | F4~0C : -12~12    |      |
| 02~04 | (RESERVE)          | 00                |      |
| 05    | Main Scale Type    | 00~0A             | *9   |
| 06    | Main Scale Key     | 00~0B : C~B       |      |
| 07    | User Scale         | CE~32 : -50~50    |      |
| ⋮     | ⋮                  |                   |      |
| 18    | *(User Scale end)* |                   |      |
| 19    | Velocity Curve     | 0~7 : 1~8         |      |
| 20    | After Touch Curve  | 0~7 : 1~8         |      |
| 21    | Sub Scale Type     | 00~0A             | *9   |
| 22    | Sub Scale Key      | 00~0B : C~B       |      |
| 23~27 | (RESERVE)          | 00                |      |

---

## Drums Parameter (TABLE 6)

Used with: Drums Data Dump (Func=52)

### Drum Kit A:1 — INDEX#0

| No. | Parameters                   | DATA(Hex) : VALUE            | Note                 |
| --- | ---------------------------- | ---------------------------- | -------------------- |
| 00  | Inst No.                     | 00:0FF, 01~D7:215            |                      |
| 01  | Key                          | 0C~73 : C0~G8                |                      |
| 02  | A:B Pan<br>Exclusive Assign  | bit0~4<br>bit5~7             | **\*10**<br>**\*10** |
| 03  | Tune                         | 88~78 : -120~120             |                      |
| 04  | Level                        | 9D~63 : -99~99               |                      |
| 05  | Decay                        | 9D~63 : -99~99               |                      |
| 06  | Send D Level<br>Send C Level | bit0~3 : 0~9<br>bit4~7 : 0~9 |                      |

### Drum Kit A:1 — INDEX#1 ~ Drum Kit A:2—#59

Same as Drum Kit A:1~#0 (00~06) × (60×2–1)

| Index | Range |
|---|---|
| 00~59 | Drum Kit 1 |
| 60~119 | Drum Kit 2 |

---

### Drum Kit Parameters — PARAM No. for DRUM PARAM CHANGE (TABLE 10)

`n : 0~59 ( : Index )`

| No. | Parameters | Param No. in TABLE 6 |
|---|---|---|
| 0 | Index No. | — |
| 1 | Inst No. | 0+7n |
| 2 | Key | 1+7n |
| 3 | Tune | 3+7n |
| 4 | Output Level | 4+7n |
| 5 | Decay | 5+7n |
| 6 | A:B Pan | 2+7n b0~4 |
| 7 | Exclusive Assign | 2+7n b5~7 |
| 8 | Send C Level | 6+7n b4~7 |
| 9 | Send D Level | 6+7n b0~3 |

---

## Notes

**\*6:** Pan

| No. | Parameter             |
| --- | --------------------- |
| 00  | A15                   |
| ⋮   | ⋮                     |
| 0F  | CNT                   |
| ⋮   | ⋮                     |
| 1E  | B15                   |
| 1F  | PRG (only Combi data) |
| FF  | Off                   |


**\*7 (Program No.):** 00~63 = A00~A99 / 00~87 = G01~G135

**\*8 (Control Filter):**
- bit0 = Program Change (=0:DIS, =1:ENA)
- bit1 = Damper (=0:DIS, =1:ENA)
- bit2 = After Touch (=0:DIS, =1:ENA)
- bit3 = Control Change (=0:DIS, =1:ENA)
- bit4,5=1,1 (fixed)
- bit6,7=0,0: Bank A Program / 0,1 = Bank G Program
- \# Program is selected by \*7 and \*8 (bit6,7)

**\*9 (Scale Type):** 0=Equal Temp, 1=Equal Temp 2, 2=Pure Major, 3=Pure Minor, 4=Arabic, 5=Pythagorean, 6=Werkmeister, 7=Kirnberger, 8=Slendro, 9=Pelog, A=User Scale

**\*10:**
A:B Pan: bit0~4:

| No. | Parameter             |
| --- | --------------------- |
| 00  | A15                   |
| ⋮   | ⋮                     |
| 0F  | CNT                   |
| ⋮   | ⋮                     |
| 1E  | B15                   |
| FF  | Off                   |

Exclusive Assign: bit5~7:

| No. | Parameter             |
| --- | --------------------- |
| 0   | EX Off                |
| 1   | EX Group 1            |
| ⋮   | ⋮                     |
| 6   | EX Group 6            |
| 7   | Self                  |


**\*11 (Effect Parameters):** See Effect Parameters (TABLE 7-1) and Effect Parameter tables
