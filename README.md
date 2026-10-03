# APEX — Circuit Workshop

A browser circuit editor and driving playground. Draw and reshape closed circuits, adjust road width, choose between three cars, and drive with lap timing.

## Run locally

Requires Node.js. No dependencies or build step.

```sh
npm run dev
```

Open http://127.0.0.1:5173. `dist/` is the complete static website and can be served by any static host.

## Controls

- Build: drag points; V move, P add points, E remove points, S place start, H pan. Ctrl/Cmd+Z undo; Ctrl/Cmd+Shift+Z or Ctrl+Y redo. Mouse wheel zooms. Three points close a circuit.
- Drive: WASD or arrow keys; Space pauses; R resets to the start. Touch controls are provided for mobile devices.
- Circuit saves, draft recovery, and car-specific lap records use browser localStorage. Export/import JSON from My circuits to move layouts between devices.

Lap timing requires driving through the circuit's checkpoints in order, in the direction indicated by the start arrow. Changing circuit geometry or the car starts a separate lap record. Off-track driving reduces speed and grip.
