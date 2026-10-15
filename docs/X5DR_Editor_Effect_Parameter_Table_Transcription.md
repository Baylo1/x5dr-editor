# Effect Parameter Table — Transcription for Visual Confirmation (Rev. 2)

> **Notice:** transcribed by hand from the Korg X5DR Owner's Manual. The original material is © Korg Inc. It is included as a technical reference for this editor and is not covered by the project's MIT License. This project is not affiliated with or endorsed by Korg.

*Transcribed from `X5DR Manual - Effect Parameter Table.pdf` (the user's second, higher-
resolution scan, 2026-08-13), cross-checked against page 144 of the original
`X5DR Manual - Effects.pdf` scan. This is still a manual transcription of a scanned
document — please cross-check before it's used to audit `EFFECT_TYPES`. Ditto marks (〃)
have been expanded to their actual value. **Confidence is much higher on this pass** than
the first attempt (that file has been superseded by this one) — the new scan is
significantly clearer, and re-reading it revealed the table's actual structure clicked
into place (see note below), which resolved most of the earlier ambiguity by itself.

**Legend:**
- `[value]` = Initial Value (the device's own default on type-select/power-on)
- `●` prefix = this parameter is a valid Dynamic Modulation destination
- `DRY~FX` = ratio-style range (e.g. `80:20`)
- `*` = Dynamic Modulation lets you switch between "Slow Speed" and "Fast Speed" (types 34, 40/47 footnote)

**Structural note (new this pass):** every type has a **Dry:FX Balance** column — this is
the universal balance knob's default, separate from the 0–7 per-type `PARAMETERS` offsets
`EFFECT_TYPES` models. For the 8 "Combination Parallel" types (40–43, 46–47), the table
prints **two** Dry:FX Balance entries per row — one early (the first sub-effect's balance,
e.g. Delay's) and one late (the second sub-effect's, e.g. Chorus's). This directly
corroborates Item 2's hardware finding: these types really do have two independent
balance defaults, not a mirrored pair. Types 44–45 print only **one** Balance entry each,
matching the already-known exception (`balR` has no device effect there).

**⚠ markers** = still genuinely ambiguous on this pass — please prioritize these specifically.

---

## REVERB (types 1–9)

| #   | Type          | Reverb Time       | Pre Delay      | E.R Level     | High Damp     | EQ Low           | EQ High          | Dry:FX Balance      |
| --- | ------------- | ----------------- | -------------- | ------------- | ------------- | ---------------- | ---------------- | ------------------- |
| 1   | Hall          | 0.2~9.9 **[2.3]** | 0~200 **[60]** | 0~99 **[62]** | 0~99 **[31]** | -12~+12 **[-3]** | -12~+12 **[-1]** | ●DRY~FX **[80:20]** |
| 2   | Ensemble Hall | 0.2~9.9 **[3.1]** | 0~200 **[15]** | 0~99 **[23]** | 0~99 **[32]** | -12~+12 **[-1]** | -12~+12 **[-3]** | ●DRY~FX **[80:20]** |
| 3   | Concert Hall  | 0.2~9.9 **[3.3]** | 0~200 **[80]** | 0~99 **[46]** | 0~99 **[41]** | -12~+12 **[-2]** | -12~+12 **[-4]** | ●DRY~FX **[80:20]** |
| 4   | Room          | 0.2~4.9 **[1.3]** | 0~200 **[8]**  | 0~99 **[68]** | 0~99 **[36]** | -12~+12 **[+1]** | -12~+12 **[+2]** | ●DRY~FX **[78:22]** |
| 5   | Large Room    | 0.2~4.9 **[2.4]** | 0~200 **[25]** | 0~99 **[51]** | 0~99 **[32]** | -12~+12 **[-1]** | -12~+12 **[+2]** | ●DRY~FX **[78:22]** |
| 6   | Live Stage    | 0.2~4.9 **[2.2]** | 0~200 **[12]** | 0~99 **[81]** | 0~99 **[36]** | -12~+12 **[-5]** | -12~+12 **[-4]** | ●DRY~FX **[75:25]** |
| 7   | Wet Plate     | 0~99 **[59]**     | 0~200 **[29]** | 1~10 **[7]**  | 0~99 **[51]** | -12~+12 **[0]**  | -12~+12 **[-4]** | ●DRY~FX **[80:20]** |
| 8   | Dry Plate     | 0~99 **[30]**     | 0~200 **[26]** | 1~10 **[5]**  | 0~99 **[47]** | -12~+12 **[+2]** | -12~+12 **[+2]** | ●DRY~FX **[80:20]** |
| 9   | Spring Reverb | 0~99 **[25]**     | 0~200 **[0]**  | 1~10 **[9]**  | 0~99 **[30]** | -12~+12 **[+2]** | -12~+12 **[-4]** | ●DRY~FX **[78:22]** |

**Confirms the Item 1 follow-up flag:** types 7–9 (Wet/Dry Plate, Spring Reverb) have three
genuinely different Reverb Time defaults (59/30/25), but the app's current `plate` array
hardcodes one shared `initial: 30` for all three — worth a fix once this table is confirmed.

---

## EARLY REFLECTION (types 10–12)

| # | Type | E.R Time | Pre Delay | EQ Low | EQ High | Dry:FX Balance |
|---|---|---|---|---|---|---|
| 10 | Early Reflection 1 | 100~800 **[220]** | 0~200 **[10]** | -12~+12 **[-4]** | -12~+12 **[-4]** | ●DRY~FX **[68:32]** |
| 11 | Early Reflection 2 | 100~800 **[180]** | 0~200 **[30]** | -12~+12 **[+1]** | -12~+12 **[0]** | ●DRY~FX **[65:35]** |
| 12 | Early Reflection 3 | 100~800 **[300]** | 0~200 **[90]** | -12~+12 **[0]** | -12~+12 **[0]** | ●DRY~FX **[75:25]** |

---

## STEREO DELAY (types 13–14)

| # | Type | Delay Time L | Delay Time R | Feedback | High Damp | EQ Low | EQ High | Dry:FX Balance |
|---|---|---|---|---|---|---|---|---|
| 13 | Stereo Delay | 0~500 **[185]** | 0~500 **[370]** | -99~+99 **[-40]** | 0~99 **[10]** | -12~+12 **[0]** | -12~+12 **[0]** | ●DRY~FX **[80:20]** |
| 14 | Cross Delay | 0~500 **[190]** | 0~500 **[380]** | -99~+99 **[+40]** | 0~99 **[10]** | -12~+12 **[0]** | -12~+12 **[0]** | ●DRY~FX **[80:20]** |

---

## DUAL MONO DELAY (type 15)

| # | Type | Delay Time L | Feedback L | High Damp L | Dry:FX Balance L | Delay Time R | Feedback R | High Damp R | Dry:FX Balance R |
|---|---|---|---|---|---|---|---|---|---|
| 15 | Dual Mono Delay | 0~500 **[20]** | -99~+99 **[0]** | 0~99 **[0]** | DRY~FX **[50:50]** | 0~500 **[40]** | -99~+99 **[0]** | 0~99 **[10]** | ●DRY~FX **[35:65]** |

---

## MULTI TAP DELAY (types 16–18)

| # | Type | Delay Time 1 | Delay Time 2 | Feedback | EQ Low | EQ High | Dry:FX Balance |
|---|---|---|---|---|---|---|---|
| 16 | Multi Tap Delay 1 | 0~500 **[175]** | 0~500 **[350]** | -99~+99 **[+30]** | -12~+12 **[0]** | -12~+12 **[0]** | ●DRY~FX **[80:20]** |
| 17 | Multi Tap Delay 2 | 0~500 **[200]** | 0~500 **[400]** | -99~+99 **[0]** | -12~+12 **[0]** | -12~+12 **[0]** | ●DRY~FX **[70:30]** |
| 18 | Multi Tap Delay 3 | 0~500 **[250]** | 0~500 **[500]** | -99~+99 **[+20]** | -12~+12 **[0]** | -12~+12 **[0]** | ●DRY~FX **[75:25]** |

---

## CHORUS — Stereo Chorus (types 19–20)

| # | Type | Delay Time | Mod Speed | Mod Depth | Mod Waveform | EQ Low | EQ High | Dry:FX Balance |
|---|---|---|---|---|---|---|---|---|
| 19 | Stereo Chorus 1 | 0~200 **[3]** | 0.03~30 **[0.33]** | 0~99 **[99]** | SIN,TRI **[TRI]** | -12~+12 **[+4]** | -12~+12 **[+4]** | ●DRY~FX **[50:50]** |
| 20 | Stereo Chorus 2 | 0~200 **[2]** | 0.03~30 **[0.42]** | 0~99 **[84]** | SIN,TRI **[SIN]** | -12~+12 **[+3]** | -12~+12 **[+4]** | ●DRY~FX **[60:40]** |

---

## CHORUS — Quadrature/Cross Over (types 21–22)

| #   | Type              | Delay Time L   | Delay Time R   | Mod Speed      | Mod Depth     | Mod Waveform (Shape) | EQ Low          | EQ High         | Dry:FX Balance     |
| --- | ----------------- | -------------- | -------------- | -------------- | ------------- | -------------------- | --------------- | --------------- | ------------------ |
| 21  | Quadrature Chorus | 0~250 **[24]** | 0~250 **[12]** | ●1~99 **[30]** | 0~99 **[50]** | T+10~S+10 **[T+0]**  | -12~+12 **[0]** | -12~+12 **[0]** | DRY~FX **[50:50]** |
| 22  | Cross Over Chorus | 0~250 **[2]**  | 0~250 **[24]** | ●1~99 **[16]** | 0~99 **[99]** | T+10~S+10 **[T+0]**  | -12~+12 **[0]** | -12~+12 **[0]** | DRY~FX **[50:50]** |

---

## HARMONIC CHORUS (type 23)

*No EQ Low/EQ High columns for this type — matches the app's `harmonicChorus` array, which has none.*

| #   | Type            | Delay Time L  | Delay Time R   | Mod Speed      | Mod Depth     | Filter Split Point | Dry:FX Balance     |
| --- | --------------- | ------------- | -------------- | -------------- | ------------- | ------------------ | ------------------ |
| 23  | Harmonic Chorus | 0~500 **[4]** | 0~500 **[12]** | ●1~99 **[36]** | 0~99 **[99]** | 0~18 **[3]**       | DRY~FX **[25:75]** |

---

## SYMPHONIC ENSEMBLE (type 24)

*Only 3 params total, matching the app's `symphonic` array (Mod Depth, EQ Low, EQ High).*

| # | Type | Mod Depth | EQ Low | EQ High | Dry:FX Balance |
|---|---|---|---|---|---|
| 24 | Symphonic Ensemble | 0~99 **[92]** | -12~+12 **[0]** | -12~+12 **[0]** | ●DRY~FX **[67:33]** |

---

## FLANGER (types 25–27)

| #   | Type               | Delay Time     | Mod Depth     | Mod Speed      | Resonance         | EQ Low          | EQ High         | Dry:FX Balance     |
| --- | ------------------ | -------------- | ------------- | -------------- | ----------------- | --------------- | --------------- | ------------------ |
| 25  | Flanger 1          | 0~200 **[5]**  | 0~99 **[50]** | ●1~99 **[20]** | -99~+99 **[+80]** | -12~+12 **[0]** | -12~+12 **[0]** | DRY~FX **[50:50]** |
| 26  | Flanger 2          | 0~200 **[24]** | 0~99 **[99]** | ●1~99 **[42]** | -99~+99 **[+36]** | -12~+12 **[0]** | -12~+12 **[0]** | DRY~FX **[50:50]** |
| 27  | Cross Over Flanger | 0~200 **[1]**  | 0~99 **[60]** | ●1~99 **[22]** | -99~+99 **[+80]** | -12~+12 **[0]** | -12~+12 **[0]** | DRY~FX **[50:50]** |

---

## EXCITER (type 28)

| #   | Type    | Blend             | Emphatic Point | EQ Low           | EQ High          | Dry:FX Balance      |
| --- | ------- | ----------------- | -------------- | ---------------- | ---------------- | ------------------- |
| 28  | Exciter | -99~+99 **[+60]** | 1~10 **[01]**  | -12~+12 **[+3]** | -12~+12 **[+3]** | ●DRY~FX **[50:50]** |

---

## ENHANCER (type 29)

| # | Type | Harmonic Density | Hot Spot | Stereo Width | Delay Time | EQ Low | EQ High | Dry:FX Balance |
|---|---|---|---|---|---|---|---|---|
| 29 | Enhancer | 1~99 **[28]** | 1~20 **[3]** | 0~99 **[85]** | 1~99 **[25]** | -12~+12 **[0]** | -12~+12 **[0]** | ●DRY~FX **[50:50]** |

---

## DISTORTION (types 30–31)

| # | Type | Drive | Hot Spot | Resonance | EQ Low | EQ High | Out Level | Dry:FX Balance |
|---|---|---|---|---|---|---|---|---|
| 30 | Distortion | 1~111 **[107]** | ●0~99 **[99]** | 0~99 **[07]** | -12~+12 **[0]** | -12~+12 **[0]** | 0~99 **[6]** | DRY~FX **[50:50]** |
| 31 | Over Drive | 1~111 **[85]** | ●0~99 **[70]** | 0~99 **[63]** | -12~+12 **[0]** | -12~+12 **[0]** | 0~99 **[8]** | DRY~FX **[50:50]** |

---

## PHASER (types 32–33)

| # | Type | Manual | Mod Speed | Mod Depth | Feedback | Mod Waveform | Dry:FX Balance |
|---|---|---|---|---|---|---|---|
| 32 | Stereo Phaser 1 | 0~99 **[98]** | ●0.03~30 **[0.24]** | 0~99 **[90]** | -99~+99 **[96]** | SIN,TRI **[TRI]** | DRY~FX **[50:50]** |
| 33 | Stereo Phaser 2 | 0~99 **[96]** | ●0.03~30 **[0.24]** | 0~99 **[90]** | -99~+99 **[90]** | SIN,TRI **[SIN]** | DRY~FX **[50:50]** |

---

## ROTARY SPEAKER (type 34)

| # | Type | Vibrato Depth | Acceleration | Slow Speed | Fast Speed | Dry:FX Balance |
|---|---|---|---|---|---|---|
| 34 | Rotary Speaker | 0~15 **[2]** | 1~15 **[12]** | 1~99 **[25]** | 1~99 **[69]** | DRY~FX **[34:66]** * |

---

## TREMOLO (types 35–36)

| # | Type | Mod Waveform | Mod Wave Shape | Mod Speed | Mod Depth | EQ Low | EQ High | Dry:FX Balance |
|---|---|---|---|---|---|---|---|---|
| 35 | Auto Pan | SIN,TRI **[TRI]** | -99~+99 **[+96]** | 0.03~30 **[0.21]** | 0~99 **[96]** | -12~+12 **[0]** | -12~+12 **[0]** | ●DRY~FX **[20:80]** |
| 36 | Tremolo | SIN,TRI **[TRI]** | -99~+99 **[-99]** | 0.03~30 **[3.9]** | 0~99 **[99]** | -12~+12 **[0]** | -12~+12 **[0]** | ●DRY~FX **[50:50]** |

---

## PARAMETRIC EQ (type 37)

| # | Type | Low Freq | Low Gain | Mid Freq | Mid Gain | Mid Width | High Freq | High Gain | Dry:FX Balance |
|---|---|---|---|---|---|---|---|---|---|
| 37 | Parametric EQ | 0~29 **[15]** | -12~+12 **[+6]** | ●0~99 **[50]** | -12~+12 **[+6]** | 0~99 **[50]** | 0~29 **[12]** | -12~+12 **[+6]** | DRY~FX **[50:50]** |

---

## COMBINATION SERIAL (types 38–39)

| # | Type | Flg/Cho Delay | Flg/Cho F·Back | Mod Speed | Mod Depth | Delay Time | Delay Feedback | Dry:FX Balance |
|---|---|---|---|---|---|---|---|---|
| 38 | Chorus-Delay | 0~50 **[24]** | -99~+99 **[+24]** | 1~99 **[12]** | 0~99 **[75]** | 0~450 **[120]** | -99~+99 **[+16]** | ●DRY~FX **[60:40]** |
| 39 | Flanger-Delay | 0~50 **[1]** | -99~+99 **[+80]** | 1~99 **[04]** | 0~99 **[99]** | 0~450 **[300]** | -99~+99 **[+30]** | ●DRY~FX **[50:50]** |

---

## COMBINATION PARALLEL (types 40–47)

*Every row shows two Dry:FX Balance entries — Balance 1 (first sub-effect, e.g. the delay
side) and Balance 2 (second sub-effect, e.g. the reverb/chorus/flanger/phaser side) — see
the structural note at the top. Types 44–45 are the confirmed exception with only one.*

### 40–41 — Delay/Hall, Delay/Room

| #   | Type       | Delay Time     | Feedback        | High Damp    | Balance 1        | Reverb Time       | Pre Delay      | Reverb High Damp | Balance 2           |
| --- | ---------- | -------------- | --------------- | ------------ | ---------------- | ----------------- | -------------- | ---------------- | ------------------- |
| 40  | Delay/Hall | 0~500 **[30]** | -99~+99 **[0]** | 0~99 **[0]** | ●DRY~FX **[FX]** | 0.2~9.9 **[3.0]** | 0~150 **[68]** | 0~99 **[34]**    | ●DRY~FX **[70:30]** |
| 41  | Delay/Room | 0~500 **[20]** | -99~+99 **[0]** | 0~99 **[0]** | ●DRY~FX **[FX]** | 0.2~4.9 **[1.1]** | 0~150 **[0]**  | 0~99 **[28]**    | ●DRY~FX **[65:35]** |

**⚠ Two flags here:**
1. **Balance 1's `[FX]` value** — printed as literal text "FX", not a ratio like `80:20`. My best guess is this means "fully wet" (all FX, no dry) as the delay side's default, but I want you to confirm the actual glyph — it's genuinely unusual next to every other cell being a ratio.
2. **Type 41's Reverb Time range prints as `0.2~9.9`, identical to Type 40's** — but the app's existing `dlyRoom` array already independently encodes this as capped at raw 47 (4.9s), matching Room's own narrower range (types 4–6 above). Either the manual really does give Delay/Room the full Hall-width range (meaning the app's pre-existing `dlyRoom` max might be wrong), or this is a scan misread of `0.2~4.9` — a `4` and `9` look similar in this font at this resolution. Worth a very close look at this one specific cell.

### 42 — Delay/Chorus

| # | Type | Delay Time | Feedback | High Damp | Balance 1 | Chorus Mod Speed | Chorus Mod Depth | Mod Waveform | Balance 2 |
|---|---|---|---|---|---|---|---|---|---|
| 42 | Delay/Chorus | 0~500 **[220]** | -99~+99 **[+15]** | 0~99 **[50]** | ●DRY~FX **[70:30]** | 0.03~30 **[0.39]** | 0~99 **[99]** | SIN,TRI **[TRI]** | ●DRY~FX **[50:50]** |

### 43 — Delay/Flanger

| # | Type | Delay Time | Feedback | High Damp | Balance 1 | Flanger Mod Speed | Flanger Mod Depth | Flanger Feedback | Balance 2 |
|---|---|---|---|---|---|---|---|---|---|
| 43 | Delay/Flanger | 0~500 **[400]** | -99~+99 **[+20]** | 0~99 **[60]** | ●DRY~FX **[70:30]** | 0.03~30 **[0.21]** | 0~99 **[96]** | -99~+99 **[-75]** | ●DRY~FX **[50:50]** |

### 44–45 — Delay/Distortion, Delay/Over Drive (single Balance, confirmed exception)

| # | Type | Delay Time | Feedback | Dry:FX Balance | Drive | Hot Spot | Resonance | Out Level |
|---|---|---|---|---|---|---|---|---|
| 44 | Delay/Distortion | 0~500 **[250]** | -99~+99 **[+40]** | DRY~FX **[79:21]** | 1~111 **[105]** | 1~99 **[99]** | 0~99 **[07]** | 1~99 **[10]** |
| 45 | Delay/Over Drive | 0~500 **[350]** | -99~+99 **[+50]** | DRY~FX **[75:25]** | 1~111 **[65]** | 1~99 **[90]** | 0~99 **[63]** | 1~99 **[20]** |

### 46 — Delay/Phaser

| #   | Type         | Delay Time      | Feedback          | Balance 1           | Phaser Mod Speed   | Phaser Mod Depth | Phaser Feedback   | Balance 2           |
| --- | ------------ | --------------- | ----------------- | ------------------- | ------------------ | ---------------- | ----------------- | ------------------- |
| 46  | Delay/Phaser | 0~500 **[300]** | -99~+99 **[+15]** | ●DRY~FX **[60:40]** | 0.03~30 **[0.69]** | 0~99 **[90]**    | -99~+99 **[+99]** | ●DRY~FX **[25:75]** |

### 47 — Delay/Rotary Speaker

| # | Type | Delay Time | Feedback | Balance 1 | Acceleration | Slow Speed | Fast Speed | Balance 2 |
|---|---|---|---|---|---|---|---|---|
| 47 | Delay/Rotary Speaker | 0~500 **[280]** | -99~+99 **[+15]** | DRY~FX **[70:30]** | 1~15 **[10]** | 1~99 **[25]** | 1~99 **[69]** | DRY~FX **[30:70]** * |

---

## Remaining flagged cells (priority list for your visual pass)

1. **Type 5 (Large Room) EQ Low** — read as `[-1]`, low confidence.
2. **Type 8 (Dry Plate) EQ High** — read as `[+2]`, low confidence.
3. **Type 28 (Exciter) EQ Low/EQ High** — both read as `[+3]`, worth a second look.
4. **Type 40/41's `[FX]` Balance 1 value** — confirm the actual printed glyph.
5. **Type 41's Reverb Time range (`0.2~9.9` vs. possible `0.2~4.9`)** — this one matters most, since it potentially contradicts the app's existing (pre-this-session) `dlyRoom` code.

Everything else on this pass I'm reasonably confident in, though as always with a scanned
document, a second set of eyes is worth it before this feeds a hardware-facing change.
