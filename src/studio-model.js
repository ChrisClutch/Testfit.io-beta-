import clipping from "polygon-clipping";
import { area, fits, inset, validBoundary } from "./engine.js";
import { rectangle, estimateStorm, STORM_DEFAULTS } from "./site-editing.js";
export { rectangle, STORM_DEFAULTS };
export const multiArea = (m) =>
  m.reduce(
    (s, p) => s + area(p[0]) - p.slice(1).reduce((a, r) => a + area(r), 0),
    0,
  );
const close = (r) =>
  JSON.stringify(r[0]) === JSON.stringify(r.at(-1)) ? r : [...r, r[0]];
const poly = (r) => [[close(r)]];
const union = (ms) => (ms.length ? clipping.union(...ms) : []);
const rot = (p, d) => {
  const a = (d * Math.PI) / 180;
  return [
    p[0] * Math.cos(a) - p[1] * Math.sin(a),
    p[0] * Math.sin(a) + p[1] * Math.cos(a),
  ].map((n) => Math.round(n * 1e6) / 1e6);
};
const rotateMulti = (m, d) =>
  m.map((p) => p.map((r) => r.map((q) => rot(q, d))));
export const bounds = (r) => {
  const x = r.map((p) => p[0]),
    y = r.map((p) => p[1]);
  return {
    x: Math.min(...x),
    y: Math.min(...y),
    w: Math.max(...x) - Math.min(...x),
    h: Math.max(...y) - Math.min(...y),
  };
};
export function capsule(cx, cy, w, h) {
  const r = w / 2,
    top = cy - h / 2 + r,
    bottom = cy + h / 2 - r,
    out = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i * Math.PI) / 16;
    out.push([cx + r * Math.cos(a), top + r * Math.sin(a)]);
  }
  for (let i = 0; i <= 16; i++) {
    const a = (i * Math.PI) / 16;
    out.push([cx + r * Math.cos(a), bottom + r * Math.sin(a)]);
  }
  return close(out);
}
const rect = (x, y, w, h) =>
  rectangle({
    center: [x + w / 2, y + h / 2],
    length: w,
    depth: h,
    degrees: 0,
  });
