# Clutch PropDev.io v0.3 validation

Completed October 17, 2026. Local branch `feature/clutch-propdev-v2`, based on `73af223` from the current GitHub `main`. No commit, push, merge or deployment performed. The remote repository was rechecked and remains **public**; publishing this branch requires explicit authorization.

| Check | Result |
| --- | --- |
| `npm ci --cache /tmp/clutch-npm-cache --no-audit --no-fund` | Passed using the existing lockfile; dependencies preserved |
| `npm run check` | Passed: JavaScript syntax checks for main, engine, site input |
| `npm test` | Passed: 19 tests (11 inherited, 8 new) |
| `npm run build` | Passed: Vite production build, including local PDF worker |
| `npm run test:browser` | Passed: inherited and new Chromium suites |
| Final UI refinement | `npm run check`, `npm run build`, and `node tests/propdev-browser.mjs` passed again after compact cottage labels and more prominent sqft input |
| `git diff --check` | Passed |
| Visual inspection | Desktop screenshot reviewed; mobile 390 px viewport checked for horizontal overflow |

This repository is JavaScript; no TypeScript typecheck is configured or claimed. Browser verification used installed `/usr/bin/chromium`, without deploying or fetching private parcel data. Dev server remains local on port 5173; localhost is not a verified owner-accessible web-chat preview URL.

## Engine coverage

Inherited checks cover setbacks/areas, concave-site containment, numerical limits, parking demand, explicit stalls, continuous spine/aisle contact, non-overlap, geometry after edits, unusable sites, proforma arithmetic, and irregular/disconnected envelopes.

New checks cover:

- All 26 explicit residential presets: 2 cottage story presets, 3 townhome story presets, and 21 plex sizes from 4 to 24; correct homes per building and net/gross area relationship.
- No building/parking/road/approach overlap for those generated default examples; all footprints within the property.
- Same-area two-story cottages occupy half the ground footprint of one-story cottages.
- Per-home and per-building area inputs produce identical geometry for equivalent targets.
- Townhome home-count and story controls; whole-building expansion and removal update demand.
- Optional auto reservations meet requested area and are not crossed by buildings, parking, roads or approaches for flexible multifamily, cottage, townhome and plex examples.
- Manual reservations count toward targets; overlapping, off-parcel or impossible reservations are rejected.
- GeoJSON input format, bounded local projection, and rejection of holes, multiple parcels and out-of-range coordinates.

## Browser coverage

Both inherited workflows and the new workflow pass with no uncaught page errors. New coverage includes brand/title, cottage/plex presets, sqft basis conversion, footprint updates, whole-building expansion, reserved area display, clearing stale results on impossible targets, v3 save/reopen, v2 migration, numeric and dragged boundary edits, WGS84 import/provenance, manually drawn green space, saving/reopening an untraced uploaded reference, and a 390 px mobile viewport.

An initial pointer-drag test attempted to hit a handle outside the current viewport after form scrolling. It now explicitly scrolls the handle into view. A manual-polygon test initially expected exact area despite pixel-rounded browser clicks; it now allows the expected click-resolution tolerance. These were test-harness corrections; current checks pass.

Screenshot: [desktop](propdev-v03-desktop.png). UI tests also write `/tmp/propdev-v03-mobile.png` and transient JSON/CSV examples locally. These paths are evidence in the executor, not claims of delivered Library attachments.

## Not tested or not implemented

No independent architect/civil/hydrologic review, municipal code verification, real parcel benchmark suite, GIS survey-precision validation, cross-browser coverage, large-scale performance certification, automated accessibility audit, cloud preview or deployment verification. Tests establish the listed concept geometry properties on supplied synthetic examples, not global solver correctness.

Known planning limits: one selected building type per study; straight spines rather than a general road network; no street-access permission or vehicle swept-path/ADA/fire analysis; no guaranteed pedestrian/driveway access to every home; no floor plans, subdivisions, mixed-type optimization, automatic image boundary detection, hydrologic sizing, terrain, stormwater volumes, or global optimality. Green-space and detention polygons reserve land only. The requested `.io` product name has been applied in the app; no domain was bought or configured.
