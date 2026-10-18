import "./studio.css";
import exportStyle from "./studio.css?raw";
import {
  cottageBase,
  objectRing,
  porchRing,
  rectangle,
  bounds,
  validateProject,
  moveObject,
  solveParking,
  bestParking,
  planMetrics,
} from "./studio-model.js";
import { area, inset, validBoundary } from "./engine.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const key = "clutch-placement-v1",
  clone = (p) => structuredClone(p),
  fmt = (n) => Math.round(n).toLocaleString();
let project = cottageBase(),
  selected = null,
  mode = "select",
  draft = [],
  history = [],
  future = [],
  drag = null,
  notice =
    "Illustrative cottage courtyard. Every home is independently editable.",
  results = [],
  metrics,
  showCars = true;
try {
  const saved = localStorage.getItem(key);
  if (saved) project = validateProject(JSON.parse(saved));
} catch {
  notice = "Saved studio project could not be loaded; the example is shown.";
}
const root = $("#app");
root.innerHTML = `<header><div class="brand"><span class="brand-mark">C</span><div>Clutch <b>PropDev.io</b><small>PLACEMENT STUDIO · CONCEPT DESIGN</small></div></div><nav><a href="?legacy=1">v0.5 workspace</a><button id="save">Save project</button><button id="open">Open</button><button id="export">Export plan</button></nav></header><main><aside class="library"><div class="eyebrow">01 / COMPOSE YOUR SITE</div><h1>Room for a<br>better plan.</h1><p>Place homes. Shape open space.<br>Fit parking around the site.</p><div class="presets"><button id="example">Cottage courtyard</button><button id="blank">Empty parcel</button></div><h3>Place on the plan</h3><div class="tools">${[
  ["select", "↖", "Select / move"],
  ["home", "⌂", "Home"],
  ["parking", "▱", "Parking area"],
  ["landscape", "♧", "Landscape"],
  ["pond", "≈", "Detention pond"],
  ["drive", "═", "Connecting drive"],
  ["boundary", "◇", "Property corners"],
]
  .map(
    ([id, icon, name]) =>
      `<button data-mode="${id}"><span>${icon}</span>${name}</button>`,
  )
  .join(
    "",
  )}</div><button class="primary" id="fill">Fill available site with parking</button><p class="hint">Parking follows your drawn area, avoiding homes, ponds and landscape. Full spaces only; drive connections are checked separately.</p><div id="draw-controls" hidden><button id="close">Finish outline</button><button id="back">Undo point</button><button id="cancel">Cancel</button></div><h3>Site assumptions</h3><label>Setback · ft<input id="setback" type="number" min="0" max="100"></label><div class="pair"><label>Stall width · ft<input id="stallWidth" type="number" min="8" max="12"></label><label>Stall depth · ft<input id="stallDepth" type="number" min="16" max="24"></label><label>Aisle · ft<input id="aisleWidth" type="number" min="20" max="40"></label><label>Spaces / home<input id="parkingRatio" type="number" min="0" max="5" step="0.1"></label></div><button id="image">Upload site image</button><button id="calibrate">Calibrate image</button><label id="calibration-label" hidden>Known distance · ft<input id="known-distance" type="number" value="100" min="1"></label><p class="hint">Paste or upload PNG/JPG/WebP, calibrate two points, then trace the property. Images remain in this browser. Use “Property corners” to drag corners; “Trace property” to replace the outline.</p><button id="trace">Trace property</button><button id="remove-image">Remove image</button></aside><section class="work"><div class="work-head"><div><div class="eyebrow">SITE PLAN / A–01</div><input id="name" aria-label="Project name"></div><div class="acres" id="acres"></div></div><div class="canvas-tools"><span id="instruction"></span><div><label><input id="cars" type="checkbox" checked> Cars</label><button id="undo" title="Undo">↶</button><button id="redo" title="Redo">↷</button></div></div><div class="sheet"><svg id="plan" xmlns="http://www.w3.org/2000/svg" aria-label="Editable architectural site plan" role="img"></svg></div><div class="status" id="status" role="status"></div><footer><span>CONCEPT ONLY · LOCAL FEET · NORTH ASSUMED</span><span>Original design · Clutch Industries</span></footer></section><aside class="inspector"><div class="eyebrow">02 / SITE SCHEDULE</div><div class="yield"><strong id="homes"></strong><span>homes on site</span></div><div class="stats" id="stats"></div><section id="selection"></section><details open><summary>Feasibility checks</summary><ul id="warnings"></ul></details><details><summary>Detention assumptions</summary><p class="hint">Volume estimate only: rainfall × weighted contributing area × allowance. Storage = pond area × depth × utilization. No outlet, infiltration, slope, routing or regulatory sizing.</p>${[
  ["rain", "Rainfall · inches"],
  ["depth", "Storage depth · ft"],
  ["impervious", "Impervious runoff fraction"],
  ["pervious", "Pervious runoff fraction"],
  ["utilization", "Storage utilization"],
  ["allowance", "Volume allowance"],
]
  .map(
    ([k, l]) =>
      `<label>${l}<input data-storm="${k}" type="number" step="0.05"></label>`,
  )
  .join(
    "",
  )}<p id="storm-result"></p></details><p class="hint">Demonstration dimensions and assumptions. Parking is a sampled layout, not a global optimum. Verify setbacks, fire access, accessible spaces, grades and drainage with your design team.</p></aside></main><input id="file" type="file" accept="application/json" hidden><input id="image-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>`;
