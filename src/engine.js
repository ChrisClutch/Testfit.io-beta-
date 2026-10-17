import buffer from "@turf/buffer";
import { polygon } from "@turf/helpers";
import clipping from "polygon-clipping";
export const TYPES = {
  multifamily: {
    label: "Multifamily",
    width: 120,
    depth: 60,
    unit: 850,
    floors: 3,
    efficiency: 0.82,
  },
  townhomes: {
    label: "Flexible townhome bar",
    width: 100,
    depth: 42,
    unit: 1500,
    floors: 2,
    efficiency: 0.9,
  },
  affordable: {
    label: "Affordable housing",
    width: 120,
    depth: 60,
    unit: 750,
    floors: 3,
    efficiency: 0.82,
  },
  cottages: {
    label: "Cottage cluster (legacy)",
    width: 28,
    depth: 34,
    unit: 900,
    floors: 1,
    efficiency: 0.95,
  },
  fuel: {
    label: "C-store / fuel",
    width: 70,
    depth: 55,
    unit: 1000,
    floors: 1,
    efficiency: 1,
  },
};
for (const floors of [1, 2])
  TYPES[`cottage${floors}`] = {
    label: `${floors}-story cottage`,
    family: "discrete",
    homes: 1,
    depth: floors === 1 ? 30 : 26,
    unit: 900,
    floors,
    efficiency: 0.95,
  };
for (const floors of [1, 2, 3])
  TYPES[`townhome${floors}`] = {
    label: `${floors}-story townhomes`,
    family: "discrete",
    homes: 6,
    depth: 42,
    unit: 1500,
    floors,
    efficiency: 0.9,
    townhome: true,
  };
for (let homes = 4; homes <= 24; homes++)
  TYPES[`plex${homes}`] = {
    label: `${homes}-plex`,
    family: "discrete",
    homes,
    depth: 60,
    unit: 850,
    floors: homes <= 6 ? 2 : 3,
    efficiency: 0.82,
  };

export function area(r) {
  return Math.abs(
    r.reduce((s, p, i) => {
      let q = r[(i + 1) % r.length];
      return s + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2,
  );
}
const multiArea = (m) =>
  m.reduce(
    (s, p) => s + area(p[0]) - p.slice(1).reduce((a, r) => a + area(r), 0),
    0,
  );
const cross = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export function validBoundary(r) {
  if (
    !Array.isArray(r) ||
    r.some(
      (p) =>
        !Array.isArray(p) ||
        p.length !== 2 ||
        p.some((v) => !Number.isFinite(v) || Math.abs(v) > 100000),
    )
  )
    return false;
  if (
    r.length < 3 ||
    r.some((p) => p.some((v) => !Number.isFinite(v))) ||
    area(r) < 10
  )
    return false;
  for (let i = 0; i < r.length; i++) {
    if (
      Math.hypot(
        r[i][0] - r[(i + 1) % r.length][0],
        r[i][1] - r[(i + 1) % r.length][1],
      ) < 0.01
    )
      return false;
    for (let j = i + 1; j < r.length; j++) {
      if (j === i + 1 || (i === 0 && j === r.length - 1)) continue;
      let a = r[i],
        b = r[(i + 1) % r.length],
        c = r[j],
        d = r[(j + 1) % r.length];
      if (
        Math.max(a[0], b[0]) >= Math.min(c[0], d[0]) &&
        Math.max(c[0], d[0]) >= Math.min(a[0], b[0]) &&
        Math.max(a[1], b[1]) >= Math.min(c[1], d[1]) &&
        Math.max(c[1], d[1]) >= Math.min(a[1], b[1]) &&
        cross(a, b, c) * cross(a, b, d) <= 0 &&
        cross(c, d, a) * cross(c, d, b) <= 0
      )
        return false;
    }
  }
  return true;
}
export function inset(r, feet) {
  if (!validBoundary(r))
    throw Error(
      "Trace a simple boundary with no crossings or duplicate vertices.",
    );
  if (feet <= 0) return [[[...r, r[0]]]];
  const k = 1 / 364813;
  const feature = buffer(
    polygon([[...r, r[0]].map(([x, y]) => [x * k, y * k])]),
    -feet * 0.3048,
    { units: "meters", steps: 8 },
  );
  if (!feature) return [];
  const coords =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  return coords.map((p) => p.map((r) => r.map(([x, y]) => [x / k, y / k])));
}
const rect = (x, y, w, h) => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
  [x, y],
];
const rotate = (p, a) => [
  p[0] * Math.cos(a) - p[1] * Math.sin(a),
  p[0] * Math.sin(a) + p[1] * Math.cos(a),
];
export function fits(r, envelope) {
  return multiArea(clipping.difference([[r]], envelope)) < 0.01;
}
// All coordinates are local feet. A continuous access spine serves every parking aisle.
const numericKeys = [
  "setback",
  "floors",
  "parkingRatio",
  "maxCoverage",
  "maxFar",
  "maxDensity",
  "openSpace",
  "unitSize",
  "efficiency",
  "buildingDepth",
  "maxLength",
  "growth",
  "stallWidth",
  "stallDepth",
  "aisleWidth",
  "detentionSqft",
  "greenSpaceSqft",
  "homesPerBuilding",
];
export function config(input = {}) {
  const t = TYPES[input.type || "multifamily"];
  if (!t) throw Error("Unknown project type.");
  const c = {
    type: "multifamily",
    setback: 15,
    floors: t.floors,
    parkingRatio: 1.5,
    maxCoverage: 40,
    maxFar: 1.5,
    maxDensity: 40,
    openSpace: 20,
    unitSize: t.unit,
    efficiency: t.efficiency,
    buildingDepth: t.depth,
    maxLength: 360,
    growth: 100,
    stallWidth: 9,
    stallDepth: 18,
    aisleWidth: 24,
    detentionSqft: 0,
    greenSpaceSqft: 0,
    homesPerBuilding: t.homes || 6,
    areaBasis: "home",
    reservedAreas: [],
    ...input,
  };
  for (const k of numericKeys)
    if (!Number.isFinite(c[k]) || c[k] < 0)
      throw Error("Constraints must be finite nonnegative numbers.");
  if (
    c.unitSize < 100 ||
    c.floors < 1 ||
    c.floors > 20 ||
    !Number.isInteger(c.floors) ||
    c.efficiency <= 0 ||
    c.efficiency > 1 ||
    c.maxCoverage > 100 ||
    c.openSpace > 100 ||
    c.growth > 100 ||
    c.buildingDepth < 20 ||
    c.buildingDepth > 150 ||
    c.maxLength < 36 ||
    c.maxLength > 1000 ||
    c.stallWidth < 8 ||
    c.stallWidth > 12 ||
    c.stallDepth < 16 ||
    c.stallDepth > 24 ||
    c.aisleWidth < 20 ||
    c.aisleWidth > 36
  )
    throw Error(
      "Check building dimensions, floors, parking dimensions and percentages.",
    );
  if (
    !["home", "building"].includes(c.areaBasis) ||
    !Number.isInteger(c.homesPerBuilding) ||
    c.homesPerBuilding < 1 ||
    c.homesPerBuilding > 24 ||
    c.greenSpaceSqft > 4356000 ||
    c.detentionSqft > 4356000
  )
    throw Error("Check area targets and homes per building.");
  if ((input.type || "").startsWith("cottage") && t.family === "discrete")
    c.floors = t.floors;
  if (t.townhome) c.floors = t.floors;
  if ((input.type || "").startsWith("plex") && c.floors > 3)
    throw Error("Plex presets support 1–3 stories.");
  c.homes = t.townhome ? c.homesPerBuilding : t.homes;
  if (c.areaBasis === "building" && t.family !== "discrete")
    throw Error(
      "Per-building area requires a cottage, townhome or plex preset.",
    );
  c.homeArea = c.areaBasis === "building" ? c.unitSize / c.homes : c.unitSize;
  if (c.homeArea < 100)
    throw Error("Provide at least 100 net square feet per home.");
  if (
    !Array.isArray(c.reservedAreas) ||
    c.reservedAreas.length > 20 ||
    c.reservedAreas.some(
      (z) =>
        !["green", "detention"].includes(z.kind) ||
        !Array.isArray(z.ring) ||
        z.ring.length > 100 ||
        !validBoundary(z.ring),
    )
  )
    throw Error(
      "Reserved areas must be valid green-space or detention polygons.",
    );
  return c;
}
function boxOf(e) {
  const p = e.flat(2);
  return p.length
    ? {
        minX: Math.min(...p.map((v) => v[0])),
        maxX: Math.max(...p.map((v) => v[0])),
        minY: Math.min(...p.map((v) => v[1])),
        maxY: Math.max(...p.map((v) => v[1])),
      }
    : null;
}
function maxSpan(x, y, h, side, max, e) {
  let low = 0,
    high = max;
  for (let i = 0; i < 14; i++) {
    const mid = (low + high) / 2;
    if (fits(rect(side > 0 ? x : x - mid, y, mid, h), e)) low = mid;
    else high = mid;
  }
  return Math.floor(low * 2) / 2;
}
function spineRuns(x, b, c, e) {
  let runs = [],
    start = null;
  for (let y = b.minY + 1; y + 12 <= b.maxY; y += 12) {
    let ok = fits(rect(x, y, c.aisleWidth, 12), e);
    if (ok && start === null) start = y;
    if (!ok && start !== null) {
      runs.push([start, y]);
      start = null;
    }
  }
  if (start !== null)
    runs.push([
      start,
      b.minY + 1 + Math.floor((b.maxY - b.minY - 1) / 12) * 12,
    ]);
  return runs.filter(
    ([a, b]) =>
      b - a > c.buildingDepth + 6 + c.stallDepth * 2 + c.aisleWidth + 12,
  );
}
const worldRing = (r, a) => r.map((p) => rotate(p, a));
export function reconfigure(site, input, model, edits = {}) {
  const c = config(input);
  if (TYPES[c.type].family === "discrete")
    return discreteLayout(site, c, model, edits);
  const land = planningLand(site, c),
    envelope = land.envelope,
    a = (model.degrees * Math.PI) / 180;
  const e = envelope.map((p) => p.map((r) => r.map((v) => rotate(v, -a)))),
    b = boxOf(e),
    siteArea = area(site);
  let buildings = [],
    parking = [],
    stallPolygons = [],
    aisles = [],
    buildingDetails = [],
    parkingDetails = [],
    units = 0,
    gfa = 0,
    footprint = 0;
  const empty = {
    reservedAreas: land.reservedAreas,
    greenArea: land.greenArea,
    detentionArea: land.detentionArea,
    degrees: model.degrees,
    buildings,
    parking,
    stallPolygons,
    aisles,
    buildingDetails,
    parkingDetails,
    units: 0,
    stalls: 0,
    gfa: 0,
    coverage: 0,
    siteArea,
    buildableArea: multiArea(envelope),
    envelope,
    model,
    edits,
    entry: null,
    roads: [],
    pavedArea: 0,
  };
  if (!b) return empty;
  const x = model.spineX,
    start = model.startY,
    end = model.endY,
    road = rect(x, start, c.aisleWidth, end - start);
  if (!fits(road, e)) return empty;
  let paved = c.aisleWidth * (end - start),
    roadWorld = worldRing(road, a);
  const minLength = c.type === "cottages" ? 28 : c.type === "fuel" ? 70 : 54,
    depth = c.buildingDepth,
    lotDepth = 2 * c.stallDepth + c.aisleWidth;
  const bayHeight = depth + 6 + lotDepth + 12;
  // Roads may cross the setback, but always remain inside the traced property.
  const localSite = land.available.map((p) => p.map((r) => worldRing(r, -a)));
  let entryLength = maxSpan(
    start,
    x,
    c.aisleWidth,
    -1,
    Math.max(0, start - boxOf(localSite).minY),
    localSite.map((p) => p.map((r) => r.map(([px, py]) => [py, px]))),
  );
  // Calculate the access approach with the coordinates transposed for maxSpan.
  let entry =
    entryLength > 0.5
      ? rect(x, start - entryLength, c.aisleWidth, entryLength)
      : null;
  if (entry) paved += area(entry);
  let budget = Math.min(
    (siteArea * c.maxCoverage) / 100,
    (siteArea * c.maxFar) / c.floors,
  );
  const densityLimit = Math.floor((siteArea / 43560) * c.maxDensity);
  for (
    let row = 0, y = start + 6;
    y + bayHeight <= end + 0.01;
    y += bayHeight, row++
  ) {
    for (const side of [1, -1]) {
      if (c.type === "fuel" && buildings.length) continue;
      const anchor = side > 0 ? x + c.aisleWidth : x;
      const available = maxSpan(
        anchor,
        y,
        depth + 6 + lotDepth,
        side,
        side > 0 ? b.maxX - anchor : anchor - b.minX,
        e,
      );
      if (available < minLength + 12) continue;
      const maxLotWidth =
        Math.floor((available - 6) / c.stallWidth) * c.stallWidth;
      const capacity = 2 * Math.floor(maxLotWidth / c.stallWidth);
      const remainingUnits =
        c.type === "fuel" ? Infinity : Math.max(0, densityLimit - units);
      const parkingUnitCap = c.parkingRatio
        ? Math.floor(capacity / c.parkingRatio)
        : Infinity;
      let maxBuilding = Math.min(
        c.maxLength,
        available - 12,
        (budget - footprint) / depth,
      );
      if (c.type === "cottages") maxBuilding = Math.min(maxBuilding, 28);
      if (c.type === "fuel") maxBuilding = Math.min(maxBuilding, 100);
      if (c.type !== "fuel" && c.type !== "cottages")
        maxBuilding = Math.min(
          maxBuilding,
          ((Math.min(remainingUnits, parkingUnitCap) + 0.999) * c.homeArea) /
            (depth * c.floors * c.efficiency),
        );
      const id = `${row}:${side}`;
      const requested =
        edits[id] ?? Math.max(minLength, (maxBuilding * c.growth) / 100);
      let length =
        c.type === "cottages"
          ? Math.min(28, maxBuilding)
          : c.type === "fuel"
            ? Math.floor(Math.min(requested, maxBuilding))
            : Math.floor(Math.min(requested, maxBuilding) / 3) * 3;
      // Reduce growth when paving and open-space budgets, not just building coverage, bind.
      let n = 0,
        needed = 0,
        lotWidth = 0,
        pad = null,
        building = null;
      for (; length >= minLength; length -= 3) {
        n =
          c.type === "fuel"
            ? 0
            : c.type === "cottages"
              ? 1
              : Math.floor(
                  (length * depth * c.floors * c.efficiency) / c.homeArea,
                );
        needed = c.type === "fuel" ? 12 : Math.ceil(n * c.parkingRatio);
        const columns = Math.ceil(needed / 2);
        lotWidth = Math.max(c.aisleWidth, columns * c.stallWidth);
        if (
          (n === 0 && c.type !== "fuel") ||
          n > remainingUnits ||
          needed > capacity
        )
          continue;
        const buildingX = side > 0 ? anchor + 6 : anchor - 6 - length;
        building = rect(buildingX, y, length, depth);
        pad = rect(
          side > 0 ? anchor : anchor - lotWidth,
          y + depth + 6,
          lotWidth,
          lotDepth,
        );
        if (!fits(building, e) || !fits(pad, e)) continue;
        if (
          footprint + length * depth + paved + area(pad) >
          siteArea * (1 - c.openSpace / 100)
        )
          continue;
        break;
      }
      if (length < minLength) continue;
      const px = pad[0][0],
        py = pad[0][1];
      const aisle = rect(px, py + c.stallDepth, lotWidth, c.aisleWidth);
      let spots = [];
      for (let j = 0; j < needed; j++) {
        const column = Math.floor(j / 2),
          top = j % 2 === 0;
        // Keep any spare half-stall at the far end; each counted stall has a footprint.
        const sx =
          side > 0
            ? px + column * c.stallWidth
            : px + lotWidth - (column + 1) * c.stallWidth;
        spots.push(
          worldRing(
            rect(
              sx,
              top ? py : py + c.stallDepth + c.aisleWidth,
              c.stallWidth,
              c.stallDepth,
            ),
            a,
          ),
        );
      }
      buildings.push(worldRing(building, a));
      parking.push(worldRing(pad, a));
      aisles.push(worldRing(aisle, a));
      stallPolygons.push(...spots);
      const bx = building[0][0];
      const corridor =
        c.type === "multifamily" || c.type === "affordable"
          ? worldRing(rect(bx, y + depth / 2 - 3, length, 6), a)
          : null;
      buildingDetails.push({
        id,
        length,
        depth,
        minLength,
        maxLength: maxBuilding,
        units: n,
        floors: c.floors,
        origin: [bx, y],
        side,
        anchor,
        corridor,
        center: rotate([bx + length / 2, y + depth / 2], a),
        handle: rotate([side > 0 ? bx + length : bx, y + depth / 2], a),
      });
      parkingDetails.push({
        stalls: needed,
        center: rotate([px + lotWidth / 2, py + lotDepth / 2], a),
      });
      units += n;
      gfa += length * depth * c.floors;
      footprint += length * depth;
      paved += area(pad);
    }
  }
  return {
    ...empty,
    buildings,
    parking,
    stallPolygons,
    aisles,
    buildingDetails,
    parkingDetails,
    roads: buildings.length ? [roadWorld] : [],
    entry: buildings.length && entry ? worldRing(entry, a) : null,
    units,
    stalls: stallPolygons.length,
    gfa,
    coverage: (footprint / siteArea) * 100,
    pavedArea: buildings.length ? paved : 0,
  };
}
export function generate(site, input = {}) {
  const c = config(input),
    envelope = planningLand(site, c).envelope;
  if (area(site) > 43560 * 100 || site.length > 100)
    throw Error("Use a study boundary smaller than 100 acres and 100 corners.");
  const scenarios = [];
  for (const degrees of [0, 90, 30, 60]) {
    const a = (degrees * Math.PI) / 180,
      e = envelope.map((p) => p.map((r) => r.map((v) => rotate(v, -a)))),
      b = boxOf(e);
    let best = reconfigure(site, c, { degrees, spineX: 0, startY: 0, endY: 0 });
    if (b) {
      const span = b.maxX - b.minX - c.aisleWidth - 4;
      for (const fraction of [0.5, 0.25, 0.75]) {
        const x = b.minX + 2 + span * fraction;
        for (const [startY, endY] of spineRuns(x, b, c, e)) {
          const candidate = reconfigure(site, c, {
            degrees,
            spineX: x,
            startY,
            endY,
          });
          if (
            candidate.units > best.units ||
            (candidate.units === best.units && candidate.gfa > best.gfa)
          )
            best = candidate;
        }
      }
    }
    scenarios.push(best);
  }
  return scenarios.sort((a, b) => b.units - a.units || b.gfa - a.gfa);
}
export function proforma(layout, input = {}) {
  let c = {
    land: 600000,
    hardCost: 210,
    softPct: 20,
    contingencyPct: 8,
    rent: 1800,
    vacancyPct: 5,
    opexPct: 35,
    capRate: 5.5,
    loanPct: 65,
    interestPct: 7,
    annualRetailNoi: 150000,
    ...input,
  };
  if (
    Object.values(c).some((v) => !Number.isFinite(v) || v < 0) ||
    c.capRate <= 0 ||
    c.vacancyPct > 100 ||
    c.opexPct > 100 ||
    c.loanPct > 100
  )
    throw Error("Check financial inputs; cap rate must be positive.");
  let hard =
    layout.gfa * c.hardCost +
    (layout.pavedArea ?? layout.parking.reduce((s, p) => s + area(p), 0)) * 12;
  let total = c.land + hard * (1 + (c.softPct + c.contingencyPct) / 100),
    noi = layout.units
      ? layout.units *
        c.rent *
        12 *
        (1 - c.vacancyPct / 100) *
        (1 - c.opexPct / 100)
      : layout.buildings.length
        ? c.annualRetailNoi
        : 0;
  let value = noi / (c.capRate / 100),
    loan = (total * c.loanPct) / 100,
    debtService = (loan * c.interestPct) / 100;
  return {
    hard,
    total,
    noi,
    value,
    profit: value - total,
    yield: total ? (noi / total) * 100 : 0,
    debtService,
    dscr: debtService ? noi / debtService : null,
    equity: total - loan,
    cashOnCash: total > loan ? ((noi - debtService) / (total - loan)) * 100 : 0,
  };
}

export function planningLand(site, input) {
  const c = config(input);
  if (
    !Array.isArray(site) ||
    site.length > 100 ||
    !validBoundary(site) ||
    area(site) > 4356000
  )
    throw Error("Use a simple site under 100 acres and 100 corners.");
  const parcel = [[[...site, site[0]]]];
  let available = parcel;
  const zones = [];
  for (const z of c.reservedAreas) {
    const r = [...z.ring, z.ring[0]];
    if (!fits(r, available))
      throw Error(
        "Reserved areas must be inside the parcel and must not overlap.",
      );
    available = clipping.difference(available, [[r]]);
    zones.push({ ...z, ring: r, source: "user-drawn" });
  }
  for (const [kind, target] of [
    ["detention", c.detentionSqft],
    ["green", c.greenSpaceSqft],
  ]) {
    const already = zones
        .filter((z) => z.kind === kind)
        .reduce((sum, z) => sum + area(z.ring), 0),
      needed = Math.max(0, target - already);
    if (needed < 0.01) continue;
    const b = boxOf(available);
    let found = null;
    if (b)
      for (const ratio of [1, 2, 0.5, 4, 0.25]) {
        const w = Math.sqrt(needed * ratio),
          h = needed / w;
        if (w > b.maxX - b.minX || h > b.maxY - b.minY) continue;
        for (let row = 0; row <= 12 && !found; row++)
          for (let col = 0; col <= 12 && !found; col++) {
            const x = b.maxX - w - ((b.maxX - b.minX - w) * col) / 12,
              y = b.maxY - h - ((b.maxY - b.minY - h) * row) / 12,
              r = rect(x, y, w, h);
            if (fits(r, available)) found = r;
          }
        if (found) break;
      }
    if (!found)
      throw Error(
        `Could not reserve ${Math.round(needed).toLocaleString()} additional sf of ${kind === "green" ? "green space" : "detention"}. Lower the target or draw the area manually.`,
      );
    zones.push({ kind, ring: found, source: "auto-reserved concept" });
    available = clipping.difference(available, [[found]]);
  }
  const envelope = clipping.intersection(inset(site, c.setback), available);
  return {
    envelope,
    available,
    reservedAreas: zones,
    greenArea: zones
      .filter((z) => z.kind === "green")
      .reduce((a, z) => a + area(z.ring), 0),
    detentionArea: zones
      .filter((z) => z.kind === "detention")
      .reduce((a, z) => a + area(z.ring), 0),
  };
}

function discreteLayout(site, c, model, edits) {
  const land = planningLand(site, c),
    a = (model.degrees * Math.PI) / 180,
    e = land.envelope.map((p) => p.map((r) => worldRing(r, -a))),
    b = boxOf(e),
    siteArea = area(site);
  const result = {
    ...land,
    degrees: model.degrees,
    buildings: [],
    parking: [],
    stallPolygons: [],
    aisles: [],
    buildingDetails: [],
    parkingDetails: [],
    units: 0,
    stalls: 0,
    gfa: 0,
    coverage: 0,
    siteArea,
    buildableArea: multiArea(land.envelope),
    model,
    edits,
    entry: null,
    roads: [],
    pavedArea: 0,
  };
  if (!b) return result;
  const { spineX: x, startY: start, endY: end } = model,
    road = rect(x, start, c.aisleWidth, end - start);
  if (end <= start || !fits(road, e)) return result;
  const depth = c.buildingDepth,
    length = (c.homes * c.homeArea) / (c.floors * c.efficiency * depth),
    gap = 12,
    lotDepth = 2 * c.stallDepth + c.aisleWidth;
  if (length > c.maxLength || length < 8) return result;
  let paved = area(road),
    footprint = 0;
  const localAvailable = land.available.map((p) =>
      p.map((r) => worldRing(r, -a)),
    ),
    bounds = boxOf(localAvailable);
  const entryLength = maxSpan(
    start,
    x,
    c.aisleWidth,
    -1,
    Math.max(0, start - bounds.minY),
    localAvailable.map((p) => p.map((r) => r.map(([px, py]) => [py, px]))),
  );
  const entry =
    entryLength > 0.5
      ? rect(x, start - entryLength, c.aisleWidth, entryLength)
      : null;
  if (entry) paved += area(entry);
  const bayHeight = depth + 6 + lotDepth + 12,
    densityLimit = Math.floor((siteArea / 43560) * c.maxDensity);
  for (
    let row = 0, y = start + 6;
    y + bayHeight <= end + 0.01;
    y += bayHeight, row++
  )
    for (const side of [1, -1]) {
      const anchor = side > 0 ? x + c.aisleWidth : x,
        available = maxSpan(
          anchor,
          y,
          depth + 6 + lotDepth,
          side,
          side > 0 ? b.maxX - anchor : anchor - b.minX,
          e,
        );
      const maxCount = Math.min(
          200,
          Math.floor((available - 6 + gap) / (length + gap)),
        ),
        countTarget = Math.max(1, Math.floor((maxCount * c.growth) / 100));
      let count = countTarget,
        pad,
        homes,
        needed;
      for (; count > 0; count--) {
        homes = count * c.homes;
        needed = Math.ceil(homes * c.parkingRatio);
        const lotWidth = Math.max(
          c.aisleWidth,
          Math.ceil(needed / 2) * c.stallWidth,
        );
        pad = rect(
          side > 0 ? anchor : anchor - lotWidth,
          y + depth + 6,
          lotWidth,
          lotDepth,
        );
        const newFootprint = count * length * depth;
        if (
          lotWidth > available ||
          !fits(pad, e) ||
          result.units + homes > densityLimit ||
          footprint + newFootprint > (siteArea * c.maxCoverage) / 100 ||
          (footprint + newFootprint) * c.floors > siteArea * c.maxFar ||
          footprint + newFootprint + paved + area(pad) >
            siteArea * (1 - c.openSpace / 100)
        )
          continue;
        break;
      }
      if (!count) continue;
      const py = pad[0][1];
      const group = [];
      for (let j = 0; j < count; j++) {
        const id = `${row}:${side}:${j}`;
        if (edits[id] === 0) continue;
        const bx =
            side > 0
              ? anchor + 6 + j * (length + gap)
              : anchor - 6 - j * (length + gap) - length,
          building = rect(bx, y, length, depth);
        if (!fits(building, e)) continue;
        group.push({ id, bx, building });
      }
      if (!group.length) continue;
      // Removed modules release parking; the remaining pad still joins the same spine.
      homes = group.length * c.homes;
      needed = Math.ceil(homes * c.parkingRatio);
      const lotWidth = Math.max(
          c.aisleWidth,
          Math.ceil(needed / 2) * c.stallWidth,
        ),
        padX = side > 0 ? anchor : anchor - lotWidth;
      pad = rect(padX, py, lotWidth, lotDepth);
      const activeAisle = rect(padX, py + c.stallDepth, lotWidth, c.aisleWidth);
      result.parking.push(worldRing(pad, a));
      result.aisles.push(worldRing(activeAisle, a));
      result.parkingDetails.push({
        stalls: needed,
        center: rotate([padX + lotWidth / 2, py + lotDepth / 2], a),
      });
      for (let j = 0; j < needed; j++) {
        const col = Math.floor(j / 2),
          sx =
            side > 0
              ? padX + col * c.stallWidth
              : padX + lotWidth - (col + 1) * c.stallWidth;
        result.stallPolygons.push(
          worldRing(
            rect(
              sx,
              py + (j % 2 ? c.stallDepth + c.aisleWidth : 0),
              c.stallWidth,
              c.stallDepth,
            ),
            a,
          ),
        );
      }
      for (const { id, bx, building } of group) {
        result.buildings.push(worldRing(building, a));
        result.buildingDetails.push({
          id,
          length,
          depth,
          minLength: length,
          maxLength: length,
          units: c.homes,
          floors: c.floors,
          origin: [bx, y],
          side,
          anchor,
          corridor: null,
          center: rotate([bx + length / 2, y + depth / 2], a),
          handle: rotate([side > 0 ? bx + length : bx, y + depth / 2], a),
          fixed: true,
          netArea: c.homes * c.homeArea,
        });
      }
      result.units += homes;
      footprint += group.length * length * depth;
      paved += area(pad);
    }
  result.stalls = result.stallPolygons.length;
  result.gfa = footprint * c.floors;
  result.coverage = (footprint / siteArea) * 100;
  if (result.buildings.length) {
    result.roads = [worldRing(road, a)];
    result.entry = entry ? worldRing(entry, a) : null;
    result.pavedArea = paved;
  }
  return result;
}

// Direct edits preserve unit count; validate final geometry rather than claiming a new solve.
export function applyFootprints(layout, input, transforms = {}) {
  const c = config(input), next = structuredClone(layout);
  if (!transforms || typeof transforms !== 'object' || Array.isArray(transforms)) throw Error('Invalid footprint edits.');
  for (const [id, t] of Object.entries(transforms)) {
    const i = next.buildingDetails.findIndex(d => d.id === id);
    if (i < 0) throw Error('Edited building is no longer in this configuration.');
    if (!t || !Array.isArray(t.center) || t.center.length !== 2 ||
      ![...t.center,t.length,t.depth,t.degrees].every(Number.isFinite) ||
      t.center.some(v => Math.abs(v)>100000) || t.length<8 || t.depth<8 ||
      t.length>1000 || t.depth>1000 || Math.abs(t.degrees)>360)
      throw Error('Use finite dimensions from 8–1,000 ft and rotation from −360° to 360°.');
    const d = next.buildingDetails[i], a = t.degrees * Math.PI / 180;
    const center = rotate(t.center,-a), origin = [center[0]-t.length/2,center[1]-t.depth/2];
    next.buildings[i] = worldRing(rect(...origin,t.length,t.depth),a);
    Object.assign(d, {length:t.length,depth:t.depth,center:[...t.center],origin,degrees:t.degrees,
      corridor:null,handle:rotate([origin[0]+t.length,center[1]],a),
      netArea:t.length*t.depth*d.floors*c.efficiency});
  }
  for (let i=0;i<next.buildings.length;i++) {
    const b = next.buildings[i];
    if (!fits(b,next.envelope)) throw Error('Footprint must stay inside setbacks and outside reserved land.');
    const obstacles = [...next.buildings.slice(i+1),...next.parking,...next.roads,...(next.entry?[next.entry]:[])];
    if (obstacles.some(p => multiArea(clipping.intersection([[b]],[[p]]))>.01))
      throw Error('Footprint overlaps another building, parking or access road. Previous position retained.');
  }
  const footprint = next.buildings.reduce((sum,b)=>sum+area(b),0);
  next.gfa = next.buildings.reduce((sum,b,i)=>sum+area(b)*next.buildingDetails[i].floors,0);
  next.coverage = footprint/next.siteArea*100;
  if(next.coverage>c.maxCoverage+1e-6 || next.gfa>next.siteArea*c.maxFar+.01 ||
    footprint+next.pavedArea>next.siteArea*(1-c.openSpace/100)+.01)
    throw Error('Footprint exceeds coverage, FAR or minimum unbuilt/unpaved assumptions.');
  next.manualTransforms = structuredClone(transforms);
  return next;
}
export function editFootprint(layout,input,id,transform) {
  return applyFootprints(layout,input,{...layout.manualTransforms,[id]:transform});
}
