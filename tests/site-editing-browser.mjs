import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
  }),
  page = await browser.newPage({ viewport: { width: 1600, height: 1100 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function dragCenter(locator, dx, dy) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, {
    steps: 3,
  });
  await page.mouse.up();
}
try {
  await page.goto("http://localhost:5173");
  await page.locator(".option").first().waitFor();
  await page.locator("#type").selectOption("fuel");
  await page.locator('[data-parking="0"] .aisle-label').click();
  assert.match(
    await page.locator("#object-editor").textContent(),
    /Parking lot 1/,
  );
  const oldStalls = await page.locator(".stall").count();
  await page.locator("#object-length").fill("45");
  await page.locator("#apply-object").click();
  assert.ok((await page.locator(".stall").count()) < oldStalls);
  assert.match(
    await page.locator("#design-warnings").textContent(),
    /shortfall/,
  );
  await page.locator("#object-depth").fill("63");
  await page.locator("#stall-angle").selectOption("45");
  await page.locator("#apply-object").click();
  assert.match(
    await page.locator("#interaction-status").textContent(),
    /Parking updated/,
  );
  const points = await page
    .locator(".parking-pad")
    .first()
    .getAttribute("points");
  await dragCenter(page.locator('[data-parking="0"] .aisle-label'), 3, 20);
  assert.notEqual(
    await page.locator(".parking-pad").first().getAttribute("points"),
    points,
  );
  await page.locator("#object-angle").fill("5");
  await page.locator("#apply-object").click();
  assert.match(
    await page.locator("#interaction-status").textContent(),
    /Parking updated/,
  );
  await page.locator("#fit-parking").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#message")
      .textContent.includes("sampled candidates"),
  );
  await page.locator("#add-pond").click();
  assert.equal(await page.locator(".detention-reserve").count(), 1);
  const capBefore = await page.locator("#storm-results").textContent();
  await page.locator("#object-length").fill("45");
  await page.locator("#apply-object").click();
  assert.notEqual(
    await page.locator("#storm-results").textContent(),
    capBefore,
  );
  await page.locator("#storm-rain").fill("3");
  assert.match(await page.locator("#storm-results").textContent(), /Shortfall/);
  await page.locator("#add-landscape").click();
  assert.equal(await page.locator(".green-reserve").count(), 1);
  const landscape = await page.locator(".green-reserve").getAttribute("points");
  await page.locator("#object-length").fill("30");
  await page.locator("#apply-object").click();
  assert.notEqual(
    await page.locator(".green-reserve").getAttribute("points"),
    landscape,
  );
  // Select a building and shrink it so the pointer rotation has room.
  await page.locator('[data-building="0"]').click();
  await page.locator("#footprint-length").fill("30");
  await page.locator("#footprint-depth").fill("30");
  await page.locator("#apply-footprint").click();
  const before = await page
    .locator(".selected-building")
    .getAttribute("points");
  await dragCenter(page.locator(".rotate-object"), -4, 5);
  assert.notEqual(
    await page.locator(".selected-building").getAttribute("points"),
    before,
  );
  const rotated = await page
    .locator(".selected-building")
    .getAttribute("points");
  await dragCenter(page.locator(".selected-building"), 3, 3);
  assert.notEqual(
    await page.locator(".selected-building").getAttribute("points"),
    rotated,
  );
  // Individual mode selects a stall without accidentally selecting the lot.
  await page.locator("#individual-stalls").check();
  await page.locator('[data-stall="0:0"]').click();
  assert.match(
    await page.locator("#object-editor").textContent(),
    /Individual parking stall/,
  );
  assert.ok(await page.locator("#object-length").isDisabled());
  const all = await page
    .locator(
      ".parking-pad,.stall,.building-pad,.green-reserve,.detention-reserve",
    )
    .evaluateAll((els) => els.map((el) => el.getAttribute("points")));
  const dlPromise = page.waitForEvent("download");
  await page.locator("#save").click();
  const dl = await dlPromise;
  await page.locator("#open").setInputFiles(await dl.path());
  await page.waitForTimeout(400);
  assert.deepEqual(
    await page
      .locator(
        ".parking-pad,.stall,.building-pad,.green-reserve,.detention-reserve",
      )
      .evaluateAll((els) => els.map((el) => el.getAttribute("points"))),
    all,
  );
  assert.equal(await page.locator("#storm-rain").inputValue(), "3");
  const stormDownload=page.waitForEvent("download");
  await page.locator("#export-storm").click();
  const stormFile=await stormDownload;
  const report=JSON.parse(await fs.readFile(await stormFile.path(),"utf8"));
  assert.equal(report.assumptions.rain,3);
  assert.ok(report.estimate.target>0);
  assert.ok(report.pondArea>0);
  await page.screenshot({
    path: "/tmp/clutch-site-editing.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: parking size/angle/drag/search, pond/landscape resize, runoff inputs, building pointer rotation/move, stall selection, project restore, responsive width.",
  );
} finally {
  await browser.close();
}
