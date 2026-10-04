# APEX 3.0 — Track Tracer for Assetto Corsa

**[Open the website](https://deepinkgroup.github.io/apex-circuit-workshop/)**

Trace a racing circuit over satellite imagery or an uploaded reference, inspect it in 3D, and export a native Assetto Corsa track ZIP for Content Manager. APEX also includes an arcade driving preview. No account, build step, or server is required.

**[Tracing, export, installation, and limitations](docs/ASSETTO_CORSA.md)**

## Trace → inspect → export

- Textured asphalt with fresh, weathered, and dark finishes across the editor, 3D preview, and mod.
- Custom solid barrier paths with editable height, thickness, and concrete or striped appearance.
- A circuit profile form for name, description, type, creator, country, city, tags, version, and website.
- Open road drafts, **Complete circuit**, and **Reopen circuit** controls. Drafts can be saved in the garage.
- A larger creation workspace, a collapsible side panel, and an expanded workspace mode.
- Satellite references from latitude/longitude or a Google Maps URL, with automatic geographic scale.
- Local image references, opacity controls, and two-point scale calibration.
- Editable road centerline, width, per-point elevation and banking, and a custom pit path.
- An orbitable WebGL 3D preview of the same geometry used by the exporter.
- Browser-generated KN5 geometry and DDS textures, collision surfaces, timing gates, grid slots, and pit spawns.
- Optional centerline and pit AI, track metadata, minimap, preview images, and a Content Manager ZIP.

The export is a generated mod prototype. File and geometry checks pass, but an in-game compatibility check is still required. Manual elevations are supported; real-world terrain data is not fetched. Generated AI needs refinement for competitive racing.

## Features

- Drag track points, draw your own closed circuit, move the start line, adjust road width, and smooth corners.
- Three starter circuits and three vehicles with different acceleration, speed, steering, and grip.
- Drive with keyboard or touch controls; use the follow camera and handbrake to find your line.
- Fixed-step physics, gradual steering, off-road friction, tire marks, and speed in km/h.
- Sequential checkpoints, invalid lap detection, session results, and car-specific best times.
- Race your best lap ghost; the most recent best ghost survives a browser reload.
- Undo/redo, automatic draft recovery, a saved-circuit garage, and JSON import/export.
- Responsive layouts and an expanded canvas.

## Run locally

Requires Node.js 22 or later. No packages need to be installed.

```sh
npm run dev
```

Open http://127.0.0.1:5173. Set the `PORT` environment variable to choose another port. The `dist/` directory is the complete static website.

## Controls

| Action | Keyboard |
| --- | --- |
| Accelerate / brake and reverse | W / S or up / down arrows |
| Steer | A / D or left / right arrows |
| Handbrake | Shift |
| Pause / resume | Space |
| Reset car | R |
| Follow camera / circuit overview | C |
| Move / add / erase points | V / P / E |
| Place start line / pan canvas | S / H in Build mode |
| Undo / redo | Ctrl or Cmd + Z / Shift + Z; Ctrl + Y |

Mouse wheel zooms the editor. Mobile devices have steering, pedal, and handbrake buttons.

Stay on the asphalt and pass all seven checkpoints in order, following the start arrow. Leaving the road for more than 0.4 seconds invalidates that lap. You can finish the lap and start a clean attempt. Resetting the car restarts the current lap.

## Data

Circuits, draft recovery, best times, and the latest best ghost are stored in this browser with localStorage. They are not uploaded to GitHub or shared with other visitors. Export a JSON circuit to move it to another device or keep a backup. Export current works even before saving to the garage.

The browser physics are designed for an arcade driving experience. Width, distance, and speed share the project's meters-per-pixel scale. Uploaded reference images are stored in IndexedDB; reference imagery is not packaged in the mod.

## Checks and deployment

```sh
npm run check
npm test
```

The tests cover driving behavior, native KN5 decoding, road orientation, AI records, spawn positions, ZIP integrity, circuit geometry, and map scale. Every push to `main` runs these checks and deploys `dist/` to GitHub Pages through `.github/workflows/pages.yml`.
