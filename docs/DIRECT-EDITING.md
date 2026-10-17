# Direct editing correction (local milestone)

Based on pushed commit `292bb36`, branch `feature/clutch-propdev-v2`.

## Diagnosis
The v0.3 cottage presets support selection, removal and site-wide area/depth changes, but have no pointer movement or individual footprint resize controls. Flexible bars have a length handle, not translation or rotation. Parcel vertex dragging already exists behind the sidebar button; edge measurements were missing. This is an implementation gap, not evidence of a deployment regression. The known Cloudflare URL could not be inspected: the executor network proxy returned CONNECT 403. The deployed commit is unverified.

## Added
- A property-corner editing button directly above the canvas, plus the existing sidebar control.
- Live edge lengths in feet, parcel area in square feet/acres and perimeter while corners move. Layout metrics clear during the drag and configurations regenerate on release. Invalid crossing edits restore the previous boundary.
- Paste a clipboard image onto the page (outside text inputs). Uses the same local reference loader and size/type limits as file upload. Calibrate one known distance, trace, then adjust corners. No automatic legal boundary extraction or survey accuracy is implied.
- Drag any generated building. Select one and enter exact footprint length, depth and rotation, then Apply footprint.
- Direct edits retain the current home count and stories; gross/net floor area, coverage and costs update. Parcel/setback/reservation containment, other building/parking/access-road overlap, coverage, FAR and unbuilt/unpaved assumptions are checked before accepting changes. Failed edits retain the last valid footprint.
- Manual transforms persist in project JSON and are validated together on restore. No new project version is required: older readers ignore this optional data, and older project files remain supported.

## Limits and next milestone
Roads and parking stay fixed during direct edits; automatic relocation around locked buildings is not implemented. Site-wide program changes and regeneration reset manual edits (UI explains this). Building separation, individual driveway/walkway connections, turning radii, zoning compliance and hydrology are not certified. Dimensions/rotation use numeric controls; there is no footprint resize/rotation handle yet. Image paste is implemented via standard paste events, not a clipboard permission API; real operating-system clipboard flows beyond Chromium remain untested. Test data are synthetic demo parcels.

Next: lock manually placed buildings and regenerate roads/parking around them, with explicit infeasibility diagnostics; add resize/rotate handles and undo history. A recording of the desired workflow and a measured parcel will help establish acceptance cases.

## Validation
- JavaScript syntax checks, production build, 21 Node tests and three Chromium browser suites pass.
- New browser coverage: edge/area values change before releasing a dragged property corner; cottage exact dimensions and rotation; pointer movement; invalid footprint rejection; edited geometry save/open; simulated image clipboard paste.
- Existing browser suites retain flexible-bar growth, save/open, image/PDF calibration/tracing, presets, reservations, GeoJSON and responsive-width checks.
- No TypeScript setup; no typecheck claimed. No cross-browser or survey/civil validation.
- Local preview: `npm ci`, `npm run dev`, then open the printed localhost URL on the machine running Vite. No externally accessible preview was verified.
- Chris authorized publishing these corrections on October 17, 2026. This update targets `feature/clutch-propdev-v2`; pushing may trigger Cloudflare's production build. Deployment success must be verified separately in Cloudflare.
