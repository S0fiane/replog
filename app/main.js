// Replog — entry, hash router, auth gating, bottom nav.
import { onAuthChange, getCurrentUser } from "./auth.js";
import { el, clear, icon } from "./ui.js";
import * as login from "./views/login.js";
import * as home from "./views/home.js";
import * as newView from "./views/new.js";
import * as session from "./views/session.js";
import * as history from "./views/history.js";
import * as exercise from "./views/exercise.js";
import * as settings from "./views/settings.js";

const routes = [
  { re: /^#\/login$/, view: () => login.render() },
  { re: /^#\/$/, view: (ctx) => home.render(ctx) },
  { re: /^#\/new$/, view: (ctx) => newView.render(ctx) },
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
  // No session yet: render the login view DIRECTLY. Do not redirect via hash —
  // relying on a hashchange event to re-trigger render() is unreliable on load
  // and left the boot screen stuck.
  if (!currentUser) {
    try {
      await login.render();
      window.__replogBooted = true;
      if (window.__replogDeadline) clearTimeout(window.__replogDeadline);
    } catch (err) {
      showError(err);
      return;
    }
    document.querySelector(".bottom-nav")?.remove();
    return;
  }
  // Logged in but still on #/login → send home.
  if (route.re.source === "^#/login$") {
    location.hash = "#/";
    return;
  }
  try {
    await route.view(ctx);
    window.__replogBooted = true;
    if (window.__replogDeadline) clearTimeout(window.__replogDeadline);
  } catch (err) {
    showError(err);
    return;
  }
  mountNav();
}

function showError(err) {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const card = el("div", { class: "center-screen" },
    el("div", { class: "login-card" },
      el("div", { class: "mark", style: "color:var(--danger)" }, "◆"),
      el("h1", {}, "Something went wrong"),
      el("p", { class: "muted" }, err && err.message ? err.message : String(err)),
      el("button", { class: "btn block", onclick: () => location.reload() }, "Reload")
    )
  );
  app.append(card);
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
// Render immediately (assume logged out → login screen) so the UI never
// hangs on the network; resolve the real session in the background.
// Wrapped so ANY init-time throw surfaces a precise message on screen
// instead of the silent boot-screen deadline.
try {
  currentUser = null;
  render();

  getCurrentUser()
    .then((u) => { currentUser = u || null; render(); })
    .catch(() => { /* already showing login */ });

  onAuthChange((user) => {
    currentUser = user;
    render();
  });

  // Safety net for magic-link callbacks: detectSessionInUrl establishes the
  // session from the URL hash asynchronously, and onAuthStateChange doesn't
  // always reach us (in-app browsers, cross-tab quirks). Poll briefly so a
  // session that lands a moment after load still flips us off the login view.
  (async () => {
    for (let i = 0; i < 14; i++) {
      if (currentUser) return;
      await new Promise((r) => setTimeout(r, 450));
      try {
        const u = await getCurrentUser();
        if (u) { currentUser = u; render(); return; }
      } catch { /* keep polling */ }
    }
  })();

  window.addEventListener("hashchange", render);
  window.addEventListener("error", (e) => showError(e.error || new Error(e.message)));
  window.addEventListener("unhandledrejection", (e) => showError(e.reason));
} catch (initErr) {
  if (window.__replogShowErr) {
    window.__replogShowErr(
      "init: " + ((initErr && initErr.message) || String(initErr)),
      (initErr && initErr.stack) ? String(initErr.stack).split("\n").slice(0, 2).join(" | ") : "",
      ""
    );
  }
}