export function cottageBase() {
  const objects = [];
  let n = 0;
  const home = (x, y, d) =>
    objects.push({
      id: `home-${++n}`,
      kind: "home",
      label: `C${String(n).padStart(2, "0")}`,
      center: [x, y],
      length: 28,
      depth: 34,
      degrees: d,
      stories: 1,
      unitCount: 1,
    });
  for (let i = 0; i < 7; i++) {
    if (i !== 3) home(46, 70 + i * 44, -90);
    home(314, 70 + i * 44, 90);
  }
  for (let i = 0; i < 4; i++) {
    home(123 + i * 38, 25, 0);
    home(123 + i * 38, 429, 180);
  }
  objects.push({
    id: "green",
    kind: "landscape",
    label: "Central green",
    ring: capsule(180, 220, 108, 260),
  });
  const roadOuter = capsule(180, 220, 186, 340),
    roadInner = capsule(180, 220, 138, 292);
  const roads = [
    [roadOuter, roadInner],
    [rect(0, 208, 100, 24)],
    [rect(26, 350, 105, 24)],
    [rect(229, 350, 105, 24)],
  ];
  const paths = [[capsule(180, 220, 120, 272), capsule(180, 220, 108, 260)]];
  for (const o of objects.filter((o) => o.kind === "home")) {
    const [x, y] = o.center;
    if (x < 80) paths.push([rect(63, y - 3, 26, 6)]);
    else if (x > 280) paths.push([rect(271, y - 3, 26, 6)]);
    else if (y < 60) paths.push([rect(x - 3, 45, 6, 18)]);
    else paths.push([rect(x - 3, 388, 6, 21)]);
  }
  return {
    version: 1,
    name: "Cottage courtyard",
    source: "Illustrative 360 × 460 ft parcel — dimensions are assumptions",
    parcel: [
      [0, 0],
      [360, 0],
      [360, 460],
      [0, 460],
    ],
    objects,
    roads,
    paths,
    parking: [
      {
        id: "parking-west",
        ring: rect(8, 354, 72, 98),
        heading: 90,
        stallAngle: 90,
      },
      {
        id: "parking-east",
        ring: rect(280, 354, 72, 98),
        heading: 90,
        stallAngle: 90,
      },
    ],
    setback: 8,
    stallWidth: 9,
    stallDepth: 18,
    aisleWidth: 24,
    parkingRatio: 1.5,
    storm: { ...STORM_DEFAULTS },
    image: null,
  };
}
export function objectRing(o) {
  return o.ring || rectangle(o);
}
export function porchRing(o) {
  const angle = (o.degrees * Math.PI) / 180;
  return rectangle({
    center: [
      o.center[0] - Math.sin(angle) * (o.depth / 2 + 3),
      o.center[1] + Math.cos(angle) * (o.depth / 2 + 3),
    ],
    length: o.length * 0.55,
    depth: 6,
    degrees: o.degrees,
  });
}
export function footprint(o) {
  return o.kind === "home"
    ? clipping.union(poly(objectRing(o)), poly(porchRing(o)))
    : poly(objectRing(o));
}
function validateRing(r) {
  const p = r.slice();
  if (JSON.stringify(p[0]) === JSON.stringify(p.at(-1))) p.pop();
  if (p.length > 100 || !validBoundary(p))
    throw Error(
      "Use a simple outline with 3–100 corners and no crossing edges.",
    );
  return p;
}
export function validateProject(p) {
  if (p?.version !== 1)
    throw Error(
      "Use a Placement Studio project. Legacy projects remain available in the v0.5 workspace.",
    );
  if (typeof p.name !== "string" || p.name.length > 100)
    throw Error("Use a project name of at most 100 characters.");
  validateRing(p.parcel);
  if (area(p.parcel) > 435600 || area(p.parcel) < 400)
    throw Error(
      "This placement workspace supports parcels from 400 sq ft to 10 acres.",
    );
  if (
    ![p.objects, p.roads, p.paths, p.parking].every(Array.isArray) ||
    p.objects.length > 200 ||
    p.parking.length > 20 ||
    p.roads.length > 100 ||
    p.paths.length > 200
  )
    throw Error("Project is too large or malformed.");
  for (const key of [
    "setback",
    "stallWidth",
    "stallDepth",
    "aisleWidth",
    "parkingRatio",
  ])
    if (!Number.isFinite(p[key])) throw Error("Invalid numeric inputs.");
  if (
    p.setback < 0 ||
    p.setback > 100 ||
    p.stallWidth < 8 ||
    p.stallWidth > 12 ||
    p.stallDepth < 16 ||
    p.stallDepth > 24 ||
    p.aisleWidth < 20 ||
    p.aisleWidth > 40 ||
    p.parkingRatio < 0 ||
    p.parkingRatio > 5
  )
    throw Error("Parking dimensions or setback are outside supported ranges.");
  const ids = new Set();
  for (const o of p.objects) {
    if (
      !["home", "pond", "landscape", "drive"].includes(o.kind) ||
      typeof o.id !== "string" ||
      ids.has(o.id)
    )
      throw Error("Invalid object type or duplicate ID.");
    ids.add(o.id);
    if (
      o.kind === "home" &&
      (!Array.isArray(o.center) ||
        o.center.length !== 2 ||
        ![...o.center, o.length, o.depth, o.degrees].every(Number.isFinite) ||
        o.length < 4 ||
        o.depth < 4 ||
        o.length > 600 ||
        o.depth > 600 ||
        Math.abs(o.degrees) > 360)
    )
      throw Error("Invalid home dimensions or rotation.");
    validateRing(objectRing(o));
    if (
      o.kind === "home" &&
      (!Number.isInteger(o.stories) ||
        o.stories < 1 ||
        o.stories > 3 ||
        !Number.isInteger(o.unitCount) ||
        o.unitCount < 1 ||
        o.unitCount > 24)
    )
      throw Error("Invalid home count or stories.");
  }
  for (const m of [...p.roads, ...p.paths]) {
    if (!Array.isArray(m) || m.length > 10)
      throw Error("Invalid road or path.");
    m.forEach(validateRing);
  }
  for (const r of p.parking) {
    if (typeof r.id !== "string" || ids.has(r.id))
      throw Error("Duplicate or invalid parking ID.");
    ids.add(r.id);
    validateRing(r.ring);
    if (
      !Number.isFinite(r.heading) ||
      Math.abs(r.heading) > 360 ||
      ![45, 60, 90].includes(r.stallAngle)
    )
      throw Error("Invalid parking angle.");
  }
  estimateStorm(
    { siteArea: 0, buildings: [], parking: [], roads: [] },
    p.storm,
  );
  if (
    p.image &&
    (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(
      p.image.url,
    ) ||
      ![p.image.width, p.image.height, p.image.scale].every(
        (n) => Number.isFinite(n) && n > 0,
      ) ||
      p.image.width * p.image.height > 40000000)
  )
    throw Error("Invalid image reference.");
  return p;
}
export function moveObject(p, id, candidate) {
  const i = p.objects.findIndex((o) => o.id === id);
  if (i < 0) throw Error("Select an object.");
  const f = footprint(candidate),
    parcel = poly(p.parcel),
    env = candidate.kind === "home" ? inset(p.parcel, p.setback) : parcel;
  if (multiArea(clipping.difference(f, env)) > 0.05)
    throw Error("Keep the footprint and porch inside the parcel/setback.");
  const obstacles = p.objects
    .filter((o) => o.id !== id && o.kind !== "drive")
    .map(footprint);
  if (candidate.kind !== "drive")
    obstacles.push(
      ...p.roads.map((r) => [r]),
      ...p.objects.filter((o) => o.kind === "drive").map(footprint),
    );
  if (obstacles.some((m) => multiArea(clipping.intersection(f, m)) > 0.05))
    throw Error(
      "This overlaps a home, green, pond or drive. Move it into clear space.",
    );
  const next = structuredClone(p);
  next.objects[i] = candidate;
  return next;
}
export function clearPaths(p) {
  return { ...p, paths: [] };
}
// Parking envelopes are freeform polygons. Rows are generated throughout their usable area.
export function solveParking(p, region) {
  const envelope = inset(p.parcel, p.setback),
    obstacles = union([
      ...p.objects.filter((o) => o.kind !== "drive").map(footprint),
      ...p.paths.map((r) => [r]),
      ...p.parking
        .slice(
          0,
          Math.max(
            0,
            p.parking.findIndex((r) => r.id === region.id),
          ),
        )
        .map((r) => poly(r.ring)),
    ]);
  let available = clipping.intersection(poly(region.ring), envelope);
  if (obstacles.length) available = clipping.difference(available, obstacles);
  if (!available.length)
    return {
      stalls: [],
      aisles: [],
      available: [],
      warnings: ["No usable parking area."],
      degrees: region.heading,
    };
  const local = rotateMulti(available, -region.heading),
    b = bounds(local.flat(2)),
    roadSpace = union([
      ...p.roads.map((r) => [r]),
      ...p.objects.filter((o) => o.kind === "drive").map(footprint),
    ]);
  const angle = (region.stallAngle * Math.PI) / 180,
    w = p.stallWidth,
    d = p.stallDepth,
    rd = d * Math.sin(angle) + w * Math.cos(angle),
    pitch = w / Math.sin(angle),
    skew = d * Math.cos(angle),
    period = 2 * rd + p.aisleWidth;
  const stalls = [],
    aisles = [];
  let attempts = 0,
    truncated = false;
  for (let y = b.y + rd; y < b.y + b.h; y += period) {
    const lane = rect(b.x, y, b.w, p.aisleWidth),
      clipped = clipping.intersection(poly(lane), local);
    if (!clipped.length) continue;
    let laneStalls = 0;
    for (let x = b.x; x < b.x + b.w; x += pitch) {
      if (++attempts > 3000) {
        truncated = true;
        break;
      }
      for (const side of [-1, 1]) {
        const ry = y - rd;
        const base = [
          [x, ry + w * Math.cos(angle)],
          [x + w * Math.sin(angle), ry],
          [x + w * Math.sin(angle) + skew, ry + d * Math.sin(angle)],
          [x + skew, ry + rd],
          [x, ry + w * Math.cos(angle)],
        ];
        const r =
          side < 0
            ? base
            : base.map(([sx, sy]) => [sx, 2 * y + p.aisleWidth - sy]);
        const frontage = rect(x, y, skew + w * Math.sin(angle), p.aisleWidth);
        // Near-coincident clipping edges can be numerically ambiguous; never count an unverified stall.
        try {
          if (!fits(r, local) || !fits(frontage, local)) continue;
        } catch {
          continue;
        }
        const world = r.map((q) => rot(q, region.heading));
        if (
          roadSpace.length &&
          multiArea(clipping.intersection(poly(world), roadSpace)) > 0.01
        )
          continue;
        stalls.push(world);
        laneStalls++;
      }
    }
    if (laneStalls) aisles.push(...rotateMulti(clipped, region.heading));
    if (truncated) break;
  }
  const warnings = [];
  if (truncated)
    warnings.push(
      "Parking sampling limit reached; split this area into smaller regions.",
    );
  return { stalls, aisles, available, warnings, degrees: region.heading };
}
export function bestParking(p, region) {
  const angles = [
    ...new Set([
      region.heading,
      0,
      90,
      ...p.parcel.map((q, i) => {
        const r = p.parcel[(i + 1) % p.parcel.length];
        return Math.round(
          (Math.atan2(r[1] - q[1], r[0] - q[0]) * 180) / Math.PI,
        );
      }),
    ]),
  ];
  let best = null;
  for (const heading of angles) {
    const candidate = solveParking(p, { ...region, heading });
    if (!best || candidate.stalls.length > best.result.stalls.length)
      best = { region: { ...region, heading }, result: candidate };
  }
  return { ...best, tested: angles.length };
}
export function planMetrics(p, results) {
  const homes = p.objects.filter((o) => o.kind === "home"),
    pond = p.objects.filter((o) => o.kind === "pond"),
    green = p.objects.filter((o) => o.kind === "landscape"),
    drives = p.objects.filter((o) => o.kind === "drive");
  const stalls = results.flatMap((r) => r.stalls),
    aisles = results.flatMap((r) => r.aisles),
    paved = union([
      ...p.roads.map((r) => [r]),
      ...p.paths.map((r) => [r]),
      ...drives.map(footprint),
      ...aisles.map((r) => [r]),
      ...stalls.map(poly),
    ]),
    roof = union(homes.map(footprint)),
    impervious = union([paved, roof].filter((m) => m.length));
  const onSite = (m) =>
    m.length ? clipping.intersection(m, poly(p.parcel)) : [];
  const areaSite = area(p.parcel),
    pondArea = multiArea(onSite(union(pond.map(footprint)))),
    greenArea = multiArea(onSite(union(green.map(footprint)))),
    units = homes.reduce((s, o) => s + o.unitCount, 0),
    required = Math.ceil(units * p.parkingRatio);
  const warnings = results.flatMap((r) => r.warnings);
  if (stalls.length < required)
    warnings.push(
      `${required - stalls.length} more parking spaces needed for the assumed ${p.parkingRatio} spaces per home.`,
    );
  // Positive-area contact propagation. Touching edges alone require manual verification.
  const driveSpace = union([
      ...p.roads.map((r) => [r]),
      ...drives.map(footprint),
    ]),
    connected = new Set();
  let more = true;
  while (more) {
    more = false;
    aisles.forEach((lane, i) => {
      if (connected.has(i)) return;
      const targets = [
        driveSpace,
        ...[...connected].map((j) => [aisles[j]]),
      ].filter((m) => m.length);
      if (
        targets.some((m) => multiArea(clipping.intersection([lane], m)) > 0.1)
      ) {
        connected.add(i);
        more = true;
      }
    });
  }
  if (connected.size < aisles.length)
    warnings.push(
      `${aisles.length - connected.size} aisle section(s) need a verified drive connection. Draw a connecting drive; turning paths are not checked.`,
    );
  for (const o of p.objects) {
    try {
      moveObject(p, o.id, o);
    } catch (e) {
      warnings.push(`${o.label || o.kind}: ${e.message}`);
    }
  }
  const rain = p.storm.rain / 12,
    imperviousArea = multiArea(onSite(impervious)),
    pervious = Math.max(0, areaSite - imperviousArea - pondArea),
    runoff =
      rain *
      (imperviousArea * p.storm.impervious +
        pervious * p.storm.pervious +
        pondArea),
    target = runoff * p.storm.allowance,
    capacity = pondArea * p.storm.depth * p.storm.utilization;
  return {
    units,
    stalls: stalls.length,
    required,
    gross: homes.reduce((s, o) => s + area(objectRing(o)) * o.stories, 0),
    siteArea: areaSite,
    greenArea,
    pondArea,
    pavedArea: multiArea(onSite(paved)),
    imperviousArea,
    runoff,
    target,
    capacity,
    warnings,
  };
}
