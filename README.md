# Clutch PropDev.io

**Version 0.3 feature branch:** explicit residential types, net-square-footage-driven footprints, responsive parking, optional detention/green-space reservations, editable boundary vertices and WGS84 parcel import. [Changes and review workflow](docs/PROPDEV-V03.md). [Current validation](docs/VALIDATION-V03.md).

A working browser-based feasibility MVP for Clutch Industries: draw or upload a site, calibrate its scale, trace a property boundary, enter constraints, expand buildings and their connected parking lots, and see live yield. Financial assumptions are optional and collapsed. Local processing; no account, backend, API credentials or paid maps required.

**Recommendation and roadmap:** [docs/BUILD-STRATEGY.md](docs/BUILD-STRATEGY.md). **Input accuracy and imagery rights:** [docs/SITE-INPUT.md](docs/SITE-INPUT.md).

## Run

Requires Node 22.12+ (validated with Node 24.19.0) and npm.

```sh
git clone https://github.com/ChrisClutch/Testfit.io-beta-.git
cd Testfit.io-beta-
npm ci
npm run dev -- --port 5173 --open
```

The last command opens the app in your browser. Leave Terminal running. For cloud setup, the existing checkout is `/workspace/Testfit.io-beta-`; use `npm ci --cache /tmp/clutch-npm-cache --no-audit --no-fund` there. Cloud onboarding does not provide a web preview. `npm test` runs geometry and financial checks. With system Chromium installed, run `npm run test:browser` while the dev server is running; set `CHROMIUM_PATH` if its executable is elsewhere. `npm run build` produces `dist/`; `npm run preview -- --port 4173` serves it locally. For Cloudflare Pages: build command `npm run build`, output directory `dist`, Node 24. No Worker required for this MVP. Deploy only when explicitly requested.

## Use

1. Start with the 500 × 400 ft demo or upload a PDF (first page), PNG, JPEG or WEBP. Files stay in the browser; there is no upload server. The project JSON embeds the reference image when saved. Handle survey/project files as sensitive documents.
2. For an uploaded reference, click **Calibrate**, then two endpoints of a known surveyed dimension or reliable scale bar. Enter its distance in feet. Never infer scale from DPI or a screenshot zoom level.
3. Click **Trace boundary**, click property corners in sequence, then **Close polygon**. Undo removes the most recent trace point. You can draw without an image, then calibrate that drawn boundary against a known dimension.
4. Choose a program and enter the parcel's verified zoning constraints. The sample assumptions are not Salem zoning rules. Regenerate after changes.
5. Compare four access-spine orientations. Select a building and drag its orange handle or use the length slider to expand/shrink it. Parking lots and drawn stall counts update together. The site-wide expansion slider changes all buildings; building depth, maximum length and stall/aisle dimensions are editable and regenerate the plan automatically. Update underwriting assumptions to see NOI, development cost, value, spread, yield on cost and interest-only debt metrics. Save/open project JSON; export a concept SVG or scenario CSV.

## What is implemented

- Manual scale calibration and polygon tracing, PDF rasterization, image references.
- Inward uniform setbacks, including concave sites and potentially split envelopes.
- Legacy program presets (retained alongside the new explicit residential presets): multifamily, townhomes, affordable housing, cottages and a retail/fuel concept.
- Four access-spine orientations; adaptive building lengths, individual drag/slider editing and a site-wide expansion control.
- Double-loaded parking lots with individual stall footprints, optional car symbols and aisles meeting a continuous access spine.
- Rectangular and irregular demo sites, schematic corridors/unit divisions and dimension labels.
- Limits on FAR, coverage, density, approximate unbuilt/unpaved area, floors and parking ratio.
- Net/gross efficiency and average unit area; per-pad rounded parking requirements.
- Transparent basic rental proforma, optional retail NOI, project persistence and SVG/CSV exports.

## What is not validated

This is a concept estimator, not TestFit parity or an entitlement tool. A straight shared drive connects lot aisles geometrically, but street frontage/curb-cut permission, turning movements, ADA spaces, fire turning, setbacks by edge, easements, hydraulic detention design, topography, actual unit floorplans, unit mix, automatic GIS ingestion, automatic zoning, 3D, DXF/Revit export or collaboration. The fuel preset places a store and parking pad; it does **not** design fuel islands, tanker access, tanks, canopy, hazardous-material separation or circulation. Its annual NOI must come from separate business underwriting.

A cottage preset uses one home per pad; maximum density and a grid do not establish compliance with Oregon cottage-cluster provisions. Affordable housing uses a smaller unit assumption; subsidy, AMI rent limits, operating restrictions and tax-credit finance are not modeled. Townhomes are estimated from gross area, not individually compliant lots.

Setback buffering uses a small local coordinate-to-geographic conversion around the equator and Turf's spherical buffer. Appropriate for concept-scale sites, not survey precision or large/regional coordinates. Tracing accepts simple exterior rings only; holes and easements need a later GIS workflow. Nonadjacent touching/crossing edges are rejected. Large sites have a search guard. PDFs over 20 MB are rejected; PDFs render their first page to at most 2400 px on the longest side. Images must be under 20 MB and 40 megapixels.

Layouts use adaptive bars beside a straight access spine. Buildings and parking footprints do not overlap, and parking aisles meet the spine. An approach extends toward the boundary when there is room; it is not a validated curb cut or street connection. Conservative bay placement can leave usable land empty, and a different orientation may yield nothing. No L/U-shaped or courtyard configurator is implemented. Interior division lines are schematic; they are not actual unit plans. Unbuilt/unpaved percentage is an area budget, not verified landscaped or recreational open space. Siteworks, roads, stormwater, utilities and required nonbuildable polygons need explicit modeling before land acquisition decisions.

## Underwriting

- Gross building area = footprint × floors. Units = floor(gross area × net/gross efficiency ÷ average unit size), except cottages use one home and retail uses zero homes.
- Hard cost = gross building area × $/sf + parking/aisle/access-drive paving area × $12/sf.
- Total development cost = land + hard cost × (1 + soft-cost percentage + contingency percentage).
- Residential NOI = units × monthly rent × 12 × (1 − vacancy) × (1 − operating-expense ratio).
- Retail NOI is the entered assumption, only when a store fits. No income if nothing fits.
- Value = NOI / exit cap rate. Spread = value − cost, before sale expenses and tax.
- Debt = cost × loan percentage; annual debt service = debt × interest rate (interest-only). Cash-on-cash uses NOI less this debt service divided by equity.

## Validation

Node tests exercise measured setback/area, concave-site containment, density/FAR/coverage limits, invalid boundaries, unusable envelopes, parking counts and known proforma arithmetic. Production build and Chromium functional checks are also run during onboarding; see `docs/VALIDATION.md` for actual outcomes. Version 2 project files preserve individual building-length edits; version 1 files still load with defaults for the new controls. The v0.3 tests and results are listed separately in docs/VALIDATION-V03.md. No live municipal or product research was verified because external research hosts were blocked by the egress proxy.

Interactive editing v0.5: see [controls, stormwater assumptions and validation](docs/INTERACTIVE-EDITING-V05.md). Select buildings, parking modules, detention or landscape areas on the plan to move/resize/rotate. Enable **Edit individual stalls** for stall placement. **Find parking fit** tests bounded placement candidates and displays access/count warnings.
