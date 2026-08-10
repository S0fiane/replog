// Replog — settings: account, library, history import, backup, logout.
import { supabase, listExercises, listSessions, listSetsForSession, upsertExercises, createSession, insertSets } from "../db.js";
import { signOut } from "../auth.js";
import { seedLibrary, importHistory } from "../seed.js";
import { el, mount, icon, topbar, toast } from "../ui.js";

export async function render(ctx) {
  const root = el("div", {},
    topbar({ title: "Settings", onBack: () => ctx.navigate("#/") }),
    el("div", { class: "screen container", id: "set-body" }, el("div", { class: "empty" }, "Loading…"))
  );
  mount(root);
  const body = root.querySelector("#set-body");
  clear(body);

  const { data: { user } } = await supabase.auth.getUser();

  // account
  body.append(section("Account",
    kv("Signed in as", user?.email || "—"),
    el("button", { class: "btn danger block", style: "margin-top:10px", onclick: async () => { await signOut(); ctx.navigate("#/login"); } },
      icon("logout"), "Log out")
  ));

  // library
  body.append(section("Exercise library",
    el("p", { class: "muted", style: "margin:0 0 10px" }, "Re-adds the default exercise list. Your custom entries and history are kept."),
    el("button", { class: "btn block", onclick: async () => {
      try { await seedLibrary(); toast("Library refreshed"); } catch (e) { toast(e.message, { type: "err" }); }
    } }, "Re-seed library")
  ));

  // history import
  body.append(section("Workout history",
    el("p", { class: "muted", style: "margin:0 0 10px" }, "Imports your past workouts parsed from your Sport folder (best-effort dates). Safe to re-run — skips sessions already imported."),
    el("button", { class: "btn primary block", id: "import-btn", onclick: doImport },
      icon("upload"), "Import past workouts"),
    el("div", { id: "import-status", style: "margin-top:10px" })
  ));

  // backup
  body.append(section("Backup",
    el("p", { class: "muted", style: "margin:0 0 10px" }, "Download all your data as JSON. Keep it somewhere safe."),
    el("div", { class: "flex gap" },
      el("button", { class: "btn", style: "flex:1", onclick: exportJson }, icon("download"), "Export JSON"),
      el("label", { class: "btn", style: "flex:1; cursor:pointer" },
        icon("upload"), "Import JSON",
        el("input", { type: "file", accept: "application/json", style: "display:none", onchange: importJson })
      )
    )
  ));

  // about
  body.append(section("About",
    el("p", { class: "muted", style: "margin:0" }, "Replog — a minimal workout tracker. Data syncs via Supabase; hosted on GitHub Pages.")
  ));
}

async function doImport() {
  const btn = document.querySelector("#import-btn");
  const status = document.querySelector("#import-status");
  btn.disabled = true; btn.textContent = "Importing…";
  clear(status);
  try {
    const res = await importHistory((done, total, msg) => {
      btn.textContent = `Importing ${done}/${total}…`;
      status.append(el("div", { class: "muted", style: "font-size:.85rem; margin-top:4px" }, msg));
    });
    status.append(el("div", { class: "notice", style: "margin-top:8px" }, `Done. ${res.imported} imported, ${res.skipped} skipped.`));
    toast(`Imported ${res.imported} session(s)`);
  } catch (e) {
    status.append(el("div", { class: "notice", style: "border-color:#3A2224; margin-top:8px" }, "Import failed: " + e.message));
  } finally {
    btn.disabled = false; btn.textContent = "Import past workouts";
  }
}

async function exportJson() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const exercises = await listExercises();
    const sessions = await listSessions({ limit: 1000 });
    const out = { exported_at: new Date().toISOString(), user: user?.email, exercises, sessions: [] };
    for (const s of sessions) {
      const sets = await listSetsForSession(s.id);
      out.sessions.push({ ...s, sets: sets.map(({ exercises: _ex, ...rest }) => rest) });
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `replog-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Backup downloaded");
  } catch (e) { toast("Export failed: " + e.message, { type: "err" }); }
}

async function importJson(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.exercises || !data.sessions) throw new Error("Not a Replog backup file");
    const { data: { user } } = await supabase.auth.getUser();
    // upsert exercises
    await upsertExercises(data.exercises.map((x) => ({ user_id: user.id, name: x.name, is_dumbbell: !!x.is_dumbbell })));
    const lib = await listExercises();
    const byName = new Map(lib.map((x) => [x.name, x]));
    let count = 0;
    for (const s of data.sessions) {
      const session = await createSession({ name: s.name, workoutDate: s.workout_date, notes: s.notes });
      const rows = (s.sets || []).map((set, i) => {
        const ex = byName.get(set.exercise_name) || byName.get(set.exercise_id);
        return ex ? {
          user_id: user.id, session_id: session.id, exercise_id: ex.id,
          set_index: set.set_index || i + 1, reps: set.reps || 0,
          weight_kg: set.weight_kg || 0, rest_sec: set.rest_sec ?? null,
          superset_group: set.superset_group ?? null,
        } : null;
      }).filter(Boolean);
      if (rows.length) await insertSets(rows);
      count++;
    }
    toast(`Restored ${count} session(s)`);
    location.hash = "#/history";
  } catch (err) {
    toast("Import failed: " + err.message, { type: "err" });
  } finally {
    e.target.value = "";
  }
}

// ---- helpers ----
function section(title, ...children) {
  return el("div", { class: "settings-section" },
    el("h2", {}, title),
    el("div", { class: "card" }, ...children)
  );
}
function kv(k, v) {
  return el("div", { class: "kv" }, el("div", { class: "k" }, k), el("div", {}, v));
}
function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }