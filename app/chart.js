// Replog — tiny inline-SVG line chart. No dependencies.
// data: [{ label, value, raw? }]  (chronological)
import { el } from "./ui.js";

export function lineChart(data, { width = 560, height = 200, yLabel = "" } = {}) {
  const padL = 44, padR = 16, padT = 16, padB = 28;
  const w = Math.max(width, 280);
  const h = height;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const values = data.map((d) => d.value);
  const maxV = Math.max(1, ...values);
  const minV = Math.min(0, ...values);
  const span = maxV - minV || 1;

  const x = (i) => padL + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v) => padT + plotH - ((v - minV) / span) * plotH;

  // y ticks (4 lines)
  const ticks = 4;
  const tickEls = [];
  for (let t = 0; t <= ticks; t++) {
    const val = minV + (span * t) / ticks;
    const yy = y(val);
    tickEls.push(
      el("line", { class: "chart-grid", x1: padL, y1: yy, x2: w - padR, y2: yy }),
      el("text", { class: "chart-axis", x: padL - 8, y: yy + 4, "text-anchor": "end" }, fmt(val))
    );
  }

  // line path
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const line = el("polyline", { class: "chart-line", points: pts });

  // dots + x labels
  const dots = data.map((d, i) =>
    el("circle", {
      class: "chart-dot", cx: x(i), cy: y(d.value), r: 4,
      "aria-label": `${d.label}: ${fmt(d.value)}${yLabel}`,
    })
  );
  // x labels: show ~4 to avoid crowding
  const xLabels = data.map((d, i) => {
    const show = data.length <= 6 || i % Math.ceil(data.length / 5) === 0 || i === data.length - 1;
    if (!show) return null;
    return el("text", { class: "chart-axis", x: x(i), y: h - 8, "text-anchor": "middle" }, d.label);
  }).filter(Boolean);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.classList.add("chart-svg");
  [...tickEls, line, ...dots, ...xLabels].forEach((n) => svg.append(n));

  const wrap = el("div", { class: "chart-wrap" }, svg);
  if (yLabel) wrap.append(el("div", { class: "chart-label", style: "text-align:center; margin-top:6px" }, yLabel));
  return wrap;
}

function fmt(v) {
  const n = Number(v) || 0;
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}