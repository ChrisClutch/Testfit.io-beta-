# Build decision for Clutch Industries

**Build a focused Clutch feasibility product with Codex, using existing geometry libraries; keep an off-the-shelf feasibility tool available for parallel validation. Do not attempt all of TestFit in one AI-generated sprint.** A browser MVP can answer rough capacity and basic economics now. A dependable land-acquisition tool needs reviewed geometry, circulation and jurisdiction rules. Hire a geometry/AEC engineer for that stage; do not hire a large agency before proving the workflow on actual Clutch parcels.

The first commercial advantage should be faster, auditable Salem-area go/no-go decisions: source-aware site import, editable rules, local costs, transparent constraint failures, affordable-housing assumptions and sensitivity ranges. Generating attractive plans is secondary to avoiding false feasibility.

## Tool choice

| Option | Judgment for a nondeveloper | Best use / limitation |
|---|---|---|
| ChatGPT / Codex | Recommended here: already connected to the repository and can execute builds/tests | Architecture, implementation, diagnosis and incremental changes. Require reproducible tests and small releases; it does not supply engineering/legal correctness. |
| Claude / Claude Code | A credible alternative; no reason to restart this project merely to switch models | Use if its local CLI/review workflow suits the operator or contractor. Same geometry and review constraints. |
| Cursor | Strong choice once a contractor works in an IDE | Convenient edit/review loop; less useful if you do not want to maintain a local development setup. |
| License TestFit or another feasibility product | Fastest path to dependable decisions while building | Ask for trials, supported typologies, API/SDK access, export rights and commercial integration permission. White-label availability is not established. Do not assume a public SDK or resale license exists. |
| Extend Rhino/Grasshopper or an AEC engine | Good contractor prototype, less convenient for a public browser app | Mature CAD ecosystem but desktop/licensing/deployment constraints. Evaluate before purchasing. |
| Open-source geometry + your UI | Chosen foundation | Turf and polygon-clipping now; GEOS/Shapely + PROJ and OR-Tools later. These solve primitives and optimization, not an AEC product. Check each license and distribution obligations. |

Tool subscriptions are small relative to professional validation. Do not buy multiple coding subscriptions expecting them to replace a geometry engineer. Prices and plan limits change; verify vendor quotes rather than treating subscription cost as the product budget.

## Realistic schedule and money

Planning ranges in USD, not bids; assume one engaged owner, existing parcel examples and a specialist hired for the hard stage.

| Stage | Time | Likely spend / effort | Deliverable |
|---|---|---|---|
| Concept MVP | Days to 2–3 weeks | Roughly $100–$1,000 tools/hosting, plus owner time; contractor optional | Manual calibrated input, constraints, simple layouts and proforma. This repository starts that stage. |
| Trusted local pilot | 6–12 weeks | Roughly $15k–$60k specialist/product work | Parcel GIS, per-edge rules, circulation, site exclusions, parcel benchmark set and financial sensitivities. |
| Focused production product | 4–9 months | Roughly $80k–$250k | Reliable chosen typologies, solver service, accounts, persistence, review trail and practical exports. |
| Broad TestFit-class capability | 18–36+ months with a multidisciplinary team | Roughly $500k–$2m+; potentially substantially more | Multiple robust configurators, 3D, BIM/CAD integrations, jurisdiction data and ongoing support. |

A solo AI-assisted build hits the wall at robust polygon topology under edits, continuous/discrete optimization, connected parking/access, fire/ADA geometry, terrain, parametric building cores, jurisdiction interpretation and reliable export interoperability. Models can help implement these; they cannot establish correctness without specification, benchmark sites, engineering review and test oracles. Code volume is not parity.

## TestFit capability inventory: verification outstanding

**Live web search was unavailable, and direct requests to TestFit and Google were denied by the egress proxy on October 10, 2026. The following is a research checklist based on generally known product positioning, not a verified inventory of what TestFit sells today. No current price or current integration support is asserted.** The user's requirement to inventory current capabilities remains outstanding until network access or source material is available.

Start with https://www.testfit.io/ and its product, pricing, integration and help pages; collect dated evidence and plan/edition restrictions. Ask sales for a demo using one multifamily parcel, one cottage parcel and one fuel parcel in Salem. Confirm supported features in the actual licensed plan, not just a promotional rendering.

