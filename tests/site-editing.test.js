import test from "node:test";
import assert from "node:assert/strict";
import clipping from "polygon-clipping";
import { area, generate, fits } from "../src/engine.js";
import {
  rectangle,
  rectInfo,
  parkingModule,
  applySiteEdits,
  estimateStorm,
  fitParking,
} from "../src/site-editing.js";
const site = [
    [0, 0],
    [500, 0],
    [500, 400],
    [0, 400],
  ],
  input = { type: "fuel" },
  base = generate(site, input)[0];
const overlap = (a, b) =>
  clipping.intersection([[a]], [[b]]).reduce((s, p) => s + area(p[0]), 0);
test("rotated 45/60/90 parking has real nonoverlapping stalls inside its pad", () => {
  for (const stallAngle of [45, 60, 90]) {
    const m = parkingModule(
      { center: [250, 200], length: 100, depth: 90, degrees: 27, stallAngle },
      input,
    );
    assert.ok(m.stalls.length > 10);
    for (let i = 0; i < m.stalls.length; i++) {
      assert.ok(fits(m.stalls[i], [[m.pad]]));
      assert.ok(Math.abs(area(m.stalls[i]) - 162) < 1e-6);
      assert.ok(overlap(m.stalls[i], m.aisle) < 0.001);
      for (let j = i + 1; j < m.stalls.length; j++)
        assert.ok(overlap(m.stalls[i], m.stalls[j]) < 0.001);
    }
  }
  assert.throws(
    () =>
      parkingModule(
        { center: [0, 0], length: 100, depth: 20, degrees: 0, stallAngle: 60 },
        input,
      ),
    /depth/,
  );
});
test("parking size changes stall count, paving and finance input; invalid edits are atomic", () => {
  const t = rectInfo(base.parking[0]);
  const next = applySiteEdits(base, site, input, {
    parking: { 0: { ...t, length: t.length - 9, stallAngle: 90 } },
  });
  assert.ok(next.stalls < base.stalls);
  assert.ok(next.pavedArea < base.pavedArea);
  assert.ok(next.warnings.some((w) => w.includes("shortfall")));
  assert.throws(
    () =>
      applySiteEdits(base, site, input, {
        parking: { 0: { ...t, center: [-100, -100], stallAngle: 90 } },
      }),
    /inside setbacks/,
  );
  assert.equal(base.stalls, 12);
  const restored = applySiteEdits(
    base,
    site,
    input,
    JSON.parse(JSON.stringify(next.design)),
  );
  assert.deepEqual(restored.parking, next.parking);
});
test("pond and landscape move/resize while excluding buildings and parking", () => {
  const zones = [
    {
      kind: "detention",
      ring: rectangle({
        center: [50, 350],
        length: 40,
        depth: 40,
        degrees: 10,
      }),
    },
    {
      kind: "green",
      ring: rectangle({
        center: [150, 350],
        length: 35,
        depth: 30,
        degrees: 0,
      }),
    },
  ];
  const next = applySiteEdits(base, site, input, { zones });
  assert.ok(Math.abs(next.detentionArea - 1600) < 0.001);
  assert.equal(next.greenArea, 1050);
  assert.deepEqual(next.buildings, base.buildings);
  assert.throws(
    () =>
      applySiteEdits(base, site, input, {
        zones: [{ kind: "detention", ring: base.buildings[0] }],
      }),
    /Footprint/,
  );
  assert.throws(
    () => applySiteEdits(base, site, input, { zones: [zones[0], zones[0]] }),
    /overlap/,
  );
});
test("storm estimate is a volume balance with direct rainfall on pond, no outlet credit", () => {
  const l = {
    siteArea: 10000,
    buildings: [
      rectangle({ center: [50, 50], length: 50, depth: 40, degrees: 0 }),
    ],
    parking: [],
    roads: [],
    entry: null,
    detentionArea: 1000,
  };
  const s = estimateStorm(l, {
    rain: 1.2,
    impervious: 1,
    pervious: 0.2,
    depth: 2,
    utilization: 0.5,
    allowance: 1.2,
  });
  assert.equal(s.impervious, 2000);
  assert.equal(s.pervious, 7000);
  assert.ok(Math.abs(s.runoff - 440) < 1e-8);
  assert.ok(Math.abs(s.target - 528) < 1e-8);
  assert.equal(s.capacity, 1000);
  assert.equal(s.deficit, 0);
  assert.throws(() => estimateStorm(l, { depth: 0 }), /Invalid/);
});
test("parking search is deterministic and returns a constraint-checked sampled result", () => {
  const t = { ...rectInfo(base.parking[0]), stallAngle: 90 };
  const a = fitParking(base, site, input, {}, 0, t),
    b = fitParking(base, site, input, {}, 0, t);
  assert.deepEqual(a.layout.parking, b.layout.parking);
  assert.ok(a.tried > 10);
  assert.ok(fits(a.layout.parking[0], a.layout.envelope));
});
test("individual stall movement persists and rejects aisle/other-stall overlaps", () => {
  const m = parkingModule(
    { center: [250, 250], length: 100, depth: 90, degrees: 0, stallAngle: 90 },
    input,
  );
  const sample = {
    ...base,
    buildings: [],
    buildingDetails: [],
    parking: [m.pad],
    parkingDetails: [m.detail],
    aisles: [m.aisle],
    stallPolygons: m.stalls,
    roads: [],
    entry: null,
    units: 0,
    gfa: 0,
    manualTransforms: {},
  };
  const original = rectInfo(m.stalls[20]),
    t = { ...original, center: [original.center[0] + 0.5, original.center[1]] };
  const edited = applySiteEdits(sample, site, input, { stalls: { "0:20": t } });
  assert.ok(
    Math.abs(rectInfo(edited.stallPolygons[20]).center[0] - t.center[0]) < 1e-6,
  );
  assert.deepEqual(
    applySiteEdits(
      sample,
      site,
      input,
      JSON.parse(JSON.stringify(edited.design)),
    ).stallPolygons,
    edited.stallPolygons,
  );
  assert.throws(
    () =>
      applySiteEdits(sample, site, input, {
        stalls: { "0:20": { ...t, center: rectInfo(m.aisle).center } },
      }),
    /drive aisle/,
  );
  assert.throws(
    () =>
      applySiteEdits(sample, site, input, {
        stalls: { "0:20": { ...t, center: rectInfo(m.stalls[18]).center } },
      }),
    /overlap/,
  );
  assert.throws(
    () =>
      applySiteEdits(sample, site, input, {
        stalls: { "0:20": { ...t, length: 3 } },
      }),
    /dimensions/,
  );
});
