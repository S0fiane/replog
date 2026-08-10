// Replog — shared UI helpers.

// SVG element names that must be created in the SVG namespace. Without this,
// chart.js's el("line"/"polyline"/"circle"/"text") would build HTMLUnknownElement
// nodes that silently fail to render inside an <svg>.
const SVG_TAGS = new Set([
  "svg", "g", "line", "polyline", "polygon", "path", "rect", "circle",
  "ellipse", "text", "tspan", "defs", "use", "clippath", "lineargradient",
  "radialgradient", "stop", "pattern", "marker", "filter", "image",
  "foreignobject", "title", "desc",
]);

export function el(tag, attrs = {}, ...children) {
  const node = SVG_TAGS.has(tag.toLowerCase())
    ? document.createElementNS("http://www.w3.org/2000/svg", tag)
    : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    // setAttribute("class") works for both HTML and SVG; the className PROPERTY
    // is a read-only SVGAnimatedString on SVG elements, so never assign to it.
    if (k === "class") node.setAttribute("class", v);
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function mount(node) {
  const app = document.getElementById("app");
  clear(app);
  app.append(node);
  return app;
}

let toastTimer;
export function toast(msg, { type = "" } = {}) {
  document.querySelector(".toast")?.remove();
  const t = el("div", { class: `toast ${type}`, text: msg });
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2400);
}

// Lucide-style inline SVG icons. stroke=currentColor.
const PATHS = {
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  back: '<polyline points="15 18 9 12 15 6"/>',
  chevron: '<polyline points="9 18 15 12 9 6"/>',
  dumbbell: '<path d="M6 4v16M18 4v16M2 8v8M22 8v8M6 12h12"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 4-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
};

export function icon(name, { size = 20, class: cls = "icon" } = {}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", cls);  // SVGElement.className is a read-only SVGAnimatedString — must use setAttribute, not assignment
  svg.innerHTML = PATHS[name] || "";
  return svg;
}

// ---- formatting ----

// Volume for one set. DB exercises: weight is per hand, multiply by 2.
export function setVolume({ reps, weight_kg, is_dumbbell }) {
  const w = Number(weight_kg) || 0;
  const r = Number(reps) || 0;
  return (is_dumbbell ? w * 2 : w) * r;
}

export function fmtKg(n) {
  const v = Number(n) || 0;
  return v % 1 === 0 ? String(v) : v.toFixed(1).replace(/\.0$/, "");
}

export function fmtDate(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function fmtDateFull(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// Format a millisecond duration as m:ss or h:mm:ss. Used for the live session
// timer and the total-duration line on the session-detail view.
export function fmtDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${m}:${String(ss).padStart(2, "0")}`;
}

// Normalize European decimal comma "3,6" -> "3.6"
export function normNum(str) {
  if (str == null) return "";
  return String(str).replace(",", ".").trim();
}

// ---- topbar ----
export function topbar({ title, onBack, right } = {}) {
  const bar = el("div", { class: "topbar" },
    el("div", { class: "topbar-inner" },
      onBack
        ? el("button", { class: "btn ghost icon", "aria-label": "Back", onclick: onBack }, icon("back"))
        : el("div", { class: "brand" }, el("span", { class: "mark" }, "◆"), "Replog"),
      el("div", { class: "head", style: "flex:1; font-size:1.05rem;" }, title || ""),
      right || el("div", { class: "spacer" })
    )
  );
  return bar;
}