# Clutch PropDev.io — residential programs and site reservations

Local feature branch: `feature/clutch-propdev-v2`, based on remote `main` commit `73af223` (the expanding-building/connected-parking version shown in the supplied screenshot). The refreshed executor initially had an empty checkout; the current remote was fetched before edits. The older prototype was not substituted for the current app. No push, merge, account/visibility change, or deployment was performed.

## What changed

- Brand and browser title: **Clutch PropDev.io**. This does not register a domain or rename the existing hosted URL.
- Explicit 1- and 2-story cottages; 1-, 2-, and 3-story townhomes; every integer plex size from 4 through 24. Existing flexible multifamily, townhouse-bar, affordable, cottage and retail/fuel presets remain for compatibility.
- A target net-square-footage input, interpreted per home or per entire building. Switching the basis preserves the equivalent home area. Whole-building area requires an explicit residential preset. Townhomes have a configurable 1–24 homes per building. Plexes support 1–3 stories; cottage/townhome story counts follow their preset.
- Preset footprint = target net area ÷ net/gross efficiency ÷ stories. Building depth then determines footprint length. Explicit presets retain their home counts; they are not stretched into a different plex size. The site expansion slider changes the count of whole buildings. Removing a selected preset building releases its parking demand. Flexible legacy bars retain individual stretch handles.
- Residential buildings repeat along bays served by shared parking pads and a straight access spine. Pad widths and individual drawn stalls update with the home count, area target, depth, expansion, parking ratio, constraints, and available land. Four orientation alternatives remain deterministic.
- Optional detention and green-space target areas, in square feet. Zero means no automatically reserved area. Users can draw either area with corners and Close polygon; manual areas count toward their respective target. Any remaining target is reserved as a concept rectangle. Overlaps and out-of-parcel reservations are rejected. Buildings, parking, aisles and access approaches avoid these polygons.
- Reserved green/detention areas are reported separately from the minimum unbuilt/unpaved percentage. Detention is not automatically counted as green space. The percentages and areas are assumptions, not regulatory interpretations.
- Existing PDF/image upload, two-point calibration and tracing retained. New parcel GeoJSON import accepts exactly one WGS84 Polygon exterior ring (up to 100 corners, under 100 acres), calculates an approximate local-foot projection, and uses that geometry as the editable boundary.
- Boundary editor supports coordinate entry, dragging vertices, adding midpoints and deleting vertices. Invalid edits are rejected. Visible provenance distinguishes demos, user-traced/user-edited geometry, image references with no inferred boundary, and imported GeoJSON with approximate projection.
- Version 3 project files persist the new controls, drawn reservations, provenance and building removals. Versions 1/2 migrate with defaults. An uploaded image can be saved and reopened before calibration/tracing. Invalid targets clear stale layouts. SVG and CSV exports include reserved areas (CSV adds their measured square footage).

## Suggested review workflow

1. Choose **2-story cottage**, change target net area, and compare its footprint with **1-story cottage** at the same area.
2. Choose **8-plex** and switch area basis between per-home and entire-building. Enter a total net area; inspect gross sf and the building dimensions.
3. Change site expansion and parking ratio. Observe whole-building count, parking pad widths and drawn stalls update together. Remove one building; save and reopen the project.
4. Enter detention and green-space targets. Confirm their polygons appear, reduce the usable envelope, and stay separate from all development.
5. Import a single-parcel WGS84 GeoJSON, or upload your own survey/image and calibrate then trace it. Use **Edit boundary vertices** to correct corners. The software does not infer legal lot lines from an image.
6. Enter an impossible reservation target: prior buildings and metrics should disappear and an explanation should be shown. Restore a valid target to regenerate.

## Validation and limits

See `docs/VALIDATION-V03.md` for commands and results. All inputs are local; uploads are decoded in the browser. No paid or third-party parcel service is involved.

One building type is selected per study; mixed-type site allocation is not yet implemented. Building sizes are block-level net/gross calculations, not individual floor plans, townhouse lots, cores, stairs or egress design. Explicit presets use complete buildings, whereas flexible bars estimate whole homes from area. A footprint wider than the configured length limit cannot be placed.

Roads remain straight spines, with parking aisles geometrically touching them. Curved roads, loops, multiple networked spines, frontage authorization, curb cuts, turning radii, fire/ADA/accessibility and pedestrian/driveway connections to every home are not validated. A complete stall count is not proof of legal or practical parking. Homes farther from a shared parking aisle still need a professionally designed access route.

Detention polygons reserve **area only**: no runoff, storage volume, depth, soil infiltration, grades, outlet structures, setbacks from ponds, design storm, or discharge permit calculations. Green-space polygons are land reservations, not verified landscaped, recreational or code-qualified open space. Auto-placement is a bounded rectangle search and can fail even when a more elaborate polygon might fit; manual drawing is available. Changing targets or site inputs regenerates and resets individual building edits.

Parcel images are references, not surveys. GeoJSON is explicitly WGS84 longitude/latitude and uses a small-site equirectangular conversion; other CRSs, multiple parcels, holes, antimeridian crossing and survey-grade projection are unsupported. No OCR, image-boundary detection or automatic zoning lookup is claimed. Labels report workflow provenance, not independent certification of uploaded data.

No global optimality, survey precision, building-code compliance, hydrologic feasibility, zoning approval or permit readiness is claimed. No cloud synchronization or external preview was created; the existing deployed app is unchanged until a separately authorized push/deployment.
