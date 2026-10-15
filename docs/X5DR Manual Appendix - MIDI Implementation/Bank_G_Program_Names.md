# Korg X5DR — Bank G Program Name List

> **Notice:** transcribed by hand from the Korg X5DR Owner's Manual. The original material is © Korg Inc. It is included as a technical reference for this editor and is not covered by the project's MIT License. This project is not affiliated with or endorsed by Korg.

Transcribed from a manual scan provided by the user (`X5DR_Manual_-_Bank_G_sounds.pdf`), page "Bank G" (Preset-b / Bank A page on the same scan is not transcribed here — Bank A names already exist in the editor's own `Snapshot.programs` data, this file is Bank G only).
Transcription date: July 2026.

---

## Overview

The X5DR's Bank G holds 136 preset Programs. The manual displays them as **G01–G136**, one-indexed — this is a real, confirmed difference from Bank A's display convention (**A00–A99**, zero-indexed). Do not assume the two banks share a display convention.

**Raw Parameter Change / dump byte value is zero-indexed (0–135)**, per `04_combi_multi_global_drums.md` footnote `*7`. The relationship confirmed against this transcription is:

```
display label = "G" + String(raw + 1).padStart(2, '0')
raw index     = parseInt(display label without "G") - 1
```

i.e. raw `0` → `G01`, raw `135` → `G136`. This corrects an assumption made in `Brief-13-Combi-Sound-Tab.md`, which — written before this scan was available — guessed at a zero-indexed `G000`–`G135` display with no name data at all. Both the indexing and the "no names available" assumption were wrong; see the note at the end of this file for the exact correction needed in that brief.

**Mode column:**
- `*` — Double Mode Program
- `@` — Drum Mode Program
- (blank) — Single Mode Program

---

## Bank G Name Table

| Raw | Display | Name | Mode |
|---|---|---|---|
| 000 | G01 | Piano | |
| 001 | G02 | BritePiano | |
| 002 | G03 | HammerPno | * |
| 003 | G04 | HonkeyTonk | * |
| 004 | G05 | New Tines | |
| 005 | G06 | Digi Piano | |
| 006 | G07 | Harpsicord | |
| 007 | G08 | Clav | |
| 008 | G09 | Celesta | |
| 009 | G10 | Glocken | |
| 010 | G11 | Music Box | |
| 011 | G12 | Vibes | |
| 012 | G13 | Marimba | |
| 013 | G14 | Xylophon | |
| 014 | G15 | Tubular | |
| 015 | G16 | Santur | |
| 016 | G17 | Full Organ | |
| 017 | G18 | Perc Organ | * |
| 018 | G19 | BX-3 Organ | |
| 019 | G20 | ChurchPipe | |
| 020 | G21 | Positive | |
| 021 | G22 | Musette | |
| 022 | G23 | Harmonica | |
| 023 | G24 | Tango | |
| 024 | G25 | ClassicGtr | |
| 025 | G26 | A.Guitar | |
| 026 | G27 | JazzGuitar | |
| 027 | G28 | Clean Gtr | |
| 028 | G29 | MuteGuitar | |
| 029 | G30 | Over Drive | |
| 030 | G31 | DistGuitar | |
| 031 | G32 | RockMonics | * |
| 032 | G33 | Jazz Bass | |
| 033 | G34 | Deep Bass | |
| 034 | G35 | Pick Bass | |
| 035 | G36 | Fretless | |
| 036 | G37 | SlapBass 1 | |
| 037 | G38 | SlapBass 2 | |
| 038 | G39 | SynthBass1 | * |
| 039 | G40 | SynthBass2 | |
| 040 | G41 | Violin | |
| 041 | G42 | Viola | |
| 042 | G43 | Cello | |
| 043 | G44 | ContraBass | |
| 044 | G45 | TremoloStr | |
| 045 | G46 | Pizzicato | |
| 046 | G47 | Harp | |
| 047 | G48 | Timpani | |
| 048 | G49 | Marcato | |
| 049 | G50 | SlowString | |
| 050 | G51 | Analog Pad | * |
| 051 | G52 | String Pad | |
| 052 | G53 | Choir | |
| 053 | G54 | Doo Voice | |
| 054 | G55 | Voices | |
| 055 | G56 | Orch Hit | |
| 056 | G57 | Trumpet | |
| 057 | G58 | Trombone | |
| 058 | G59 | Tuba | |
| 059 | G60 | Muted Trpt | |
| 060 | G61 | FrenchHorn | * |
| 061 | G62 | Brass | |
| 062 | G63 | SynBrass 1 | * |
| 063 | G64 | SynBrass 2 | * |
| 064 | G65 | SopranoSax | |
| 065 | G66 | Alto Sax | |
| 066 | G67 | Tenor Sax | |
| 067 | G68 | Bari Sax | |
| 068 | G69 | Sweet Oboe | |
| 069 | G70 | EnglishHrn | |
| 070 | G71 | BasoonOboe | |
| 071 | G72 | Clarinet | |
| 072 | G73 | Piccolo | |
| 073 | G74 | Flute | |
| 074 | G75 | Recorder | |
| 075 | G76 | Pan Flute | |
| 076 | G77 | Bottle | |
| 077 | G78 | Shakuhachi | |
| 078 | G79 | Whistle | |
| 079 | G80 | Ocarina | |
| 080 | G81 | SquareWave | * |
| 081 | G82 | Saw Wave | |
| 082 | G83 | SynCaliope | * |
| 083 | G84 | Syn Chiff | * |
| 084 | G85 | Charang | |
| 085 | G86 | AirChorus | * |
| 086 | G87 | Rezzo4ths | * |
| 087 | G88 | Bass&Lead | * |
| 088 | G89 | Fantasia | * |
| 089 | G90 | Warm Pad | |
| 090 | G91 | Poly Pad | * |
| 091 | G92 | Ghost Pad | |
| 092 | G93 | BowedGlass | * |
| 093 | G94 | Metal Pad | * |
| 094 | G95 | Halo Pad | * |
| 095 | G96 | Sweep | |
| 096 | G97 | Ice Rain | * |
| 097 | G98 | SoundTrack | * |
| 098 | G99 | Crystal | * |
| 099 | G100 | Atmosphere | * |
| 100 | G101 | Brightness | * |
| 101 | G102 | Goblin | |
| 102 | G103 | Echo Drop | |
| 103 | G104 | Star Theme | |
| 104 | G105 | Sitar | * |
| 105 | G106 | Banjo | |
| 106 | G107 | Shamisen | |
| 107 | G108 | Koto | |
| 108 | G109 | Kalimba | |
| 109 | G110 | Scotland | * |
| 110 | G111 | Fiddle | * |
| 111 | G112 | Shanai | |
| 112 | G113 | Metal Bell | |
| 113 | G114 | Agogo | |
| 114 | G115 | SteelDrums | |
| 115 | G116 | Woodblock | |
| 116 | G117 | Taiko | * |
| 117 | G118 | Tom | |
| 118 | G119 | Synth Tom | |
| 119 | G120 | Rev Cymbal | |
| 120 | G121 | Fret Noise | |
| 121 | G122 | NoiseChiff | |
| 122 | G123 | Seashore | * |
| 123 | G124 | Birds | |
| 124 | G125 | Telephone | |
| 125 | G126 | Helicopter | |
| 126 | G127 | Stadium!! | * |
| 127 | G128 | GunShot | |
| 128 | G129 | GM Kit | @ |
| 129 | G130 | Power Kit | @ |
| 130 | G131 | Analog Kit | @ |
| 131 | G132 | Jazz Kit | @ |
| 132 | G133 | Brush kit | @ |
| 133 | G134 | Perc Kit | @ |
| 134 | G135 | Dance Kit | @ |
| 135 | G136 | Orch Kit | @ |

---

## Correction required in Brief #13

`Brief-13-Combi-Sound-Tab.md`, §5 (Program Browser overlay), currently states:

> "There is no Bank G program name source anywhere in the project's reference files... show Bank G entries by number only (`G000`–`G135`, no name)."

Both parts of that statement are superseded by this file:
1. **Names now exist** — the Program Browser should display Bank G entries with real names, exactly like Bank A, not numbers only.
2. **The display format itself was wrong** — `G000`–`G135` (zero-indexed) should be `G01`–`G136` (one-indexed), per the confirmed formula above.

I will update Brief #13 directly to reflect this rather than leaving the correction only noted here — see the accompanying revision.
