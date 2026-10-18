import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("clutch-placement-v1")));
async function at(x, y) {
  return page.locator("#plan").evaluate(
    (svg, [x, y]) => {
      const p = svg.createSVGPoint();
      p.x = x;
      p.y = y;
      const q = p.matrixTransform(svg.getScreenCTM());
      return [q.x, q.y];
    },
    [x, y],
  );
}
async function click(x, y) {
  const p = await at(x, y);
  await page.mouse.click(...p);
}
async function drag(x, y, tx, ty) {
  await page.mouse.move(...(await at(x, y)));
  await page.mouse.down();
  await page.mouse.move(...(await at(tx, ty)), { steps: 5 });
  await page.mouse.up();
}
try {
  await page.goto(process.env.STUDIO_URL || "http://localhost:5173");
  await page.locator(".home").first().waitFor();
  assert.equal(await page.locator(".home").count(), 21);
  assert.equal(await page.locator(".stall").count(), 31);
  await page.screenshot({
    path: "/tmp/clutch-studio-courtyard.png",
    fullPage: true,
  });
  await page.locator("#blank").click();
  await page.locator('[data-mode="home"]').click();
  await click(100, 100);
  assert.equal(await page.locator(".home").count(), 1);
  await page.locator("#width").fill("32");
  await page.locator("#depth").fill("40");
  await page.locator("#rotation").fill("30");
  await page.locator("#apply").click();
  assert.equal((await saved()).objects[0].degrees, 30);
  await drag(100, 100, 150, 140);
  assert.deepEqual((await saved()).objects[0].center, [150, 140]);
  // Rotate with actual handle, then resize with the actual corner handle.
  let h = await page.locator('[data-handle="rotate"]').boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(...(await at(190, 140)), { steps: 4 });
  await page.mouse.up();
  assert.equal((await saved()).objects[0].degrees, 90);
  h = await page.locator('[data-handle="resize"]').boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(...(await at(126, 160)), { steps: 4 });
  await page.mouse.up();
  assert.equal((await saved()).objects[0].length, 40);
  // Irregular pond and landscape are drawn and retained through parking fill.
  await page.locator('[data-mode="pond"]').click();
  for (const p of [
    [30, 280],
    [90, 270],
    [110, 330],
    [35, 340],
  ])
    await click(...p);
  await page.locator("#close").click();
  assert.equal(await page.locator(".site-object>.pond").count(), 1);
  await page.locator('[data-mode="landscape"]').click();
  for (const p of [
    [230, 270],
    [300, 280],
    [290, 340],
    [220, 330],
  ])
    await click(...p);
  await page.locator("#close").click();
  assert.equal(await page.locator(".site-object>.landscape").count(), 1);
  await page.locator("#fill").click();
  const allCount = await page.locator(".stall").count();
  assert.ok(allCount > 100);
  assert.equal((await saved()).parking.length, 1);
  await page.locator("#stall-angle").selectOption("60");
  assert.equal((await saved()).parking[0].stallAngle, 60);
  await page.locator("#heading").fill("20");
  await page.locator("#heading").press("Tab");
  assert.equal((await saved()).parking[0].heading, 20);
  // Move a parking outline vertex to create an irregular envelope.
  await drag(360, 0, 300, 25);
  assert.deepEqual((await saved()).parking[0].ring[1], [300, 25]);
  await page.locator('[data-mode="boundary"]').click();
  await drag(360, 460, 330, 440);
  assert.deepEqual((await saved()).parcel[2], [330, 440]);
  await page.locator("#undo").click();
  assert.deepEqual((await saved()).parcel[2], [360, 460]);
  await page.locator("#redo").click();
  assert.deepEqual((await saved()).parcel[2], [330, 440]);
  const before = await saved();
  await page.reload();
  await page.locator(".home").first().waitFor();
  assert.deepEqual(await saved(), before);
  const saveEvent = page.waitForEvent("download");
  await page.locator("#save").click();
  const download = await saveEvent;
  await download.saveAs("/tmp/studio-project.json");
  assert.deepEqual(
    JSON.parse(await fs.readFile("/tmp/studio-project.json", "utf8")),
    before,
  );
  await page.locator("#blank").click();
  await page.locator("#file").setInputFiles("/tmp/studio-project.json");
  await page.waitForFunction(
    () => document.querySelectorAll(".home").length === 1,
  );
  assert.deepEqual(await saved(), before);
  const exportEvent = page.waitForEvent("download");
  await page.locator("#export").click();
  await (await exportEvent).saveAs("/tmp/clutch-studio-export.svg");
  const svg = await fs.readFile("/tmp/clutch-studio-export.svg", "utf8");
  assert.ok(svg.includes("CONCEPT ONLY"));
  assert.ok(svg.includes(".home"));
  assert.ok(!svg.includes("data-handle"));
  await page.screenshot({
    path: "/tmp/clutch-studio-irregular-parking.png",
    fullPage: true,
  });
  const png = await page.screenshot();
  await page
    .locator("#image-file")
    .setInputFiles({
      name: "reference.png",
      mimeType: "image/png",
      buffer: png,
    });
  await page.waitForFunction(() => document.querySelector("#plan image"));
  const initialScale = (await saved()).image.scale;
  await page.locator("#calibrate").click();
  await page.locator("#known-distance").fill("200");
  await click(50, 50);
  await click(150, 50);
  assert.ok(Math.abs((await saved()).image.scale - initialScale * 2) < 0.00001);
  await page.locator("#trace").click();
  for (const p of [
    [0, 0],
    [300, 0],
    [300, 400],
    [0, 400],
  ])
    await click(...p);
  await page.locator("#close").click();
  assert.deepEqual((await saved()).parcel, [
    [0, 0],
    [300, 0],
    [300, 400],
    [0, 400],
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.locator("#plan").isVisible());
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Placement studio: courtyard, placement, drag/rotate/resize, polygon zones, whole-site parking, boundary edits, undo/redo, persistence, save/open, SVG export and mobile passed.",
  );
} finally {
  await browser.close();
}
