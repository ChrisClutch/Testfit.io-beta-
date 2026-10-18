# Placement Studio v0.6

The default Clutch PropDev.io workspace is now a placement editor. The existing v0.5 generator and its saved-project format remain available at `?legacy=1`; its implementation was preserved. Studio projects use a separate browser storage key and JSON format.

## Run and use

Run `npm ci`, then `npm run dev -- --port 5173`. Open `http://localhost:5173` on the machine running Vite. A public deployment is not part of this milestone.

1. Start with **Cottage courtyard** or **Empty parcel**. Both use a clearly identified illustrative 360 × 460 ft property.
2. Select **Home**, then click clear space. Select a placed home to drag it, rotate its blue handle, resize its orange corner, or enter width/depth/stories/home count in the inspector. Dimensions are in feet; displayed floor area is gross area. Homes include a six-foot-deep porch.
3. Draw landscape, detention and connecting drives by clicking corners and choosing **Finish outline**. Select these objects to move, scale, rotate or reshape their vertices.
4. Choose **Fill available site with parking**, or draw one or more **Parking area** outlines. Parking can cover concave or angled regions around placed objects. Set row heading and 45/60/90-degree stalls. **Fit to site edge directions** compares the current heading, cardinal directions and parcel-edge directions, selecting the greatest sampled stall count.
5. Drag a parking region's blue corners to reshape it, or drag its body to move it. Earlier parking regions own overlapping land, preventing duplicate spaces. Separate regions can have different row directions.
6. Select **Property corners** to drag parcel corners with live edge lengths and area. Buildings are retained when the parcel changes and any new conflicts are reported. The editor does not silently remove placed homes.
7. Upload or paste PNG/JPG/WebP references, enter a known distance and click two points with **Calibrate image**, then **Trace property**. Calibration changes the reference-image scale; existing object dimensions stay in feet. Images and JSON remain local to the browser.
8. Save/open JSON, use undo/redo, or export the current architectural SVG. Local storage automatically preserves the current project, including images when browser quota permits. Save a JSON file if the browser reports a storage limit.

## What parking generation checks

The engine subtracts homes and their porches, landscape, ponds and pedestrian paths from the parking region, intersects with the parcel setback envelope, and lays out full-size stall rectangles and clipped aisle polygons. Stalls cannot overlap existing drives. Every counted stall must have its full rectangular footprint and an aisle frontage inside the available region. Numerically ambiguous clipping cases are conservatively omitted. Overlapping regions do not double count land or stalls.

The engine samples row directions, not every possible placement/phase/topology. It does not optimize circulation. Aisle sections lacking positive-area contact with a drawn drive or a connected aisle produce an explicit warning. Edge-only contact is conservatively unverified. A drive itself is not certified to connect to a public street. Turning radii, cross-aisle widths at intersections, fire access, accessible parking, drainage grades and zoning compliance are not verified. The user must draw connecting drives and review the result. No global-optimum or permit-ready claim is made.

The starter courtyard has **21 individually editable cottages, 31 stalls and an assumed requirement of 32 stalls**. The one-space shortfall is intentionally reported. Its loop and initial footpaths are fixed starter geometry; they do not automatically reroute when a home moves. Start from an empty parcel for a fully custom circulation plan. New freeform connecting drives are editable.

## Detention estimate

Editable assumptions default to 2 inches rainfall, impervious runoff fraction 0.95, pervious fraction 0.20, storage depth 3 feet, utilization 0.70 and volume allowance 1.20. Impervious area is the union of roofs/porches and paving, clipped to the parcel; ponds receive direct rainfall. Target volume is rainfall in feet × weighted contributing area × allowance. Capacity is drawn pond footprint × depth × utilization.

This is a transparent conceptual volume balance, not a hydrologic/hydraulic design: no hydrograph, outlet, infiltration, side-slope geometry, soil model or local design storm is evaluated. No live weather or third-party parcel service is used. Landscape symbols are illustrative, not counted planting schedules. North is assumed.

## Validation

- 33 Node tests pass, including concave-region parking at 45/60/90 degrees, complete stall dimensions, exclusion geometry, overlapping-region deduplication, deterministic direction sampling, home movement/rotation rejection and detention volume response.
- Studio Chromium suite passes: starter, placement, direct drag/rotate/resize, polygon pond/landscape, whole-site parking, heading and stall angle, parking-region reshape, boundary edits, undo/redo, reload persistence, save/open, SVG export, image upload/calibration/tracing and mobile width. No page errors.
- All four preserved v0.5 Chromium suites pass at `?legacy=1`.
- JavaScript syntax checks, Vite production build and Wrangler configuration/assets dry-run pass (no upload). There is no TypeScript compiler or separate lint configuration in this repository.
- Screenshots: [courtyard](studio-v06-courtyard.png), [irregular parking](studio-v06-irregular-parking.png).

## Next coherent milestone

1. Editable curved road centerlines with connected aisle routing and turning-envelope checks.
2. Home-associated pedestrian paths that update with movement; richer cottage/townhome/plex symbols and explicit unit-area presets in Studio.
3. Save and compare alternatives, bring existing financial assumptions and GIS/PDF import into Studio, with explicit migration of legacy projects.

Existing financial modeling, GeoJSON/PDF imports and the older preset catalog remain accessible through the v0.5 workspace. This rewrite does not claim TestFit feature parity or access to its proprietary solver. It uses original code and schematic symbols inspired by the user's cottage-community layout reference.
