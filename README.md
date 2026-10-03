# APEX — Circuit Workshop

**[Open the website](https://deepinkgroup.github.io/apex-circuit-workshop/)**

Build a racing circuit and test it in your browser. APEX combines a visual track editor with an arcade driving playground. No account, installation, or server is required.

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

The physics are designed for an arcade driving experience. Track distances, widths, and speed use the same scale: 0.2 meters per world unit.

## Checks and deployment

```sh
npm run check
npm test
```

The tests cover circuit geometry, lap completion and shortcut detection, acceleration, off-road friction, and reversing. Every push to `main` runs these checks and deploys `dist/` to GitHub Pages through `.github/workflows/pages.yml`.
