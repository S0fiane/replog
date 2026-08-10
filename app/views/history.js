// Replog — history list + session detail.
import { listSessions, getSession, listSetsForSession } from "../db.js";
import { el, mount, icon, topbar, fmtDate, fmtDateFull, fmtDuration, fmtKg, setVolume } from "../ui.js";

// ---- list ----
export async function list(ctx) {
  const root = el("div", {},
    topbar({ title: "History", onBack: () => ctx.navigate("#/") }),
    el("div", { class: "screen container", id: "hist-body" }, el("div", { class: "empty" }, "Loading…"))
  );
  mount(root);
  const body = root.querySelector("#hist-body");

  try {
    const sessions = await listSessions({ limit: 200 });
    clear(body);
    if (!sessions.length) {
      body.append(el("div", { class: "empty" }, el("div", { class: "big" }, "◇"), "No sessions yet."));
      return;
    }
    // group by month
    const groups = new Map();
    for (const s of sessions) {
      const m = (s.workout_date || "").slice(0, 7);
      if (!groups.has(m)) groups.set(m, []);
      groups.get(m).push(s);
    }
    for (const [m, items] of groups) {
      body.append(el("h2", { style: "margin:18px 0 8px; color:var(--muted); font-size:.95rem" }, monthLabel(m)));
      const list = el("div", { class: "list" });
      for (const s of items) {
        const item = el("div", { class: "item", onclick: () => ctx.navigate(`#/session-detail/${s.id}`) },
          el("div", { class: "meta" },
            el("div", { class: "title" }, s.name || "Workout"),
            el("div", { class: "sub" }, fmtDate(s.workout_date))
          ),
          el("div", { class: "chev" }, icon("chevron"))
        );
        list.append(item);
        listSetsForSession(s.id).then((sets) => {
          const vol = sets.reduce((sum, x) => sum + setVolume({ reps: x.reps, weight_kg: x.weight_kg, is_dumbbell: x.exercises?.is_dumbbell }), 0);
          if (vol) item.querySelector(".meta").append(el("div", { class: "sub num" }, `${fmtKg(vol)} kg`));
        }).catch(() => {});
      }
      body.append(list);
    }
  } catch (e) {
    clear(body);
    body.append(el("div", { class: "empty" }, "Could not load: " + e.message));
  }
}

// ---- detail ----
export async function detail(ctx) {
  const id = ctx.params?.id;
  const root = el("div", {},
    topbar({ title: "Session", onBack: () => ctx.navigate("#/history") }),
    el("div", { class: "screen container", id: "sd-body" }, el("div", { class: "empty" }, "Loading…"))
  );
  mount(root);
  const body = root.querySelector("#sd-body");

  try {
    const [session, sets] = await Promise.all([getSession(id), listSetsForSession(id)]);
    if (!session) { clear(body); body.textContent = "Session not found."; return; }
    clear(body);

    // header — name, date, and duration (ended_at - started_at) if known
    const startedMs = session.started_at ? new Date(session.started_at).getTime() : null;
    const endedMs = session.ended_at ? new Date(session.ended_at).getTime() : null;
    let durationLine = null;
    if (startedMs && endedMs) {
      durationLine = el("div", { class: "muted num" }, `Duration ${fmtDuration(endedMs - startedMs)}`);
    } else if (startedMs && !endedMs) {
      durationLine = el("div", { class: "muted" }, "In progress · not finished");
    }
    body.append(
      el("div", { style: "margin-bottom:14px" },
        el("h1", {}, session.name || "Workout"),
        el("div", { class: "muted" }, fmtDateFull(session.workout_date)),
        durationLine,
      )
    );

    // edit button — opens the full editor for this (existing) session, so past
    // sessions can be corrected/extended, not just viewed.
    body.append(
      el("button", { class: "btn primary block", style: "margin-bottom:14px", onclick: () => ctx.navigate(`#/session/${id}`) },
        icon("edit"), "Edit session"
      )
    );

    if (session.notes) {
      body.append(el("div", { class: "card", style: "margin-bottom:14px; white-space:pre-wrap; color:var(--muted)" }, session.notes));
    }

    if (!sets.length) {
      body.append(el("div", { class: "empty" }, "No sets logged."));
      return;
    }

    // group by exercise in order
    const order = []; const byEx = new Map();
    for (const s of sets) {
      if (!byEx.has(s.exercise_id)) { byEx.set(s.exercise_id, []); order.push(s.exercise_id); }
      byEx.get(s.exercise_id).push(s);
    }

    let totalVol = 0;
    for (const key of order) {
      const ss = byEx.get(key);
      const ex = ss[0].exercises;
      const isSS = ss[0].superset_group != null;
      const block = el("div", { class: "detail-ex" },
        el("div", { class: "dh" },
          el("span", { class: "n" }, ex.name),
          isSS ? el("span", { class: "ss" }, `SUPERSET ${String.fromCharCode(64 + ss[0].superset_group)}`) : null,
          el("span", { class: "muted-2", style: "margin-left:auto; font-size:.8rem" }, ex.is_dumbbell ? "kg/hand ×2" : "")
        )
      );
      const table = el("table", { class: "sets" },
        el("thead", {}, el("tr", {}, el("th", {}, "Set"), el("th", {}, "Reps"), el("th", {}, ex.is_dumbbell ? "kg/hand" : "kg"), el("th", {}, "Vol"))),
        el("tbody", {})
      );
      const tb = table.querySelector("tbody");
      ss.forEach((s, i) => {
        const v = setVolume({ reps: s.reps, weight_kg: s.weight_kg, is_dumbbell: ex.is_dumbbell });
        totalVol += v;
        tb.append(el("tr", {},
          el("td", {}, String(i + 1)),
          el("td", { class: "num" }, String(s.reps || 0)),
          el("td", { class: "num" }, fmtKg(s.weight_kg || 0)),
          el("td", { class: "num muted" }, fmtKg(v))
        ));
      });
      block.append(table);
      body.append(block);
    }

    body.append(
      el("div", { class: "divider" }),
      el("div", { class: "flex between center" },
        el("div", { class: "muted" }, "Total volume"),
        el("div", { class: "num", style: "font-size:1.3rem" }, `${fmtKg(totalVol)} kg`)
      )
    );
  } catch (e) {
    clear(body);
    body.append(el("div", { class: "empty" }, "Could not load: " + e.message));
  }
}

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }