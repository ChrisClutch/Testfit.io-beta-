import "./style.css";
import drawingStyles from "./drawing.css?inline";
import {
  TYPES,
  area,
  generate,
  reconfigure,
  proforma,
  validBoundary,
  config,
} from "./engine.js";
import { importParcelGeoJSON } from "./site-input.js";
const $ = (s) => document.querySelector(s),
  money = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
let state = {
  reservations: [],
  provenance: "Demo rectangle · not a real property",
  site: [
    [70, 60],
    [570, 60],
    [570, 460],
    [70, 460],
  ],
  image: null,
  imageName: "",
  scale: 1,
  mode: "select",
  selectedBuilding: null,
  draft: [],
  calibration: [],
  layouts: [],
  selected: 0,
  locked: true,
};
$("#app").innerHTML =
  `<header><div class="brand">Clutch <span>◆</span> PropDev.io <small>PROPERTY DEVELOPMENT STUDIO</small></div><div class="status">● LOCAL & PRIVATE <span>Live configurator · v0.3</span></div></header><main><section class="intro"><div><div class="eyebrow">LAND DECISIONS, WITH THE MATH VISIBLE</div><h1>Shape the site. Grow the plan.</h1><p>Choose your homes. Reserve the land. Watch the plan and parking respond.</p></div><div class="actions"><button id="demo">Rectangular site</button><button id="irregular">Irregular site</button><button id="save">Save project</button><label class="button">Open project<input id="open" type="file" accept=".json" hidden></label></div></section><div class="workspace"><aside><div class="section-title"><span>01</span> SITE & PROGRAM</div><label class="upload">↑ Upload survey or site image<input id="upload" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" hidden><small>PDF first page · PNG · JPG · WEBP</small></label><p id="file-status" class="hint">Demo: 500 × 400 ft · 4.59 acres</p><div class="toolbar"><button id="calibrate">Calibrate</button><button id="trace">Trace boundary</button><button id="close">Close polygon</button><button id="undo">Undo point</button></div><label class="button parcel-upload">Import parcel GeoJSON<input id="parcel-upload" type="file" accept=".geojson,.json,application/geo+json" hidden></label><p id="boundary-source" class="hint">Demo rectangle · not a real property</p><div class="toolbar"><button id="edit-boundary">Edit boundary vertices</button><button id="cancel-edit">Cancel drawing</button></div><div id="vertex-editor"></div><p class="hint">GeoJSON: one WGS84 parcel polygon; coordinates are projected approximately into local feet. Image boundaries are never inferred automatically.</p><p class="hint">Upload → click two known points → enter distance in feet → trace the property corners → close polygon. Imagery never establishes survey accuracy.</p><label>Building type<select id="type">${Object.entries(
    TYPES,
  )
    .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
    .join(
      "",
    )}</select></label><label>Square-footage basis<select id="areaBasis"><option value="home">Per home (net sf)</option><option value="building">Entire building (net sf)</option></select></label>${field("unitSize", "Target area · net sq ft", 850, 100)}<div id="program-description" class="hint"></div><div class="grid-fields">${field("homesPerBuilding", "Homes per townhome building", 6, 1, 24)}${field("setback", "Uniform setback · ft", 15)}${field("floors", "Floors", 3, 1, 6)}${field("parkingRatio", "Stalls / unit", 1.5, 0, 10, 0.1)}${field("maxCoverage", "Max lot coverage · %", 40, 0, 100)}${field("maxFar", "Max FAR", 1.5, 0, 20, 0.1)}${field("maxDensity", "Max units / acre", 40, 0, 1000)}${field("openSpace", "Min unbuilt/unpaved · %", 20, 0, 100)}${field("efficiency", "Net / gross efficiency", 0.82, 0.1, 1, 0.01)}</div><section class="land-reserves"><h3>Land reservations</h3><p class="hint">Zero = optional area off. Targets reserve explicit land, separate from the unbuilt/unpaved percentage. Detention footprint is not a hydraulic design.</p><div class="grid-fields">${field("detentionSqft", "Detention target · sq ft", 0)}${field("greenSpaceSqft", "Green-space target · sq ft", 0)}</div><div class="toolbar"><button id="draw-green">Draw green space</button><button id="draw-detention">Draw detention</button></div><div id="reserve-list"></div></section><button class="primary" id="generate">Generate site options <span>↗</span></button><p class="hint">Inputs are assumptions, not Salem zoning defaults. Confirm the parcel’s adopted rules, overlays and allowed uses.</p></aside><section class="board"><div class="board-top"><div><div class="eyebrow">SITE WORKSPACE</div><h2 id="site-title">Clutch demo parcel</h2></div><span id="area-tag" class="pill">4.59 AC</span></div><div class="canvas-tools"><span>Flexible bars: drag to grow · Presets: change area or building count</span><label><input type="checkbox" id="show-cars" checked> Show cars</label></div><div class="canvas-wrap"><svg id="canvas" viewBox="0 0 700 540" role="img" aria-label="Site boundary and generated layouts"></svg><div class="legend"><span class="boundary">Property</span><span class="envelope">Setback envelope</span><span class="building">Building</span><span class="parking">Parking stalls</span><span class="drive">Connected drive</span><span class="green-key">Green space</span><span class="detention-key">Detention</span></div></div><div id="message" role="status">Demo site is scaled in feet. Generate options to begin.</div><div id="options" class="options"></div><div class="board-foot"><span>CONCEPT GEOMETRY · NOT A PERMIT PLAN</span><button id="export-svg">Export SVG</button><button id="export-csv">Export CSV</button></div></section><aside class="finance"><div class="section-title"><span>02</span> FEASIBILITY SNAPSHOT</div><div id="metrics" class="metrics"></div><div class="section-title"><span>03</span> BUILDING & PARKING GROWTH</div><label>Site-wide expansion / building count <div class="range-header"><span>Compact</span><output id="growth-output">100%</output><span>Fill available length</span></div><input id="growth" type="range" min="20" max="100" value="100" step="1"></label><div class="grid-fields">${field("buildingDepth", "Building depth · ft", 60, 20, 150)}${field("maxLength", "Length limit · ft", 360, 36, 1000, 3)}${field("stallWidth", "Stall width · ft", 9, 8, 12, 0.5)}${field("stallDepth", "Stall depth · ft", 18, 16, 24)}${field("aisleWidth", "Drive / aisle · ft", 24, 20, 36)}</div><div id="building-editor" class="building-editor"></div><p class="hint">Growth stops at the setback, parking capacity or a zoning limit. Parking lots grow with the homes they serve. Select a building to resize it individually.</p><details class="underwriting"><summary>Financial assumptions & proforma</summary><h3>Underwriting assumptions</h3><div class="grid-fields">${field("land", "Land acquisition · $", 600000)}${field("hardCost", "Building hard cost · $/sf", 210)}${field("softPct", "Soft costs · % hard", 20, 0, 100)}${field("contingencyPct", "Contingency · % hard", 8, 0, 100)}${field("rent", "Monthly rent / unit · $", 1800)}${field("vacancyPct", "Vacancy · %", 5, 0, 100)}${field("opexPct", "Operating expense · %", 35, 0, 100)}${field("capRate", "Exit cap · %", 5.5, 0.1, 30, 0.1)}${field("loanPct", "Debt / total cost · %", 65, 0, 100)}${field("interestPct", "Interest-only rate · %", 7, 0, 30, 0.1)}${field("annualRetailNoi", "Retail / fuel annual NOI · $", 150000)}</div><div id="financials"></div><p class="hint">Concept estimate. Includes parking paving at $12/sf; excludes demolition, abnormal sitework, offsite improvements, financing fees, taxes at sale and fuel equipment. Affordable rents and subsidies require explicit underwriting. Debt service is interest-only.</p></details></aside></div><section class="limitations"><strong>Decision support, with limits.</strong> Flexible bars expand and residential presets repeat along a shared access spine. Reserved green/detention polygons exclude development; detention volume, infiltration, discharge, and landscape compliance are not calculated. Each counted stall is drawn and each parking aisle meets the spine. Street frontage, curb-cut permission, fire turning, ADA, grading, utilities, stormwater, easements and fuel safety separations remain unvalidated. Interior lines are schematic, not unit floorplans. Unbuilt area is not verified landscaped open space. No automated zoning or entitlement approval.</section></main>`;
function field(id, label, value, min = 0, max = 1e12, step = 1) {
  return `<label>${label}<input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;
}
const oldCfgKeys = [
  "setback",
  "floors",
  "unitSize",
  "parkingRatio",
  "maxCoverage",
  "maxFar",
  "maxDensity",
  "openSpace",
  "efficiency",
];
const cfgKeys = [
  ...oldCfgKeys,
  "buildingDepth",
  "maxLength",
  "growth",
  "stallWidth",
  "stallDepth",
  "aisleWidth",
  "homesPerBuilding",
  "detentionSqft",
  "greenSpaceSqft",
];
const finKeys = [
  "land",
  "hardCost",
  "softPct",
  "contingencyPct",
  "rent",
  "vacancyPct",
  "opexPct",
  "capRate",
  "loanPct",
  "interestPct",
  "annualRetailNoi",
];
const read = (keys) =>
  Object.fromEntries(keys.map((k) => [k, Number($("#" + k).value)]));
function program() {
  return {
    type: $("#type").value,
    ...read(cfgKeys),
    areaBasis: $("#areaBasis").value,
    reservedAreas: state.reservations,
  };
}
function message(s) {
  $("#message").textContent = s;
}
function bounds() {
  let pts = [...state.site, ...state.draft];
  if (state.image)
    pts.push(
      [0, 0],
      [state.image.width * state.scale, state.image.height * state.scale],
    );
  if (!pts.length)
    pts = [
      [0, 0],
      [700, 540],
    ];
  let xs = pts.map((p) => p[0]),
    ys = pts.map((p) => p[1]),
    x = Math.min(...xs),
    y = Math.min(...ys),
    w = Math.max(...xs) - x,
    h = Math.max(...ys) - y;
  let margin = Math.max(w, h) * 0.08 + 10;
  return [x - margin, y - margin, w + margin * 2, h + margin * 2];
}
function poly(points, cls) {
  return `<polygon points="${points.map((p) => p.join(",")).join(" ")}" class="${cls}"/>`;
}
function draw() {
  const box = drag?.vertex !== undefined ? drag.box : bounds(),
    svg = $("#canvas");
  svg.setAttribute("viewBox", box.join(" "));
  const l = state.layouts[state.selected];
  let html = `<style>${drawingStyles}</style><defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 25" fill="none" stroke="#dfe5e1" stroke-width=".5"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#fffef1"/></marker></defs><rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="url(#grid)"/>`;
  if (state.image)
    html += `<image href="${state.image.url}" x="0" y="0" width="${state.image.width * state.scale}" height="${state.image.height * state.scale}" opacity=".6"/>`;
  if (state.site.length) html += poly(state.site, "site");
  const zones = l?.reservedAreas || state.reservations;
  zones.forEach((z) => {
    html += poly(
      z.ring,
      z.kind === "green" ? "green-reserve" : "detention-reserve",
    );
    const center = z.ring.reduce(
      (s, p) => [s[0] + p[0] / z.ring.length, s[1] + p[1] / z.ring.length],
      [0, 0],
    );
    html += `<text x="${center[0]}" y="${center[1] - 5}" text-anchor="middle" class="reserve-label">${z.kind === "green" ? "GREEN SPACE" : "DETENTION"}<tspan x="${center[0]}" dy="10">${Math.round(area(z.ring))} SF · ${z.source === "auto-reserved concept" ? "AUTO" : "DRAWN"}</tspan></text>`;
  });
  if (l) {
    for (const p of l.envelope)
      html += `<path d="${p.map((r) => "M" + r.map((v) => v.join(",")).join("L") + "Z").join("")}" fill-rule="evenodd" class="setback"/>`;
    l.roads.forEach((p) => (html += poly(p, "access-road")));
    if (l.entry) html += poly(l.entry, "access-road");
    l.parking.forEach((p) => (html += poly(p, "parking-pad")));
    l.stallPolygons.forEach((p) => {
      html += poly(p, "stall");
      if ($("#show-cars").checked) {
        const [a, b, , d] = p;
        const u = [(b[0] - a[0]) / 9, (b[1] - a[1]) / 9],
          v = [(d[0] - a[0]) / 18, (d[1] - a[1]) / 18];
        const c = p
          .slice(0, 4)
          .reduce((s, q) => [s[0] + q[0] / 4, s[1] + q[1] / 4], [0, 0]);
        html += poly(
          [
            [-2.3, -6.7],
            [2.3, -6.7],
            [2.3, 6.7],
            [-2.3, 6.7],
          ].map(([x, y]) => [
            c[0] + u[0] * x + v[0] * y,
            c[1] + u[1] * x + v[1] * y,
          ]),
          "car",
        );
      }
    });
    l.aisles.forEach((p, i) => {
      const a = p[0].map((v, k) => (v + p[3][k]) / 2),
        b = p[1].map((v, k) => (v + p[2][k]) / 2);
      html += `<path d="M${a}L${b}" class="drive-center"/>`;
      const c = l.parkingDetails[i].center;
      html += `<text x="${c[0]}" y="${c[1]}" class="aisle-label">${l.parkingDetails[i].stalls} STALLS · ${$("#aisleWidth").value}′ AISLE</text>`;
    });
    l.buildings.forEach((p, i) => {
      const d = l.buildingDetails[i],
        selected = state.selectedBuilding === d.id;
      html += `<g data-building="${i}" class="building-group">${poly(p, selected ? "building-pad selected-building" : "building-pad")}`;
      if (d.corridor) html += poly(d.corridor, "corridor");
      const angle = (l.degrees * Math.PI) / 180,
        project = ([x, y]) => [
          x * Math.cos(angle) - y * Math.sin(angle),
          x * Math.sin(angle) + y * Math.cos(angle),
        ];
      const perSide = Math.max(1, Math.round(d.units / d.floors / 2));
      for (let j = 1; j < perSide; j++) {
        const x = d.origin[0] + (d.length * j) / perSide;
        for (const [y1, y2] of [
          [d.origin[1], d.origin[1] + d.depth / 2 - 3],
          [d.origin[1] + d.depth / 2 + 3, d.origin[1] + d.depth],
        ])
          html += `<path d="M${project([x, y1])}L${project([x, y2])}" class="unit-line"/>`;
      }
      const compact = d.fixed && Math.min(d.length, d.depth) < 40;
      if (compact) {
        const [bx, by] = d.origin;
        html += `<path d="M${project([bx + 2, by + 2])}L${project([bx + d.length / 2, by + 6])}L${project([bx + d.length - 2, by + 2])}M${project([bx + d.length / 2, by + 6])}L${project([bx + d.length / 2, by + d.depth - 3])}" class="unit-line"/>`;
      }
      html += `<title>Building ${i + 1}: ${d.units} homes, ${d.floors} stories, ${Math.round(area(p) * d.floors)} gross sf</title><text x="${d.center[0]}" y="${d.center[1]}" class="building-label">${compact ? `B${i + 1}` : $("#type").value === "fuel" ? "STORE" : `B${i + 1} · ${d.units} HOMES`}</text>${compact ? "" : `<text x="${d.center[0]}" y="${d.center[1] + 9}" class="dimension-label">${Number(d.length.toFixed(1))}′ × ${d.depth}′ · ${d.floors} FLOORS</text>`}</g>`;
      if (selected && !d.fixed)
        html += `<circle cx="${d.handle[0]}" cy="${d.handle[1]}" r="${box[2] / 90}" class="resize-handle" data-resize="${i}"/><text x="${d.handle[0]}" y="${d.handle[1] - box[2] / 55}" class="resize-label">DRAG TO GROW</text>`;
    });
    if (l.roads.length) {
      const r = l.roads[0],
        a = r[0].map((v, k) => (v + r[1][k]) / 2),
        b = r[2].map((v, k) => (v + r[3][k]) / 2);
      html += `<path d="M${a}L${b}" class="road-center"/>`;
      const p = l.entry?.[0] || r[0];
      html += `<text x="${p[0]}" y="${p[1] - 6}" class="entry-label">PROPOSED ACCESS</text>`;
    }
  }
  if (state.mode === "vertices")
    state.site.forEach((p, i) => {
      html += `<circle cx="${p[0]}" cy="${p[1]}" r="${box[2] / 110}" class="boundary-handle" data-vertex="${i}"/><text x="${p[0] + box[2] / 90}" y="${p[1]}" class="reserve-label">${i + 1}</text>`;
    });
  if (state.draft.length)
    html += `<polyline points="${state.draft.map((p) => p.join(",")).join(" ")}" class="trace-line"/>`;
  [...state.draft, ...state.calibration].forEach(
    (p) =>
      (html += `<circle cx="${p[0]}" cy="${p[1]}" r="${box[2] / 150}" fill="#db673d"/>`),
  );
  svg.innerHTML = html;
  $("#area-tag").textContent = validBoundary(state.site)
    ? (area(state.site) / 43560).toFixed(2) + " AC"
    : "TRACE SITE";
}
function editor() {
  const l = state.layouts[state.selected],
    i = l?.buildingDetails.findIndex((d) => d.id === state.selectedBuilding),
    d = l?.buildingDetails[i];
  $("#building-editor").innerHTML = d
    ? `<div class="editor-title">EDIT BUILDING ${i + 1}<span>${d.units} HOMES</span></div><label>Building length · feet<input id="selected-length" type="range" min="${d.minLength}" max="${Math.max(d.minLength, Math.floor(d.maxLength))}" value="${d.length}" step="3"></label><div class="editor-dimensions"><strong>${Number(d.length.toFixed(1))}′</strong><span>${d.depth}′ deep · ${d.floors} floors</span></div><button id="restore-building">Expand to available limit</button>`
    : '<p class="hint">Select a green building to resize it.</p>';
  if (d?.fixed)
    $("#building-editor").innerHTML =
      `<div class="editor-title">${TYPES[$("#type").value].label}<span>${d.units} HOMES</span></div><p>${Math.round(d.netArea).toLocaleString()} net sf · ${Math.round(area(l.buildings[i]) * d.floors).toLocaleString()} gross sf</p><p class="hint">${Number(d.length.toFixed(1))}′ × ${d.depth}′ · ${d.floors} stories. Change target area or depth to resize this preset. Site expansion adds or removes whole buildings.</p><button id="remove-module">Remove this building</button>`;
  const remove = $("#remove-module");
  if (remove)
    remove.onclick = () => {
      const current = state.layouts[state.selected];
      state.layouts[state.selected] = reconfigure(
        state.site,
        program(),
        current.model,
        { ...current.edits, [d.id]: 0 },
      );
      state.selectedBuilding = null;
      draw();
      editor();
      options();
      updateFinance();
    };
  const slider = $("#selected-length");
  if (slider)
    slider.oninput = () => {
      resizeBuilding(d.id, Number(slider.value));
    };
  const restore = $("#restore-building");
  if (restore) restore.onclick = () => resizeBuilding(d.id, d.maxLength);
}
function options() {
  $("#options").innerHTML = state.layouts
    .map(
      (l, i) =>
        `<button class="option ${i === state.selected ? "active" : ""}" data-option="${i}"><small>OPTION ${i + 1} · ${l.degrees}°</small><b>${l.units} homes / ${l.stalls} stalls</b><span>${l.buildings.length} buildings</span></button>`,
    )
    .join("");
}
function resizeBuilding(id, length) {
  const current = state.layouts[state.selected];
  if (!current) return;
  try {
    const edits = { ...current.edits, [id]: length };
    const next = reconfigure(state.site, program(), current.model, edits);
    if (!next.buildingDetails.some((d) => d.id === id)) return;
    state.layouts[state.selected] = next;
    draw();
    updateFinance();
    options();
    // Keep an active slider intact during input; refresh dimensions without replacing its DOM.
    const d = next.buildingDetails.find((d) => d.id === id),
      label = $(".editor-dimensions strong");
    if (label) label.textContent = d.length + "′";
    const title = $(".editor-title span");
    if (title) title.textContent = d.units + " HOMES";
    message(
      `Building length ${d.length} ft. Parking resized to ${next.stalls} drawn stalls; site yield ${next.units} homes.`,
    );
  } catch (e) {
    message(e.message);
  }
}
function updateFinance() {
  let l = state.layouts[state.selected];
  if (!l) {
    $("#metrics").innerHTML =
      '<p class="hint">Generate a layout to see feasibility.</p>';
    $("#financials").innerHTML = "";
    return;
  }
  try {
    let p = proforma(l, read(finKeys));
    $("#metrics").innerHTML =
      `<div class="big-metric"><strong>${l.units || (l.buildings.length ? "Retail" : "0")}</strong><span>${$("#type").value === "fuel" ? "C-store concept" : "potential homes"}</span></div><div class="mini-metrics"><div><b>${l.stalls}</b> stalls</div><div><b>${Math.round(l.gfa).toLocaleString()}</b> gross sf</div><div><b>${l.coverage.toFixed(1)}%</b> coverage</div><div><b>${(l.buildableArea / 43560).toFixed(2)}</b> usable envelope ac</div><div><b>${Math.round(l.greenArea || 0).toLocaleString()}</b> reserved green sf</div><div><b>${Math.round(l.detentionArea || 0).toLocaleString()}</b> detention sf</div></div>`;
    $("#financials").innerHTML =
      `<div class="result ${p.profit >= 0 ? "positive" : "negative"}"><span>Value less development cost</span><strong>${money(p.profit)}</strong><small>Before selling costs / taxes</small></div>${[
        ["Total development cost", money(p.total)],
        ["Stabilized NOI / year", money(p.noi)],
        ["Value at exit cap", money(p.value)],
        ["Yield on cost", p.yield.toFixed(2) + "%"],
        ["Interest-only DSCR", p.dscr === null ? "—" : p.dscr.toFixed(2) + "×"],
        ["Equity required", money(p.equity)],
        ["Cash-on-cash (interest-only)", p.cashOnCash.toFixed(1) + "%"],
      ]
        .map(
          ([a, b]) =>
            `<div class="financial-row"><span>${a}</span><b>${b}</b></div>`,
        )
        .join("")}`;
  } catch (e) {
    message(e.message);
  }
}
function resetLayouts() {
  $("#boundary-source").textContent = state.provenance;
  state.selectedBuilding = null;
  state.layouts = [];
  $("#options").innerHTML = "";
  updateFinance();
  editor();
  draw();
}
function run(preserve = false) {
  clearTimeout(liveTimer);
  try {
    if (!state.locked)
      throw Error("Calibrate the uploaded reference before generating.");
    const oldDegrees = preserve ? state.layouts[state.selected]?.degrees : null;
    state.layouts = generate(state.site, program());
    state.selected = Math.max(
      0,
      state.layouts.findIndex((l) => l.degrees === oldDegrees),
    );
    const l = state.layouts[state.selected];
    state.selectedBuilding = l.buildingDetails[0]?.id ?? null;
    options();
    draw();
    updateFinance();
    editor();
    $("#growth-output").textContent = $("#growth").value + "%";
    $("#boundary-source").textContent = state.provenance;
    updateProgramDescription();
    message(
      l.buildings.length && TYPES[$("#type").value].family === "discrete"
        ? "Area-driven buildings placed. Change home size, depth or expansion; parking reflows with the home count."
        : l.buildings.length
          ? "Drag the orange building handle, or change expansion. Building lengths, drawn stalls and yield update together."
          : "No complete connected building and parking layout fits these constraints. Reduce depth or parking demand, or review the boundary.",
    );
  } catch (e) {
    resetLayouts();
    message(e.message);
  }
}
$("#generate").onclick = () => run();
$("#options").onclick = (e) => {
  const b = e.target.closest("[data-option]");
  if (!b) return;
  state.selected = Number(b.dataset.option);
  state.selectedBuilding =
    state.layouts[state.selected].buildingDetails[0]?.id ?? null;
  options();
  draw();
  updateFinance();
  editor();
};
let liveTimer;
cfgKeys.forEach(
  (k) =>
    ($("#" + k).oninput = () => {
      clearTimeout(liveTimer);
      $("#growth-output").textContent = $("#growth").value + "%";
      liveTimer = setTimeout(() => {
        if (state.locked && validBoundary(state.site)) run(true);
        else resetLayouts();
      }, 100);
    }),
);
finKeys.forEach((k) => ($("#" + k).oninput = updateFinance));
$("#show-cars").onchange = draw;
$("#areaBasis").onchange = () => {
  const t = TYPES[$("#type").value],
    homes = t.townhome ? Number($("#homesPerBuilding").value) : t.homes;
  if (homes)
    $("#unitSize").value =
      Number($("#unitSize").value) *
      ($("#areaBasis").value === "building" ? homes : 1 / homes);
  updateProgramDescription();
  run();
};
$("#type").onchange = () => {
  const t = TYPES[$("#type").value];
  $("#areaBasis").value = "home";
  $("#homesPerBuilding").value = t.homes || 6;
  $("#floors").value = t.floors;
  $("#unitSize").value = t.unit;
  $("#efficiency").value = t.efficiency;
  $("#buildingDepth").value = t.depth;
  updateProgramDescription();
  run();
};
let drag = null,
  suppressClick = false;
