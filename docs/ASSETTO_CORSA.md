# Native Assetto Corsa export

APEX 7.0 traces a circuit and generates a prototype track ZIP entirely in the browser. The package includes a native KN5 file: no Blender or ksEditor conversion step is needed.

## Trace and inspect

1. Choose **Satellite map**, enter latitude and longitude, and pick a zoom that fits the whole circuit. Paste a Google Maps URL containing `@latitude,longitude` if convenient. Or upload a PNG, JPG, or WebP.
2. For a reference image, click **Calibrate**, select two reference points, and enter their known distance. Satellite references automatically calculate meters per reference pixel from latitude and zoom. You can override that scale.
3. Click the centerline in driving order. The road remains open while editing. **Draw** appends points; Alt + click inserts a point into a road section. Select **Move** and drag points to refine the layout. Set road width in meters.
4. Select points to set elevation in meters and banking in degrees. These are manually authored values; APEX does not retrieve real terrain elevations.
5. Draw a pit lane as an open path, or keep the automatic lane. Set 1–16 pit boxes. Adjust width, finish, and bay side in **Pit lane design**. Short routes receive a connected parking apron; inspect it in 3D and adjust the path if it intersects the road.
6. Choose an asphalt finish. Click **Draw barrier**, click a path, then **Finish barrier**. Select the barrier from its list to edit height, thickness, or appearance. Move drags its square handles; Erase removes a point. Custom barriers are collision geometry in the exported model.
7. Open **Circuit details** to set the name, description, creator, type, country, city, tags, mod version, and optional website. These details carry into Content Manager's track listing.
8. Select **Complete circuit** to join the ends. Completed circuits stay editable. **Open circuit** separates the ends again. **Save draft** keeps unfinished work in the library; JSON import/export preserves its editing state and barriers. **Clear** removes chosen items, and Undo can restore them.
9. Select **Analyze** for geometry metrics, corner inventory, the elevation profile, calibration source, and export requirements. Click a corner to find it on the map. Use **Reverse direction** to reverse the road and pit direction while preserving the physical banking orientation.
10. Download the report as JSON or geometry samples as CSV. Select **3D** to orbit and inspect the geometry. Hide the side panel or expand the workspace for more room.

## Random layouts and custom corners

**A little inspiration** now generates random layouts. Choose a character, target length, control-point count, and seed. **New idea** changes the seed and preview. **Use this circuit** applies the idea as a closed, editable circuit. The seed is saved in circuit JSON. Target length sets the physical scale; no satellite calibration is implied.

Select a road handle, then use **Corner workshop** to name it, adjust rounding, choose sharp/tight/rounded geometry, set banking, and select kerb side and width for its outgoing section. Enable **Smooth corners** for rounding; the global **Generate kerbs** toggle controls all kerbs. These changes carry into the 3D preview and mod.

The canvas is taller and **Focus canvas** fills the window. Escape exits focus.

## Ground, buildings, and mod setup

**Ground & buildings** covers all empty ground with grass. Choose Meadow, Mown lawn, or Dry summer; the finish is preserved in circuit files, the color preview, 3D, and the exported DDS material.

Select a garage, control tower, or pavilion, set its dimensions and roof finish, then click **Place building** (U) and click clear ground. Move selects and drags it. The inspector changes dimensions and rotation after placement. Erase or Clear removes buildings; Undo restores them. Newly placed footprints avoid the road, pits, trees, and other buildings. Imported or edited footprints that overlap road or pits receive export review notes. Buildings sit on the flat grass base; they do not follow road elevation.

**Assetto Corsa setup** provides Solo practice (1 pit, AI off), Kart session (8 pits, AI on), and Race session (16 pits, AI on) presets. These configure the package, not car classes or game sessions. Set creator and location, edit the full circuit profile, choose 1–16 pit boxes, and set grid row spacing (4–12 m). **Design pit lane** opens the pit editor.

Surface controls write asphalt/kerb/pit friction (0.8–1.2) and grass friction (0.3–0.9) to the existing surface definitions. Defaults are 1.00 and 0.70. Inclusion switches control generated kerbs, outer boundary walls, placed trees, placed buildings, and AI files. Boundary height is adjustable from 0.5–4 m. Grass and custom drawn barriers remain part of the track. The 3D preview shows the selected mod contents.

The package summary displays the generated track folder, pit count, grass finish, and included scenery counts. Review the export notes and inspect spawns and pit routes. Drop the downloaded ZIP into Content Manager, install it, select the track, choose one car, and start Practice. Game weather and cars are selected in Content Manager.

## Scene and drawing tools

Use **Freehand** (K) to sketch a road section, then refine its editable points. **Snap** aligns placement in meters; Shift temporarily enables it. **Fit view** frames the circuit and generated pits.

In **Weather & trees**, choose a preview mood, place trees with T, or scatter edge trees. Select a tree with Move to change its type or height. Clear trees separately or restore changes with Undo. Trees are saved with circuit JSON and included in native geometry.

## Download and install

Click **Export to Assetto Corsa**, review the report, and download the ZIP. Drop the ZIP into Content Manager and install the detected track. Alternatively extract its `content/` folder into the Assetto Corsa game directory.

The exported KN5 embeds colored opaque DXT1 DDS textures with complete mip chains. Matching copies are included in `texture/` for editing. All materials explicitly set diffuse, ambient, specular, and zero emissive properties. Texture names include a content checksum. When updating an installed circuit, replace its old version. The export dialog displays the color overview before downloading; `map.png` and `ui/outline.png` are intentionally white route masks for the game UI.

Start with a single-car Practice session. Check spawn placement, collision surfaces, timing, and elevation transitions before attempting races. APEX's automated file checks do **not** certify in-game compatibility.

The folder layout is:

```text
content/tracks/apex_your_circuit/
  apex_your_circuit.kn5
  models.ini
  texture/apex_*.dds
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
  apex_analysis.json
INSTALL.txt
```

AI files are omitted when disabled. The website generates preview and map PNGs during export. The model contains road, grass, optional kerbs and boundary walls, start-grid and pit spawn dummies, a hotlap spawn, and three left/right timing-gate pairs.

## Current limits

- Analysis uses the scaled, traced geometry. Bend counts and straight lengths use curvature thresholds; paved area is length × width. Pit bay counts follow the generated layout. Methods are included in `apex_analysis.json`.
- Manual elevation and banking affect the road; surrounding terrain is a flat base. This is not a terrain/LIDAR reconstruction tool.
- The automatically generated AI line follows the centerline with curvature-based speed hints. Record or refine AI in-game for competitive racing.
- Automatic pit-lane geometry needs inspection. For unusual tracks, draw a dedicated lane and choose a suitable pit-box count.
- Tight corners can cause inner-edge overlap. The export report flags this; adjust the trace or width in 3D.
- Self-crossing centerlines are rejected. Overpasses and separate layouts are not generated.
- Placed broadleaf and pine trees are exported as simple meshes with collidable trunks. Garages, towers, and pavilions include collision bodies, detailed roofs, windows, and doors. Replay cameras and CSP-specific features are not included.
- Weather presets affect the studio preview and exported sun settings. They do not enable rain physics; select game weather in Content Manager.
- Uploaded references are stored locally in IndexedDB. Exported JSON retains the reference ID, so another device needs the image uploaded again.
- Satellite imagery is used as a tracing reference with Esri attribution; it is not included in the exported mod.

## File checks

`npm test` includes an independent KN5 decoder, upward road-triangle checks for all starter circuits, AI point/extra-record checks, distinct spawn checks, ZIP path and CRC checks, and geometry/scale checks. A real Assetto Corsa/Content Manager installation is still needed to verify gameplay.

Format research references: [Content Manager's AcTools KN5 writer](https://github.com/gro-ove/actools/blob/master/AcTools/Kn5File/Kn5Writer.cs), [Direct3D BC1/DXT1 format](https://learn.microsoft.com/en-us/windows/win32/direct3d10/d3d10-graphics-programming-guide-resources-block-compression), [Content Manager material implementation](https://github.com/gro-ove/actools/blob/master/AcTools.Render/Kn5SpecificForward/Materials/Kn5MaterialSimple.cs), [AI spline reader](https://github.com/gro-ove/actools/blob/master/AcTools/AiFile/AiSpline.cs), [AI extra-point structure](https://github.com/gro-ove/actools/blob/master/AcTools/AiFile/AiPointExtra.cs), and the original [track authoring guide](https://assettocorsamods.net/threads/build-your-first-track-basic-guide.12/). The tracing workflow was informed by [TrackTracer](https://tracktracer.trackgrind.com/); APEX is independent of it and of Kunos Simulazioni.
