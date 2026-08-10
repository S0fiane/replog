// Replog — entry, hash router, auth gating, bottom nav.
import { onAuthChange, getCurrentUser } from "./auth.js";
import { el, clear, icon } from "./ui.js";
import * as login from "./views/login.js";
import * as home from "./views/home.js";
import * as session from "./views/session.js";
import * as history from "./views/history.js";
import * as exercise from "./views/exercise.js";
import * as settings from "./views/settings.js";

const routes = [
  { re: /^#\/login$/, view: () => login.render() },
  { re: /^#\/$/, view: (ctx) => home.render(ctx) },
  { re: /^#\/session\/([\w-]+)$/, view: (ctx) => session.render(ctx) },
  { re: /^#\/history$/, view: (ctx) => history.list(ctx) },
  { re: /^#\/session-detail\/([\w-]+)$/, view: (ctx) => history.detail(ctx) },
  { re: /^#\/exercise$/, view: (ctx) => exercise.picker(ctx) },
  { re: /^#\/exercise\/([\w-]+)$/, view: (ctx) => exercise.detail(ctx) },
  { re: /^#\/settings$/, view: (ctx) => settings.render(ctx) },
];

const NAV = [
  { hash: "#/", icon: "history", label: "Home" },
  { hash: "#/exercise", icon: "chart", label: "Progress" },
  { hash: "#/settings", icon: "settings", label: "Settings" },
];

function parseRoute() {
  const hash = location.hash || "#/";
  for (const r of routes) {
    const m = hash.match(r.re);
    if (m) return { route: r, params: { id: m[1] } };
  }
  return { route: routes[1], params: {} }; // default home
}

const ctx = {
  get params() { return parseRoute().params; },
  navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  },
};

let currentUser = null;

async function render() {
  const { route } = parseRoute();
  // auth gate
  if (!currentUser && route.re.source !== "^#/login$") {
    location.hash = "#/login";
    return;
  }
  if (currentUser && route.re.source === "^#/login$") {
    location.hash = "#/";
    return;
  }
  await route.view(ctx);
  if (currentUser) mountNav();
  else document.querySelector(".bottom-nav")?.remove();
}

function mountNav() {
  document.querySelector(".bottom-nav")?.remove();
  const cur = location.hash || "#/";
  const bar = el("div", { class: "bottom-nav" },
    ...NAV.map((n) => {
      const on = cur === n.hash || (n.hash === "#/" && cur.startsWith("#/session"));
      const b = el("button", {
        class: `nav-btn${on ? " on" : ""}`,
        "aria-label": n.label,
        onclick: () => ctx.navigate(n.hash),
      }, icon(n.icon, { size: 22 }), el("span", {}, n.label));
      return b;
    })
  );
  document.body.append(bar);
}

// initial auth resolve + subscribe
(async () => {
  currentUser = await getCurrentUser();
  render();
})();

onAuthChange((user) => {
  currentUser = user;
  render();
});

window.addEventListener("hashchange", render);