$("#canvas").onpointerdown = (e) => {
  const vertex = e.target.closest("[data-vertex]");
  if (vertex && state.mode === "vertices") {
    drag = {
      vertex: Number(vertex.dataset.vertex),
      original: structuredClone(state.site),
      box: bounds(),
    };
    $("#canvas").setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  const handle = e.target.closest("[data-resize]");
  if (!handle || state.mode !== "select") return;
  const l = state.layouts[state.selected],
    d = l.buildingDetails[Number(handle.dataset.resize)];
  drag = {
    id: d.id,
    angle: (l.degrees * Math.PI) / 180,
    origin: d.origin[0],
    length: d.length,
    side: d.side,
    min: d.minLength,
  };
  $("#canvas").setPointerCapture(e.pointerId);
  e.preventDefault();
};
$("#canvas").onpointermove = (e) => {
  if (!drag) return;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
    $("#canvas").getScreenCTM().inverse(),
  );
  if (drag.vertex !== undefined) {
    state.site[drag.vertex] = [p.x, p.y];
    state.layouts = [];
    draw();
    return;
  }
  const localX = p.x * Math.cos(drag.angle) + p.y * Math.sin(drag.angle);
  const length =
    drag.side > 0 ? localX - drag.origin : drag.origin + drag.length - localX;
  resizeBuilding(drag.id, Math.max(drag.min, Math.round(length / 3) * 3));
  suppressClick = true;
};
$("#canvas").onpointerup = (e) => {
  if (!drag) return;
  if (drag.vertex !== undefined) {
    if (!validBoundary(state.site)) {
      state.site = drag.original;
      message(
        "That edit crosses boundary edges; the previous boundary was restored.",
      );
    } else state.provenance = "User-edited boundary · verify dimensions";
    drag = null;
    renderVertices();
    run();
    return;
  }
  drag = null;
  if ($("#canvas").hasPointerCapture(e.pointerId))
    $("#canvas").releasePointerCapture(e.pointerId);
  editor();
  setTimeout(() => (suppressClick = false), 0);
};
$("#canvas").onpointercancel = () => {
  if (drag?.vertex !== undefined) {
    state.site = drag.original;
    run();
  }
  drag = null;
  suppressClick = false;
  editor();
};
$("#trace").onclick = () => {
  state.mode = "trace";
  state.draft = [];
  message("Click each property corner in order. Close polygon when finished.");
  draw();
};
$("#undo").onclick = () => {
  state.draft.pop();
  draw();
};
$("#close").onclick = () => {
  if (!validBoundary(state.draft)) {
    message(
      "Boundary needs at least three corners, with no crossings or duplicate points.",
    );
    return;
  }
  if (["green", "detention"].includes(state.mode)) {
    if (state.reservations.length >= 20) {
      message("Use up to 20 drawn reservation areas.");
      return;
    }
    state.reservations.push({ kind: state.mode, ring: state.draft });
    state.draft = [];
    state.mode = "select";
    renderReserves();
    run();
    return;
  }
  state.site = state.draft;
  state.reservations = [];
  state.provenance = "User-traced boundary · verify scale and corners";
  state.draft = [];
  state.mode = "select";
  resetLayouts();
  message("Boundary saved. Confirm calibration and zoning, then generate.");
};
$("#calibrate").onclick = () => {
  state.mode = "calibrate";
  state.calibration = [];
  message("Click the two endpoints of a known distance on the plan.");
  draw();
};
$("#canvas").onclick = (e) => {
  if (suppressClick) return;
  const building = e.target.closest("[data-building]");
  if (building && state.mode === "select") {
    state.selectedBuilding =
      state.layouts[state.selected].buildingDetails[
        Number(building.dataset.building)
      ].id;
    draw();
    editor();
    return;
  }
  let pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(
    $("#canvas").getScreenCTM().inverse(),
  );
  let p = [pt.x, pt.y];
  if (["trace", "green", "detention"].includes(state.mode)) {
    if (state.draft.length >= 100) {
      message("MVP supports up to 100 traced corners.");
      return;
    }
    state.draft.push(p);
    draw();
  } else if (state.mode === "calibrate") {
    state.calibration.push(p);
    if (state.calibration.length === 2) {
      let distance = Number(
        prompt("Measured distance between these points, in feet:", "100"),
      );
      let current = Math.hypot(
        ...state.calibration[0].map((v, i) => v - state.calibration[1][i]),
      );
      if (distance > 0 && Number.isFinite(distance) && current > 0.01) {
        let factor = distance / current;
        state.scale *= factor;
        state.reservations = state.reservations.map((z) => ({
          ...z,
          ring: z.ring.map((p) => p.map((v) => v * factor)),
        }));
        state.site = state.site.map((p) => p.map((v) => v * factor));
        state.draft = state.draft.map((p) => p.map((v) => v * factor));
        state.locked = true;
        state.provenance =
          "User-calibrated reference · boundary must be traced/verified";
        message("Scale calibrated. Trace or confirm the boundary.");
      } else
        message(
          "Calibration cancelled or invalid. Repeat using a positive known distance.",
        );
      state.calibration = [];
      state.mode = "select";
      resetLayouts();
    }
    draw();
  }
};
$("#upload").onchange = async (e) => {
  let file = e.target.files[0];
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) {
    message("Use a file under 20 MB.");
    return;
  }
  try {
    message("Loading reference…");
    let url;
    if (file.type === "application/pdf") {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).href;
      let doc = await pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        isEvalSupported: false,
      }).promise;
      let page = await doc.getPage(1),
        vp = page.getViewport({ scale: 1 }),
        scale = Math.min(2, 2400 / Math.max(vp.width, vp.height));
      vp = page.getViewport({ scale });
      let canvas = document.createElement("canvas");
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport: vp,
      }).promise;
      url = canvas.toDataURL("image/png");
      await doc.destroy();
    } else {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
        throw Error("Use PDF, PNG, JPEG or WEBP.");
      url = await new Promise((resolve, reject) => {
        let r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }
    let img = new Image();
    img.src = url;
    await img.decode();
    if (img.width * img.height > 40000000)
      throw Error("Image too large. Resize below 40 megapixels.");
    state.image = { url, width: img.width, height: img.height };
    state.imageName = file.name;
    state.reservations = [];
    state.provenance =
      "Uploaded image/PDF · no boundary inferred · calibration and tracing required";
    $("#boundary-source").textContent = state.provenance;
    renderReserves();
    state.scale = 1;
    state.site = [];
    state.draft = [];
    state.locked = false;
    $("#file-status").textContent = file.name + " · scale required";
    $("#site-title").textContent = "Uploaded site reference";
    resetLayouts();
    message(
      "Reference loaded. Calibrate a known distance, then trace the boundary.",
    );
  } catch (err) {
    message("Upload failed: " + err.message);
  }
  e.target.value = "";
};
function download(name, data, type) {
  let url = URL.createObjectURL(new Blob([data], { type }));
  let a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#save").onclick = () =>
  download(
    "clutch-propdev-project.json",
    JSON.stringify(
      {
        version: 3,
        provenance: state.provenance,
        reservations: state.reservations,
        layoutEdit: state.layouts[state.selected]
          ? {
              model: state.layouts[state.selected].model,
              edits: state.layouts[state.selected].edits,
            }
          : null,
        site: state.site,
        image: state.image,
        imageName: state.imageName,
        scale: state.scale,
        locked: state.locked,
        program: program(),
        finance: read(finKeys),
      },
      null,
      2,
    ),
    "application/json",
  );
$("#open").onchange = async (e) => {
  try {
    let f = e.target.files[0];
    if (!f) return;
    if (f.size > 40 * 1024 * 1024) throw Error("Project file too large.");
    let p = JSON.parse(await f.text());
    if (
      ![1, 2, 3].includes(p.version) ||
      (!validBoundary(p.site) &&
        !(
          Array.isArray(p.site) &&
          p.site.length === 0 &&
          p.image &&
          p.locked === false
        )) ||
      p.site.length > 100 ||
      !TYPES[p.program?.type]
    )
      throw Error("Invalid project boundary or version.");
    for (const k of cfgKeys)
      if (p.program[k] === undefined)
        p.program[k] = {
          buildingDepth: TYPES[p.program.type].depth,
          maxLength: 360,
          growth: 100,
          stallWidth: 9,
          stallDepth: 18,
          aisleWidth: 24,
          homesPerBuilding: TYPES[p.program.type].homes || 6,
          detentionSqft: 0,
          greenSpaceSqft: 0,
        }[k];
    for (let k of [...cfgKeys, ...finKeys])
      if (!Number.isFinite((cfgKeys.includes(k) ? p.program : p.finance)?.[k]))
        throw Error("Invalid project inputs.");
    p.program.areaBasis = p.program.areaBasis || "home";
    p.reservations = p.reservations || [];
    p.program.reservedAreas = p.reservations;
    if (!Number.isFinite(p.scale) || p.scale <= 0)
      throw Error("Invalid scale.");
    config(p.program);
    proforma({ units: 0, gfa: 0, buildings: [], parking: [] }, p.finance);
    if (p.site.length) generate(p.site, p.program);
    if (
      p.image &&
      (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(
        p.image.url,
      ) ||
        !Number.isFinite(p.image.width) ||
        !Number.isFinite(p.image.height) ||
        p.image.width <= 0 ||
        p.image.height <= 0 ||
        p.image.width * p.image.height > 40000000)
    )
      throw Error("Invalid reference image.");
    Object.assign(state, {
      reservations: p.reservations,
      provenance:
        typeof p.provenance === "string"
          ? p.provenance
          : "Restored boundary · provenance unspecified",
      site: p.site,
      image: p.image || null,
      imageName: p.imageName || "",
      scale: p.scale,
      locked: p.locked === true,
      draft: [],
      calibration: [],
      mode: "select",
    });
    $("#type").value = p.program.type;
    $("#areaBasis").value = p.program.areaBasis;
    renderReserves();
    updateProgramDescription();
    cfgKeys.forEach((k) => ($("#" + k).value = p.program[k]));
    finKeys.forEach((k) => ($("#" + k).value = p.finance[k]));
    $("#site-title").textContent = "Saved project";
    $("#file-status").textContent = "Project restored";
    run();
    if (
      p.layoutEdit &&
      Object.values(p.layoutEdit.model || {}).every(Number.isFinite) &&
      Object.values(p.layoutEdit.edits || {}).every(
        (v) => Number.isFinite(v) && v >= 0,
      )
    ) {
      const match = state.layouts.findIndex(
        (l) => l.degrees === p.layoutEdit.model.degrees,
      );
      if (match >= 0) {
        state.layouts[match] = reconfigure(
          state.site,
          program(),
          p.layoutEdit.model,
          p.layoutEdit.edits,
        );
        state.selected = match;
        state.selectedBuilding =
          state.layouts[match].buildingDetails[0]?.id ?? null;
        options();
        draw();
        updateFinance();
        editor();
      }
    }
  } catch (err) {
    message(err.message);
  }
  e.target.value = "";
};
$("#export-svg").onclick = () => {
  let svg = $("#canvas").cloneNode(true);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  let style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = drawingStyles;
  svg.prepend(style);
  download("clutch-propdev-concept.svg", svg.outerHTML, "image/svg+xml");
};
$("#export-csv").onclick = () => {
  if (!state.layouts.length) {
    message("Generate layouts first.");
    return;
  }
  download(
    "clutch-propdev-feasibility.csv",
    "orientation_degrees,units,stalls,gross_sf,site_sf,total_cost,noi,value,profit,green_space_sf,detention_sf\n" +
      state.layouts
        .map((l) => {
          let p = proforma(l, read(finKeys));
          return [
            l.degrees,
            l.units,
            l.stalls,
            l.gfa,
            l.siteArea,
            p.total,
            p.noi,
            p.value,
            p.profit,
            l.greenArea || 0,
            l.detentionArea || 0,
          ].join(",");
        })
        .join("\n"),
    "text/csv",
  );
};
$("#demo").onclick = () => {
  state = {
    reservations: [],
    provenance: "Demo rectangle · not a real property",
    site: [
      [70, 60],
      [570, 60],
      [570, 460],
      [70, 460],
    ],
    image: null,
    imageName: "",
    scale: 1,
    mode: "select",
    selectedBuilding: null,
    draft: [],
    calibration: [],
    layouts: [],
    selected: 0,
    locked: true,
  };
  $("#site-title").textContent = "Clutch demo parcel";
  $("#file-status").textContent = "Demo: 500 × 400 ft · 4.59 acres";
  renderReserves();
  renderVertices();
  run();
};
$("#irregular").onclick = () => {
  state.reservations = [];
  state.provenance = "Irregular demo · not a real property";
  state.site = [
    [70, 60],
    [650, 60],
    [650, 280],
    [480, 280],
    [480, 540],
    [70, 470],
  ];
  state.image = null;
  state.locked = true;
  state.mode = "select";
  state.draft = [];
  state.calibration = [];
  $("#site-title").textContent = "Irregular demo parcel";
  $("#file-status").textContent = "Irregular boundary · scaled in feet";
  renderReserves();
  renderVertices();
  run();
};
run();

function updateProgramDescription() {
  const t = TYPES[$("#type").value],
    fixed = t.family === "discrete";
  $("#homesPerBuilding").disabled = !t.townhome;
  $("#floors").disabled = fixed && !$("#type").value.startsWith("plex");
  if ($("#floors").disabled) $("#floors").value = t.floors;
  $("#areaBasis").querySelector('[value="building"]').disabled = !fixed;
  $("#program-description").textContent = fixed
    ? `${t.label}: ${t.townhome ? $("#homesPerBuilding").value : t.homes} homes per building. Net area ÷ efficiency ÷ stories determines the ground footprint. Expansion changes whole-building count.`
    : "Flexible building bars. Area per home determines capacity; lengths and parking grow together.";
}
function renderReserves() {
  $("#reserve-list").innerHTML = state.reservations
    .map(
      (z, i) =>
        `<p>${z.kind === "green" ? "Green space" : "Detention"} · ${Math.round(area(z.ring)).toLocaleString()} sf <button data-remove-zone="${i}">Remove</button></p>`,
    )
    .join("");
}
$("#reserve-list").onclick = (e) => {
  const b = e.target.closest("[data-remove-zone]");
  if (b) {
    state.reservations.splice(Number(b.dataset.removeZone), 1);
    renderReserves();
    run();
  }
};
for (const kind of ["green", "detention"])
  $("#draw-" + kind).onclick = () => {
    state.mode = kind;
    state.draft = [];
    message(
      `Click corners for ${kind === "green" ? "green space" : "detention"}, then Close polygon. Areas must stay inside the site and not overlap.`,
    );
    draw();
  };
$("#cancel-edit").onclick = () => {
  state.mode = "select";
  state.draft = [];
  state.calibration = [];
  renderVertices();
  draw();
  message("Drawing cancelled.");
};
function renderVertices() {
  $("#vertex-editor").innerHTML =
    state.mode === "vertices"
      ? state.site
          .map(
            (p, i) =>
              `<div class="vertex-row"><span>${i + 1}</span><label>X ft<input type="number" data-coordinate="${i}:0" value="${p[0].toFixed(2)}"></label><label>Y ft<input type="number" data-coordinate="${i}:1" value="${p[1].toFixed(2)}"></label><button data-add-vertex="${i}" title="Insert midpoint">+</button><button data-delete-vertex="${i}" ${state.site.length <= 3 ? "disabled" : ""} title="Delete vertex">×</button></div>`,
          )
          .join("")
      : "";
}
$("#edit-boundary").onclick = () => {
  state.mode = state.mode === "vertices" ? "select" : "vertices";
  renderVertices();
  draw();
  message(
    "Drag a boundary handle or edit its local-foot coordinates. + inserts an edge midpoint.",
  );
};
$("#vertex-editor").onchange = (e) => {
  const key = e.target.dataset.coordinate;
  if (!key) return;
  const [i, axis] = key.split(":").map(Number),
    next = structuredClone(state.site),
    v = Number(e.target.value);
  if (!Number.isFinite(v) || Math.abs(v) > 100000) {
    message("Use a finite coordinate within ±100,000 feet.");
    renderVertices();
    return;
  }
  next[i][axis] = v;
  if (!validBoundary(next)) {
    message("Invalid boundary edit; previous coordinates retained.");
    renderVertices();
    return;
  }
  state.site = next;
  state.provenance = "User-edited boundary · verify dimensions";
  run();
  renderVertices();
};
$("#vertex-editor").onclick = (e) => {
  const add = e.target.dataset.addVertex,
    del = e.target.dataset.deleteVertex;
  let next = structuredClone(state.site);
  if (add !== undefined && next.length < 100) {
    const i = Number(add),
      p = next[i],
      q = next[(i + 1) % next.length];
    next.splice(i + 1, 0, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
  } else if (del !== undefined && next.length > 3) next.splice(Number(del), 1);
  else return;
  if (!validBoundary(next)) {
    message("That deletion would create an invalid boundary.");
    return;
  }
  state.site = next;
  state.provenance = "User-edited boundary · verify dimensions";
  renderVertices();
  run();
};
$("#parcel-upload").onchange = async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2000000) throw Error("Use a GeoJSON file under 2 MB.");
    const imported = importParcelGeoJSON(JSON.parse(await f.text()));
    Object.assign(state, {
      site: imported.site,
      provenance: imported.provenance,
      reservations: [],
      image: null,
      imageName: "",
      scale: 1,
      locked: true,
      mode: "select",
      draft: [],
      calibration: [],
    });
    $("#site-title").textContent = f.name;
    $("#file-status").textContent =
      "Parcel geometry imported; verify the boundary against your survey.";
    renderReserves();
    renderVertices();
    run();
  } catch (err) {
    message("Parcel import failed: " + err.message);
  }
  e.target.value = "";
};
updateProgramDescription();
