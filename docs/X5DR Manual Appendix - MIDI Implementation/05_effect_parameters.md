# Korg X5DR MIDI Implementation — Effect Parameters

> **Notice:** transcribed by hand from the Korg X5DR Owner's Manual. The original material is © Korg Inc. It is included as a technical reference for this editor and is not covered by the project's MIT License. This project is not affiliated with or endorsed by Korg.

Source: X5DR Owner's Manual, pp.181–182

Used with: Parameter Change (Func=41) via Effect Parameter offsets in Program/Combi/Multi tables.

---

## Effect Parameter (TABLE 7-1)

**Note:** Effect parameters are offset within the Program, Combination, and Multi parameter blocks.  
See TABLE 7-1 cross-reference for exact parameter numbers per mode.

---

## \*11 Effect Parameter

| No. (offset) | Parameter                                | DATA(Hex) : VALUE | Note  |
| ------------ | ---------------------------------------- | ----------------- | ----- |
| (00)         | Effect 1 Type No.                        | 0,1~2F:OFF, 1~47  |       |
| (01)         | Effect 2 Type No.                        | 0,1~2F:OFF, 1~47  |       |
| (02)         | Effect 1 L-Ch E. Balnc                   | 00~64 : 00~100    |       |
| (03)         | Effect  1 R-Ch E. Balnc                  | 00~64 : 00~100    |       |
| (04)         | Effect  2 L-Ch E. Balnc                  | 00~64 : 00~100    |       |
| (05)         | Effect  2 R-Ch E. Balnc                  | 00~64 : 00~100    |       |
| (06)         | Output 3 Pan                             | 00,01~65          | *11-1 |
| (07)         | Output 4 Pan                             | 00,01~65          | *11-1 |
| (08)         | Effect I/O                               | bit5~0            | *11-2 |
| (09)         | Effect 1 Parameter                       |                   | *11-3 |
| ⋮            | ⋮                                        |                   |       |
| (16)         | *(Effect 1 params end)*                  |                   |       |
| (17)         | Effect 1 Mod Source                      | 00~0D             | *11-4 |
| (18)         | Effect 1 Mod Amount                      | F1~0F : -15~15    |       |
| (19)         | Effect 2 Parameter                       |                   | *11-3 |
| ⋮            | *(same structure as Effect 1 Parameter)* |                   |       |
| (26)         |                                          |                   |       |
| (27)         | Effect 2 Mod Source                      | 00~0D             | *11-4 |
| (28)         | Effect 2 Mod Amount                      | F1~0F : -15~15    |       |

---

### \*11-1 — Output 3/4 Pan

| DATA | VALUE |
| ---- | ----- |
| 00   | Off   |
| 01   | R     |
| 02   | 01:99 |
| ⋮    | ⋮     |
| 64   | 99:01 |
| 65   | L     |

### \*11-2 — Effect I/O

| DATA                                                               |
| ------------------------------------------------------------------ |
| bit0=0 : Efct1 L-Ch Off, =1 : On                                   |
| bit1=0 : Efct 1 R-Ch Off, =1 : On                                  |
| bit2=0 : Efct 2 L-Ch Off, =1 : On                                  |
| bit3=0 : Efct 2 R-Ch Off, =1 : On                                  |
| bit4,5=0 : Serial, =1 : Parallel, =2 : Parallel 2, =3 : Parallel 3 |

### \*11-3 — Effect Parameter (8Byte) 47 Type

### Effect Type 1~3: Hall, 4~5: Room, 6: Live Stage

| Offset | Parameter   | DATA(Hex) : VALUE        |
| ------ | ----------- | ------------------------ |
| (00)   | Reverb Time | 00~61(2F): 0.2~9.9 (4.9) |
| (01)   | (NUL)       | 00                       |
| (02)   | High Damp   | 00~63 : 00~99            |
| (03)   | Pre Delay   | 00~C8 : 00~200           |
| (04)   | E.R Level   | 00~63 : 00~99            |
| (05)   | (NUL)       | 00                       |
| (06)   | EQ High     | F4~0C : -12~12           |
| (07)   | EQ Low      | F4~0C : -12~12           |

*Don't display NUL from here, and that value must be 00*
### Effect Types 7~9: Wet Plate, 8: Dry Plate, 9: Spring

| Offset | Parameter     | DATA(Hex) : VALUE |
| ------ | ------------- | ----------------- |
| (00)   | Pre Delay (L) | 00~C8 : 00~200    |
| (01)   | Pre Delay (H) | 00~C8 : 00~200    |
| (02)   | E.R Level     | 01~0A : 01~10     |
| (03)   | Reverb Time   | 00~63 : 00~99     |
| (04)   | High Damp     | 00~63 : 00~99     |
| (06)   | EQ Low        | F4~0C : -12~12    |
| (07)   | EQ High       | F4~0C : -12~12    |

### Effect Types 10~12: Early Reflection 1, 2, 3

| Offset | Parameter | DATA(Hex) : VALUE |
| ------ | --------- | ----------------- |
| (00)   | E.R Time  | 00~46 : 100~800   |
| (01)   | Pre Delay | 00~C8 : 00~200    |
| (06)   | EQ High   | F4~0C : -12~12    |
| (07)   | EQ Low    | F4~0C : -12~12    |

### 13: Stereo Delay, 14: Cross Delay

| Offset | Parameter        | DATA(Hex) : VALUE |
| ------ | ---------------- | ----------------- |
| (00)   | Delay Time L (L) | 00~1F4 : 00~500   |
| (01)   | Delay Time L (H) | 00~1F4 : 00~500   |
| (02)   | Feed Back        | 9D~63 : -99~99    |
| (03)   | High Damp        | 00~63 : 00~99     |
| (04)   | Delay Time R (L) | 00~1F4 : 00~500   |
| (05)   | Delay Time R (H) | 00~1F4 : 00~500   |
| (06)   | EQ High          | F4~0C : -12~12    |
| (07)   | EQ Low           | F4~0C : -12~12    |

### 15: Dual Delay

| Offset | Parameter        | DATA(Hex) : VALUE |
| ------ | ---------------- | ----------------- |
| (00)   | Delay Time L (L) | 00~1F4 : 00~500   |
| (01)   | Delay Time L (H) | 00~1F4 : 00~500   |
| (02)   | Feed Back L      | 9D~63 : -99~99    |
| (03)   | High Damp L      | 00~63 : 00~99     |
| (04)   | Delay Time R (L) | 00~1F4 : 00~500   |
| (05)   | Delay Time R (H) | 00~1F4 : 00~500   |
| (06)   | Feed Back R      | 9D~63 : -99~99    |
| (07)   | High Damp R      | 00~63 : 00~99     |

### 16~18: Multi Tap Delay 1, 2, 3

| Offset | Parameter         | DATA(Hex) : VALUE |
| ------ | ----------------- | ----------------- |
| (00)   | Delay Time 1 (L)  | 00~1F4 : 00~500   |
| (01)   | Delay  Time 1 (H) | 00~1F4 : 00~500   |
| (02)   | Delay Time 2 (L)  | 00~1F4 : 00~500   |
| (03)   | Delay Time 2 (H)  | 00~1F4 : 00~500   |
| (04)   | Feed back         | 9D~63 : -99~99    |
| (06)   | EQ Low            | F4~0C : -12~12    |
| (07)   | EQ High           | F4~0C : -12~12    |

### 19, 20: Stereo Chorus 1, 2

| Offset | Parameter  | DATA(Hex) : VALUE                        | Note    |
| ------ | ---------- | ---------------------------------------- | ------- |
| (00)   | Mod Depth  | 00~63 : 00~99                            |         |
| (01)   | Mod Speed  | 00~D8                                    | *11-3-2 |
| (02)   | MG Status  | bit0=0:Sin, =1:Tri / bit1 ← 1 / bit2 ← 0 | *11-3-3 |
| (04)   | Delay Time | 00~C8 : 00~200                           |         |
| (06)   | EQ High    | F4~0C : -12~12                           |         |
| (07)   | EQ Low     | F4~0C : -12~12                           |         |

### 21: Quadrature Chorus, 22: X Over Chorus

| Offset | Parameter    | DATA(Hex) : VALUE | Note    |
| ------ | ------------ | ----------------- | ------- |
| (00)   | Delay Time L | 00~FA : 00~250    |         |
| (01)   | Delay Time R | 00~FA : 00~250    |         |
| (02)   | Mod Speed    | 01~63 : 01~99     |         |
| (03)   | Mod Depth    | 00~63 : 00~99     |         |
| (04)   | Mod Waveform | EB~14             | *11-3-4 |
| (06)   | EQ Low       | F4~0C : -12~12    |         |
| (07)   | EQ High      | F4~0C : -12~12    |         |

### 23: Harmonic Chorus

| Offset | Parameter          | DATA(Hex) : VALUE |
| ------ | ------------------ | ----------------- |
| (00)   | Delay Time L (L)   | 00~1F4 : 00~500   |
| (01)   | Delay Time L (H)   | 00~1F4 : 00~500   |
| (02)   | Delay Time R (L)   | 00~1F4 : 00~500   |
| (03)   | Delay Time R (H)   | 00~1F4 : 00~500   |
| (04)   | Mod Speed          | 01~63 : 01~99     |
| (05)   | Mod Depth          | 00~63 : 00~99     |
| (06)   | Filter Split Point | 00~12 : 00~18     |

### 24: Symphonic Ensemble

| Offset | Parameter | DATA(Hex) : VALUE |
|---|---|---|
| (00) | Mod Depth | 00~63 : 00~99 |
| (06) | EQ High | F4~0C : -12~12 |
| (07) | EQ Low | F4~0C : -12~12 |

### 25, 26: Flanger 1, 2 / 27: X Over Flanger

| Offset | Parameter | DATA(Hex) : VALUE |
|---|---|---|
| (00) | Delay Time | 00~C8 : 00~200 |
| (01) | Mod Depth | 00~63 : 00~99 |
| (02) | Mod Speed | 01~63 : 01~99 |
| (03) | Resonance | 9D~63 : -99~99 |
| (06) | EQ Low | F4~0C : -12~12 |
| (07) | EQ High | F4~0C : -12~12 |

### 28: Exciter

| Offset | Parameter | DATA(Hex) : VALUE |
|---|---|---|
| (00) | Blend | 9D~63 : -99~99 |
| (01) | Emphatic Point | 01~0A : 01~10 |
| (06) | EQ High | F4~0C : -12~12 |
| (07) | EQ Low | F4~0C : -12~12 |

### 29: Enhancer

| Offset | Parameter | DATA(Hex) : VALUE |
|---|---|---|
| (00) | Harmonic Density | 01~63 : 01~99 |
| (01) | Hot Spot | 01~14 : 01~20 |
| (02) | Stereo Width | 00~63 : 00~99 |
| (03) | Delay | 01~63 : 01~99 |
| (06) | EQ Low | F4~0C : -12~12 |
| (07) | EQ High | F4~0C : -12~12 |

### 30: Distortion, 31: Over Drive

| Offset | Parameter | DATA(Hex) : VALUE |
|---|---|---|
| (00) | Drive (Edge) | 01~6F : 01~111 |
| (01) | Hot Spot | 00~63 : 00~99 |
| (02) | Resonance | 00~63 : 00~99 |
| (03) | Out Level | 00~63 : 00~99 |
| (06) | EQ Low | F4~0C : -12~12 |
| (07) | EQ High | F4~0C : -12~12 |

### 32, 33: Phaser 1 (2)

| Offset | Parameter | DATA(Hex) : VALUE                            | Note    |
| ------ | --------- | -------------------------------------------- | ------- |
| (00)   | Mod Depth | 00~63 : 01~99                                |         |
| (01)   | Mod Speed | 00~D8                                        | *11-3-2 |
| (02)   | MG Status | bit0=0:Sin, =1:Tri / bit1 ← 1,(0) / bit2 ← 0 | *11-3-3 |
| (03)   | Feedback  | 9D~63 : -99~99                               |         |
| (04)   | Manual    | 00~63 : 00~99                                |         |

### 34: Rotary Speaker

| Offset | Parameter | DATA(Hex) : VALUE |
|---|---|---|
| (00) | Vibrato Depth | 00~0F : 00~15 |
| (01) | Acceleration | 01~0F : 01~15 |
| (02) | Slow Speed | 01~63 : 01~99 |
| (03) | Fast Speed | 01~63 : 01~99 |

### 35: Auto Pan (36: Tremolo)

| Offset | Parameter | DATA(Hex) : VALUE                            | Note    |
| ------ | --------- | -------------------------------------------- | ------- |
| (00)   | Depth     | 00~63 : 00~99                                |         |
| (01)   | Speed     | 00~D8                                        | *11-3-2 |
| (02)   | MG Status | bit0=0:Sin, =1:Tri / bit1 ← 1,(0) / bit2 ← 0 | *11-3-3 |
| (03)   | Shape     | 9D~63 : -99~99                               |         |
| (06)   | EQ High   | F4~0C : -12~12                               |         |
| (07)   | EQ Low    | F4~0C : -12~12                               |         |

### 37: Parametric EQ

| Offset | Parameter | DATA(Hex) : VALUE |
|---|---|---|
| (00) | Low Freq | 00~1D : 00~29 |
| (01) | Low Gain | F4~0C : -12~12 |
| (02) | Low Freq | 00~63 : 00~99 |
| (03) | Mid Gain | F4~0C : -12~12 |
| (04) | Mid Width | 00~63 : 00~99 |
| (05) | High Freq | 00~1D : 00~29 |
| (06) | High Gain | F4~0C : -12~12 |

### 38: Chorus-Delay, 39: Flanger-Delay

| Offset | Parameter | DATA(Hex) : VALUE |
|---|---|---|
| (00) | Delay Time | 00~32 : 00~50 |
| (01) | Mod Speed | 01~63 : 01~99 |
| (02) | Mod Depth | 00~63 : 00~99 |
| (03) | Feed back | 9D~63 : -99~99 |
| (04) | Delay Time | 00~E1 : 00~450 |
| (05) | Feed back | 9D~63 : -99~99 |

### 40: Delay / Hall

