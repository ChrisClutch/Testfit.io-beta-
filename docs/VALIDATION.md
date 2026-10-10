# Version 0.2 validation update

The rebuilt layout engine expands building lengths beside a shared drive and sizes parking from each building's unit count. Eleven engine tests passed, covering containment, concave/irregular sites, zoning limits, building growth, parking growth, explicit stall counts, drive/aisle connections, non-overlap, individual edits, all presets, access-approach containment and paving-inclusive open-space budgets.

Chromium checks passed for live site-wide growth without pressing Generate, individual length-slider edits, actual pointer dragging of SVG growth handles, persistence of individually edited plans, irregular sites, plus the prior upload/calibration/tracing/PDF/export/mobile workflows. No browser errors were observed. Production build passed; the same browser workflow also passed against the built production preview, including PDF upload and its worker.

The new rectangular demo defaults produce 147 homes and 222 drawn stalls in the highest-yield orientation. These are concept counts based on the stated assumptions, not approved design capacity. Corridors and unit dividers are schematic. No road turning, curb-cut permission, frontage, ADA, emergency access, drainage or fuel engineering is established. Financials are optional and collapsed.

The notes below describe the original version's validation and should not be read as current layout output.

# Validation evidence

Validated October 10, 2026 in the cloud machine with Node 24.19.0, npm 11.9.0 and system Chromium.

- Frozen-lockfile `npm ci --cache /tmp/clutch-npm-cache --no-audit --no-fund`: passed after initial installation. The default home cache was unavailable; the writable `/tmp` cache resolved it without disabling TLS or integrity checks.
- `npm test`: 6 tests executed and passed. Checks cover area/inward setbacks, concave-site containment and constraints, invalid boundaries/empty envelopes, parking requirements, financial arithmetic and separated collinear boundary edges.
- `npm run build`: passed. Produces static `dist/`, including dynamically loaded PDF.js and its worker.
- `npm run test:browser` against the development server: passed.
- `APP_URL=http://localhost:4173/ npm run test:browser` against the built production preview: passed, including PDF worker operation.
- Functional browser checks: four demo options, positive demo unit count, no-fit setback case, project download/reload, CSV download contents, PNG upload, mandatory calibration gate, two-point calibration, boundary tracing/closure, layout generation, valid PDF first-page upload, 390-pixel mobile viewport without horizontal overflow; no browser page errors.
- Desktop screenshot visually inspected. Development and production-preview servers started in persistent execution sessions. Live processes are not part of publication/restoration.
- Repository began with no commits or tracked application files. All source/documentation additions are the user's requested new coding work. `node_modules` and `dist` are ignored. No existing user source or lockfile was overwritten. `git diff --check` reported no issues (new files remain untracked).

## Demo result, not a parcel finding

500 × 400 ft rectangle; default multifamily assumptions: 120 homes, 180 conceptual stalls, 129,600 gross sf. With the displayed cost/rent assumptions: development cost $36,182,976; NOI $1,600,560/year; value $29,101,091; spread −$7,081,885; yield on cost 4.42%; interest-only DSCR 0.97. These are model arithmetic, not validated market or engineering facts.

## Configuration persistence

Saved `install_script`, `start_skill`, and custom research-domain additions in the cloud configuration draft. Save confirmation received. That does not apply the research allowlist to this instance or publish a snapshot. Review and save environment settings, then publish through the product. No new secrets were required. No fresh-task snapshot restoration was validated.

## Outstanding research

No web-search capability was exposed. Direct HTTPS access to TestFit and Google returned an egress-proxy 403 CONNECT denial. A read-only request through the escalation route also returned the same proxy denial; it was not an automatic-approval rejection. Saving the research-domain draft did not apply it at runtime. The product capability matrix and imagery terms are explicitly labeled unverified in the accompanying documents. Apply the saved network settings to enable live official-source research; then verify current editions, features, integrations, pricing and exact imagery licenses before parity/legal claims.
