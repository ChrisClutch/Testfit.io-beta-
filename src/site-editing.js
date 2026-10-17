import clipping from "polygon-clipping";
import { area, config, fits, planningLand, applyFootprints } from "./engine.js";
const rad = (d) => (d * Math.PI) / 180;
export const ringCenter = (r) =>
  r.slice(0, 4).reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
export function rectangle(t) {
  if (
    !t ||
    !Array.isArray(t.center) ||
    t.center.length !== 2 ||
    ![...t.center, t.length, t.depth, t.degrees].every(Number.isFinite) ||
    t.center.some((v) => Math.abs(v) > 100000) ||
    t.length < 1 ||
    t.depth < 1 ||
    t.length > 3000 ||
    t.depth > 3000 ||
    Math.abs(t.degrees) > 360
  )
    throw Error(
      "Use finite dimensions from 1–3,000 ft and rotation within ±360°.",
    );
  const a = rad(t.degrees),
    cs = Math.cos(a),
    sn = Math.sin(a);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ].map(([x, y]) => [
    t.center[0] + ((x * t.length) / 2) * cs - ((y * t.depth) / 2) * sn,
    t.center[1] + ((x * t.length) / 2) * sn + ((y * t.depth) / 2) * cs,
  ]);
}
export function rectInfo(r) {
  return {
    center: ringCenter(r),
    length: Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]),
    depth: Math.hypot(r[2][0] - r[1][0], r[2][1] - r[1][1]),
    degrees: (Math.atan2(r[1][1] - r[0][1], r[1][0] - r[0][0]) * 180) / Math.PI,
  };
}
const mArea = (m) =>
  m.reduce(
    (s, p) => s + area(p[0]) - p.slice(1).reduce((v, r) => v + area(r), 0),
    0,
  );
