import test from "node:test";
import assert from "node:assert/strict";
import clipping from "polygon-clipping";
import {
  cottageBase,
  validateProject,
  solveParking,
  bestParking,
  moveObject,
  planMetrics,
  rectangle,
  multiArea,
  footprint,
} from "../src/studio-model.js";
import { area, fits, inset } from "../src/engine.js";
const empty = () => ({
  ...cottageBase(),
  objects: [],
  paths: [],
  roads: [],
  parking: [],
  setback: 0,
});
const poly = (r) => [[r]];
test("courtyard starter has individual homes without placement conflicts and honest parking deficit", () => {
  const p = validateProject(cottageBase());
  assert.equal(p.objects.filter((o) => o.kind === "home").length, 21);
  for (const o of p.objects) assert.doesNotThrow(() => moveObject(p, o.id, o));
  const m = planMetrics(
    p,
    p.parking.map((r) => solveParking(p, r)),
  );
  assert.equal(m.units, 21);
  assert.equal(m.stalls, 31);
  assert.equal(m.required, 32);
  assert.ok(m.warnings.some((w) => w.includes("1 more parking")));
  assert.ok(!m.warnings.some((w) => w.includes("aisle section")));
});
test("parking fills concave area while respecting obstacles, road space and full-size stall geometry at each angle", () => {
  const p = empty();
  p.parcel = [
    [0, 0],
    [330, 0],
    [330, 150],
    [220, 150],
    [220, 320],
    [0, 320],
  ];
  const home = {
    id: "home",
    kind: "home",
    center: [80, 80],
    length: 35,
    depth: 50,
    degrees: 25,
    stories: 2,
    unitCount: 1,
  };
  const pond = {
    id: "pond",
    kind: "pond",
    ring: rectangle({ center: [100, 240], length: 60, depth: 50, degrees: 0 }),
  };
  p.objects = [home, pond];
  p.roads = [
    [rectangle({ center: [165, 150], length: 330, depth: 24, degrees: 0 })],
  ];
  for (const stallAngle of [45, 60, 90]) {
    const r = { id: "all", ring: p.parcel, heading: 0, stallAngle };
    p.parking = [r];
    const out = solveParking(p, r);
    assert.ok(out.stalls.length > 40);
    assert.ok(out.stalls.some((r) => r.some(([x, y]) => x > 220 && y < 150)));
    assert.ok(out.stalls.some((r) => r.some(([x, y]) => y > 150 && x < 220)));
    for (let i = 0; i < out.stalls.length; i++) {
      const s = out.stalls[i];
      assert.ok(fits(s, inset(p.parcel, 0)));
      assert.ok(Math.abs(area(s) - 162) < 0.001);
      for (const o of p.objects)
        assert.ok(
          multiArea(clipping.intersection(poly(s), footprint(o))) < 0.01,
        );
      assert.ok(multiArea(clipping.intersection(poly(s), [p.roads[0]])) < 0.01);
      for (let j = 0; j < i; j++)
        assert.ok(
          multiArea(clipping.intersection(poly(s), poly(out.stalls[j]))) < 0.01,
        );
    }
  }
});
test("overlapping parking envelopes never double count a space", () => {
  const p = empty();
  const r = { id: "one", ring: p.parcel, heading: 0, stallAngle: 90 };
  p.parking = [r, { ...r, id: "two", heading: 45 }];
  assert.ok(solveParking(p, r).stalls.length > 0);
  assert.equal(solveParking(p, p.parking[1]).stalls.length, 0);
});
test("sampled edge orientations are deterministic and at least as productive as starting angle", () => {
  const p = empty(),
    r = { id: "one", ring: p.parcel, heading: 35, stallAngle: 60 };
  p.parking = [r];
  const initial = solveParking(p, r),
    best = bestParking(p, r);
  assert.ok(best.result.stalls.length >= initial.stalls.length);
  assert.deepEqual(best, bestParking(p, r));
});
test("moving and rotating homes rejects overlap and refits parking; pond volume responds to depth", () => {
  const p = empty(),
    home = {
      id: "a",
      kind: "home",
      center: [100, 100],
      length: 28,
      depth: 34,
      degrees: 0,
      stories: 1,
      unitCount: 1,
    };
  p.objects = [home];
  p.parking = [{ id: "all", ring: p.parcel, heading: 0, stallAngle: 90 }];
  const first = solveParking(p, p.parking[0]);
  const moved = moveObject(p, "a", {
    ...home,
    center: [220, 220],
    degrees: 45,
  });
  assert.notDeepEqual(
    solveParking(moved, moved.parking[0]).stalls,
    first.stalls,
  );
  assert.throws(() => moveObject(p, "a", { ...home, center: [0, 0] }));
  p.objects.push({ ...home, id: "b", center: [200, 100] });
  assert.throws(() => moveObject(p, "a", { ...home, center: [200, 100] }));
  p.objects.push({
    id: "pond",
    kind: "pond",
    ring: rectangle({ center: [250, 300], length: 50, depth: 50, degrees: 0 }),
  });
  const a = planMetrics(
    p,
    p.parking.map((r) => solveParking(p, r)),
  );
  p.storm.depth *= 2;
  const b = planMetrics(
    p,
    p.parking.map((r) => solveParking(p, r)),
  );
  assert.equal(b.capacity, a.capacity * 2);
  assert.equal(b.target, a.target);
});
test("invalid imports and crossing boundaries are rejected", () => {
  const p = empty();
  p.parcel = [
    [0, 0],
    [300, 300],
    [0, 300],
    [300, 0],
  ];
  assert.throws(() => validateProject(p));
  const q = empty();
  q.stallWidth = 1;
  assert.throws(() => validateProject(q));
});
