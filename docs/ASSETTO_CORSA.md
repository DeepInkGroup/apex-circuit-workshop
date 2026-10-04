# Native Assetto Corsa export

APEX 2.0 traces a closed circuit and generates a prototype track ZIP entirely in the browser. The package includes a native KN5 file: no Blender or ksEditor conversion step is needed.

## Trace and inspect

1. Choose **Satellite map**, enter latitude and longitude, and pick a zoom that fits the whole circuit. Paste a Google Maps URL containing `@latitude,longitude` if convenient. Or upload a PNG, JPG, or WebP.
2. For a reference image, click **Calibrate**, select two reference points, and enter their known distance. Satellite references automatically calculate meters per reference pixel from latitude and zoom. You can override that scale.
3. Click the centerline in driving order. Select **Move** to finish, then drag points to refine the layout. Set road width in meters.
4. Select points to set elevation in meters and banking in degrees. These are manually authored values; APEX does not retrieve real terrain elevations.
5. Draw a pit lane as an open path, or keep the automatic lane. Set 1–16 pit boxes and leave enough space for all cars.
6. Select **3D** to orbit and inspect the exported geometry. The browser driving mode remains an arcade layout preview.

## Download and install

Click **Export to Assetto Corsa**, review the report, and download the ZIP. Drop the ZIP into Content Manager and install the detected track. Alternatively extract its `content/` folder into the Assetto Corsa game directory.

Start with a single-car Practice session. Check spawn placement, collision surfaces, timing, and elevation transitions before attempting races. APEX's automated file checks do **not** certify in-game compatibility.

The folder layout is:

```text
content/tracks/apex_your_circuit/
  apex_your_circuit.kn5
  models.ini
  map.png
  ai/fast_lane.ai
  ai/pit_lane.ai
  data/surfaces.ini
  data/map.ini
  data/sections.ini
  data/lighting.ini
  data/crew.ini
  ui/ui_track.json
  ui/preview.png
  ui/outline.png
  apex_source.json
INSTALL.txt
```

AI files are omitted when disabled. The website generates preview and map PNGs during export. The model contains road, grass, optional kerbs and boundary walls, start-grid and pit spawn dummies, a hotlap spawn, and three left/right timing-gate pairs.

## Current limits

- Manual elevation and banking affect the road; surrounding terrain is a flat base. This is not a terrain/LIDAR reconstruction tool.
- The automatically generated AI line follows the centerline with curvature-based speed hints. Record or refine AI in-game for competitive racing.
- Automatic pit-lane geometry needs inspection. For unusual tracks, draw a dedicated lane and choose a suitable pit-box count.
- Tight corners can cause inner-edge overlap. The export report flags this; adjust the trace or width in 3D.
- Self-crossing centerlines are rejected. Overpasses and separate layouts are not generated.
- Trees, buildings, detailed scenery, replay cameras, and CSP-specific features are not included.
- Uploaded references are stored locally in IndexedDB. Exported JSON retains the reference ID, so another device needs the image uploaded again.
- Satellite imagery is used as a tracing reference with Esri attribution; it is not included in the exported mod.

## File checks

`npm test` includes an independent KN5 decoder, upward road-triangle checks for all starter circuits, AI point/extra-record checks, distinct spawn checks, ZIP path and CRC checks, and geometry/scale checks. A real Assetto Corsa/Content Manager installation is still needed to verify gameplay.

Format research references: [Content Manager's AcTools KN5 writer](https://github.com/gro-ove/actools/blob/master/AcTools/Kn5File/Kn5Writer.cs), [AI spline reader](https://github.com/gro-ove/actools/blob/master/AcTools/AiFile/AiSpline.cs), [AI extra-point structure](https://github.com/gro-ove/actools/blob/master/AcTools/AiFile/AiPointExtra.cs), and the original [track authoring guide](https://assettocorsamods.net/threads/build-your-first-track-basic-guide.12/). The tracing workflow was informed by [TrackTracer](https://tracktracer.trackgrind.com/); APEX is independent of it and of Kunos Simulazioni.
