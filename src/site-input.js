import { area, validBoundary } from "./engine.js";
// GeoJSON positions are explicitly WGS84 longitude/latitude, never guessed local units.
export function importParcelGeoJSON(value) {
  const features =
    value?.type === "FeatureCollection"
      ? value.features
      : value?.type === "Feature"
        ? [value]
        : [{ geometry: value }];
  if (!Array.isArray(features) || features.length !== 1)
    throw Error("Import exactly one parcel feature.");
  if (value.crs)
    throw Error("Use WGS84 longitude/latitude GeoJSON without a legacy CRS.");
  const g = features[0]?.geometry;
  if (g?.type !== "Polygon" || g.coordinates?.length !== 1)
    throw Error(
      "Use one Polygon exterior ring; holes and multi-parcels are not supported.",
    );
  let ring = g.coordinates[0];
  if (
    !Array.isArray(ring) ||
    ring.length < 4 ||
    ring.length > 101 ||
    ring.some(
      (p) =>
        !Array.isArray(p) ||
        p.length !== 2 ||
        !Number.isFinite(p[0]) ||
        !Number.isFinite(p[1]) ||
        Math.abs(p[0]) > 180 ||
        Math.abs(p[1]) > 85,
    )
  )
    throw Error("Expected WGS84 longitude/latitude positions.");
  if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1])
    throw Error("GeoJSON polygon must be closed.");
  ring = ring.slice(0, -1);
  const lon = ring[0][0],
    lat = ring[0][1],
    feet = ((6371008.8 / 0.3048) * Math.PI) / 180;
  const site = ring.map(([x, y]) => [
    (x - lon) * feet * Math.cos((lat * Math.PI) / 180),
    (lat - y) * feet,
  ]);
  if (!validBoundary(site) || area(site) > 43560 * 100)
    throw Error("Use a valid parcel smaller than 100 acres.");
  return {
    site,
    provenance:
      "Imported WGS84 parcel · approximate local-foot projection · not a survey",
    origin: [lon, lat],
  };
}
