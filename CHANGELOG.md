# Changelog

All notable changes to the Korg X5DR Editor are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-10-15

First public release.

### Added
- **Program editing:** every parameter, on six pages (Easy, OSC, VDF, VDA, Control, Effect), with draggable envelope displays (Shift-drag for time or level only) and envelope values you can drag one at a time; edits are sent to the device as you move a control.
- **Combination editing:** Timbres, Control and Effect pages.
- **Multi editing:** Tracks, Control and Effect pages, and Copy From Combination.
- **Global** settings and both **Drum Kits**, with a list of the Programs and Combinations that use each kit.
- All 47 **effect types**, with Serial and Parallel 1–3 routing diagrams.
- **Write In Place** and **Write To A New Slot…** for Programs and Combinations; **Discard Edits**; an Unsaved Edits prompt before leaving a slot with unwritten changes.
- **Initialize…** for Programs and Combinations.
- **Patch Browser** to audition and pick Programs and Combinations, including Bank G names.
- **Factory Sounds Bank A and B** built in, captured from a real X5DR. Bank B works on every model; 45 of Bank A's programs use X5D/X5DR-only sounds.
- **File → Load/Save → Data File…:** choose any of Programs, Combinations, Multi, Drums and Global; Single Program and Single Combination files too. Each file is checked before anything changes.
- **Device → Import From Device / Write to Device** for every data type.
- **MIDI port** chosen by name and remembered; a **MIDI channel** selector for devices not on channel 1.
- A **device status** indicator, a **No response from device** box with Retry when the device doesn't answer, and a box when the browser blocks MIDI.
- **Every value** can be changed by dragging its number up or down, or by clicking it and typing.
- **Help:** Getting Started, Troubleshooting, Report a Problem, Copy Diagnostics, About.
- Three colour themes; installable as an app; runs as a single downloadable file.

[1.0.0]: https://github.com/Baylo1/x5dr-editor/releases/tag/v1.0.0