const overlap = (a, b) => mArea(clipping.intersection([[a]], [[b]])) > 0.01;
function unionArea(rings) {
  return rings.length ? mArea(clipping.union(...rings.map((r) => [[r]]))) : 0;
}
// A module contains two stall rows and a central drive aisle. Angle is relative to the aisle.
export function parkingModule(t, input) {
  const c = config(input),
    a = rad(t.stallAngle ?? 90),
    sin = Math.sin(a),
    cos = Math.cos(a);
  if (![45, 60, 90].includes(t.stallAngle ?? 90))
    throw Error("Choose 45°, 60° or 90° stalls.");
  const rowDepth = c.stallDepth * sin + c.stallWidth * cos,
    pitch = c.stallWidth / sin,
    skew = c.stallDepth * cos;
  if (t.depth < 2 * rowDepth + c.aisleWidth - 0.001)
    throw Error(
      `Lot depth needs at least ${(2 * rowDepth + c.aisleWidth).toFixed(1)} ft for these stalls and aisle.`,
    );
  const pad = rectangle(t),
    slots = Math.floor(
      (t.length - skew - c.stallWidth * sin) / pitch + 1 + 1e-8,
    );
  if (slots < 1 || slots > 400)
    throw Error("Lot length must fit 1–400 stalls per row.");
  const rot = rad(t.degrees),
    project = ([x, y]) => [
      t.center[0] +
        (x - t.length / 2) * Math.cos(rot) -
        (y - t.depth / 2) * Math.sin(rot),
      t.center[1] +
        (x - t.length / 2) * Math.sin(rot) +
        (y - t.depth / 2) * Math.cos(rot),
    ];
  const stalls = [];
  for (let j = 0; j < slots; j++) {
    const x = j * pitch;
    const r = [
      [x, c.stallWidth * cos],
      [x + c.stallWidth * sin, 0],
      [x + c.stallWidth * sin + skew, c.stallDepth * sin],
      [x + skew, rowDepth],
      [x, c.stallWidth * cos],
    ];
    stalls.push(
      r.map(project),
      r.map(([sx, sy]) => project([sx, t.depth - sy])),
    );
  }
  const aisle = [
    [0, rowDepth],
    [t.length, rowDepth],
    [t.length, t.depth - rowDepth],
    [0, t.depth - rowDepth],
    [0, rowDepth],
  ].map(project);
  return {
    pad,
    stalls,
    aisle,
    detail: {
      ...t,
      stalls: stalls.length,
      center: t.center,
      stallAngle: t.stallAngle ?? 90,
    },
  };
}
function groups(layout) {
  let offset = 0;
  return layout.parkingDetails.map((d) => {
    const r = layout.stallPolygons.slice(offset, offset + d.stalls);
    offset += d.stalls;
    return r;
  });
}
export function applySiteEdits(base, site, input, design = {}) {
  const c = config(input),
    next = structuredClone(base);
  const zones = design.zones ?? base.reservedAreas ?? [];
  const land = planningLand(site, {
    ...c,
    reservedAreas: zones.map((z) => ({
      kind: z.kind,
      ring: z.ring.slice(0, -1),
    })),
    greenSpaceSqft: 0,
    detentionSqft: 0,
  });
  Object.assign(next, land);
  next.buildableArea = mArea(land.envelope);
  const stallGroups = groups(base);
  for (const [key, t] of Object.entries(design.parking || {})) {
    const i = Number(key);
    if (!Number.isInteger(i) || i < 0 || i >= next.parking.length)
      throw Error("Unknown parking lot.");
    const m = parkingModule(t, c);
    next.parking[i] = m.pad;
    next.aisles[i] = m.aisle;
    next.parkingDetails[i] = m.detail;
    stallGroups[i] = m.stalls;
  }
  for (const [key, t] of Object.entries(design.stalls || {})) {
    const [lot, index] = key.split(":").map(Number);
    if (
      !Number.isInteger(lot) ||
      !Number.isInteger(index) ||
      !stallGroups[lot]?.[index]
    )
      throw Error(
        "Individual stall no longer exists. Re-edit its parking lot.",
      );
    if (
      Math.abs(t.length - c.stallWidth) > 0.01 ||
      Math.abs(t.depth - c.stallDepth) > 0.01
    )
      throw Error("Individual stalls retain the configured stall dimensions.");
    stallGroups[lot][index] = rectangle(t);
  }
  for (let lot = 0; lot < stallGroups.length; lot++) {
    if (!Object.keys(design.stalls || {}).some((k) => k.startsWith(lot + ":")))
      continue;
    for (let i = 0; i < stallGroups[lot].length; i++) {
      const r = stallGroups[lot][i];
      if (!fits(r, [[next.parking[lot]]]) || overlap(r, next.aisles[lot]))
        throw Error(
          "Stalls must stay on their parking pad and outside its drive aisle.",
        );
      if (stallGroups[lot].slice(i + 1).some((q) => overlap(r, q)))
        throw Error("Individual parking stalls overlap.");
    }
  }
  next.stallPolygons = stallGroups.flat();
  next.stalls = next.stallPolygons.length;
  for (let i = 0; i < next.parking.length; i++) {
    const p = next.parking[i];
    if (!fits(p, land.envelope))
      throw Error(
        "Parking must stay inside setbacks and outside pond/landscape areas.",
      );
    if (next.parking.slice(i + 1).some((q) => overlap(p, q)))
      throw Error("Parking lots overlap.");
    if (
      stallGroups[i].some((s) =>
        [...next.roads, ...(next.entry ? [next.entry] : [])].some((r) =>
          overlap(s, r),
        ),
      )
    )
      throw Error(
        "Parking stalls overlap a road. Keep the aisle facing access.",
      );
  }
  const roads = [...next.roads, ...(next.entry ? [next.entry] : [])];
  if (roads.some((r) => !fits(r, land.available)))
    throw Error("Pond or landscape overlaps an access road.");
  next.pavedArea = unionArea([...next.parking, ...roads]);
  const result = applyFootprints(
    next,
    c,
    design.buildings ?? base.manualTransforms ?? {},
  );
  result.design = structuredClone(design);
  result.warnings = [];
  const required =
    c.type === "fuel" ? 12 : Math.ceil(result.units * c.parkingRatio);
  if (result.stalls < required)
    result.warnings.push(
      `Parking shortfall: ${required - result.stalls} stalls (${result.stalls} drawn / ${required} assumed required).`,
    );
  // Contact is only geometric; an aisle merely touching another drive is not a turning-path proof.
  const contact = (a, b) => {
    if (overlap(a, b)) return true;
    const distance = (p, q, r) => {
      const dx = r[0] - q[0],
        dy = r[1] - q[1],
        v = dx * dx + dy * dy;
      const t = v
        ? Math.max(
            0,
            Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dy) / v),
          )
        : 0;
      return Math.hypot(p[0] - q[0] - t * dx, p[1] - q[1] - t * dy);
    };
    return (
      a.some((p) => b.slice(1).some((q, i) => distance(p, b[i], q) < 0.1)) ||
      b.some((p) => a.slice(1).some((q, i) => distance(p, a[i], q) < 0.1))
    );
  };
  const linked = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    result.aisles.forEach((a, i) => {
      if (
        !linked.has(i) &&
        [...roads, ...[...linked].map((j) => result.aisles[j])].some((r) =>
          contact(a, r),
        )
      ) {
        linked.add(i);
        changed = true;
      }
    });
  }
  const missing = result.aisles.length - linked.size;
  if (missing)
    result.warnings.push(
      `${missing} parking aisle(s) have no geometric connection to the access road. Move them to access before treating this as feasible.`,
    );
  if (result.greenArea + 1 < c.greenSpaceSqft)
    result.warnings.push("Landscape area is below the requested target.");
  if (result.detentionArea + 1 < c.detentionSqft)
    result.warnings.push("Detention area is below the requested target.");
  return result;
}
export const STORM_DEFAULTS = {
  rain: 2,
  impervious: 0.95,
  pervious: 0.2,
  depth: 3,
  utilization: 0.7,
  allowance: 1.2,
};
export function estimateStorm(layout, assumptions = {}) {
  const a = { ...STORM_DEFAULTS, ...assumptions };
  if (
    !Object.values(a).every(Number.isFinite) ||
    a.rain <= 0 ||
    a.rain > 50 ||
    a.impervious < 0 ||
    a.impervious > 1 ||
    a.pervious < 0 ||
    a.pervious > 1 ||
    a.depth <= 0 ||
    a.depth > 20 ||
    a.utilization <= 0 ||
    a.utilization > 1 ||
    a.allowance < 1 ||
    a.allowance > 3
  )
    throw Error("Invalid rainfall, runoff fraction or storage assumptions.");
  const impervious = unionArea([
    ...layout.buildings,
    ...layout.parking,
    ...layout.roads,
    ...(layout.entry ? [layout.entry] : []),
  ]);
  const pond = layout.detentionArea || 0,
    pervious = Math.max(0, layout.siteArea - impervious - pond);
  const runoff =
    (a.rain / 12) * (impervious * a.impervious + pervious * a.pervious + pond);
  const target = runoff * a.allowance,
    capacity = pond * a.depth * a.utilization;
  const effective = a.depth * a.utilization - (a.rain / 12) * a.allowance;
  const suggestedArea =
    effective > 0
      ? Math.max(
          0,
          ((a.rain / 12) *
            (impervious * a.impervious +
              (layout.siteArea - impervious) * a.pervious) *
            a.allowance) /
            (a.depth * a.utilization -
              (a.rain / 12) * a.allowance * (1 - a.pervious)),
        )
      : null;
  return {
    impervious,
    pervious,
    runoff,
    target,
    capacity,
    deficit: Math.max(0, target - capacity),
    suggestedArea,
  };
}
// Bounded, deterministic search. Existing buildings and other lots stay locked.
export function fitParking(base, site, input, design, index, t) {
  let best = null,
    score = -Infinity,
    tried = 0;
  const xs = site.map((p) => p[0]),
    ys = site.map((p) => p[1]);
  const angles = [
    ...new Set([
      t.degrees,
      ...site.map((p, i) => {
        const q = site[(i + 1) % site.length];
        return (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
      }),
    ]),
  ];
  for (const degrees of angles)
    for (const scale of [1, 0.75, 0.5])
      for (let row = 0; row <= 4; row++)
        for (let col = 0; col <= 4; col++) {
          const center =
            row === 0 && col === 0
              ? t.center
              : [
                  Math.min(...xs) +
                    ((Math.max(...xs) - Math.min(...xs)) * col) / 4,
                  Math.min(...ys) +
                    ((Math.max(...ys) - Math.min(...ys)) * row) / 4,
                ];
          tried++;
          try {
            const candidate = applySiteEdits(base, site, input, {
              ...design,
              stalls: Object.fromEntries(
                Object.entries(design.stalls || {}).filter(
                  ([k]) => !k.startsWith(index + ":"),
                ),
              ),
              parking: {
                ...design.parking,
                [index]: {
                  ...t,
                  center,
                  degrees,
                  length: Math.max(9, t.length * scale),
                },
              },
            });
            const disconnected = candidate.warnings.some((w) =>
              w.includes("connection"),
            );
            const value =
              (disconnected ? -100000 : 0) +
              candidate.stalls * 100 -
              Math.hypot(center[0] - t.center[0], center[1] - t.center[1]);
            if (value > score) {
              best = candidate;
              score = value;
            }
          } catch {}
        }
  if (!best)
    throw Error(
      `No valid placement found among ${tried} sampled candidates. Try a smaller lot or move nearby buildings.`,
    );
  return { layout: best, tried };
}
