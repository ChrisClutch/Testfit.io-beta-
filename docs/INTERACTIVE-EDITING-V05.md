# Interactive site editing v0.5

Local milestone based on `50782b4` on `feature/clutch-propdev-v2`. Chris authorized pushing v0.5 on October 17, 2026. Cloudflare deployment status must be verified separately after the push.

## What changed

- Selection inspector moved to the top of the right sidebar. The canvas toolbar has Select / move, Drag property corners, Add pond and Add landscape. Active mode and rejection messages are displayed above the plan.
- Buildings: drag to move, blue handle to rotate, orange corner to resize, or type exact footprint dimensions and heading. Manual edits retain homes/stories and recompute areas/coverage/costs. Collisions are rejected with a red attempted-footprint outline during dragging. Legacy length-only growth is available on unmodified flexible bars.
- Parking modules: select any pad, drag, rotate or resize. Module length controls the actual number of drawn stalls. Depth must accommodate two rows plus the specified aisle. Stall angles are 45°, 60° and 90°, relative to the aisle. Real stall polygons remain at configured width/depth; they are not just visual diagonal lines. Paving area uses a polygon union to avoid double-counting road/aisle overlap.
- Individual stalls: enable Edit individual stalls, select one, drag or rotate inside its pad. Stall dimensions stay fixed. Overlapping stalls or encroachment on the aisle is rejected. Editing/searching that whole lot regenerates its rows and resets individual stall adjustments within it.
- Find parking fit: samples current and parcel-edge angles, three lengths and a bounded grid of positions. Buildings, reservations and other lots remain locked. Selection favors geometric road contact, then stall count and proximity. This is a deterministic heuristic, not exhaustive search or a guaranteed optimum.
- Ponds and landscaping: add a starter area in available space, or select existing generated/drawn areas. Drag/scale/rotate the outline or use numeric fields. Arbitrary drawn polygons retain their shape under affine scaling. The pond/landscape inspector uses current axis-aligned extents; rotation is relative to the current shape. Existing development is retained and overlaps are rejected.
- Saved project JSON retains manual parking/building/area/stall changes and stormwater assumptions. Existing project versions remain readable. SVG renders the edited geometry. CSV contains updated parking, areas and feasibility totals; a separate storm-estimate JSON exports assumptions, units, volumes and limitations.

## Estimated water collection

Illustrative defaults, not local design criteria: rainfall 2 inches, roof/pavement runoff fraction 0.95, pervious runoff fraction 0.20, effective storage depth 3 ft, utilization 0.70 and volume allowance 1.20.

All parcel runoff is assumed routed to the pond. The original simplified volume balance is:

`runoff ft³ = rainfall inches / 12 × (roof/pavement ft² × impervious fraction + pervious ft² × pervious fraction + pond ft²)`

`target = runoff × allowance`

`capacity = pond area × effective depth × utilization`

Direct rain on the pond is counted once at fraction 1; pond area is removed from pervious area. Impervious geometry uses the union of buildings, lots and roads. Suggested pond area solves the same balance including conversion of pervious ground to pond. This is a volume estimate, not the Rational Method peak-flow equation or hydrograph-based detention sizing. No infiltration or outlet credit is taken. Effective depth/utilization approximate usable storage; side slopes, freeboard, grading, catchment routing, groundwater and outlet restrictions still need civil analysis. Defaults must be replaced for the property and storm event.

Background references consulted (not a claim that the simplified estimator implements either model):
- EPA National Stormwater Calculator: https://www.epa.gov/water-research/national-stormwater-calculator
- SUDAS runoff and peak-flow methods: https://www.iowasudas.org/wp-content/uploads/sites/15/2020/03/2B-4.pdf

The supplied YouTube URL could not be retrieved, and the pasted transcript file reference was not visible through the available file tools. Implementation follows the user's written requirements and screenshot, not a claimed frame-by-frame video review.

## Constraint and parity limits

Parcel/setback/reservation containment and building/parking/stall overlap are checked. Coverage, FAR and unbuilt/unpaved assumptions remain enforced. Manual parking may have insufficient stalls or lose road contact; visible warnings describe those conditions. Residential demand uses the configured ratio; fuel/retail retains the generator's illustrative 12-stall assumption. Aisle-road contact is only geometric, not proof of legal/usable access, direction, turning clearance or fire/ADA compliance. Landscaping is reserved area, not a plant schedule or certified landscape percentage. Roads do not reroute automatically, building layouts remain single-typology, and site-wide regeneration resets manual edits. No automatic subdivision, architectural plans or zoning certification. The existing financial estimate does not model pond excavation or landscape installation costs.

## Validation

27 Node tests, four Chromium browser suites, JavaScript syntax checks and Vite production build pass. New checks include actual nonoverlapping 45/60/90-degree stalls, footprint containment, atomic rejection, parking counts/paving, deterministic placement search, individual-stall moves and collisions, pond/landscape exclusions, hand-calculated runoff volume, mouse-driven building rotation/movement, parking drag/resize/search, save/open, storm export and mobile width. Existing tests retain image/PDF calibration/tracing, parcel measurements, presets, reservations and financial calculations. Desktop screenshot inspected. No TypeScript setup, cross-browser testing or civil-engineering validation is claimed.

Run: `npm ci`, `npm run dev`; open the printed localhost URL on that machine. For checks: `npm run check`, `npm test`, `npm run build`, and `npm run test:browser` with Vite running and Chromium installed. The local URL is not a verified externally accessible preview.
