# APEX 8.0 — Circuit Studio for Assetto Corsa

**[Open the website](https://deepinkgroup.github.io/apex-circuit-workshop/)**

Trace a racing circuit over satellite imagery or an uploaded reference, refine its geometry, analyze its data, and export a native Assetto Corsa track ZIP for Content Manager. No account, build step, or server is required.

**[Tracing, export, installation, and limitations](docs/ASSETTO_CORSA.md)**

## Trace → inspect → export

- The export bypasses the custom BC1 compressor with explicit 32-bit color/alpha masks and opaque pixels, adjusts material lighting, versions texture names, and includes explicit CSP texture bindings. The white-surface symptom still needs visual confirmation in-game.
- Improved grass detail and optional CSP Grass FX, with road/pit/building occlusion. The colored base also works without CSP.
- Building rotation via canvas handle (Shift snaps to 15°), degree input, slider, ±15° buttons, and 90° turn.
- Automatic curved connections from custom pit entry/exit to the road, including elevation and bank blending; disable auto-connect for manual joins.
- Corrected crew SIDE placement and sector TEXT keys after inspecting game-log errors.

- Automatic textured grass across empty ground: meadow, mown lawn, and dry summer finishes.
- Place pit garages, control towers, pavilions, covered grandstands, workshops, and marshal posts. Edit dimensions, height, rotation, and roof finish; move or erase them with Undo support. Buildings appear in previews and exports with collision geometry.
- Assetto Corsa setup organized by identity, paddock, surface grip, and package contents. Solo/kart/race presets set pit count and AI inclusion; customize grid spacing and boundary height.
- Select trees and buildings for the mod, inspect overlap warnings, and review the package before downloading. The 3D renderer uses the same procedural texture pixels as exported DDS files.

- Per-point corner rounding, sharp/tight/rounded shapes, corner names, banking, and configurable kerb sides and widths.
- Seeded random circuits replace the sample buttons. Choose flowing, technical, or fast layouts; preview an idea before applying it. Saved seeds are reproducible.
- A larger canvas, compact drawing controls, and **Focus canvas** for a full-window drawing workspace.
- Improved export materials: opaque uncompressed BGRA DDS textures with nine mip levels, explicit shader settings, content-based texture names, and embedded plus separate DDS assets.
- A color overview in the export dialog and a separate preview-image download. White minimap and outline masks remain available for their game UI roles.

- A drawing ribbon with labeled tools, freehand sketches converted to editable points, meter-based snapping, live coordinates, and Fit view.
- Styled pit lanes with adjustable width, bay side, numbered parking bays, and a connected apron when a short path needs more room. The selected pit count is preserved.
- Clear daylight, overcast, golden hour, and rainy preview moods. Choose game weather separately in Content Manager.
- Place broadleaf or pine trees with editable height; scatter them beside the circuit. Tree meshes and collidable trunks are included in the mod.
- Textured asphalt with fresh, weathered, and dark finishes across the editor, 3D preview, and mod.
- Custom solid barrier paths with editable height, thickness, and concrete or striped appearance.
- A circuit profile form for name, description, type, creator, country, city, tags, version, and website.
- Open road drafts and **Complete circuit** controls. Completed circuits stay editable; **Open circuit** separates the ends.
- **Clear** road, pits, barriers, trees, buildings, references, or all geometry, with Undo available.
- Geometry insights: length, direction, bends, radius, straight length, elevation profile, slope, banking, paved area, and pit capacity.
- Corner markers and clickable bend inventory, reverse direction, and export-readiness feedback.
- Download an analysis report as JSON or centerline samples as CSV. Mod ZIPs also include `apex_analysis.json`.
- A larger creation workspace, a collapsible side panel, and an expanded workspace mode.
- Satellite references from latitude/longitude or a Google Maps URL, with automatic geographic scale.
- Local image references, opacity controls, and two-point scale calibration.
- Editable road centerline, width, per-point elevation and banking, and a custom pit path.
- An orbitable WebGL 3D preview of the same geometry used by the exporter.
- Browser-generated KN5 geometry and DDS textures, collision surfaces, timing gates, grid slots, and pit spawns.
- Optional centerline and pit AI, track metadata, minimap, preview images, and a Content Manager ZIP.

The export is a generated mod prototype. File and geometry checks pass, but an in-game compatibility check is still required. Manual elevations are supported; real-world terrain data is not fetched. Generated AI needs refinement for competitive racing.

## Editing

Random circuit generation, open or closed roads, movable control points, pit paths, custom barriers, undo/redo, draft recovery, and a local circuit library. Completed circuits remain editable. Drawing on a closed road inserts a point into the nearest section; drawing on an open road extends it. Alt + click inserts into an open road section.

## Run locally

Requires Node.js 22 or later. No packages need to be installed.

```sh
npm run dev
```

Open http://127.0.0.1:5173. Set the `PORT` environment variable to choose another port. The `dist/` directory is the complete static website.

## Controls

| Action | Keyboard |
| --- | --- |
| Move / add / erase points | V / P / E |
| Place start line / pan canvas | S / H |
| Draw a barrier | B |
| Sketch a road / place trees | K / T |
| Place a building | U |
| Rotate selected building or placement brush by 15° | R / Shift + R |
| Temporarily snap to the selected grid | Shift |
| Exit focus / expanded canvas | Esc |
| Undo / redo | Ctrl or Cmd + Z / Shift + Z; Ctrl + Y |

Mouse wheel zooms the editor. The 3D preview supports drag to orbit and wheel to zoom.

## Data

Circuits and draft recovery are stored in this browser with localStorage. They are not uploaded to GitHub or shared with other visitors. Export a JSON circuit to move it to another device or keep a backup. Unfinished drafts can also be imported and exported.

Distances use the circuit's meters-per-pixel scale. Generated circuits set this scale to the requested target length; this is a design size, not geographic calibration. The report identifies satellite, calibrated, or manual scale and keeps calibration measurements. Heights are manually authored. Curvature-based bend counts and paved area are estimates. Pit bay counts follow the generated layout, whose method is included in the report. Uploaded reference images are stored in IndexedDB; reference imagery is not packaged in the mod.

## Checks and deployment

```sh
npm run check
npm test
```

Existing checks cover native KN5 decoding, road orientation, AI records, spawn positions, ZIP integrity, circuit geometry, and map scale. Every push to `main` runs the checks and deploys `dist/` to GitHub Pages through `.github/workflows/pages.yml`.
