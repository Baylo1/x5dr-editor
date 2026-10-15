# Korg X5DR Editor — App Icon (Release Plan B1)

Design: 1a "Knob" — face-on rotary, amber value arc on graphite track (Warm Graphite theme).

Copy these into `src/icons/`.

| File | Use |
|---|---|
| `icon-master.svg` | Master, 512 artboard, full-bleed `#1c1916` background |
| `icon-1024.png` | 1024×1024 raster of the master (manifest `purpose: "any"`) |
| `icon-maskable-1024.png` | Maskable variant (manifest `purpose: "maskable"`); artwork scaled to 92%, outer edge at ~68% radius, inside the 80% safe circle |
| `favicon.svg` | Simplified 16–32px version: thicker arc (72) and pointer (40), no shading |
| `social-preview-1280x640.png` | GitHub social preview, icon + "Korg X5DR Editor" in Inter 600 |

Colours: bg `#1c1916`, track/border `#3a332c`, knob `#2c2721`, pointer `#ece6dd`, arc `#ffab4a`.

Wiring hints for Claude Code:
- `<link rel="icon" href="icons/favicon.svg" type="image/svg+xml">`
- Generate 192/512 PNGs from `icon-1024.png` / `icon-maskable-1024.png` for the manifest if needed.
- `theme_color` / `background_color`: `#242019` / `#1c1916`.
