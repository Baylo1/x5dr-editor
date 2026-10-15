# Korg X5DR MIDI Implementation — Program Parameters (TABLE 1)

> **Notice:** transcribed by hand from the Korg X5DR Owner's Manual. The original material is © Korg Inc. It is included as a technical reference for this editor and is not covered by the project's MIT License. This project is not affiliated with or endorsed by Korg.

Source: X5DR Owner's Manual, pp.180–181, 183

Used with: Parameter Change (Func=41), Program Parameter Dump (Func=40/4C)

---

## Program Parameter Table 1

| No. | Parameters                                      | DATA(Hex) : VALUE          | NOTE |
| --- | ----------------------------------------------- | -------------------------- | ---- |
| 00  | Program Name (Head)                             | 20~7F : ' '~'←'            |      |
| ⋮   | ⋮                                               |                            |      |
| 09  | Program Name (Tail)                             |                            |      |
|     | **OSCILLATOR**                                  |                            |      |
| 10  | Oscillator Mode                                 | 0,1,2                      | *1   |
| 11  | Assign                                          | bit0=0 : POL, bit0=1 : MON |      |
| 11  | Hold                                            | bit1=1 : OFF, bit1=1 : ON  |      |
| 12  | OSC-1 M/D Sound (LSB)                           | 00~1AD : 0~429             |      |
| 13  | OSC-1 M/D Sound (MSB)                           |                            | *2   |
| 14  | OSC-1 Octave                                    | FE~01 : 32'~4'             |      |
| 15  | OSC-2 MLT Sound (LSB)                           | 0~1AD : 0~429              |      |
| 16  | OSC-2 MLT Sound (MSB)                           |                            |      |
| 17  | OSC-2 Octave                                    | FE~01 : 32'~4'             |      |
| 18  | Interval                                        | F4~0C : -12~12             |      |
| 19  | Detune                                          | CE~32 : -50~50             |      |
| 20  | Delay Start                                     | 00~63 : 00~99              |      |
|     | **Pitch EG**                                    |                            |      |
| 21  | Start Level                                     | 9D~63 : -99~99             |      |
| 22  | Attack Time                                     | 00~63 : 00~99              |      |
| 23  | Attack Level                                    | 9D~63 : -99~99             |      |
| 24  | Decay Time                                      | 00~63 : 00~99              |      |
| 25  | Release Time                                    | 00~63 : 00~99              |      |
| 26  | Release Level                                   | 9D~63 : -99~99             |      |
| 27  | Time Velocity Sense                             | 9D~63 : -99~99             |      |
| 28  | Level Velocity Sense                            | 9D~63 : -99~99             |      |
|     | **Cutoff MG**                                   |                            |      |
| 29  | Wave Form                                       | bit0~2 : 0~5               | *3   |
| 29  | OSC-1 MG Enable                                 | bit5=0 : OFF, =1 : ON      |      |
| 29  | OSC-2 MG Enable                                 | bit6=0 : OFF, =1 : ON      |      |
| 29  | Key Sync                                        | bit7=0 : OFF, =1 : ON      |      |
| 30  | Frequency                                       | 00~63 : 00~99              |      |
| 31  | Delay                                           | 00~63 : 00~99              |      |
| 32  | Intensity                                       | 00~63 : 00~99              |      |
|     | **After Touch**                                 |                            |      |
| 33  | Pitch Bend Range                                | F4~0C : -12~12             |      |
| 34  | VDF Cutoff                                      | 9D~63 : -99~99             |      |
| 35  | VDF MG Int                                      | 00~63 : 00~99              |      |
| 36  | VDA Amplitude                                   | 9D~63 : -99~99             |      |
|     | **Pitch Bend / Modulation**                     |                            |      |
| 37  | Pitch Bend Range                                | F4~0C : -12~12             |      |
| 38  | VDF Sweep Int                                   | 9D~63 : -99~99             |      |
| 39  | VDF MG Int                                      | 00~63 : 00~99              |      |
|     | **OSC-1 Pitch EG Int**                          |                            |      |
| 40  | Pitch EG Int                                    | 9D~63 : -99~99             |      |
|     | **OSC-1 Pitch MG**                              |                            |      |
| 41  | Wave Form                                       | bit0~2 : 0~5               | *3   |
| 41  | Key Sync                                        | bit7=0 : OFF, =1 : ON      |      |
| 42  | Frequency                                       | 00~63 : 00~99              |      |
| 43  | Delay                                           | 00~63 : 00~99              |      |
| 44  | Fade In                                         | 00~63 : 00~99              |      |
| 45  | Intensity                                       | 00~63 : 00~99              |      |
| 46  | Freq Mod by KBD TRK                             | 9D~63 : -99~99             |      |
| 47  | Intensity Mod by AT                             | 00~63 : 00~99              |      |
| 48  | Intensity Mod by MW                             | 00~63 : 00~99              |      |
| 49  | Freq Mod by AT+MW                               | 00~09 : 0~9                |      |
|     | **VDF-1**                                       |                            |      |
| 50  | Cutoff Value                                    | 00~63 : 00~99              |      |
| 51  | KBD Track Key                                   | 00~7F : C-1~G9             |      |
| 52  | Cutoff KBD Track                                | 9D~63 : -99~99             |      |
| 53  | EG Intensity                                    | 00~63 : 00~99              |      |
| 54  | EG Time KBD Track                               | 00~63 : 00~99              |      |
| 55  | EG Time Vel Sense                               | 00~63 : 00~99              |      |
| 56  | EG Int Vel Sense                                | 9D~63 : -99~99             |      |
|     | **VDF-1 EG**                                    |                            |      |
| 57  | Attack Time                                     | 00~63 : 00~99              |      |
| 58  | Attack Level                                    | 9D~63 : -99~99             |      |
| 59  | Decay Time                                      | 00~63 : 00~99              |      |
| 60  | Break Point                                     | 9D~63 : -99~99             |      |
| 61  | Slope Time                                      | 00~63 : 00~99              |      |
| 62  | Sustain Level                                   | 9D~63 : -99~99             |      |
| 63  | Release Time                                    | 00~63 : 00~99              |      |
| 64  | Release Level                                   | 9D~63 : -99~99             |      |
|     | **VDA-1**                                       |                            |      |
| 65  | Oscillator Level                                | 00~63 : 00~99              |      |
| 66  | KBD Track Key                                   | 00~7F : C-1~G9             |      |
| 67  | AMP KBD Track Int                               | 9D~63 : -99~99             |      |
| 68  | AMP Velocity Sense                              | 9D~63 : -99~99             |      |
| 69  | EG Time KBD Track                               | 00~63 : 00~99              |      |
| 70  | EG Time Vel Sense                               | 00~63 : 00~99              |      |
|     | **VDA-1 EG**                                    |                            |      |
| 71  | Attack Time                                     | 00~63 : 00~99              |      |
| 72  | Attack Level                                    | 00~63 : 00~99              |      |
| 73  | Decay Time                                      | 00~63 : 00~99              |      |
| 74  | Break Point                                     | 00~63 : 00~99              |      |
| 75  | Slope Time                                      | 00~63 : 00~99              |      |
| 76  | Sustain Level                                   | 00~63 : 00~99              |      |
| 77  | Release Time                                    | 00~63 : 00~99              |      |
|     | **OSC-1 EG Time KBD Track, Vel, SW & Polarity** |                            |      |
| 78  | F. EG Time K.T SW&POL                           | bit0~7                     | *4   |
| 79  | F. EG Time Vel SW&POL                           | bit0~7                     | *4   |
| 80  | A. EG Time K.T SW&POL                           | bit0~7                     | *4   |
| 81  | A. EG Time Vel SW&POL                           | bit0~7                     | *4   |
|     | **OSC-1 Send**                                  |                            |      |
| 82  | Send D Level                                    | bit0~3 : 0~9               |      |
| 82  | Send C Level                                    | bit4~7 : 0~9               |      |
|     | **Color-1**                                     |                            |      |
| 83  | Intensity                                       | 00~63 : 00~99              |      |
| 84  | Velocity Sense                                  | 9D~63 : -99~99             |      |
|     | **VDF-1, VDA-1 KBD Track Mode**                 |                            |      |
| 85  | F-1, A-1 KBD Track Mode                         |                            | *5   |
|     | **OSC-1 Panpot**                                |                            |      |
| 86  | A:B Pan                                         | 00~1E,FF                   | *6   |
|     | **OSC-2 Parameters**                            |                            |      |
| 87  | Same as OSC-1 (40~86)                           |                            |      |
| ⋮   | (Parameters 87~133 mirror OSC-1)                |                            |      |
| 133 |                                                 |                            |      |
| 134 | (RESERVE)                                       | 00                         |      |
|     | **Effect Parameters**                           |                            |      |
| 135 |                                                 |                            | *11  |
| ⋮   |                                                 |                            |      |
| 163 |                                                 |                            |      |

*(OSC-2 parameters, 87–133, follow exactly the same structure as OSC-1, 40–86)*

---

## Program Parameter Table 7 — PARAM No. for PARAMETER CHANGE (1993.09.21)

| No. | Parameters                              | Param No. in TABLE 1 |
| --- | --------------------------------------- | -------------------- |
|     | **OSCILLATOR**                          |                      |
| 00  | OSC Mode                                | 10                   |
| 01  | Assign                                  | 11 bit0              |
| 02  | Hold                                    | 11 bit1              |
|     | **Pitch EG**                            |                      |
| 03  | Start Level                             | 21                   |
| 04  | Attack Time                             | 22                   |
| 05  | Attack Level                            | 23                   |
| 06  | Decay Time                              | 24                   |
| 07  | Release Time                            | 25                   |
| 08  | Release Level                           | 26                   |
| 09  | EG INT by Vel Sense                     | 28                   |
| 10  | EG Time by Vel Sense                    | 27                   |
|     | **Cutoff MG**                           |                      |
| 11  | Wave Form                               | 29 bit0~2            |
| 12  | Frequency                               | 30                   |
| 13  | Intensity                               | 32                   |
| 14  | Delay                                   | 31                   |
| 15  | OSC Select                              | 29 bit5,6            |
| 16  | Key Sync                                | 29 bit7              |
|     | **After Touch**                         |                      |
| 17  | Pitch Bend Range                        | 33                   |
| 18  | VDF Cutoff                              | 34                   |
| 19  | VDF MG Int                              | 35                   |
| 20  | VDA Amplitude                           | 36                   |
|     | **Bend Wheel, Modulation Wheel**        |                      |
| 21  | VDF MG Int                              | 39                   |
| 22  | Pitch Bend Range                        | 37                   |
| 23  | VDF Sweep Int                           | 38                   |
|     | **OSC-1**                               |                      |
| 24  | Multisound                              | 12, 13               |
| 25  | Level                                   | 65                   |
| 26  | Octave                                  | 14                   |
| 27  | Pitch EG Int                            | 40                   |
| 28  | A:B Pan                                 | 86                   |
| 29  | Send C Level                            | 82 bit4~7            |
| 30  | Send D Level                            | 82 bit0~3            |
|     | **VDF-1**                               |                      |
| 31  | Cutoff Value                            | 50                   |
| 32  | EG Intensity                            | 53                   |
|     | **Color-1**                             |                      |
| 33  | Intensity                               | 83                   |
| 34  | Int by Vel Sense                        | 84                   |
|     | **VDF-1 EG**                            |                      |
| 35  | Attack Time                             | 57                   |
| 36  | Attack Level                            | 58                   |
| 37  | Decay Time                              | 59                   |
| 38  | Break Point                             | 60                   |
| 39  | Slope Time                              | 61                   |
| 40  | Sustain Level                           | 62                   |
| 41  | Release Time                            | 63                   |
| 42  | Release Level                           | 64                   |
| 43  | EG Int by Vel Sense                     | 56                   |
| 44  | EG Time by Vel Sense                    | 55                   |
|     | **VDF-1 EG Time Mod by VEL Sense**      |                      |
| 45  | Attack Time                             | 79 bit0,4            |
| 46  | Decay Time                              | 79 bit1,5            |
| 47  | Slope Time                              | 79 bit2,6            |
| 48  | Release Time                            | 79 bit3,7            |
|     | **VDF-1 KBD Track**                     |                      |
| 49  | KBD Track Key                           | 66                   |
| 50  | Mode                                    | 85 bit0,1            |
| 51  | Cutoff                                  | 52                   |
| 52  | EG Time                                 | 54                   |
|     | **VDF-1 EG Time Mod by KBD Track**      |                      |
| 53  | Attack Time                             | 78 bit0,4            |
| 54  | Decay Time                              | 78 bit1,5            |
| 55  | Slope Time                              | 78 bit2,6            |
| 56  | Release Time                            | 78 bit3,7            |
|     | **VDA-1 EG**                            |                      |
| 57  | Attack Time                             | 71                   |
| 58  | Attack Level                            | 72                   |
| 59  | Decay Time                              | 73                   |
| 60  | Break Point                             | 74                   |
| 61  | Slope Time                              | 75                   |
| 62  | Sustain Level                           | 76                   |
| 63  | Release Time                            | 77                   |
| 64  | EG Int By Vel Sense                     | 68                   |
| 65  | EG Time By Vel Sense                    | 70                   |
|     | **VDA-1 EG Time Mod by VEL Sense**      |                      |
| 66  | Attack Time                             | 81 bit0,4            |
| 67  | Decay Time                              | 81 bit1,5            |
| 68  | Slope Time                              | 81 bit2,6            |
| 69  | Release Time                            | 81 bit3,7            |
|     | **VDA-1 KBD Track**                     |                      |
| 70  | KBD Track Key                           | 66                   |
| 71  | Mode                                    | 85 bit4,5            |
| 72  | Intensity                               | 67                   |
| 73  | EG Time                                 | 69                   |
|     | **VDA-1 EG Time Mod by KBD Track**      |                      |
| 74  | Attack Time                             | 80 bit0,4            |
| 75  | Decay Time                              | 80 bit1,5            |
| 76  | Slope Time                              | 80 bit2,6            |
| 77  | Release Time                            | 80 bit3,7            |
|     | OSC-1 Pitch MG                          |                      |
| 78  | Wave Form                               | 41 bit0~2            |
| 79  | Frequency                               | 42                   |
| 80  | Intensity                               | 45                   |
| 81  | Delay                                   | 43                   |
| 82  | Fade IN                                 | 44                   |
| 83  | Key Sync                                | 41 bit7              |
| 84  | Freq Mod by KBD Track                   | 46                   |
| 85  | Freq Mod by A.T+M.Wheel                 | 49                   |
| 86  | Intensity Mod by A.T                    | 47                   |
| 87  | Intensity Mod by M.Wheel                | 48                   |
|     | **Oscillator-2**                        |                      |
| 88  | Interval                                | 18                   |
| 89  | Detune                                  | 19                   |
| 90  | Delay Start                             | 20                   |
|     | **OSC-2 Parameters**                    |                      |
| 91  | (same structure as OSC-1, 24–87 repeat) | 87                   |
| ⋮   |                                         | ⋮                    |
| 154 |                                         | 133                  |
|     | **Effect Parameters**                   |                      |
| 155 |                                         | (Table 7-1)          |
| ⋮   |                                         |                      |
| 187 |                                         |                      |

---

## Effect Parameter Table 7-1

| PROG (No. of Table 7) | COMB (No. of Table 8) | MULT (No. of Table 9) | Parameters                           |
| --------------------- | --------------------- | --------------------- | ------------------------------------ |
| 155                   | 136                   | 144                   | Effect 1 Type                        |
| 156                   | 137                   | 145                   | Effect 2 Type                        |
| 157                   | 138                   | 146                   | Effect 1 OFF/ON                      |
| 158                   | 139                   | 147                   | Effect 2 OFF/ON                      |
| 159                   | 140                   | 148                   | OUT3 Panpot (Seri, Para1, 2)         |
| 160                   | 141                   | 149                   | OUT4 Panpot (Seri, Para1, 2)         |
| 161                   | 142                   | 150                   | OUT 3-L Level (Para3)                |
| 162                   | 143                   | 151                   | OUT 3-R Level (Para3)                |
| 163                   | 144                   | 152                   | OUT 4-L Level (Para3)                |
| 164                   | 145                   | 153                   | OUT 4-R Level (Para3)                |
| 165                   | 146                   | 154                   | Placement                            |
|                       | **Effect 1**          |                       |                                      |
| 166                   | 147                   | 155                   | Dynamic Mod Source                   |
| 167                   | 148                   | 156                   | Dynamic Mod Int                      |
| 168                   | 149                   | 157                   | Parameter 1                          |
| ⋮                     | ⋮                     | ⋮                     | ⋮                                    |
| 174                   | 155                   | 163                   | Parameter 7                          |
| 175                   | 156                   | 164                   | Balance 1                            |
| 176                   | 157                   | 165                   | Balance 2                            |
|                       | **Effect 2**          |                       |                                      |
| 177                   | 158                   | 166                   | Same as Effect 1<br>(166~176 : PROG) |
| ⋮                     | ⋮                     | ⋮                     | (147~157 : COMB)                     |
| 187                   | 168                   | 176                   | (155~165 : MULT)                     |

---

## OSC-1/2 Notes

**\*1: OSC Mode:**
- 0 = Single
- 1 = Double
- 2 = Drums

**\*2:**
- When at Single/Double mode:

| No. | Description    |
| --- | -------------- |
| 000 | Multisound 0   |
| ⋮   | ⋮              |
| 1AD | Multisound 429 |

- When at Drums mode:

| No. | Description    |
| --- | -------------- |
| 00  | Drum Kit 1     |
| 01  | Drum Kit 2     |
| 08  | ROM Drum Kit 1 |
| ⋮   | ⋮              |
| 0F  | ROM Drum Kit 8 |

**\*3: Wave Form:**
- 0 = Triangle
- 1 = Up Saw
- 2 = Down Saw
- 3 = Square1
- 4 = Random
- 5 = Square2

**\*4:**
- bit0 = Attack Time SW (=0:OFF, =1:ON)
- bit1 = Decay Time SW (=0:OFF, =1:ON)
- bit2 = Slope Time SW (=0:OFF, =1:ON)
- bit3 = Release Time SW (=0:OFF, =1:ON)
- bit4 = Attack Time Polarity (=0:+, =1:-)  
- bit5 = Decay Time Polarity (=0:+, =1:-)
- bit6 = Slope Time Polarity (=0:+, =1:-)
- bit7 = Release Time Polarity (=0:+, =1:-)

**\*5:**
bit0,1 for VDF:
- 0 = OFF
- 1 = LOW
- 2 = HIGH
- 3 = ALL

bit4,5 for VDA (same values)

**\*6:**
- 00 = A15 → 0F = CNT → 1E = B15
- 1F = PRG (only Combi data)
- FF = OFF

**\*7:**
- 00~63 = A00~A99
- 00~87 = G01~G136

**\*8:**
- bit0 = Program Change (=0:DIS, =1:ENA)
- bit1 = Damper (=0:DIS, =1:ENA)
- bit2 = After Touch (=0:DIS, =1:ENA)
- bit3 = Control Change (=0:DIS, =1:ENA)
- bit4,5 = 1,1 (fixed)
- bit6,7=0,0: Bank A Program / =0,1: Bank G Program

**\*9:**
- 0 = Equal Temp
- 1 = Equal Temp 2
- 2 = Pure Major
- 3 = Pure Minor
- 4 = Arabic
- 5 = Pythagorean
- 6 = Werkmeister
- 7 = Kirnberger
- 8 = Slendro
- 9 = Pelog
- A = User Scale

**\*10:**
bit0~4:
- 00 = A15 → 0F = CNT → 1E = B15
- 1F = OFF
bit5~7:
- 0 = EX Off
- 1 = EX Group1
- ⋮
- 6 = EX Group6
- 7 = Self
