# Native Assetto Corsa export

APEX 8.0 traces a circuit and generates a prototype track ZIP entirely in the browser. The package includes a native KN5 file: no Blender or ksEditor conversion step is needed.

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

The inspiration generator has been removed. Start from scratch, draw a road, trace a reference or open a shared code. Existing saved circuits remain editable.

Select a road handle, then use **Corner workshop** to name it, adjust rounding, choose sharp/tight/rounded geometry, set banking, and select kerb side and width for its outgoing section. Enable **Smooth corners** for rounding; the global **Generate kerbs** toggle controls all kerbs. These changes carry into the 3D preview and mod.

Kerbs have no raised collision lip: their vertices use the same height and banking as the road edge. Both sine displacement and extra kerb vibration are zero in surfaces.ini. The flat grass base is placed below the lowest paved edge, so it cannot protrude through the low side of a banked corner. Red/white stripes remain flat strips outside the road.

Sharp corners retain their exact control points in the road mesh. Road and kerbs share joined boundary vertices; oversized corner extensions are bounded and local inner-edge loops are trimmed. Kerb width changes use shared endpoints, and pit openings are consistent in the drawing, 3D model, and color preview. Corners tighter than half the road width still need visual review because the road itself may overlap.

The canvas is taller and **Focus canvas** fills the window. Escape exits focus.

## Ground, buildings, and mod setup

**Ground & buildings** covers all empty ground with grass. Choose Meadow, Mown lawn, or Dry summer; the finish is preserved in circuit files, the color preview, 3D, and the exported DDS material.

Select a garage, control tower, pavilion, covered grandstand, workshop/warehouse, or marshal post, set its dimensions and roof finish, then click **Place building** (U) and click clear ground. Move selects and drags it. The inspector changes dimensions and rotation after placement. Rotate with the canvas handle above a selected building, the angle slider, ±15° and 90° buttons, or R / Shift+R. Shift while dragging the handle snaps to 15°. Enter any whole degree from 0–359. Erase or Clear removes buildings; Undo restores them. Newly placed footprints avoid the road, pits, trees, and other buildings. Imported or edited footprints that overlap road or pits receive export review notes. Buildings sit on the flat grass base; they do not follow road elevation.

**Assetto Corsa setup** provides Solo practice (1 pit, AI off), Kart session (8 pits, AI on), and Race session (16 pits, AI on) presets. These configure the package, not car classes or game sessions. Set creator and location, edit the full circuit profile, choose 1–16 pit boxes, and set grid row spacing (4–12 m). **Design pit lane** opens the pit editor.

**Surface grip** provides independent road friction (0.8–1.2), flat kerb friction (0.6–1.2), pit friction (0.7–1.1), and grass friction (0.3–0.9). New circuit defaults are 1.00 / 0.96 / 0.95 / 0.65. Grass drag controls DAMPING from 0–0.05; dirt pickup controls DIRT_ADDITIVE from 0–1. Existing saved road/grass values are preserved. Club circuit, High grip and Low grip practice presets apply a complete starting setup; every value remains adjustable. Reset restores the new circuit defaults. These are friction configurations, not rain physics. Choose game weather in Content Manager. Inclusion switches control generated kerbs, outer boundary walls, placed trees, placed buildings, and AI files. Boundary height is adjustable from 0.5–4 m. Grass and custom drawn barriers remain part of the track. The 3D preview shows the selected mod contents. **Grass blades in game · CSP** enables a Grass FX definition when Custom Shaders Patch is installed and Grass FX is enabled. Road, pits, kerbs, walls, and buildings occlude blades; the opaque grass base remains visible without CSP.

The package summary displays the generated track folder, pit count, grass finish, and included scenery counts. Review the export notes and inspect spawns and pit routes. Choose the Content Manager ZIP for its installer, or extract the track folder ZIP into `content/tracks/`. Select the track, choose one car, and start Practice. Game weather and cars are selected in Content Manager.

## Connected pit lane

Automatic pits use a separate straight service lane beside a clear section of the circuit. The planner searches for a shoulder outside the racing surface, fits the selected number of bays, and connects both ends with curved ribbons. **Minimum road gap** sets the requested separation; the planner increases it when nearby road sections need more clearance. **Pit side** chooses automatic outside, left, or right. Use **Fit automatic connected lane** to replace a custom route with the generated layout; Undo restores your route. Pits extending outside the canvas receive an expanded grass base in the mod. Fit view includes the pit layout.

Custom pit paths automatically gain curved entry and exit ribbons anchored to the joined road shoulder in the driving direction. The connector positions recalculate when the road or pit points move. They carry road/pit elevation and banking, and taper their road join height to avoid a sharp 35 mm step. Draw the service route on clear ground beside the road. Overlapping custom routes receive a placement note and remain editable. Connections appear in 2D, 3D, route images, KN5 geometry, and pit AI. Turn off **Connect entry & exit to track** for manual joins. Inspect complex nearby corners and crossing paths in 3D.

### Trees and automatic planting

Choose oak, pine, white-bark birch, cypress, palm, or cherry blossom in **Weather & trees**. All six have distinct 2D and native 3D models. Place individually with T, then select with Move to change height or species. **Automatic random trees** adds up to 200 per batch, with a maximum of 300 per circuit. Choose clear-ground scatter, track edges, or woodland groves. Mix all species or use the current brush; heights vary naturally. Planting checks canopy clearance against roads, pit connections and bays, buildings, barriers, and existing trees. If space runs out, only the trees that fit are added. Undo removes the whole batch. Saved circuits, JSON files, shared codes, color previews, and KN5 exports preserve the species.

### Driving direction

The export preserves the point order and the editor's turn direction. Painted road arrows show the forward direction in 3D and the mod. The native car convention is +Z forward and +X left, confirmed from the stock car's wheel nodes; the editor uses +Y downward and converts it to native +Z. Minimap image projection is separate from driving coordinates. Re-export and replace an old installed mod to get the corrected geometry; existing ZIP files do not update themselves.

**Start/Finish Gantry** is enabled by default in Export → Paddock & starting grid. The overhead beam carries readable START / FINISH signs on both faces and red/white checkers. Posts stand outside the racing road; the span expands over adjacent pit lanes and bays at the finish gate. Clearance is measured above the high side of the crossing pavement and can be set from 4.5–8 m. The gantry moves with start/finish, appears in the drawing, 3D model and color overview, and is exported as native collision geometry. Disable it with its inclusion switch. Fit view and the grass base include its supports. New tree planting, building placement and generated walls avoid the supports; existing scenery collisions appear in export review notes.

The start/finish checkerboard is a separate visual paint mesh, without a physical surface prefix. Its white tiles follow road-triangle elevation with a 2 mm display offset, and dark tiles show the underlying asphalt. The collision road contains no raised start/finish tiles.

The minimap uses native X/Z without reflecting Z. Its projection is `pixel X = (world X + X_OFFSET) / SCALE_FACTOR` and `pixel Y = (world Z + Z_OFFSET) / SCALE_FACTOR`. `WIDTH` and `HEIGHT` are image pixels; `SCALE_FACTOR` is meters per pixel. The PNG and INI share one calculation, with bounds that include road edges, pit joins, and bays. The map mask is independent of the fitted color preview. This follows [Content Manager's map generator](https://github.com/gro-ove/actools/blob/master/AcTools.Render/Kn5SpecificSpecial/TrackMapRenderer.cs).

## Material export and replacing an old mod

The exporter now writes opaque uncompressed 32-bit BGRA DDS assets with full mipmaps, explicit channel masks, and pitch. All alpha pixels are 255. Native ksPerPixel material properties include zero emissive output and moderated diffuse/specular levels. Textures are embedded in KN5 and copied to texture/. Names start with apex8_ and include a content hash to distinguish them from previous cached assets. The optional CSP config explicitly binds each material to its corresponding diffuse texture. Raw textures make the package larger than the earlier BC1 export.

Exit your active game session, export a fresh ZIP, install it with Content Manager replacing the old model/config files, then start Practice again. An already downloaded or installed ZIP cannot pick up website fixes automatically. If white surfaces persist, capture the in-game image and game log; the previous installed material table contained colored textures and zero emissive values, so the exact cause has not yet been confirmed.

## Lap timing, sectors, and automatic barriers

In **Export → Lap detection & sectors**, choose automatic split placement (prefers straights near one-third and two-thirds) or custom lap percentages. S1 and S2 appear as teal dashed lines in the drawing. Each sector must contain at least 10% of the lap. Move start/finish with its placement tool; all split progress follows that point. Native AC_TIME_0/1/2 gates span the actual joined road boundaries, including sharp-corner extensions, at 1.2 m above their respective road edges. The native gate names follow the [Kunos timing instructions quoted in the track guide](https://assettocorsamods.net/threads/build-your-first-track-basic-guide.12/).

Lap order is start/finish → S1 → S2 → start/finish. The game measures times; APEX shows sector geometry and lengths, not estimated lap times. Exported **sections.ini**, **apex_timing.json**, and analysis data use the same split plan. AI uses unique cyclic points, correct local segment lengths in the extra records, Direction=-1, and bank-aware normals, matching the installed Kunos track and [Content Manager’s AiPointExtra reader](https://github.com/gro-ove/actools/blob/master/AcTools/AiFile/AiPointExtra.cs). When updating, exit the game and replace the model, AI files, and data together. Drive through all checkpoints in Practice to assess native timing.

In **Scenery → Asphalt & barriers**, use **Generate circuit barriers**. Choose both sides, left, or right, a 2–20 m run-off gap, and concrete or red/white styling. Generated walls leave openings for pit paths and bays, avoid placed trees/buildings, and use joined curve geometry with conservative chord checks. They are ordinary editable collision barriers. Generating again replaces the previous generated set and keeps drawn walls. Regenerate after moving the road or pits; Undo restores the previous set. Paths outside the canvas are omitted.

Pit connectors overlap only the outer 25 cm of road, rather than ending on the racing centerline. Their anchors follow the actual joined road edge and banked height. With automatic connections enabled, old custom routes that include road-overlapping start/end clicks have those terminal sections removed; a fully overlapping custom trace falls back to an automatic service lane. The editable input points are preserved.

The default canvas is wider with a 300 px inspector and at least 800 px desktop drawing height (860 px on wide screens). Phone/tablet layouts use a taller drawing area. **Focus canvas** continues to fill the window.

## Scene and drawing tools

Use **Freehand** (K) to sketch a road section, then refine its editable points. **Snap** aligns placement in meters; Shift temporarily enables it. **Fit view** frames the circuit and generated pits.

In **Weather & trees**, choose a preview mood, place trees with T, or scatter edge trees. Select a tree with Move to change its type or height. Clear trees separately or restore changes with Undo. Trees are saved with circuit JSON and included in native geometry.

## Download and install

Click **Export to Assetto Corsa**, review the report, and choose **Download track folder ZIP**. In WinRAR choose **Extract Here**: the archive creates one track folder with all files inside. Copy that folder into `assettocorsa/content/tracks/`. WinRAR's **Extract to ZIP-name folder** adds its own extra wrapper; use **Extract Here** to avoid it.

For Content Manager installation, choose the separate **Content Manager ZIP** and drop it into the installer. This alternative package uses `content/tracks/<id>/` so the installer can detect the destination.

The exported KN5 embeds colored opaque BGRA DDS textures with complete mip chains. Matching copies are included in `texture/` for editing. All materials explicitly set diffuse, ambient, specular, and zero emissive properties. Texture names include a content checksum. When updating an installed circuit, replace its old version. The export dialog displays the color overview before downloading; `map.png` and `ui/outline.png` are intentionally white route masks for the game UI.

Start with a single-car Practice session. Check spawn placement, collision surfaces, timing, and elevation transitions before attempting races. APEX's automated file checks do **not** certify in-game compatibility.

The folder layout is:

```text
apex_your_circuit_1234abcd/
  apex_your_circuit_1234abcd.kn5
  models.ini
  texture/apex_*.dds
  map.png
  ai/fast_lane.ai
  ai/pit_lane.ai
  data/surfaces.ini
  data/map.ini
  data/sections.ini
  extension/ext_config.ini
  data/lighting.ini
  data/crew.ini
  ui/ui_track.json
  ui/preview.png
  ui/outline.png
  apex_source.json
  apex_analysis.json
  INSTALL.txt
  SERVER_CONFIG.txt
  SERVER_INSTALL.txt
  APEX_MANIFEST.json
```

AI files are omitted when both Driving AI and Show ideal racing line are disabled. The website generates preview and map PNGs during export. The model contains road, grass, optional kerbs and boundary walls, start-grid and pit spawn dummies, a hotlap spawn, and three left/right timing-gate pairs.

## Choose boards and customize turns

Open **Corners → Corner distance boards**, or use **Choose corners & distance boards** in Assetto Corsa setup. Each detected turn has separate **10 m** and **5 m** switches. Click its title to locate the road handle and inspect its estimated angle, radius and bend length. **Both on all turns** and **Clear all boards** change the inventory in one undoable action. The **Include boards in mod** switch controls the complete board set while keeping individual selections.

For the active turn, choose **Auto**, **Left of the driver** or **Right of the driver**. Auto may use the opposite side to find clear space; an explicitly chosen side is respected. The planner reports insufficient approach distance and obstructed positions per turn. Boards cannot move along the road to avoid an obstruction; they may move farther away from its edge. A disabled board is not reported as a placement failure.

**Turn-entry adjustment** moves the detected entry up to 10 m earlier (negative) or later (positive), measured along the 3D centerline. The boards remain 10 m and 5 m before that authored entry. **Reset this turn’s boards** restores both boards, Auto side and zero adjustment. Overrides attach to their road handle and distinguish multiple detected turns near one handle. Drafts, saved circuits, JSON imports, new shared snapshots and `apex_source.json` preserve these settings. Reverse direction swaps authored board sides and directional slots.

The analysis inventory and board planner use the same detector: spatial sampling at approximately 0.5 m (capped at 8,000 samples), chord-based headings, a median curvature filter and a lower continuation threshold to keep a broad corner together. Opposite bends remain separate. A turn needs at least 12° of accumulated turning and sufficiently strong peak curvature; sharp vertices anchor their entry directly. Numbering begins at start/finish and follows driving direction. These entries and radii remain geometric estimates, not surveyed racing corner definitions. `apex_turn_markers.json` records the detected and authored entries, selections, requested count, placement issues and world positions.

Under the selected road handle, **Tangent angle** rotates the direction through that point from −60° to +60° while keeping the adjoining spline direction continuous. Positive is clockwise in the drawing. It requires **Smooth corners**; rounding and entry/exit reach still determine how strongly that direction shapes the curve. **Swap entry & exit reach** reverses the approach/departure balance. These curve controls apply to multiple Shift-selected handles and appear in previews and native geometry. Copy/paste and curve reset preserve independent board selections. Inspect tight or strongly rotated curves for overlaps before exporting.
## Current limits

- Analysis uses the scaled, traced geometry. Bend counts and straight lengths use curvature thresholds; paved area is length × width. Pit bay counts follow the generated layout. Methods are included in `apex_analysis.json`.

- Manual elevation and banking also reshape the surrounding grass. The terrain meets the actual exported pavement edges and blends out into the landscape. Bridge cores keep terrain below their suspended decks; tunnels retain overhead cover and open approaches. This is procedural terrain, not surveyed terrain/LIDAR reconstruction.
- The automatically generated AI follows the centerline, or the visible racing guide when enabled, with curvature-based speed hints. Record or refine AI in-game for competitive racing.
- Automatic pit-lane geometry needs inspection. For unusual tracks, draw a dedicated lane and choose a suitable pit-box count.
- Tight corners can cause inner-edge overlap. The export report flags this; adjust the trace or width in 3D.
- Crossings require a bridge or tunnel core and at least 4.5 m of vertical clearance after allowance for banking and deck thickness. Intersections without sufficient clearance are rejected. Separate selectable track layouts are not generated.
- Placed broadleaf and pine trees are exported as simple meshes with collidable trunks. Garages, towers, and pavilions include collision bodies, detailed roofs, windows, and doors. Replay cameras are not included.
- Weather presets affect the studio preview and exported sun settings. They do not enable rain physics; select game weather in Content Manager.
- Uploaded references are stored locally in IndexedDB. Exported JSON retains the reference ID, so another device needs the image uploaded again.
- Satellite imagery is used as a tracing reference with Esri attribution; it is not included in the exported mod.

## File checks

`npm test` includes an independent KN5 decoder, upward road-triangle checks for all starter circuits, AI point/extra-record checks, distinct spawn checks, ZIP path and CRC checks, and geometry/scale checks. A real Assetto Corsa/Content Manager installation is still needed to verify gameplay.

CSP references: [Grass FX](https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/Tracks-%E2%80%93-Grass-FX) and [shader/texture replacement syntax](https://github.com/ac-custom-shaders-patch/acc-extension-config/wiki/General-%E2%80%93-Shader-replacements).

Format research references: [Content Manager's AcTools KN5 writer](https://github.com/gro-ove/actools/blob/master/AcTools/Kn5File/Kn5Writer.cs), [Direct3D DDS header](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dds-header) and [pixel masks](https://learn.microsoft.com/en-us/windows/win32/direct3ddds/dds-pixelformat), [Content Manager material implementation](https://github.com/gro-ove/actools/blob/master/AcTools.Render/Kn5SpecificForward/Materials/Kn5MaterialSimple.cs), [AI spline reader](https://github.com/gro-ove/actools/blob/master/AcTools/AiFile/AiSpline.cs), [AI extra-point structure](https://github.com/gro-ove/actools/blob/master/AcTools/AiFile/AiPointExtra.cs), and the original [track authoring guide](https://assettocorsamods.net/threads/build-your-first-track-basic-guide.12/). The tracing workflow was informed by [TrackTracer](https://tracktracer.trackgrind.com/); APEX is independent of it and of Kunos Simulazioni.

## Pit merges and optional racing guide

Pit mouths narrow to 2.2–3.2 meters, meet the outer driving lane and widen toward the separate service route. The **Entry / exit approach** setting changes the approach distance (12–60 meters, limited by the available lap length). The shared pavement ribbon is used for the drawing, minimap and KN5. The road-facing portion uses the ROAD surface, so it does not place pit speed limiting at the initial merge mouth. Road edge markings and kerbs leave access openings. Custom service points remain editable; review unusual layouts in 3D.

Enable **Show ideal racing line** under **04 / Include in mod** for a dashed guide colored by local corner radius: green for flowing sections, yellow for corners, orange for tight turns. The generator smooths positions within the actual joined road cross-sections and retains clearance to each edge. The guide paint uses a non-collision mesh draped above the road, and `data/ideal_line.ai` carries the same positions. It also includes fast-lane and pit guidance if the Driving AI switch is off. This is a learning guide, not a car-specific braking prediction or lap-time optimizer; refine generated AI in-game for races.

## Online server installation and track names

The circuit name shown locally and online is the same. The **Mod folder / server track ID** is the filesystem-safe form of that name. Renaming updates the saved listing, folder ID, KN5 filename, `models.ini`, track metadata, manifests, server settings and download filenames together. An existing random suffix is preserved; a renamed legacy custom ID receives a deterministic suffix. The ID accepts a lowercase initial letter followed by lowercase letters, numbers or underscores, up to 32 characters. It is saved in JSON drafts, mod sources and shared snapshots. A manually entered ID applies until the next circuit rename.

After renaming, export and install the newly named track on every client and server, then update the server's `TRACK` value. Previously downloaded files and installed mods cannot rename themselves. Existing shared codes are snapshots; create a new code to share the renamed revision.

If an unrelated mod already has the same ID, use **New unique ID** and install the newly exported mod on every driver’s client and the server. For a revision of the same mod, keep the ID and replace matching content together. A server may reject duplicate uploads until its existing track is replaced through that manager’s update workflow.

1. Download the full **track folder ZIP** for clients and copy its single `<id>/` folder into `assettocorsa/content/tracks/`, or install the separate **Content Manager ZIP**. Everyone needs the identical revision and folder ID.
2. Download the **server ZIP** under **05 / Online server**. Choose **Extract Here**, then copy its single `<id>/` folder into the dedicated server's `content/tracks/`. All files and instructions are inside this folder. It contains `models.ini`, native data (including `surfaces.ini` and `drs_zones.ini`) and display metadata. Managers requiring a KN5 or preview should use the full client package; use the Content Manager alternative when an importer requires a game-root layout.
3. Merge the three keys in `SERVER_CONFIG.txt` into the server’s existing `[SERVER]` section. `TRACK` is the exact folder ID; `CONFIG_TRACK` is empty for this single-layout export. `MAX_CLIENTS` must not exceed the generated pit count. Keep existing cars, ports, session settings and credentials.
4. Rescan/restart the server manager. For an update, stop the server and replace the old revision on clients and server; avoid leaving an old `data.acd`, AI cache or minimap beside new exported files.
5. If a content checksum fails, compare matching exports. `APEX_MANIFEST.json` lists CRC32 values for the model and native data as revision identifiers; it does not alter the game’s checksum protection.

The naming/layout handling follows [Content Manager’s server preset implementation](https://github.com/gro-ove/actools/blob/master/AcManager.Tools/Objects/ServerPresetObject.cs). The metadata and base-layout structure follow [Assetto Server Manager’s track loader](https://github.com/JustaPenguin/assetto-server-manager/blob/master/content_tracks.go). The ideal spline’s binary records follow the native AI writer and [the author’s AI import tool](https://github.com/leBluem/io_import_accsv/blob/master/import_ai.py); the `data/ideal_line.ai` location was checked against installed Kunos track files. Actual server acceptance depends on the host’s installation and manager, and has not been verified in a live online session.

## Returning through circuit barriers

**Automatic circuit barriers ? Leave return openings** defaults on. The generator omits entire wall sections at staggered positions along each side. Opening width is 6?16 meters (8 by default) and desired spacing is 50?300 meters (150 by default). There are up to ten planned openings per side, so spacing grows on long circuits. Existing pit/scenery exclusions may create further gaps. These are actual separate wall paths in the editor and native collision model, not transparent wall textures.

For barriers already in a saved draft, regenerate automatic barriers to add the planned openings. Drawn barriers are preserved. For individual drawn barriers, select one and use **Cut opening in selected barrier** with a width and position along the path. The original barrier must be at least the opening width plus 4 meters long; the cut creates two editable paths and requires a free slot within the 40-path limit. Undo restores either operation.

Export a fresh client ZIP after changing walls. Online drivers and the server should use the matching revision. Review openings beside trees, buildings and manually placed walls, which remain editable scenery.

## Barrier construction and pit protection

New, selected and automatic barrier paths support concrete, tyres and steel. Appearance (natural or red/white) is independent of type. Older paths load as concrete. Thin legacy widths and low heights are raised to the structural minimums: 0.8 m thickness for concrete/steel, 1.1 m for tyres, and 1 m height above the authored/banked reference level.

The native exporter builds joined rails and outward-facing faces along the path, closes both ends, adds a top and buried bottom, and extends foundations below the local terrain. This addresses gaps between independent blocks and routes beneath floating elevated barriers. Faces are subdivided, with a bounded face budget for extreme path lengths, and split into mesh chunks within the KN5 vertex limit. Tyre stacks and raised steel ribs are visual detail over a continuous physical core. Return openings remain separate empty path gaps. Outer terrain-boundary walls also receive a thicker body and buried footing.

**Outside pit barriers** in Pit lane design creates a back wall beyond the parking bays. It trims the first/last 6 meters of the service row and leaves openings at entry/exit connectors, apron connections, conflicting scenery and nearby track pavement. For expanded pits, it follows the outside of the parking row. Type, height and inclusion are saved in pit settings and exported. Inspect custom, elevated or unusually tight pit layouts in 3D. This is separate from the outer-terrain boundary switch.

The exporter preserves active native mesh nodes and physical `1WALL` names. Naming follows the [track authoring guide](https://assettocorsamods.net/threads/build-your-first-track-basic-guide.12/); the serialized node layout follows [AcTools? KN5 node implementation](https://github.com/gro-ove/actools/blob/master/AcTools/Kn5File/Kn5Node.cs). Closed geometry corrects structural gaps; real collision behavior at high speed or with unusual car mods has not been verified in-game.

## Editing several road points together

Use Move and Shift-click the road handles. Orange handles are selected; the last active point supplies the values shown in Corner workshop. Release Shift before dragging. Movement keeps the spacing of the group and clamps its overall bounds to the drawing limits. Snapping rounds the group?s movement rather than independently relocating each point.

Changing a corner field applies that field to all selected points, preserving their other properties. Presets, style paste and curve/banking reset also apply to the selection. Each completed group drag or property change makes one undo entry. A normal click on an unselected handle selects that point alone; Shift-click toggles selection membership. Escape clears selection. Delete/Backspace removes the selected road points, and Ctrl+A selects all when the editor canvas has focus. Road drawing still uses Shift for snapping.


## Terrain follows elevation and banking

Adjust corner elevation or banking and reopen the 3D preview to see the surrounding grass reshape automatically. Both preview and fresh native KN5 exports use the same terrain geometry. The terrain meets the road, enabled kerbs, connected pit ribbons and parking aprons, and eases into the surrounding landscape. Pavement footprints are removed from the grass collision mesh, preserving low banked edges and flush paint/kerbs. Shared edge vertices and smooth terrain normals avoid cracks between clipped cells; large terrain is split within the KN5 vertex limit.

Trees follow local ground height. Buildings receive level pads with a short transition into the grass; gantry supports and barrier foundations follow local ground. Closely spaced normal road sections at different heights share a blended landscape. Elevation combines authored point heights with optional automatically generated bridge/tunnel profiles; there is no surveyed height data. Export a new ZIP and replace the old installed track to update in-game geometry.

## Bridges, tunnels and automatic elevations

Select a road handle at the center of the intended span in **Corners**, then click **Bridge / tunnel at this handle**. In **Bridges & tunnels**, choose a raised bridge or below-ground tunnel. Use the visual Road / Bridge / Tunnel cards and Gentle / Balanced / Compact ramp presets. Set the covered span, minimum vertical clearance and appearance. Fine-tune placement along the road without moving its handles, or increase the approach length reserve. Sliders preview the effective elevation profile; release to save one undoable change. Peak approach grade reflects the blended profile and neighboring spans. The covered road becomes level and unbanked; seventh-order approach profiles blend into authored heights with continuous grades and eased curvature transitions. Bridge heights account for nearby road elevations and slab thickness; tunnel depths account for the ceiling and ground cover. Choosing **Normal road** removes the span and restores authored elevation and banking. Placement applies to the active handle; up to 16 spans are supported.

Short circuits can require steeper ramps than the target. The panel shows estimated peak grade and available approach length. Export is blocked for overlapping covered spans or estimated approaches above 18%; extend the layout or lower clearance/span. Adjacent ramp influences blend automatically. Inspect the complete route in 3D, especially tight bends, crossings, spawns and placed scenery.

Bridge exports contain a native deck underside, shoulders, girders, approach guards and supports. Choose steel rail detailing on a concrete base or solid concrete parapets. Supports skip paved footprints beneath the deck. Tunnels contain solid walls, a ceiling and portal frames; ground cover stays above the interior and the approaching road remains open. Rounded-vault or flat tunnel roofs have smooth shading, portal collars, entrance wings, reflective guides and luminous ceiling strips. These strips do not cast dynamic light. The structures appear in the drawing, 3D preview and fresh KN5 exports; settings persist in drafts, circuit files and shared codes. `apex_structures.json` records effective spans, levels and grades. **Inspect in 3D** frames the selected span; **Tunnel cutaway** hides tunnel roofs and terrain for inspection only. The exported tunnel remains closed. The drawing highlights approach extents and span ends, and the saved-span list selects and locates each structure. A **Bridges & tunnels** shortcut is also available beside the drawing tools.

## Pit fitting and route controls

**Pit stops & parking apron** adds adjustable box width (2.8–5 m), spacing (6–12 m), and Automatic / Along the service lane / Separate straight row layouts. Automatic mode finds the straightest suitable stop section and fits a separate straight row for short or tightly curved routes. The selected pit count is preserved. **Locate stop** centers the drawing on a selected bay; **Inspect lane & pit stops in 3D** frames the connected route and apron.

The working apron shares the service lane's joined edge vertices. Bays are painted spaces on continuous pavement, with open mouths and stop lines; they no longer have individual collision slabs. Entry and exit use quintic curves matching endpoint position, heading, grade and available curvature. Pit mouths conform to the actual racing-road triangle planes, with a gradual blend into service pavement. Pit AI and spawn elevations sample the exported pavement. A fitted row connects directly to the racing road instead of returning through short authoring hints. Custom handles remain editable.

**Fit automatic connected lane** searches both sides when Pit side is Automatic, checking lane/bay clearance, scenery, racing-road crossings and merge grades. Covered bridge/tunnel cores are avoided as connection mouths. If no unobstructed fit exists, the lane remains editable and the fit notes explain what to move; inspect those notes before installation.

For a drawn service lane, **Bend smoothing reach** controls the tangent fillets without moving the editable handles. **Automatic pit elevation** derives route heights from the authored landscape; turn it off to keep manual pit elevations. Merge candidates are compared for clearance and grade, with tapered shoulder mouths and matching road elevation/banking. Direction arrows show the route in the drawing, color preview and native mod. Analysis and Assetto Corsa setup report peak pit grade and whether the connections need review.


## Smooth grades, pit bends and turn distance boards

Bridge end faces stop 8 cm below the asphalt, leaving the continuous road mesh as the driving surface. Close structural spans blend directly between their levels, avoiding an unnecessary dip between equal-height decks. Export grade checks use the effective profile, including linked spans. Additional road samples across structural approaches and shared pavement normals improve the joins. Tunnel approach retaining walls curve with the road, flare outward and taper into the portal. Export a fresh ZIP and replace the installed track to receive these changes; driving behavior still needs confirmation in Assetto Corsa.

The drawing ribbon offers **Large canvas** and **Extra large canvas**. New layout preferences default to full width and extra large; existing side-by-side preferences are retained. Size and layout persist locally. **Focus canvas** remains available for a full-window workspace.

Elevation and banking use shape-preserving cubic profiles over centerline distance, with a shared grade on both sides of every control point and the closed circuit seam. The curve passes through authored heights, flattens at crests/valleys and avoids height overshoot. Road collision is sampled at approximately 0.75 m, capped for very long circuits. Height differences over a short distance can still create a steep slope: spread the rise over more road points for a gentler gradient. Surrounding terrain follows the updated pavement.

Custom pit bends receive tangent fillets inside their original corner triangles. Keep editing the original handles; the rendered ribbon, map and native pit geometry use the rounded route. Road entry/exit curves carry the road grade into the service lane. Short-lane parking connectors are curved, and pit AI follows those actual connector paths. The former 35 mm pit ribbon lift and 40 mm parking apron lift are removed; bay markings are visual paint.

**04 / Include in mod → Turn distance boards · 10 m / 5 m** is enabled by default and persists in saved circuits, JSON imports and shared maps. Each detected turn receives two roadside boards measured backward along the 3D surface centerline from its entry, including elevation. Closed circuits wrap correctly across the start/finish seam; unfinished open roads skip distances before their beginning. Boards normally sit outside the upcoming turn and search both sides for space around pits, trees, buildings and barriers. Export notes report unplaceable boards. Geometry detects bends of at least 12 degrees, using a curvature threshold; very gentle sweeps and adjacent same-direction bends may be grouped. These are distance references, not a recommended braking point.

The drawing, color overview and 3D preview show the same board plan. The native model includes readable two-sided boards grounded on the terrain as visual scenery. `apex_turn_markers.json` records turn entries, distances, centerline stations and board world positions. New exports replace existing mods; restart the driving session after installing the fresh ZIP.


## Distance board appearance and placement

In **04 / Include in mod**, choose a light **Classic** face or dark **High contrast** face, a **Standard** 1.2 × 1.5 m panel or **Large** 1.5 × 1.85 m panel, and a preferred **Trackside gap** of 1–8 m beyond enabled kerbs. These settings persist in saved circuits, JSON imports, shared snapshots and the native source. The 10 m board has two countdown bars with an amber accent; the 5 m board has one bar with an orange accent. Large condensed numbers, METRES labels and turn arrows are printed into opaque textures with mipmaps. Preview and native DDS use the same procedural poster pixels.

Placement first searches for a clear pair on one side at one gap, then tries individual fallback positions. It allows space for the panel width, tree canopies, buildings, pit lanes/bays and barriers, and rejects sight lines blocked by trees or buildings. The face aims at a point 15 m back along the approaching road. Placement moves laterally, preserving the original 10 m and 5 m road stations. After terrain is generated, each of two closed support posts is grounded independently. Crossed safety walls raise the panel for visibility; the lift is capped at 7 m above local ground. Boards are visual scenery, not physical barriers.

Editor/overview cards use the same poster design, with dots showing physical positions, dashed guides from the road edge and callout leaders. Cards move apart at small zoom levels where space permits. `apex_turn_markers.json` includes appearance settings, the selected side/gap, face angle and native panel heights. Export a fresh ZIP and restart the driving session when replacing an installed mod.