| Offset | Parameter      | DATA(Hex) : VALUE |
| ------ | -------------- | ----------------- |
| (00)   | Delay Time (L) | 00~1F4 : 00~500   |
| (01)   | Delay Time (H) | 00~1F4 : 00~500   |
| (02)   | Feed Back      | 9D~63 : -99~99    |
| (03)   | High Damp      | 00~63 : 00~99     |
| (04)   | Reverb Time    | 00~61: 0.2~9.9    |
| (05)   | High Damp      | 00~63 : 00~99     |
| (06)   | Pre Delay      | 00~96 : 00~150    |

### 41: Delay / Room

| Offset | Parameter       | DATA(Hex) : VALUE | Note    |
| ------ | --------------- | ----------------- | ------- |
| (00)   | Delay Parameter |                   | *11-3-1 |
| ⋮      |                 |                   |         |
| (03)   |                 |                   |         |
| (04)   | Reverb Time     | 00~2F : 0.2~4.9   |         |
| (06)   | High Damp       | 00~63 : 00~99     |         |
| (07)   | Pre Delay       | 00~96 : 00~150    |         |

### 42: Delay / Chorus (43: Delay / Flanger)

| Offset | Parameter       | DATA(Hex) : VALUE                              | Note    |
| ------ | --------------- | ---------------------------------------------- | ------- |
| (00)   | Delay Parameter |                                                | *11-3-1 |
| ⋮      |                 |                                                |         |
| (03)   |                 |                                                |         |
| (04)   | Depth           | 00~63 : 00~99                                  |         |
| (05)   | Speed           | 00~D8                                          | *11-3-2 |
| (06)   | MG Status       | bit0=0:S, =1:T (←0) / bit1 ← 0 / bit2 ← 0,(←1) | *11-3-3 |
| (07)   | Feed Back       | 0,(9D~63:−99~99)                               |         |

### 44: Delay / Distortion (45: Delay / Over Drive)

| Offset | Parameter      | DATA(Hex) : VALUE |
| ------ | -------------- | ----------------- |
| (00)   | Delay Time (L) | 00~1F4 : 00~500   |
| (01)   | Delay Time (H) | 00~1F4 : 00~500   |
| (02)   | Feed Back      | 9D~63 : -99~99    |
| (03)   | Drive          | 01~6F : 01~111    |
| (04)   | Hot Spot       | 01~63 : 01~99     |
| (05)   | Resonance      | 00~63 : 00~99     |
| (06)   | Out Level      | 01~63 : 01~99     |

### 46: Delay / Phaser

| Offset | Parameter       | DATA(Hex) : VALUE | Note    |
| ------ | --------------- | ----------------- | ------- |
| (00)   | Delay Parameter |                   | *11-3-1 |
| ⋮      |                 |                   |         |
| (03)   |                 |                   |         |
| (04)   | Depth           | 00~63 : 00~99     |         |
| (05)   | Speed           | 00~D8             | *11-3-2 |
| (06)   | Feedback        | 9D~63 : -99~99    |         |

### 47: Delay / Rotary Speaker

| Offset | Parameter      | DATA(Hex) : VALUE |
| ------ | -------------- | ----------------- |
| (00)   | Delay Time (L) | 00~1F4 : 00~500   |
| (01)   | Delay Time (H) | 00~1F4 : 00~500   |
| (02)   | Feed back      | 9D~63 : -99~99    |
| (03)   | Acceleration   | 01~0F : 01~15     |
| (04)   | Slow Speed     | 01~63 : 01~99     |
| (05)   | Fast Speed     | 01~63 : 01~99     |

---

## Effect Parameter Notes

### \*11-3-1: Delay Parameter

Same as 40~(00)~(03).

**\*11-3-2: DATA(Hex) Value[Hz]**

| Hex | Value |
|---|---|
| 00~63 | 0.03~3.00 (0.03 step) |
| 64~C7 | 3.1~13.0 (0.1 step) |
| C8~D8 | 14~30 (1 step) |

**\*11-3-3: MG Status**
- bit0: Wave Form (=0:Sin, =1:Tri)
- bit1: Phase (=0:0°, =1:180°)
- bit2: Wave Shape (=0:Normal, =1:for Flanger)

**\*11-3-4: Waveform**

| Hex | Value |
|---|---|
| E8 | T+10 |
| ⋮ | ⋮ |
| FF | T-10 |
| 00 | S-10 |
| ⋮ | ⋮ |
| 14 | S+10 |

**\*11-4: Dynamic Modulation Source**
- 0 = None
- 1 = Control Change #1 (as X5's Mod Wheel = JoyUp)
- 2 = Control Change #2 (as X5's Mod Wheel = JoyDn)
- 3 = After Touch
- 4 = Control Change #12 (as X5's Assn Pedal = Eff Control)
- 5 = Control Change #13
- 6 = Total level of VDA EG
