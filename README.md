# APEX 1.3.2 — Circuit Studio for Assetto Corsa

**[Open the website](https://deepinkgroup.github.io/apex-circuit-workshop/)**

Trace a racing circuit over satellite imagery or an uploaded reference, refine its geometry, analyze its data, and export a native Assetto Corsa track ZIP for Content Manager. The editor runs on GitHub Pages without an account or build step. Cross-device sharing uses a public Sites Worker with persistent R2 storage.

**[Tracing, export, installation, and limitations](docs/ASSETTO_CORSA.md)**

## Latest fixes

- Fixed a reproduced `AISpline::calculateNormals` loading crash on a generated bridge track with CSP 0.2.11. Native AI is projected above collision triangles and sampled inside pavement faces; its center and 0.6 m side probes are checked before export. Fixed ambiguous ROAD/PIT and WALL/PIT mesh names and duplicate terrain chunk names. KN5 export validates mesh names, vertices, indices and required spawns. A fresh ZIP replaces affected exports.

- Click the crossing-clearance warning to **Resolve crossing automatically**. The fitter compares bridge/tunnel placements on both branches, checks road-width overlap clearance, and applies a complete result only when every crossing clears and structural grades remain at or below 12%. One Undo restores the original layout. The action is available in Export, Full analysis and Assetto Corsa setup; fitted spans remain editable and shareable.

- Bridge end faces now finish below the driving surface. Nearby spans connect directly without an extra dip, and structural approaches use denser collision sampling and shared pavement normals. Tunnel entrances have curved, flared retaining walls that follow the road.
- Pit joins match road triangle heights and use smoother tangent/curvature transitions. Pit stops share a continuous flush apron with open bay mouths, stop lines and numbered spaces. Adjust box width, spacing and row layout; locate individual stops or inspect the whole route in 3D. Fitted parking rows connect directly to the track.
- Larger drawing workspace with **Large canvas / Extra large canvas**, full-width layout by default, and saved layout/size preferences. Export a fresh ZIP and replace the installed revision to receive the geometry changes.

- Redesigned bridge/tunnel controls with visual type cards, Gentle/Balanced/Compact ramps, a live elevation profile, actual peak grades, placement offset, approach reserve and saved-span navigation. **Bridges & tunnels** is available beside the drawing tools. **Inspect in 3D** focuses the selected structure; a preview-only **Tunnel cutaway** reveals the interior.
- Smoother structural ramps ease grade and curvature changes at the ends. Bridges have selectable steel detailing or concrete parapets, underside girders and approach guards. Tunnels have rounded-vault or flat roofs, smooth roof shading, portal collars, entrance wings, reflective guides and luminous ceiling strips. Native exports include the updated geometry.

- **Bridges & tunnels**: select a road handle in **Corners**, choose **Bridge / tunnel at this handle**, then set the span, clearance and target grade. Elevation, level deck/floor and smooth approach ramps are generated automatically. The 3D preview and native mod include bridge rails/supports or tunnel walls/roof/portals, with terrain below bridges and above tunnels. Removing a span restores authored heights. Export reports flag overlapping spans and overly steep approaches.
- Pit fitting compares both sides of the circuit, avoids scenery and covered spans at merge mouths, and checks road crossings and approach grades. Custom routes have adjustable bend smoothing and automatic landscape elevation. Direction arrows follow the connected route, and fit notes identify merges that need review.

- Improved distance boards with large condensed numerals, METRES labels, turn arrows, 10 m/5 m countdown bars, galvanized supports and solid frames. Choose Classic or High contrast, Standard or Large, and a trackside gap. Pairs prefer the same side, faces aim toward approaching drivers, and native panel height clears crossed safety walls. Editor cards use the same poster design with anchors and leaders.

- Continuous elevation and banking curves replace abrupt straight ramps, preserving authored heights without crest/valley overshoot and smoothing the closed seam.
- Rounded pit corners, grade-aware entry/exit curves, matching pit AI routes, and flush lane/apron collision surfaces remove the old 35 mm pit lift.
- Automatic **10 m / 5 m turn distance boards**, visible in the drawing, 3D preview and native mod. Toggle them in **04 / Include in mod**. Distances are measured along the centerline before detected turn entries; boards seek clear space beside the road.

- Road elevation and banking now reshape the surrounding grass in 3D and native exports, with smooth transitions, pavement cutouts and shared terrain edges. Trees, building pads, gantry posts and barrier foundations follow local terrain.
- Transparent footer with a new serif APEX Design. wordmark and GitHub/Telegram links. Removed the “REAL PLACES. YOUR RACING LINE.” label.

- Kerbs are flush with the racing road. Removed the 35 mm collision lift and extra vibration; shared road-edge elevation and banking are preserved. Grass is cut out beneath pavement and meets the banked edges.
- Added a signed **START / FINISH** gantry in the drawing, 3D preview, color overview and native KN5. It follows the finish gate and spans adjacent pit pavement; clearance is adjustable from 4.5–8 m.
- Removed the inspiration section and random-generator entry points. **Start from scratch**, tracing and shared circuits remain available.
- Surface grip now has independent road, flat kerb, pit and grass friction, grass drag and dirt pickup, three presets, a friction comparison and a reset action. All settings persist in saved circuits, shared codes and native exports.

- Pit entry/exit now branch from the actual road shoulder, with only 25 cm of asphalt overlap and bank-aware height. Old custom route ends on the racing road are treated as join hints.
- Corrected AI extra-record segment lengths and removed the duplicate closed-loop seam point. Configurable native timing gates, visible S1/S2 markers, and matching sector metadata share one start-relative plan. Sector lengths are included in analysis.
- **Generate circuit barriers** adds editable left/right/both-side walls with a run-off gap, pit-access openings, and scenery clearance. Regenerate after road edits; Undo restores the previous set.
- A wider, taller drawing workspace, with at least 800 px desktop canvas height and a narrower inspector.

- Sharp corners now retain their exact vertices and use joined road/kerb edges with bounded corner extensions and trimmed inner loops. The drawing, 3D preview, and color export share the same kerb geometry and pit openings.
- Start/finish checkerboard tiles are visual paint on a separate non-collision mesh. Dark squares use the underlying asphalt; no elevated checkerboard faces are added to the road collision mesh. Paint follows the actual road triangles, including elevation and banking.
- Corrected minimap Z direction and shared its world-to-pixel transform with `map.ini`. Image dimensions, offsets, and meters per pixel are calculated together; the map also includes connected pits and parking bays outside the drawing area.
- Preserved driving turn direction across the editor, 3D model, KN5 export, AI, and spawns: a drawn right turn stays a right turn. Native car axes were compared with the stock Assetto Corsa model. Road arrows show the forward direction in 3D and in-game. Fresh exports replace previously mirrored mods.
- Automatic pits now use a separate service straight outside the racing surface, with fitted bays and curved entry/exit connections. Adjust the minimum road gap and pit side, or use **Fit automatic connected lane** to replace a custom route that overlaps the road. The grass base expands to support pits outside the drawing bounds.
- Six tree models: oak, pine, birch with white bark, slender cypress, palm with fronds, and pink cherry blossom. Species and dimensions survive saved circuits, sharing, and mod exports.
- **Automatic random trees** adds 1–200 trees across clear ground, along track edges, or in woodland groves. Mix species or use the current brush, with varied heights and clearance around roads, pit ribbons/bays, buildings, barriers, and existing trees. Each batch is undoable; the scene supports 300 trees.
- North-aligned 3D preview, **Top view**, and **Reset view** controls make the layout easier to compare with the drawing.
- Four new building models: trackside café with an awning and tables, medical center with a roof cross, fuel station with pumps and a canopy, and a hospitality building with a terrace.
- Five wall finishes, five roof finishes, optional glass panels, a footprint preview, and **Duplicate nearby**. Building clearances include awnings and roof overhangs.
- Existing circuits, shared codes, and JSON imports preserve the new building settings. The footer remains V 1.3.2.

## New in 1.3.2

- **Share** creates a real 14-digit code for an immutable circuit snapshot. Another user pastes it, previews the layout, and opens an editable copy. Copy a code or a direct editor link. Leading zeros are preserved.
- Sharing includes road geometry, corner styles, pit paths, trees, buildings, scale, circuit details, and mod settings. Uploaded reference images are optional; satellite references share coordinates. Anyone with a code can retrieve its snapshot. Create a fresh code to share later edits.
- **Corners** has independent entry/exit reach, five presets, an actual curve preview, turn deflection, elevation, banking, and style copy/paste. Geometry changes carry into the exported mod.
- Task tabs organize Design, Corners, Scenery, Export, and Share. A first-circuit guide makes the starting actions clear.
- Footer: `V 1.3.2` / `APEX Design.` / GitHub + Telegram.

## Trace → inspect → export

- The export bypasses the custom BC1 compressor with explicit 32-bit color/alpha masks and opaque pixels, adjusts material lighting, versions texture names, and includes explicit CSP texture bindings. The white-surface symptom still needs visual confirmation in-game.
- Improved grass detail and optional CSP Grass FX, with road/pit/building occlusion. The colored base also works without CSP.
- Building rotation via canvas handle (Shift snaps to 15°), degree input, slider, ±15° buttons, and 90° turn.
- Automatic curved connections from custom pit entry/exit to the road, including elevation and bank blending; disable auto-connect for manual joins.
- Corrected crew SIDE placement and sector TEXT keys after inspecting game-log errors.

- Automatic textured grass across empty ground: meadow, mown lawn, and dry summer finishes.
- Place pit garages, control towers, pavilions, covered grandstands, workshops, marshal posts, cafés, medical centers, fuel stations, and hospitality buildings. Edit dimensions, height, rotation, and roof finish; move or erase them with Undo support. Buildings appear in previews and exports with collision geometry.
- Assetto Corsa setup organized by identity, paddock, surface grip, and package contents. Solo/kart/race presets set pit count and AI inclusion; customize grid spacing and boundary height.
- Select trees and buildings for the mod, inspect overlap warnings, and review the package before downloading. The 3D renderer uses the same procedural texture pixels as exported DDS files.

- Per-point corner rounding, sharp/tight/rounded shapes, corner names, banking, and configurable kerb sides and widths.
- The Design panel focuses on drawing and tracing; the inspiration generator has been removed.
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

## Connected pits, racing guide and online export

- Tapered pit entry and exit merge into the outer driving lane. Adjust approach length in **Pit lane design**. Editor, native pavement and minimap use the same variable-width geometry; kerbs and road edge paint leave openings. Merge collision follows the road height.
- **04 / Include in mod → Show ideal racing line** adds a dashed green/yellow/orange guide in the drawing, 3D and native model, plus `data/ideal_line.ai`. The paint has no collision. It is a generated learning guide, not a calibrated braking or optimal lap-time solution. Driving AI follows the guide when enabled.
- **Track identity** follows the circuit name. Renaming updates the saved listing, lowercase folder/server ID, KN5 filename, metadata and download names together, preserving the unique suffix. Local and server exports use the same identity. **New unique ID** creates a separate mod when another track already uses the ID.
- **05 / Online server** copies matching `TRACK`, empty `CONFIG_TRACK`, and pit-limited `MAX_CLIENTS` settings and downloads a server data ZIP. Every full client ZIP also includes server instructions, a configuration snippet and a revision manifest. Install the same revision on server and clients.
- **Track folder ZIP** and server ZIP each contain one top-level track folder, with all files and instructions inside. Use WinRAR **Extract Here**, then copy that folder into the game's or server's `content/tracks/`. The separate **Content Manager ZIP** retains its installer layout.
- **Ctrl+Shift+R** (or **Refresh app data** in Help) saves the current draft, requests fresh app HTML and rebuilds circuit geometry, analysis and previews after loading. Saved circuits and reference images remain available; share lookups bypass the browser request cache.
- **Corner distance boards** lets you choose 10 m, 5 m, both or neither for each detected turn in the Corners tab. Choose Auto, left or right placement and adjust the turn entry by up to 10 m. Placement issues are listed per turn; disabled boards do not count as failures.
- **Shared corner analysis** uses filtered spatial curvature and distinguishes opposite bends. Analysis and boards share the same turn inventory and numbering from start/finish; distances follow the 3D road centerline.
- **Tangent angle** rotates the curve direction through selected road handles by up to 60° in either direction. Swap entry/exit reach, copy the curve style, or apply it to several selected handles. Board selections remain separate from copied curve styles.

Native online hosting still needs an in-game check with your particular server manager. See [the installation guide](docs/ASSETTO_CORSA.md) for naming and replacement instructions.

## Return openings and larger drawing workspace

Automatic circuit barriers now leave staggered return openings by default: 8 m wide, spaced around 150 m apart, with up to 10 per side. Adjust width (6?16 m), spacing (50?300 m), or disable openings under **Asphalt & barriers**. Regenerate previously placed automatic barriers to apply these settings. Pit-access and scenery clearances remain part of the placement calculation.

For a drawn barrier, select it and use **Cut opening in selected barrier**. Choose the gap width and its percentage along the path. This splits the real barrier geometry into two editable paths; the exported collision model contains the gap too. Undo restores the original.

The default drawing canvas is taller and the page width cap has been removed. **Full-width canvas** moves settings below the drawing, while **Side-by-side layout** restores the inspector on the right. The layout preference is saved in this browser. Focus canvas still fills the screen. The reference tip and Trace ? Analyze ? Export strip below the studio have been removed.

## Barrier types, pit protection and group editing

- Choose **Concrete safety wall**, **Tyre wall**, or **Steel crash barrier** for new, selected, and automatic barriers. Natural finish and red/white markings are separate appearance choices. Types and settings persist in saved/shared circuits.
- Collision geometry is now a joined, closed wall with outward-facing surfaces, end caps, top and buried bottom. Foundations extend below the flat terrain; corners share joined edges instead of independent thin blocks. Minimum thickness is 0.8 m (1.1 m for tyres), and minimum height above the reference surface is 1 m. Large walls are split into native mesh chunks. Tyre stacks and steel ribs decorate the solid collision body. Intended return openings remain empty.
- **Pit lane design ? Outside pit barriers** defaults on. The back wall sits outside the bays, follows the fitted/custom service route, and leaves access joins and ends open. Choose its type and height independently. It appears in the editor, 3D, color overview and native mod.
- In **Move**, Shift-click road points to add or remove them from the selection. Release Shift and drag any selected handle to move the group. Corner controls, presets, paste, reset, height and banking apply to all selected points in one undo action. Values displayed are those of the active point. Escape clears the selection; Delete removes the selected points. Ctrl+A selects all road points when the canvas has focus.

Re-export existing tracks to get the new collision and pit wall geometry. The native collision response still requires an in-game check with the cars and speeds used on your server.
