// Replog — exercise picker + per-exercise history with progress chart.
import { listExercises, listSetsForExercise } from "../db.js";
import { lineChart } from "../chart.js";
import { el, mount, icon, topbar, fmtDate, fmtKg, setVolume } from "../ui.js";

// ---- picker ----
export async function picker(ctx) {
  const root = el("div", {},
    topbar({ title: "Progress", onBack: () => ctx.navigate("#/") }),
    el("div", { class: "screen container", id: "ex-body" }, el("div", { class: "empty" }, "Loading…"))
  );
  mount(root);
  const body = root.querySelector("#ex-body");

  try {
    const exercises = await listExercises();
    clear(body);
    body.append(
      el("h1", { style: "margin-bottom:6px" }, "Exercise progress"),
      el("p", { class: "muted", style: "margin:0 0 14px" }, "Pick an exercise to see your history and progress chart.")
    );
    if (!exercises.length) {
      body.append(el("div", { class: "empty" }, "No exercises yet."));
      return;
    }
    const list = el("div", { class: "list" });
    for (const e of exercises) {
      list.append(el("div", { class: "item", onclick: () => ctx.navigate(`#/exercise/${e.id}`) },
        el("div", { class: "meta" },
          el("div", { class: "title" }, e.name),
          el("div", { class: "sub" }, e.is_dumbbell ? "Dumbbell · kg/hand ×2" : "kg")
        ),
        el("div", { class: "chev" }, icon("chart"))
      ));
    }
    body.append(list);
  } catch (e) {
    clear(body);
    body.append(el("div", { class: "empty" }, "Could not load: " + e.message));
  }
}

// ---- detail ----
export async function detail(ctx) {
  const id = ctx.params?.id;
  const root = el("div", {},
    topbar({ title: "Progress", onBack: () => ctx.navigate("#/exercise") }),
    el("div", { class: "screen container", id: "ed-body" }, el("div", { class: "empty" }, "Loading…"))
  );
  mount(root);
  const body = root.querySelector("#ed-body");

  try {
    const all = await listExercises();
    const ex = all.find((e) => e.id === id);
    if (!ex) { clear(body); body.textContent = "Exercise not found."; return; }

    const sets = await listSetsForExercise(id);
    clear(body);

    body.append(
      el("h1", {}, ex.name),
      el("div", { class: "muted", style: "margin-bottom:14px" }, ex.is_dumbbell ? "Dumbbell · weight is per hand (×2 for total)" : "Weight in kg")
    );

    if (!sets.length) {
      body.append(el("div", { class: "empty" }, "No sets logged for this exercise yet."));
      return;
    }

    // group by session date
    const byDate = new Map();
    for (const s of sets) {
      const key = s.sessions?.workout_date || "—";
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(s);
    }
    const dates = [...byDate.keys()].sort();

    // ---- chart: top set weight per session ----
    const chartData = dates.map((d) => {
      const ss = byDate.get(d);
      const top = ss.reduce((m, s) => Math.max(m, Number(s.weight_kg) || 0), 0);
      return { label: fmtDate(d).split(" ").slice(1).join(" "), value: top };
    });
    body.append(
      el("div", { class: "head", style: "margin-bottom:6px; color:var(--muted); font-size:.8rem; text-transform:uppercase; letter-spacing:.06em" }, "Top set weight"),
      lineChart(chartData, { yLabel: ex.is_dumbbell ? "kg / hand" : "kg" }),
      el("div", { style: "height:16px" })
    );

    // ---- history list (newest first) ----
    body.append(
      el("div", { class: "head", style: "margin-bottom:6px; color:var(--muted); font-size:.8rem; text-transform:uppercase; letter-spacing:.06em" }, "History")
    );
    for (const d of [...dates].reverse()) {
      const ss = byDate.get(d);
      const top = ss.reduce((m, s) => Math.max(m, Number(s.weight_kg) || 0), 0);
      const vol = ss.reduce((sum, s) => sum + setVolume({ reps: s.reps, weight_kg: s.weight_kg, is_dumbbell: ex.is_dumbbell }), 0);
      const card = el("div", { class: "card" },
        el("div", { class: "flex between center", style: "margin-bottom:6px" },
          el("div", { class: "title" }, fmtDate(d)),
          el("div", { class: "num muted" }, `top ${fmtKg(top)} · vol ${fmtKg(vol)}`)
        )
      );
      const chips = el("div", { class: "flex wrap gap", style: "gap:6px" });
      ss.forEach((s, i) => {
        chips.append(el("span", { class: "chip", style: "cursor:default" },
          `${i + 1}× ${s.reps || 0} reps @ ${fmtKg(s.weight_kg || 0)}${ex.is_dumbbell ? "/h" : ""}`
        ));
      });
      card.append(chips);
      body.append(card);
    }
  } catch (e) {
    clear(body);
    body.append(el("div", { class: "empty" }, "Could not load: " + e.message));
  }
}

function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }