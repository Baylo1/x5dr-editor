# X5DR Effect Parameter Capture Sheet

> **Notice:** a working sheet from this project's hardware captures. Effect type and parameter names are from the Korg X5DR Owner's Manual, © Korg Inc. This project is not affiliated with or endorsed by Korg.

## Why this sheet exists

The manual's effect parameter tables (`05_effect_parameters.md`) give reliable labels and value ranges, but early hardware tests (June 2026) showed that their **per-type parameter order doesn't match what the X5DR actually sends**. For example, Stereo Chorus 2's captured Parameter Changes came in a different order from the table, so controls built from the table would have been mapped to the wrong parameters.

Rather than fix the effect types one at a time, every effect type was grouped by its parameter set (25 groups, A–Y). Each parameter was then nudged once on the front panel while MIDI Monitor (Snoize) recorded the Parameter Change the device sent. This sheet is the worksheet for that capture. The Parameter Change numbers it records, relative to Effect 1's base (parameter 168), became the editor's `EFFECT_TYPES` table, the hardware ground truth that the manual's order could not provide. Three groups (G, K and Y) were re-captured after an audit for duplicate codes.

See Landmine #9 in `docs/X5DR_Editor_Landmines.md` and the "EFFECT Tab First Build + Hardware Testing" entry in the Decision Archive. To check a new or doubtful effect type, capture it the same way.

## Instructions

1. Load a patch that uses the effect type being tested (either Effect 1 or Effect 2 slot — **note which one you used**).
2. On the device front panel, navigate to each parameter listed and nudge it one step.
3. Copy the Snoize output for that parameter and paste into the space below it.
4. You only need **one message per parameter** — ignore duplicates (the device sends multiples).
5. Skip any parameter that the device doesn't show for that type.
6. Note which Effect slot (1 or 2) was used for each group — it affects the parameter numbers and we need to decode them correctly.

**Effect slot used is critical.** If unsure, test with Effect 2 (it's what we accidentally used for Stereo Chorus and it gave clean data).

---

## Group A — Types 1–3: Hall / 4–5: Room / 6: Live Stage
*(All six types share one parameter set per the manual — confirm with just one, e.g. Type 1: Hall)*

**Effect slot used (circle): 1**

**Type tested:** 1: Hall___________

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | Reverb Time  | 22:36:31.661	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 17 00 F7 |
| 2   | Hi Damp      | 22:37:09.639	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 3C 00 F7 |
| 3   | Pre Delay    | 22:37:21.749	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 4   | E.R Level    | 22:37:34.192	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 1F 00 F7 |
| 5   | EQ. Low      | 22:37:42.554	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 0C 00 F7 |
| 6   | EQ. High     | 22:38:00.427	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |

---

## Group B — Types 7–9: Wet Plate / Dry Plate / Spring
*(All three share one parameter set — test with one, e.g. Type 7: Wet Plate)*

**Effect slot used (circle): 1**

**Type tested:** 7: Wet Plate___________

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | Reverb Time  | 09:43:18.550	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 00 00 F7 |
| 2   | Hi Damp      | 09:44:03.843	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 1E 00 F7 |
| 3   | Pre Delay    | 09:44:13.453	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 4   | E.R. Level   | 09:44:55.255	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 05 00 F7 |
| 5   | EQ. Low      | 09:45:06.339	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 0C 00 F7 |
| 6   | EQ. High     | 09:45:16.236	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |

---

## Group C — Types 10–12: Early Reflection 1 / 2 / 3
*(All three share one parameter set — test with one)*

**Effect slot used (circle): 1**

**Type tested:** 10: Early Reflection 1___________

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | E.R Time     | 09:47:34.230	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 14 00 F7 |
| 2   | Pre Delay    | 09:47:45.252	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | EQ. Low      | 09:48:10.286	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 00 00 F7 |
| 4   | EQ. High     | 09:48:26.733	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 00 00 F7 |

---

## Group D — Types 13–14: Stereo Delay / Cross Delay
*(Already partially tested — Effect 1 Stereo Delay confirmed. Re-test to capture all params cleanly.)*

**Effect slot used (circle): 1**

**Type tested:** 13: Stereo Delay___________

| #   | Device label     | Paste Snoize line here                                                         |
| --- | ---------------- | ------------------------------------------------------------------------------ |
| 1   | Delay Time Left  | 09:49:24.197	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 64 00 F7 |
| 2   | Delay Time Right | 09:49:33.409	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Feedback         | 09:49:39.096	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 00 00 F7 |
| 4   | Hi Damp          | 09:50:56.278	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 1E 00 F7 |
| 5   | EQ. Low          | 09:51:06.993	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 0C 00 F7 |
| 6   | EQ. High         | 09:51:23.954	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |

---

## Group E — Type 15: Dual Delay

**Effect slot used (circle): 1**

| #   | Device label     | Paste Snoize line here                                                         |
| --- | ---------------- | ------------------------------------------------------------------------------ |
| 1   | Delay Time Left  | 09:52:04.232	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 64 00 F7 |
| 2   | Feedback Left    | 09:52:23.744	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Hi Damp Left     | 09:52:36.988	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 00 00 F7 |
| 4   | Delay Time Right | 09:52:49.802	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 1E 00 F7 |
| 5   | Feedback Right   | 09:53:01.174	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 63 00 F7 |
| 6   | Hi Damp Right    | 09:53:09.118	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |

---

## Group F — Types 16–18: Multi Tap Delay 1 / 2 / 3
*(All three share one parameter set — test with one)*

**Effect slot used (circle): 1**

**Type tested:** 16: Multi Tap Delay 1___________

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | Delay Time 1 | 09:54:08.549	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 64 00 F7 |
| 2   | Delay Time 2 | 09:54:18.372	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Feedback     | 09:54:26.220	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 63 00 F7 |
| 4   | EQ. Low      | 09:54:34.165	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 00 00 F7 |
| 5   | EQ. High     | 09:54:44.750	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 00 00 F7 |

---

## Group G — Types 19–20: Stereo Chorus 1 / 2
*(Already tested — Effect 2 Stereo Chorus 2 captured. Re-test Effect 1 to confirm same layout.)*

**Effect slot used (circle): 1**

**Type tested:** 19: Stereo Chorus 1___________

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | Delay Time   | 13:38:40.725	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 32 00 F7 |
| 2   | Tri/Sin      | 09:57:05.661	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 00 00 F7 |
| 3   | Mod Depth    | 09:57:15.609	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 01 00 F7 |
| 4   | Mod Speed    | 09:57:27.155	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 14 00 F7 |
| 5   | EQ. Low      | 09:57:37.919	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 0C 00 F7 |
| 6   | EQ. High     | 09:57:47.336	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |

---

## Group H — Types 21–22: Quadrature Chorus / X Over Chorus

**Effect slot used (circle): 1**

**Type tested:** 21: Quadrature Chorus___________

| #   | Device label     | Paste Snoize line here                                                         |
| --- | ---------------- | ------------------------------------------------------------------------------ |
| 1   | Delay Time Left  | 09:58:45.744	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 14 00 F7 |
| 2   | Delay Time Right | 09:59:20.999	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 14 00 F7 |
| 3   | Mod Depth        | 09:59:28.944	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 32 00 F7 |
| 4   | Mod Speed        | 09:59:37.368	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 14 00 F7 |
| 5   | Mod Shape        | 09:59:43.663	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 00 00 F7 |
| 6   | EQ. Low          | 10:00:07.047	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |
| 7   | EQ. High         | 10:00:13.837	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2E 01 00 00 F7 |

---

## Group I — Type 23: Harmonic Chorus

**Effect slot used (circle): 1**

| #   | Device label       | Paste Snoize line here                                                         |
| --- | ------------------ | ------------------------------------------------------------------------------ |
| 1   | Delay Time 1       | 10:00:53.394	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 32 00 F7 |
| 2   | Delay Time 2       | 10:01:14.571	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Mod Depth          | 10:01:28.810	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 00 00 F7 |
| 4   | Mod Speed          | 10:01:36.497	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 4B 00 F7 |
| 5   | Filter Split Point | 10:01:57.335	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 12 00 F7 |

---

## Group J — Type 24: Symphonic Ensemble

**Effect slot used (circle): 1**

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | Mod Depth    | 10:11:45.530	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 32 00 F7 |
| 2   | EQ. Low      | 10:11:58.042	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | EQ. High     | 10:12:29.273	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 00 00 F7 |

---

## Group K — Types 25–27: Flanger 1 / Flanger 2 / X Over Flanger
*(All three share one parameter set — test with one)*

**Effect slot used (circle): 1**

**Type tested:** 25: Flanger 1___________

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | Delay Time   | 13:40:12.320	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 0A 00 F7 |
| 2   | Resonance    | 10:13:52.125	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 00 00 F7 |
| 3   | Mod Depth    | 10:13:58.516	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 32 00 F7 |
| 4   | Mod Speed    | 10:14:17.799	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 14 00 F7 |
| 5   | EQ. Low      | 10:14:24.495	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 00 00 F7 |
| 6   | EQ. High     | 10:14:31.685	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |

---

## Group L — Type 28: Exciter

**Effect slot used (circle): 1**

| #   | Device label   | Paste Snoize line here                                                         |
| --- | -------------- | ------------------------------------------------------------------------------ |
| 1   | Blend          | 10:15:03.457	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 00 00 F7 |
| 2   | Emphasis Point | 10:15:12.560	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 05 00 F7 |
| 3   | EQ. Low        | 10:15:26.206	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 00 00 F7 |
| 4   | EQ. High       | 10:15:39.691	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 00 00 F7 |

---

## Group M — Type 29: Enhancer

**Effect slot used (circle): 1**

| #   | Device label     | Paste Snoize line here                                                         |
| --- | ---------------- | ------------------------------------------------------------------------------ |
| 1   | Harmonic Density | 10:16:28.680	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 1E 00 F7 |
| 2   | Hot Spot         | 10:16:43.644	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 0A 00 F7 |
| 3   | Stereo Width     | 10:16:54.150	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 32 00 F7 |
| 4   | Delay Time       | 10:17:05.377	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 14 00 F7 |
| 5   | EQ. Low          | 10:17:26.968	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 00 00 F7 |
| 6   | EQ. High         | 10:17:35.039	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |

---

## Group N — Types 30–31: Distortion / Over Drive

**Effect slot used (circle): 1**

**Type tested:** 30: Distortion___________

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | Drive        | 10:18:29.586	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 32 00 F7 |
| 2   | Resonance    | 10:19:09.535	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 00 00 F7 |
| 3   | Hot Spot     | 10:19:17.913	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 32 00 F7 |
| 4   | Out Level    | 10:19:42.529	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |
| 5   | EQ. Low      | 10:19:49.929	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 0C 00 F7 |
| 6   | EQ. High     | 10:19:58.482	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 00 00 F7 |

---

## Group O — Types 32–33: Phaser 1 / Phaser 2
*(Already flagged as problematic — test both if possible, or at minimum one)*

**Effect slot used (circle): 1

**Type tested:** 32: Phaser 1___________

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | Manual       | 10:20:49.106	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 32 00 F7 |
| 2   | Mod Depth    | 10:21:13.038	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 01 00 F7 |
| 3   | Mod Speed    | 10:21:38.503	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 14 00 F7 |
| 4   | Feedback     | 10:21:47.601	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 00 00 F7 |
| 5   | Tri/Sin      | 10:22:02.976	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 01 00 F7 |

---

## Group P — Type 34: Rotary Speaker

**Effect slot used (circle): 1**

| #   | Device label  | Paste Snoize line here                                                         |
| --- | ------------- | ------------------------------------------------------------------------------ |
| 1   | Vibrato Depth | 10:22:52.943	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 08 00 F7 |
| 2   | Acceleration  | 10:23:11.142	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 08 00 F7 |
| 3   | Slow Speed    | 10:23:22.241	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 0A 00 F7 |
| 4   | Fast Speed    | 10:23:43.542	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 32 00 F7 |

---

## Group Q — Types 35–36: Auto Pan / Tremolo
*(Both share one parameter set — test with one)*

**Effect slot used (circle): 1**

**Type tested:** 35: Auto Pan___________

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | Tri/Sin      | 10:25:54.358	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 01 00 F7 |
| 2   | Mod Shape    | 10:26:01.779	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 14 00 F7 |
| 3   | Mod Depth    | 10:26:18.581	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 00 00 F7 |
| 4   | Mod Speed    | 10:26:41.786	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 01 00 F7 |
| 5   | EQ. Low      | 10:26:55.771	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 00 00 F7 |
| 6   | EQ. High     | 10:27:10.231	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |

---

## Group R — Type 37: Parametric EQ

**Effect slot used (circle): 1**

| #   | Device label | Paste Snoize line here                                                         |
| --- | ------------ | ------------------------------------------------------------------------------ |
| 1   | Low Freq     | 10:28:13.909	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 0A 00 F7 |
| 2   | Low Gain     | 10:28:29.577	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Mid Freq     | 10:28:35.648	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 32 00 F7 |
| 4   | Mid Gain     | 10:28:43.959	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 00 00 F7 |
| 5   | Mid Width    | 10:28:49.052	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 32 00 F7 |
| 6   | Hi Freq      | 10:29:37.087	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 14 00 F7 |
| 7   | Hi Gain      | 10:29:45.815	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2E 01 00 00 F7 |

---

## Group S — Types 38–39: Chorus-Delay / Flanger-Delay
*(Both share one parameter set — test with one)*

**Effect slot used (circle): 1**

**Type tested:** 38: Chorus-Delay___________

| #   | Device label      | Paste Snoize line here                                                         |
| --- | ----------------- | ------------------------------------------------------------------------------ |
| 1   | Chorus Delay Time | 13:01:01.821	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 0A 00 F7 |
| 2   | Chorus Feedback   | 13:01:43.915	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 14 00 F7 |
| 3   | Chorus Mod Depth  | 13:01:51.314	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 00 00 F7 |
| 4   | Chorus Mod Speed  | 13:02:14.168	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 1E 00 F7 |
| 5   | Delay Delay Time  | 13:02:34.014	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 64 00 F7 |
| 6   | Delay Feedback    | 13:03:06.590	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |

---

## Group T — Type 40: Delay / Hall

**Effect slot used (circle): 1**

| #   | Device label     | Paste Snoize line here                                                         |
| --- | ---------------- | ------------------------------------------------------------------------------ |
| 1   | Delay Time       | 13:04:17.186	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 64 00 F7 |
| 2   | Delay Feedback   | 13:04:26.527	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Delay Hi Damp    | 13:04:32.150	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 00 00 F7 |
| 4   | Reverb Time      | 13:04:39.069	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 1E 00 F7 |
| 5   | Reverb Hi Damp   | 13:05:16.546	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 1E 00 F7 |
| 6   | Reverb Pre Delay | 13:05:23.193	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 17 00 F7 |

---

## Group U — Type 41: Delay / Room

**Effect slot used (circle): 1**

| #   | Device label     | Paste Snoize line here                                                         |
| --- | ---------------- | ------------------------------------------------------------------------------ |
| 1   | Delay Time       | 13:06:15.210	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 64 00 F7 |
| 2   | Delay Feedback   | 13:06:27.578	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Delay Hi Damp    | 13:06:34.466	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 00 00 F7 |
| 4   | Reverb Time      | 13:06:41.578	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 1E 00 F7 |
| 5   | Reverb Hi Damp   | 13:07:04.448	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 00 00 F7 |
| 6   | Reverb Pre Delay | 13:07:28.264	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 0A 00 F7 |

---

## Group V — Types 42–43: Delay / Chorus / Delay / Flanger
*(Both share one parameter set — test with one)*

**Effect slot used (circle): 1**

**Type tested:** Delay / Chorus___________

| #   | Device label     | Paste Snoize line here                                                         |
| --- | ---------------- | ------------------------------------------------------------------------------ |
| 1   | Delay Time       | 13:08:26.847	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 64 00 F7 |
| 2   | Delay Feedback   | 13:08:41.330	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Delay Hi Damp    | 13:08:48.074	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 00 00 F7 |
| 4   | Chorus Mod Depth | 13:08:56.834	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 1E 00 F7 |
| 5   | Chorus Mod Speed | 13:09:34.921	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 1E 00 F7 |
| 6   | Chorus Tri/Sin   | 13:09:49.432	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 01 00 F7 |

---

## Group W — Types 44–45: Delay / Distortion / Delay / Over Drive
*(Both share one parameter set — test with one)*

**Effect slot used (circle): 1**

**Type tested:** 44: Delay / Distortion___________

| #   | Device label         | Paste Snoize line here                                                         |
| --- | -------------------- | ------------------------------------------------------------------------------ |
| 1   | Delay Time           | 13:18:48.328	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 64 00 F7 |
| 2   | Delay Feedback       | 13:19:09.409	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Distortion Drive     | 13:19:21.166	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 01 00 F7 |
| 4   | Distortion Resonance | 13:19:50.363	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 32 00 F7 |
| 5   | Distortion Hot Spot  | 13:19:57.827	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 32 00 F7 |
| 6   | Out Level            | 13:20:26.992	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 01 00 F7 |

---

## Group X — Type 46: Delay / Phaser

**Effect slot used (circle): 1**

| #   | Device label     | Paste Snoize line here                                                         |
| --- | ---------------- | ------------------------------------------------------------------------------ |
| 1   | Delay Time       | 13:21:23.764	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 64 00 F7 |
| 2   | Delay Feed Back  | 13:21:34.996	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Delay Hi Damp    | 13:21:43.038	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 00 00 F7 |
| 4   | Phaser Mod Depth | 13:21:58.975	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 1E 00 F7 |
| 5   | Phaser Mod Speed | 13:22:32.448	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 1E 00 F7 |
| 6   | Phaser Feedback  | 13:22:38.262	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2D 01 14 00 F7 |

---

## Group Y — Type 47: Delay / Rotary Speaker

**Effect slot used (circle): 1**

| #   | Device label         | Paste Snoize line here                                                         |
| --- | -------------------- | ------------------------------------------------------------------------------ |
| 1   | Delay Time           | 13:33:44.648	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 28 01 64 00 F7 |
| 2   | Delay Feedback       | 13:41:59.282	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 29 01 00 00 F7 |
| 3   | Speaker Acceleration | 13:34:13.417	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2A 01 01 00 F7 |
| 4   | Speaker Slow Speed   | 13:34:34.943	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2B 01 08 00 F7 |
| 5   | Speaker Fast Speed   | 13:35:04.027	From Korg X5DR	SysEx		Korg 10 bytes	F0 42 30 36 41 2C 01 0A 00 F7 |

---

## Notes / anomalies

*(Use this space for anything unexpected — parameters that don't appear, extra parameters not listed above, device behavior that seems wrong, etc.)*

For parallel effects 40-47, the first named effect is on the L channel, the second named effect is on the R channel. 
Use terminology above for editor parameter labels. E.g, always use "Feedback" and not "Feed Back" or "F.B.", etc.

