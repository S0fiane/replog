// Full-graph repro: real UMD + real createClient + import main.js exactly as
// the browser does, with a hard timeout. If an import throws, this catches it.
import { readFileSync } from "node:fs";

globalThis.self = globalThis;
globalThis.window = globalThis;
try { Object.defineProperty(globalThis, "navigator", { value: { userAgent: "node-repro", language: "en", locks: { request: (_m, _o, cb) => cb({ name: "lock", mode: "exclusive" }), supported: true }, storage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} } }, configurable: true, writable: true }); } catch {}
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
globalThis.location = { hash: "", href: "https://s0fiane.github.io/replog/", origin: "https://s0fiane.github.io", host: "s0fiane.github.io", pathname: "/replog/", search: "" };
globalThis.WebSocket = class { constructor() {} close() {} };
const fakeEl = () => new Proxy({ innerHTML: "", style: {}, value: "", textContent: "", dataset: {} }, {
  get(t, p) {
    if (p in t) return t[p];
    if (p === "append" || p === "appendChild") return (...k) => k[k.length-1];
    if (p === "querySelector" || p === "querySelectorAll") return () => null;
    if (p === "addEventListener" || p === "setAttribute" || p === "remove" || p === "removeEventListener") return () => {};
    if (p === "removeChild") return (k) => k;
    if (p === "getElementsByTagName") return () => [];
    return undefined;
  },
  set(t, p, v) { t[p] = v; return true; },
});
const scriptEl = { tagName: "SCRIPT", src: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", getAttribute: () => null };
globalThis.document = new Proxy({ body: fakeEl(), documentElement: fakeEl(), head: fakeEl(), createElement: () => fakeEl(), createElementNS: () => fakeEl(), createTextNode: (t) => ({ nodeType: 3, textContent: t }), getElementById: () => fakeEl(), querySelector: () => null, querySelectorAll: () => [], getElementsByTagName: () => [scriptEl], addEventListener: () => {}, removeEventListener: () => {}, currentScript: scriptEl, readyState: "complete" }, { get(t, p) { return p in t ? t[p] : () => null; } });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};

// load real UMD
const code = readFileSync("C:/claude_code/Projects/Workout-Tracker/vendor/supabase-js.min.js", "utf8");
try { (0, eval)(code); } catch (e) { console.error("UMD EVAL THREW:", e.message); process.exit(1); }

// capture any error showError swallows
globalThis.__replogShowErr = (msg, src, line) => console.log(">>> SHOWERR:", msg, src, line);

// import main.js with a hard timeout (getCurrentUser fires a real network call)
const base = "file:///C:/claude_code/Projects/Workout-Tracker/app/main.js";
const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("import timed out (>10s)")), 10000));
try {
  await Promise.race([import(base), timeout]);
  console.log(">>> main.js imported OK — module graph fully evaluated");
  // drain microtasks + timers so render()'s async continuation can complete
  await new Promise((r) => setTimeout(r, 200));
  console.log(">>> __replogBooted =", globalThis.__replogBooted);
} catch (e) {
  console.error(">>> IMPORT FAILED:", e.message);
  console.error(e.stack);
}
process.exit(0);