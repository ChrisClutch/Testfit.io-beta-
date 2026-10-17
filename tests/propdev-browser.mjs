import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.APP_URL || "http://localhost:5173");
  await page.locator(".option").first().waitFor();
  assert.equal(await page.title(), "Clutch PropDev.io");
  await page.locator("#type").selectOption("cottage2");
  assert.ok((await page.locator(".building-pad").count()) > 8);
  assert.equal(await page.locator("#floors").inputValue(), "2");
  assert.ok(await page.locator("#floors").isDisabled());
  const count = await page.locator(".building-pad").count();
  await page.locator("#growth").fill("40");
  await page.waitForFunction(
    (n) => document.querySelectorAll(".building-pad").length < n,
    count,
  );
  await page.locator("#growth").fill("100");
  await page.waitForFunction(
    (n) => document.querySelectorAll(".building-pad").length === n,
    count,
  );
  await page.locator("#type").selectOption("plex8");
  assert.match(await page.locator("#building-editor").textContent(), /8 HOMES/);
  await page.locator("#areaBasis").selectOption("building");
  assert.equal(Number(await page.locator("#unitSize").inputValue()), 6800);
  await page.locator("#unitSize").fill("9600");
  await page.waitForFunction(() =>
    document
      .querySelector("#building-editor")
      .textContent.includes("9,600 net sf"),
  );
  await page.locator("#detentionSqft").fill("6000");
  await page.waitForFunction(
    () => document.querySelectorAll(".detention-reserve").length === 1,
  );
  await page.locator("#greenSpaceSqft").fill("8000");
  await page.waitForFunction(
    () => document.querySelectorAll(".green-reserve").length === 1,
  );
  assert.match(await page.locator("#metrics").textContent(), /8,000/);
  assert.match(await page.locator("#metrics").textContent(), /6,000/);
  const save = page.waitForEvent("download");
  await page.locator("#save").click();
  const download = await save;
  await download.saveAs("/tmp/propdev-v3.json");
  const project = JSON.parse(await fs.readFile("/tmp/propdev-v3.json", "utf8"));
  assert.equal(project.version, 3);
  assert.equal(project.program.areaBasis, "building");
  await page.locator("#type").selectOption("townhome3");
  await page.locator("#open").setInputFiles("/tmp/propdev-v3.json");
  await page.waitForFunction(
    () => document.querySelector("#type").value === "plex8",
  );
  assert.equal(await page.locator("#unitSize").inputValue(), "9600");
  assert.equal(await page.locator(".detention-reserve").count(), 1);
  await page.locator("#detentionSqft").fill("4000000");
  await page.waitForFunction(() =>
    document
      .querySelector("#message")
      .textContent.includes("Could not reserve"),
  );
  assert.equal(await page.locator(".option").count(), 0);
  assert.equal(await page.locator(".building-pad").count(), 0);
  await page.locator("#detentionSqft").fill("6000");
  await page.locator(".option").first().waitFor();
  // Numerical vertex edits and pointer drag retain editable provenance.
  await page.locator("#edit-boundary").click();
  await page.locator('[data-coordinate="0:0"]').fill("80");
  await page.locator('[data-coordinate="0:0"]').press("Tab");
  assert.match(
    await page.locator("#boundary-source").textContent(),
    /User-edited/,
  );
  await page.locator('[data-vertex="0"]').scrollIntoViewIfNeeded();
  const handle = await page.locator('[data-vertex="0"]').boundingBox();
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle.x + 20, handle.y + 10, { steps: 4 });
  await page.mouse.up();
  assert.notEqual(
    await page.locator('[data-coordinate="0:0"]').inputValue(),
    "80.00",
  );
  // GeoJSON resolves geometry, but never claims image inference or survey accuracy.
  const parcel = {
    type: "Polygon",
    coordinates: [
      [
        [-123, 45],
        [-122.998, 45],
        [-122.998, 44.9985],
        [-123, 44.9985],
        [-123, 45],
      ],
    ],
  };
  await page
    .locator("#parcel-upload")
    .setInputFiles({
      name: "parcel.geojson",
      mimeType: "application/geo+json",
      buffer: Buffer.from(JSON.stringify(parcel)),
    });
  await page.waitForFunction(() =>
    document
      .querySelector("#boundary-source")
      .textContent.includes("Imported WGS84"),
  );
  assert.match(
    await page.locator("#boundary-source").textContent(),
    /not a survey/,
  );
  await page.locator("#greenSpaceSqft").fill("0");
  await page.locator("#detentionSqft").fill("0");
  await page.locator("#generate").click();
  await page.locator("#draw-green").click();
  const svg = page.locator("#canvas");
  await svg.scrollIntoViewIfNeeded();
  const coords = await svg.evaluate((el) => {
    const m = el.getScreenCTM();
    return [
      [30, 30],
      [75, 30],
      [75, 75],
      [30, 75],
    ].map(([x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(m);
      return [p.x, p.y];
    });
  });
  for (const [x, y] of coords) await page.mouse.click(x, y);
  await page.locator("#close").click();
  const drawnArea = Number(
    (await page.locator("#reserve-list").textContent())
      .match(/[\d,]+/)[0]
      .replaceAll(",", ""),
  );
  assert.ok(drawnArea > 1800 && drawnArea < 2200);
  assert.equal(await page.locator(".green-reserve").count(), 1);
  // Old project controls migrate, including missing new fields.
  const legacy = {
    ...project,
    version: 2,
    program: { ...project.program, type: "multifamily", areaBasis: "home" },
  };
  delete legacy.reservations;
  for (const k of [
    "homesPerBuilding",
    "detentionSqft",
    "greenSpaceSqft",
    "areaBasis",
    "reservedAreas",
  ])
    delete legacy.program[k];
  legacy.program.unitSize = 850;
  await page
    .locator("#open")
    .setInputFiles({
      name: "legacy-v2.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacy)),
    });
  await page.waitForFunction(
    () => document.querySelector("#type").value === "multifamily",
  );
  assert.equal(await page.locator("#greenSpaceSqft").inputValue(), "0");
  // Save/reopen an uploaded reference before calibration/tracing.
  const png = await page.screenshot();
  await page
    .locator("#upload")
    .setInputFiles({
      name: "reference.png",
      mimeType: "image/png",
      buffer: png,
    });
  await page.waitForFunction(() =>
    document.querySelector("#message").textContent.includes("Reference loaded"),
  );
  const partialSave = page.waitForEvent("download");
  await page.locator("#save").click();
  await (await partialSave).saveAs("/tmp/propdev-untraced.json");
  await page.locator("#demo").click();
  await page.locator("#open").setInputFiles("/tmp/propdev-untraced.json");
  await page.waitForFunction(() =>
    document.querySelector("#message").textContent.includes("Calibrate"),
  );
  assert.equal(await page.locator(".building-pad").count(), 0);
  await page.locator("#demo").click();
  await page.locator("#type").selectOption("cottage2");
  await page.locator("#greenSpaceSqft").fill("8000");
  await page.locator("#detentionSqft").fill("6000");
  await page.locator("#generate").click();
  await page.screenshot({
    path: "docs/propdev-v03-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "/tmp/propdev-v03-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: presets, sqft basis/footprint, dynamic whole-building count and parking, reservations, invalid-target stale-result clearing, v3/legacy restore, boundary coordinate/drag editing, WGS84 import, manual green polygon, untraced-reference persistence, branding and mobile.",
  );
} finally {
  await browser.close();
}
