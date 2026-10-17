import { test } from "node:test";
import assert from "node:assert/strict";
import clipping from "polygon-clipping";
import {
  TYPES,
  config,
  area,
  generate,
  reconfigure,
  planningLand,
  fits,
} from "../src/engine.js";
import { importParcelGeoJSON } from "../src/site-input.js";
const site = [
  [0, 0],
  [600, 0],
  [600, 500],
  [0, 500],
];
const intersection = (a, b) =>
  clipping
    .intersection([[a]], [[b]])
    .reduce(
      (s, p) => s + area(p[0]) - p.slice(1).reduce((x, r) => x + area(r), 0),
      0,
    );
test("all explicit residential presets use exact homes and net square footage", () => {
  for (const [type, t] of Object.entries(TYPES).filter(
    ([, t]) => t.family === "discrete",
  )) {
    const l = generate(site, { type, unitSize: 1000, maxDensity: 80 })[0];
    assert.ok(l.buildings.length > 0, type);
    assert.equal(l.units, l.buildings.length * t.homes, type);
    assert.ok(Math.abs(l.gfa * t.efficiency - l.units * 1000) < 0.01, type);
    assert.equal(l.stalls, l.stallPolygons.length);
    assert.ok(l.stalls >= Math.ceil(l.units * 1.5));
    const occupied = [
      ...l.buildings,
      ...l.parking,
      ...l.roads,
      ...(l.entry ? [l.entry] : []),
    ];
    for (const r of occupied) assert.ok(fits(r, [[[...site, site[0]]]]));
    for (let i = 0; i < occupied.length; i++)
      for (let j = i + 1; j < occupied.length; j++)
        assert.ok(
          intersection(occupied[i], occupied[j]) < 0.01,
          `${type} overlap`,
        );
  }
});
test("two-story cottage uses half the ground footprint for the same net area", () => {
  const a = generate(site, { type: "cottage1", unitSize: 1200 })[0],
    b = generate(site, { type: "cottage2", unitSize: 1200 })[0];
  assert.ok(Math.abs(area(a.buildings[0]) / area(b.buildings[0]) - 2) < 0.0001);
  assert.equal(a.buildingDetails[0].floors, 1);
  assert.equal(b.buildingDetails[0].floors, 2);
});
test("per-building target and per-home target give identical plex geometry", () => {
  const a = generate(site, { type: "plex8", unitSize: 800 })[0],
    b = generate(site, {
      type: "plex8",
      unitSize: 6400,
      areaBasis: "building",
    })[0];
  assert.deepEqual(a.buildings, b.buildings);
  assert.equal(a.units, b.units);
  assert.throws(() =>
    config({ type: "plex8", unitSize: 500, areaBasis: "building" }),
  );
});
test("townhome count and story presets remain explicit", () => {
  for (const floors of [1, 2, 3]) {
    const l = generate(site, {
      type: `townhome${floors}`,
      homesPerBuilding: 4,
      unitSize: 1200,
    })[0];
    assert.ok(l.units > 0);
    assert.ok(
      l.buildingDetails.every((d) => d.units === 4 && d.floors === floors),
    );
  }
});
test("whole-building growth changes cottage count and parking, and removal persists", () => {
  const full = generate(site, { type: "cottage1" })[0],
    small = reconfigure(site, { type: "cottage1", growth: 40 }, full.model);
  assert.ok(full.units > small.units);
  assert.ok(full.stalls > small.stalls);
  const id = full.buildingDetails[0].id,
    removed = reconfigure(site, { type: "cottage1" }, full.model, { [id]: 0 });
  assert.ok(!removed.buildingDetails.some((d) => d.id === id));
  assert.ok(removed.stalls >= Math.ceil(removed.units * 1.5));
});
test("auto green and detention reservations meet area targets and exclude all development", () => {
  for (const type of ["multifamily", "cottage2", "townhome2", "plex12"]) {
    const c = { type, greenSpaceSqft: 16000, detentionSqft: 12000 };
    for (const l of generate(site, c)) {
      assert.ok(Math.abs(l.greenArea - 16000) < 0.01);
      assert.ok(Math.abs(l.detentionArea - 12000) < 0.01);
      for (const z of l.reservedAreas)
        for (const r of [
          ...l.buildings,
          ...l.parking,
          ...l.roads,
          ...(l.entry ? [l.entry] : []),
        ])
          assert.ok(intersection(z.ring, r) < 0.01);
    }
  }
});
test("manual reservation areas count toward target without double-counting", () => {
  const ring = [
      [420, 350],
      [580, 350],
      [580, 480],
      [420, 480],
    ],
    c = { reservedAreas: [{ kind: "green", ring }], greenSpaceSqft: 20800 };
  const land = planningLand(site, c);
  assert.equal(land.reservedAreas.length, 1);
  assert.equal(land.greenArea, 20800);
  assert.throws(
    () =>
      planningLand(site, {
        reservedAreas: [
          { kind: "green", ring },
          { kind: "detention", ring },
        ],
      }),
    /overlap/,
  );
  assert.throws(
    () => planningLand(site, { greenSpaceSqft: 400000 }),
    /Could not reserve/,
  );
  assert.throws(
    () =>
      planningLand(site, {
        reservedAreas: [
          {
            kind: "green",
            ring: [
              [590, 490],
              [650, 490],
              [650, 550],
              [590, 550],
            ],
          },
        ],
      }),
    /inside/,
  );
});
test("WGS84 parcel import is explicit, bounded, and rejects holes or ambiguous collections", () => {
  const polygon = {
    type: "Polygon",
    coordinates: [
      [
        [-123, 45],
        [-122.999, 45],
        [-122.999, 44.999],
        [-123, 44.999],
        [-123, 45],
      ],
    ],
  };
  const p = importParcelGeoJSON(polygon);
  assert.ok(area(p.site) > 90000 && area(p.site) < 100000);
  assert.match(p.provenance, /approximate/);
  assert.throws(() =>
    importParcelGeoJSON({
      type: "FeatureCollection",
      features: [{ geometry: polygon }, { geometry: polygon }],
    }),
  );
  assert.throws(() =>
    importParcelGeoJSON({
      ...polygon,
      coordinates: [...polygon.coordinates, polygon.coordinates[0]],
    }),
  );
  assert.throws(() =>
    importParcelGeoJSON({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [500, 0],
          [500, 400],
          [0, 400],
          [0, 0],
        ],
      ],
    }),
  );
});