| Area to verify | Candidate capabilities / questions | What “better” means for Clutch | MVP status |
|---|---|---|---|
| Residential configurators | Multifamily configurations, townhouse and single-family support; podium/wrap/garden/corridor variants; exact current editions | Prioritize garden/walk-up multifamily, townhomes and Oregon cottages; report why capacity is limited | Five coarse program presets; no actual unit floorplans |
| Other typologies | Industrial, commercial/retail, mixed-use and other configurators; verify fuel/cottage support rather than assume | Fuel-specific circulation and cottage-cluster rules that a generic box does not handle | Store-only concept; no fuel configurator |
| Parking | Surface/structured parking, aisle modules, stall sizes, ratios and ramps; verify accessible parking and turning analysis | Explicit parking/access failures, spillover constraints, connected aisles, structured-parking economics | Parking/aisle pads and counts, no connectivity |
| Unit mix | Editable sizes, counts, mix, efficiency and building core logic; verify exact outputs | AMI/rent-banded mix, scenario-specific costs, explicit efficiency and sensitivity | Average unit size + efficiency only |
| Site and zoning | Parcel/site import, setbacks, height, density, FAR, exclusions and data integrations; distinguish manual input from authoritative zoning | Source citations, dates, jurisdiction review status, per-edge rules and confidence | Uniform manual setbacks and numerical constraints |
| Yield | Units, floor area, density, parking, coverage, iterative option comparison | Explain binding constraints, use conservative/base/upside yield, compare residual land value | Four scenarios with gross area, units and stalls |
| Financials | Current cost/financial/proforma functionality, plan restrictions, financial integrations | Visible cost model, downside tests, development timeline, interest carry, affordable subsidy and fuel business assumptions | Stabilized NOI/value, cost spread, interest-only metrics |
| Exports | Verify current DXF, CAD/BIM, Revit/Rhino/SketchUp/PDF/CSV support and units/layers | Clean georeferenced exports and an acquisition memo usable by consultants | Concept SVG, CSV, project JSON |
| Pricing | Verify editions, seats, annual commitments, geographic scope, quote-based options and API rights | Total cost justified by faster parcel screening and fewer false positives | No paid external services required |
| Integrations | Verify current parcel, mapping, financial and BIM integration names and support status | Vendor-independent input/output, source provenance, local parcel and underwriting connectors | Local file workflow only |

Do not claim “does everything TestFit does” until a verified feature matrix, real site benchmark and acceptance suite establish it. A broad parity claim is not supported by this MVP.

## Architecture

Current: browser-only Vite/JavaScript; SVG editor; PDF.js for first-page rasterization; Turf buffer for inward offsets; polygon-clipping for containment; deterministic grid candidates; explicit financial formulas. Cloudflare Pages can serve the static bundle. Documents are processed locally; project JSON contains both geometry and reference image.

Next: TypeScript with immutable project schema and migrations; separate geometry/constraints/solver/finance domains; a worker for browser geometry and cancelable searches; WebGL/Three.js only when massing is useful. Use Cloudflare Workers for auth, API and project metadata, D1 for structured data and R2 for permissioned uploads. Run CPU-intensive Shapely/GEOS/PROJ + OR-Tools in a container job service with job timeouts and explicit coordinate units; Workers are not the default home for long solver jobs. Keep the solver replaceable and return constraint checks alongside candidates. No credentials in a browser bundle.

## Build next, in order

1. **Truth and safety of the answer:** benchmark 10–20 actual Clutch parcels against architect/surveyor plans; calibrate a second dimension; source/license provenance; editor vertex manipulation; parcel import with CRS; easement/exclusion polygons; invalid-geometry handling and input limits. Bind every zoning assumption to a source and review state.
2. **Usable access and parking:** frontage/curb cuts, connected aisle/drive graph, turning templates, fire access, ADA/loading and guest parking. Per-edge setbacks, build-to rules, height, buffers, stormwater and open-space polygons. A plan is not feasible because disconnected boxes fit.
3. **Best first configurators:** multifamily blocks with corridor/core/egress accounting and explicit unit mix; townhouse lots/driveways; Oregon cottage clustering/shared court and jurisdiction-specific constraints. Validate one typology at a time.
4. **Acquisition economics:** cost line items, sitework allowances, financing schedule and interest carry, residual land value, rent/cost/cap sensitivity, conservative/base/upside comparison. Affordable housing: AMI and rent limits, subsidies, compliance costs, reserves and LIHTC support with specialist review.
5. **Fuel-site engine:** curb geometry, queueing, tanker swept paths, canopy and pump islands, tank locations, hazardous separation, deliveries, car wash and business underwriting. Bring in a fuel-site civil engineer; a generic retail preset is insufficient.
6. **Better optimization:** objective weights, Pareto options (yield/cost/open space), site exclusions and access graph, manual pinning, deterministic seeds, explanations for binding constraints, cancelable bounded jobs and interactive response targets. Measure quality against benchmarks.
7. **Massing and deliverables:** 3D levels, terrain when required, unitized massing, georeferenced DXF and consultant-friendly layers, PDF acquisition memo; evaluate licensed BIM export SDKs rather than promise immediate native Revit support.
8. **Productization:** accounts, version history, project sharing, role permissions, local-data connectors, monitoring, billing and human review workflow. Later add structured parking, podium/wrap, industrial and broader jurisdictions where demand supports it.

Get one experienced AEC geometry engineer to review stages 1–3, and a local architect/civil consultant to approve the benchmark acceptance criteria. Use AI to accelerate implementation against those criteria. For go/no-go decisions today, reconcile this app's estimates with professional analysis and a licensed established tool.
