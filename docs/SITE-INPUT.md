# Turning a document into a usable site

A drawing is a reference image; the property polygon is the geometry. The fastest trustworthy path is human-assisted calibration and tracing, not a model guessing a lot line.

## Current MVP

PDF first page → raster image → pick two known dimension endpoints → enter feet → draw exterior property ring. The measured segment defines feet per image pixel; every vertex and the reference image use that scale. A manually drawn site can also be calibrated. Calibration is mandatory after uploading. The uniform inward setback creates a buildable polygon; candidate building and parking/aisle footprints must lie wholly inside it.

For best results use a survey dimension between identifiable corners, a scale bar on an undistorted plan, or a known measured distance. Confirm a second dimension in another direction outside the MVP. A north arrow establishes orientation, not scale. A page resized nonuniformly, phone photograph with perspective, map tilted in 3D, or stitched screenshot cannot be corrected accurately by a single scale factor. Get the source survey/GIS or rectify it with control points first. Trace the legal parcel, not a fence or road edge. A map scale bar can support a concept estimate, never a boundary survey.

## Production input workflow

1. Prefer GeoJSON/parcel GIS with known CRS or licensed survey DXF. Preserve source, acquisition date, parcel identifier, units, CRS, license and confidence.
2. Reproject into an appropriate local projected CRS in feet/meters (verify county data CRS; do not assume WGS84 or Oregon State Plane from an unlabeled file). Use PROJ/pyproj server-side. Distinguish international feet from US survey feet.
3. For scans, render selected PDF pages; detect vector content where available; propose OCR dimensions and boundary segments. Require user confirmation. An LLM can assist interpretation but should not calculate or assert a legal boundary.
4. Use two-point scale only for orthographic undistorted references; use multiple control points and residual error for georeferencing. Reject inconsistent dimensions rather than silently averaging.
5. Accept closed polygons and holes. Validate self-intersections, duplicate/short edges, topology, coordinates and area. Overlay deed/survey/GIS discrepancies and report them.
6. Label frontage, rear and side edges; apply edge-specific setbacks. Subtract easements, waterways, buffers, ROW, access reservations and environmental exclusions. Preserve disconnected usable regions. Model variable rules at corners rather than blindly clipping offsets.
7. Store source geometry and all transformations separately. Keep revisions and an audit trail; always allow manual correction. Show geometry confidence separately from financial confidence.

## Google Maps imagery: do not build ingestion around screenshots

The current Google terms could not be fetched in this environment, so this is implementation guidance, not a verified current legal interpretation. Before a commercial release, review the official agreements for the exact product and get legal advice on the intended workflow:

- Google Maps Platform terms: https://cloud.google.com/maps-platform/terms
- Service-specific terms: https://cloud.google.com/maps-platform/terms/maps-service-terms
- Maps/Earth additional terms: https://www.google.com/help/terms_maps/
- Geo guidelines and attribution: https://about.google/brand-resource-center/products-and-services/geo-guidelines/
- Maps JavaScript policies: https://developers.google.com/maps/documentation/javascript/policies

Google's contractual restrictions may cover extracting/deriving datasets from its content, caching/storage, redistribution, creating substitutes and combining content with other maps; displaying an official SDK map with attribution does not automatically license polygon extraction, screenshot persistence or AI training. Permission to take a screenshot for one use does not establish permission to use it as persistent commercial product input. Do not assume user upload transfers imagery rights. Review both copyright/license rights and service contract restrictions.

**Product decision:** accept user-owned or properly licensed surveys, site plans and imagery. Do not advertise Google screenshot extraction as an unrestricted supported feature. This MVP accepts generic image files without scraping or calling Google; users must have permission to use the image. A rights acknowledgment and source metadata should precede public release. If Google data is required, obtain written authorization for the exact derivative and storage workflow; an API key alone is insufficient.

**Practical Salem alternatives:** request the owner's survey; acquire Marion or Polk County assessor parcel geometry as applicable; investigate Oregon geospatial data/imagery and Salem GIS; use USGS/NAIP imagery with verified dataset-specific reuse terms. Parcel GIS is often useful for feasibility but is not a substitute for a legal survey, and availability does not prove an unrestricted redistribution license. Links to investigate: https://www.co.marion.or.us/ , https://www.cityofsalem.net/ , https://www.oregon.gov/geo/ , https://www.usgs.gov/ . Confirm terms, accuracy, CRS and update dates for the specific layers. Add these sources with provenance and permissions instead of relying on scraped map screenshots.