function persist() {
  try {
    localStorage.setItem(key, JSON.stringify(project));
  } catch {
    notice =
      "Browser storage is full. Save a project file to preserve your changes.";
  }
}
function commit(next, message) {
  validateProject(next);
  history.push(clone(project));
  if (history.length > 40) history.shift();
  future = [];
  project = next;
  notice = message;
  persist();
  render();
}
function attempt(fn) {
  try {
    fn();
  } catch (e) {
    notice = e.message;
    $("#status").textContent = notice;
  }
}
function path(r) {
  return r.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ") + "Z";
}
function polygonPath(p) {
  return p.map(path).join(" ");
}
function polygon(r, cls, attr = "") {
  return `<path d="${path(r)}" class="${cls}" ${attr}/>`;
}
function center(o) {
  if (o.center) return o.center;
  const b = bounds(o.ring);
  return [b.x + b.w / 2, b.y + b.h / 2];
}
function translated(o, dx, dy) {
  const n = clone(o);
  if (n.ring) n.ring = n.ring.map(([x, y]) => [x + dx, y + dy]);
  else n.center = [n.center[0] + dx, n.center[1] + dy];
  return n;
}
function transformed(o, width, height, degrees) {
  const n = clone(o);
  if (!n.ring) return { ...n, length: width, depth: height, degrees };
  const b = bounds(n.ring),
    c = center(n),
    a = (degrees * Math.PI) / 180;
  n.ring = n.ring.map(([x, y]) => {
    const u = ((x - c[0]) * width) / b.w,
      v = ((y - c[1]) * height) / b.h;
    return [
      c[0] + u * Math.cos(a) - v * Math.sin(a),
      c[1] + u * Math.sin(a) + v * Math.cos(a),
    ];
  });
  return n;
}
function selectedObject() {
  return (
    project.objects.find((o) => o.id === selected) ||
    project.parking.find((o) => o.id === selected)
  );
}
function render() {
  results = project.parking.map((r) => solveParking(project, r));
  metrics = planMetrics(project, results);
  $("#name").value = project.name;
  $("#acres").textContent = (metrics.siteArea / 43560).toFixed(2) + " AC";
  $("#homes").textContent = metrics.units;
  $("#stats").innerHTML = [
    ["Parking spaces", metrics.stalls],
    ["Assumed need", metrics.required],
    ["Gross floor sf", fmt(metrics.gross)],
    ["Landscape sf", fmt(metrics.greenArea)],
    ["Pond footprint sf", fmt(metrics.pondArea)],
    ["Paved area sf", fmt(metrics.pavedArea)],
  ]
    .map(([l, v]) => `<div><strong>${v}</strong><span>${l}</span></div>`)
    .join("");
  $("#warnings").innerHTML = metrics.warnings.length
    ? metrics.warnings.map((w) => `<li>${esc(w)}</li>`).join("")
    : '<li class="ok">No detected placement conflicts. Access and engineering still require review.</li>';
  $("#storm-result").textContent =
    `Estimated target ${fmt(metrics.target)} cu ft · storage ${fmt(metrics.capacity)} cu ft · shortfall ${fmt(Math.max(0, metrics.target - metrics.capacity))} cu ft.`;
  for (const k of [
    "setback",
    "stallWidth",
    "stallDepth",
    "aisleWidth",
    "parkingRatio",
  ])
    $("#" + k).value = project[k];
  document
    .querySelectorAll("[data-storm]")
    .forEach((el) => (el.value = project.storm[el.dataset.storm]));
  document
    .querySelectorAll("[data-mode]")
    .forEach((el) => el.classList.toggle("active", el.dataset.mode === mode));
  $("#draw-controls").hidden = ![
    "parking",
    "landscape",
    "pond",
    "drive",
    "trace",
    "calibrate",
  ].includes(mode);
  $("#calibration-label").hidden = mode !== "calibrate";
  $("#instruction").textContent =
    mode === "select"
      ? "Drag objects · select to resize or rotate"
      : mode === "home"
        ? "Click clear space to place a cottage"
        : mode === "boundary"
          ? "Drag a property corner · distances update live"
          : mode === "calibrate"
            ? "Click two points with a known distance"
            : `Click corners to draw ${mode === "trace" ? "the property" : mode} · Finish outline`;
  $("#status").textContent = notice;
  $("#undo").disabled = !history.length;
  $("#redo").disabled = !future.length;
  renderSelection();
  draw();
}
function renderSelection() {
  const o = selectedObject(),
    s = $("#selection");
  if (!o) {
    s.innerHTML =
      '<h3>Object inspector</h3><p class="hint">Select a home, parking area, pond or landscape on the plan to edit it.</p>';
    return;
  }
  const isParking = project.parking.includes(o),
    b = bounds(objectRing(o)),
    c = center(o);
  s.innerHTML = `<div class="eyebrow">03 / ${isParking ? "PARKING AREA" : esc(o.kind.toUpperCase())}</div><h3>${esc(o.label || "Parking region")}</h3><label>Label<input id="object-label" value="${esc(o.label || "Parking region")}"></label>${isParking ? `<div class="pair"><label>Row heading · °<input id="heading" type="number" value="${o.heading}" min="-360" max="360"></label><label>Stall angle<select id="stall-angle">${[45, 60, 90].map((a) => `<option ${a === o.stallAngle ? "selected" : ""}>${a}</option>`).join("")}</select></label></div><button id="best">Fit to site edge directions</button><p class="hint">Samples row directions; keeps the most full spaces. It does not guarantee connected aisles or the best possible layout. Drag blue corners to reshape this region. Earlier regions own overlapping space, so spaces are never counted twice.</p>` : `<div class="pair"><label>Width · ft<input id="width" type="number" min="4" max="600" value="${Math.round(o.length || b.w)}"></label><label>Depth · ft<input id="depth" type="number" min="4" max="600" value="${Math.round(o.depth || b.h)}"></label><label>${o.ring ? "Rotate by" : "Rotation"} · °<input id="rotation" type="number" value="${o.degrees || 0}" min="-360" max="360"></label>${o.kind === "home" ? `<label>Stories<select id="stories">${[1, 2, 3].map((n) => `<option ${n === o.stories ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>Homes / building<input id="unit-count" type="number" min="1" max="24" value="${o.unitCount}"></label>` : ""}</div><button id="apply">Apply dimensions</button>${o.kind === "home" ? `<p class="hint">${fmt(area(objectRing(o)))} sq ft footprint · ${fmt(area(objectRing(o)) * o.stories)} gross sq ft. Orange handle resizes, blue handle rotates. Porch faces the lower roof edge.</p>` : '<p class="hint">Drag blue corners to reshape. Dimensions scale the current outline.</p>'}`}<div class="pair"><button id="duplicate">Duplicate</button><button id="delete" class="danger">Remove</button></div>`;
  $("#object-label").onchange = (e) =>
    attempt(() => {
      const n = clone(project);
      (isParking ? n.parking : n.objects).find((x) => x.id === o.id).label =
        e.target.value.slice(0, 80);
      commit(n, "Label updated.");
    });
  $("#delete").onclick = () => {
    const n = clone(project);
    n.objects = n.objects.filter((x) => x.id !== o.id);
    n.parking = n.parking.filter((x) => x.id !== o.id);
    selected = null;
    commit(n, "Object removed. Parking recalculated.");
  };
  $("#duplicate").onclick = () =>
    attempt(() => {
      const n = clone(project),
        copy = translated(o, 20, 20);
      copy.id = crypto.randomUUID();
      if (isParking) n.parking.push(copy);
      else {
        n.objects.push(copy);
        moveObject(n, copy.id, copy);
      }
      selected = copy.id;
      commit(n, "Duplicate placed. Drag to position.");
    });
  if (isParking) {
    $("#heading").onchange = (e) =>
      attempt(() => {
        const n = clone(project);
        n.parking.find((x) => x.id === o.id).heading = +e.target.value;
        commit(n, "Parking direction updated.");
      });
    $("#stall-angle").onchange = (e) =>
      attempt(() => {
        const n = clone(project);
        n.parking.find((x) => x.id === o.id).stallAngle = +e.target.value;
        commit(n, "Stall angle updated.");
      });
    $("#best").onclick = () =>
      attempt(() => {
        const fit = bestParking(project, o),
          n = clone(project);
        n.parking[n.parking.findIndex((x) => x.id === o.id)] = fit.region;
        commit(
          n,
          `Compared ${fit.tested} row directions. Selected ${fit.region.heading}° with ${fit.result.stalls.length} spaces; review aisle connections.`,
        );
      });
  } else
    $("#apply").onclick = () =>
      attempt(() => {
        const w = +$("#width").value,
          h = +$("#depth").value,
          a = +$("#rotation").value;
        if (
          ![w, h, a].every(Number.isFinite) ||
          w < 4 ||
          h < 4 ||
          w > 600 ||
          h > 600 ||
          Math.abs(a) > 360
        )
          throw Error(
            "Use dimensions 4–600 ft and rotation between −360° and 360°.",
          );
        const next = transformed(o, w, h, a);
        if (o.kind === "home") {
          next.stories = +$("#stories").value;
          next.unitCount = +$("#unit-count").value;
        }
        commit(
          moveObject(project, o.id, next),
          "Object updated. Parking refitted around the footprint.",
        );
      });
}
function draw(preview = project) {
  const svg = $("#plan"),
    b = bounds(project.parcel),
    margin = 38;
  svg.setAttribute(
    "viewBox",
    `${b.x - margin} ${b.y - margin} ${b.w + 2 * margin} ${b.h + 2 * margin}`,
  );
  const img = preview.image;
  let html = `<defs><pattern id="lawn" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M1 2h.4 M5 6h.4" stroke="#adb793" stroke-width=".6"/></pattern></defs>`;
  if (img)
    html += `<image href="${img.url}" x="0" y="0" width="${img.width * img.scale}" height="${img.height * img.scale}" opacity=".45"/>`;
  html += polygon(preview.parcel, "parcel");
  for (const env of inset(preview.parcel, preview.setback))
    html += `<path d="${polygonPath(env)}" class="setback"/>`;
  for (const r of preview.paths)
    html += `<path d="${polygonPath(r)}" class="walk" fill-rule="evenodd"/>`;
  for (const r of preview.roads)
    html += `<path d="${polygonPath(r)}" class="road" fill-rule="evenodd"/>`;
  preview.parking.forEach((region, i) => {
    const result = results[i];
    if (!result) return;
    html += `<g data-id="${esc(region.id)}" class="parking-object">${polygon(region.ring, `parking-region ${selected === region.id ? "chosen" : ""}`)}${result.aisles.map((r) => `<path d="${polygonPath(r)}" class="road parking-aisle" fill-rule="evenodd"/>`).join("")}${result.stalls
      .map((r) => {
        const c = bounds(r),
          cx = c.x + c.w / 2,
          cy = c.y + c.h / 2;
        const angle =
          (Math.atan2(r[2][1] - r[1][1], r[2][0] - r[1][0]) * 180) / Math.PI;
        return (
          polygon(r, "stall") +
          (showCars
            ? `<rect class="car" x="${cx - 6}" y="${cy - 2.7}" width="12" height="5.4" rx="1.3" transform="rotate(${angle} ${cx} ${cy})"/>`
            : "")
        );
      })
      .join("")}</g>`;
  });
  for (const o of preview.objects) {
    const r = objectRing(o),
      c = center(o),
      isHome = o.kind === "home";
    html += `<g data-id="${esc(o.id)}" class="site-object ${selected === o.id ? "selected" : ""}">`;
    if (isHome) {
      html += polygon(porchRing(o), "porch") + polygon(r, "home");
      const a = (o.degrees * Math.PI) / 180,
        dx = Math.cos(a) * o.length * 0.38,
        dy = Math.sin(a) * o.length * 0.38;
      html += `<path d="M${c[0] - dx},${c[1] - dy}L${c[0] + dx},${c[1] + dy}" class="ridge"/><text x="${c[0]}" y="${c[1] + 1.5}" class="object-label">${esc(o.label)}</text>`;
    } else {
      html += polygon(r, o.kind);
      if (o.kind === "landscape") {
        const bb = bounds(r),
          spacing = Math.max(25, Math.sqrt((bb.w * bb.h) / 180));
        for (let y = bb.y + 12; y < bb.y + bb.h - 10; y += spacing)
          for (let x = bb.x + 12; x < bb.x + bb.w - 10; x += spacing) {
            // Trees are illustrative symbols clipped to the landscape.
            html += `<clipPath id="tree-${esc(o.id)}-${x}-${y}"><path d="${path(r)}"/></clipPath><g clip-path="url(#tree-${esc(o.id)}-${x}-${y})"><circle cx="${x}" cy="${y}" r="7.5" class="tree"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="4.7" class="tree-inner"/></g>`;
          }
      }
      html += `<text x="${c[0]}" y="${c[1]}" class="zone-label">${esc(o.label || o.kind)}</text>`;
    }
    html += "</g>";
  }
  const object =
    preview.objects.find((o) => o.id === selected) ||
    preview.parking.find((o) => o.id === selected);
  if (object && mode === "select") {
    if (object.kind === "home") {
      const c = object.center,
        a = (object.degrees * Math.PI) / 180,
        handle = [
          c[0] + Math.sin(a) * (object.depth / 2 + 13),
          c[1] - Math.cos(a) * (object.depth / 2 + 13),
        ],
        corner = objectRing(object)[2];
      html += `<line x1="${c[0]}" y1="${c[1]}" x2="${handle[0]}" y2="${handle[1]}" class="handle-line"/><circle data-handle="rotate" cx="${handle[0]}" cy="${handle[1]}" r="4" class="handle"/><rect data-handle="resize" x="${corner[0] - 3}" y="${corner[1] - 3}" width="6" height="6" class="resize-handle"/>`;
    } else {
      const ring = object.ring,
        vertices =
          JSON.stringify(ring[0]) === JSON.stringify(ring.at(-1))
            ? ring.slice(0, -1)
            : ring;
      if (vertices.length <= 40)
        vertices.forEach(
          (q, i) =>
            (html += `<circle data-vertex="${i}" cx="${q[0]}" cy="${q[1]}" r="3" class="handle"/>`),
        );
    }
  }
  preview.parcel.forEach((q, i) => {
    const r = preview.parcel[(i + 1) % preview.parcel.length],
      len = Math.hypot(r[0] - q[0], r[1] - q[1]);
    html += `<text x="${(q[0] + r[0]) / 2}" y="${(q[1] + r[1]) / 2 - 5}" class="dimension">${len.toFixed(1)}′</text>`;
    if (mode === "boundary")
      html += `<circle data-corner="${i}" cx="${q[0]}" cy="${q[1]}" r="4" class="handle"/>`;
  });
  if (draft.length)
    html +=
      `<polyline points="${draft.map((p) => p.join(",")).join(" ")}" class="draft"/>` +
      draft
        .map(
          (p) => `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" class="handle"/>`,
        )
        .join("");
  html += `<g class="drawing-key"><path d="M${b.x + b.w + 17} ${b.y + 24}v-23m-4 7l4-7 4 7"/><text x="${b.x + b.w + 17}" y="${b.y - 5}">N*</text><path d="M${b.x} ${b.y + b.h + 20}h50m-50-3v6m25-6v6m25-6v6"/><text x="${b.x + 25}" y="${b.y + b.h + 31}">0 — 25 — 50 FT</text></g>`;
  svg.innerHTML = html;
}
const point = (e) => {
  const p = $("#plan").createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  const q = p.matrixTransform($("#plan").getScreenCTM().inverse());
  return [Math.round(q.x * 2) / 2, Math.round(q.y * 2) / 2];
};
$("#plan").onpointerdown = (e) =>
  attempt(() => {
    if (e.button !== 0) return;
    const p = point(e),
      svg = $("#plan");
    if (
      ["parking", "landscape", "pond", "drive", "trace", "calibrate"].includes(
        mode,
      )
    ) {
      draft.push(p);
      if (mode === "calibrate" && draft.length === 2) {
        const distance = +$("#known-distance").value,
          measured = Math.hypot(
            draft[1][0] - draft[0][0],
            draft[1][1] - draft[0][1],
          );
        if (distance <= 0 || !Number.isFinite(distance) || measured < 1)
          throw Error("Enter a positive distance and pick distinct points.");
        const n = clone(project);
        n.image.scale *= distance / measured;
        draft = [];
        mode = "select";
        commit(
          n,
          "Image calibrated. Trace the boundary in feet; existing placed objects retain their dimensions.",
        );
      } else draw();
      return;
    }
    if (mode === "home") {
      const n = clone(project),
        o = {
          id: crypto.randomUUID(),
          kind: "home",
          label: `H${n.objects.filter((x) => x.kind === "home").length + 1}`,
          center: p,
          length: 28,
          depth: 34,
          degrees: 0,
          stories: 1,
          unitCount: 1,
        };
      n.objects.push(o);
      moveObject(n, o.id, o);
      selected = o.id;
      mode = "select";
      commit(n, "Cottage placed. Drag, resize or rotate it.");
      return;
    }
    const corner = e.target.closest("[data-corner]"),
      vertex = e.target.closest("[data-vertex]"),
      handle = e.target.closest("[data-handle]"),
      target = e.target.closest("[data-id]");
    if (corner)
      drag = {
        type: "boundary",
        index: +corner.dataset.corner,
        start: p,
        original: clone(project),
      };
    else if (vertex && selected)
      drag = {
        type: "vertex",
        index: +vertex.dataset.vertex,
        start: p,
        original: clone(project),
        id: selected,
      };
    else if (handle && selected)
      drag = {
        type: handle.dataset.handle,
        start: p,
        original: clone(project),
        id: selected,
      };
    else if (target && mode === "select") {
      selected = target.dataset.id;
      renderSelection();
      draw();
      drag = { type: "move", start: p, original: clone(project), id: selected };
    } else {
      selected = null;
      renderSelection();
      draw();
      return;
    }
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
$("#plan").onpointermove = (e) => {
  if (!drag) return;
  attempt(() => {
    const p = point(e),
      n = clone(drag.original);
    if (drag.type === "boundary") {
      n.parcel[drag.index] = p;
      if (!validBoundary(n.parcel)) return;
    } else {
      const isParking = n.parking.some((o) => o.id === drag.id),
        list = isParking ? n.parking : n.objects,
        i = list.findIndex((o) => o.id === drag.id),
        o = list[i];
      let next = o;
      if (drag.type === "move")
        next = translated(o, p[0] - drag.start[0], p[1] - drag.start[1]);
      if (drag.type === "vertex") {
        next = clone(o);
        const closed =
          JSON.stringify(next.ring[0]) === JSON.stringify(next.ring.at(-1));
        next.ring[drag.index] = p;
        if (closed && drag.index === 0) next.ring[next.ring.length - 1] = p;
      }
      if (drag.type === "rotate") {
        next = {
          ...o,
          degrees: Math.round(
            (Math.atan2(p[1] - o.center[1], p[0] - o.center[0]) * 180) /
              Math.PI +
              90,
          ),
        };
      }
      if (drag.type === "resize") {
        const a = (-o.degrees * Math.PI) / 180,
          dx = p[0] - o.center[0],
          dy = p[1] - o.center[1];
        next = {
          ...o,
          length: Math.max(
            8,
            Math.round(2 * Math.abs(dx * Math.cos(a) - dy * Math.sin(a))),
          ),
          depth: Math.max(
            8,
            Math.round(2 * Math.abs(dx * Math.sin(a) + dy * Math.cos(a))),
          ),
        };
      }
      list[i] = next;
    }
    drag.next = n;
    draw(n);
    $("#status").textContent =
      drag.type === "boundary"
        ? `Parcel: ${fmt(area(n.parcel))} sq ft · ${(area(n.parcel) / 43560).toFixed(2)} acres`
        : "Release to apply and refit parking.";
  });
};
$("#plan").onpointerup = () => {
  if (!drag) return;
  const d = drag;
  drag = null;
  attempt(() => {
    if (!d.next) {
      render();
      return;
    }
    validateProject(d.next);
    if (d.type !== "boundary" && d.next.objects.some((o) => o.id === d.id))
      moveObject(
        d.next,
        d.id,
        d.next.objects.find((o) => o.id === d.id),
      );
    commit(d.next, "Placement updated. Parking refitted around the site.");
  });
  draw();
};
$("#plan").onpointercancel = () => {
  drag = null;
  render();
};
function setMode(next) {
  mode = next;
  draft = [];
  render();
}
root
  .querySelectorAll("[data-mode]")
  .forEach((el) => (el.onclick = () => setMode(el.dataset.mode)));
$("#close").onclick = () =>
  attempt(() => {
    if (draft.length < 3) throw Error("Click at least three corners.");
    if (!validBoundary(draft)) throw Error("Outline edges must not cross.");
    const n = clone(project),
      id = crypto.randomUUID();
    if (mode === "trace") {
      n.parcel = clone(draft);
      n.source = "User-traced approximate boundary";
    } else if (mode === "parking")
      n.parking.push({ id, ring: clone(draft), heading: 0, stallAngle: 90 });
    else {
      const o = {
        id,
        kind: mode,
        label:
          mode === "pond"
            ? "Detention"
            : mode === "drive"
              ? "Connecting drive"
              : "Landscape",
        ring: clone(draft),
      };
      n.objects.push(o);
      moveObject(n, id, o);
    }
    selected = id;
    draft = [];
    mode = "select";
    commit(n, "Outline placed. Parking recalculated.");
  });
$("#back").onclick = () => {
  draft.pop();
  draw();
};
$("#cancel").onclick = () => setMode("select");
$("#fill").onclick = () =>
  attempt(() => {
    const n = clone(project),
      region = {
        id: crypto.randomUUID(),
        ring: clone(n.parcel),
        heading: 0,
        stallAngle: 90,
      };
    n.parking = [region];
    const fit = bestParking(n, region);
    n.parking = [fit.region];
    selected = region.id;
    mode = "select";
    commit(
      n,
      `Parking filled across available site at ${fit.region.heading}°. Review aisle connections and circulation.`,
    );
  });
for (const k of [
  "setback",
  "stallWidth",
  "stallDepth",
  "aisleWidth",
  "parkingRatio",
])
  $("#" + k).onchange = (e) =>
    attempt(() =>
      commit(
        { ...clone(project), [k]: +e.target.value },
        "Assumptions updated; parking regenerated.",
      ),
    );
root.querySelectorAll("[data-storm]").forEach(
  (el) =>
    (el.onchange = () =>
      attempt(() => {
        const n = clone(project);
        n.storm[el.dataset.storm] = +el.value;
        commit(n, "Detention estimate updated.");
      })),
);
$("#name").onchange = (e) =>
  commit(
    { ...clone(project), name: e.target.value.slice(0, 100) },
    "Project renamed.",
  );
$("#example").onclick = () => {
  selected = null;
  commit(
    cottageBase(),
    "Illustrative cottage courtyard loaded. Undo restores your previous plan.",
  );
};
$("#blank").onclick = () => {
  const n = cottageBase();
  n.name = "Untitled site";
  n.objects = [];
  n.parking = [];
  n.paths = [];
  n.roads = [];
  selected = null;
  commit(
    n,
    "Empty demo parcel. Place a home or draw landscape, pond, drives and parking.",
  );
};
$("#undo").onclick = () => {
  if (!history.length) return;
  future.push(clone(project));
  project = history.pop();
  selected = null;
  persist();
  notice = "Undone.";
  render();
};
$("#redo").onclick = () => {
  if (!future.length) return;
  history.push(clone(project));
  project = future.pop();
  selected = null;
  persist();
  notice = "Redone.";
  render();
};
function download(name, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#save").onclick = () =>
  download(
    "clutch-placement.json",
    "application/json",
    JSON.stringify(project, null, 2),
  );
$("#open").onclick = () => $("#file").click();
$("#file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 12e6) throw Error("Project exceeds 12 MB.");
    const n = validateProject(JSON.parse(await file.text()));
    selected = null;
    commit(n, "Project opened.");
  } catch (err) {
    notice = err.message;
    $("#status").textContent = notice;
  }
  e.target.value = "";
};
$("#export").onclick = async () => {
  const svg = $("#plan").cloneNode(true);
  svg
    .querySelectorAll(
      "[data-handle],[data-vertex],[data-corner],.handle-line,.draft",
    )
    .forEach((el) => el.remove());
  svg
    .querySelectorAll(".selected,.chosen")
    .forEach((el) => el.classList.remove("selected", "chosen"));
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = exportStyle;
  svg.prepend(style);
  svg.setAttribute("width", "1200");
  svg.setAttribute("height", "1400");
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text"),
    b = bounds(project.parcel);
  text.setAttribute("x", b.x);
  text.setAttribute("y", b.y - 20);
  text.setAttribute("font-size", "6");
  text.textContent = `${project.name} · CONCEPT ONLY · ${metrics.units} homes / ${metrics.stalls} spaces · North assumed`;
  svg.append(text);
  download(
    "clutch-site-plan.svg",
    "image/svg+xml",
    new XMLSerializer().serializeToString(svg),
  );
};
$("#cars").onchange = (e) => {
  showCars = e.target.checked;
  draw();
};
$("#image").onclick = () => $("#image-file").click();
async function loadImage(file) {
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw Error("Use a PNG, JPG or WebP image.");
  if (file.size > 8e6) throw Error("Use an image smaller than 8 MB.");
  const url = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    }),
    im = new Image();
  im.src = url;
  await im.decode();
  const n = clone(project);
  n.image = {
    url,
    width: im.naturalWidth,
    height: im.naturalHeight,
    scale: bounds(n.parcel).w / im.naturalWidth,
  };
  commit(
    n,
    "Reference image loaded at assumed scale. Calibrate before tracing.",
  );
}
$("#image-file").onchange = (e) =>
  loadImage(e.target.files[0]).catch((e) => {
    $("#status").textContent = e.message;
  });
document.addEventListener("paste", (e) => {
  const file = [...(e.clipboardData?.files || [])].find((f) =>
    f.type.startsWith("image/"),
  );
  if (file) {
    e.preventDefault();
    loadImage(file).catch((e) => {
      $("#status").textContent = e.message;
    });
  }
});
$("#calibrate").onclick = () =>
  attempt(() => {
    if (!project.image) throw Error("Upload a site image first.");
    setMode("calibrate");
  });
$("#trace").onclick = () => setMode("trace");
$("#remove-image").onclick = () =>
  commit({ ...clone(project), image: null }, "Reference image removed.");
render();
