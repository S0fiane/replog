// Replog — home view: start/continue session, recent sessions.
import { listSessions, listSetsForSession, prepareProgramDay } from "../db.js";
import { seedLibrary, libraryIsEmpty } from "../seed.js";
import { PROGRAMS, dayExerciseNames } from "../programs.js";
import { el, mount, icon, topbar, fmtDate, fmtKg, setVolume, toast } from "../ui.js";

// Guard against double-taps while a program day is being created (several DB
// round-trips) — prevents two sessions from being spun up.
let startingDay = false;

export async function render(ctx) {
  const root = el("div", {},
    topbar({ right: el("button", { class: "btn ghost icon", "aria-label": "Settings", onclick: () => ctx.navigate("#/settings") }, icon("settings")) }),
    el("div", { class: "screen container" },
      el("div", { id: "home-body" }, el("div", { class: "empty" }, el("div", { class: "big" }, "…"), "Loading"))
    )
  );
  mount(root);

  const body = root.querySelector("#home-body");
  try {
    // first-run: seed the exercise library
    if (await libraryIsEmpty()) {
      await seedLibrary();
      toast("Exercise library ready");
    }

    const sessions = await listSessions({ limit: 30 });
    const active = sessions.find((s) => !s.ended_at);

    // header + start button
    clear(body);
    body.append(
      el("h1", { style: "margin-bottom:6px" }, "Workouts"),
      el("p", { class: "muted", style: "margin:0 0 16px" }, "Start a session and log your lifts."),
      el("button", { class: "btn primary block", style: "margin-bottom:8px", onclick: () => ctx.navigate("#/session/new") },
        icon("plus"), "New session"),
    );
    // continue the most recent open session (draft or active), if any
    if (active) {
      body.append(
        el("button", { class: "btn block", style: "margin-bottom:8px", onclick: () => ctx.navigate(`#/session/${active.id}`) },
          icon("history"), "Continue open session")
      );
    }

    // program templates — tap a day to start a pre-filled session
    for (const prog of PROGRAMS) {
      body.append(
        el("div", { class: "divider" }),
        el("div", { class: "flex between center", style: "margin-bottom:10px" },
          el("h2", {}, prog.name),
          prog.coach ? el("span", { class: "muted", style: "font-size:.78rem" }, prog.coach) : null
        )
      );
      const plist = el("div", { class: "list" });
      for (const day of prog.days) {
        const full = dayExerciseNames(day).join(" · ");
        const sub = full.length > 56 ? full.slice(0, 55) + "…" : full;
        plist.append(
          el("div", { class: "item", onclick: () => startDay(day, ctx) },
            el("div", { class: "meta" },
              el("div", { class: "title" }, day.label),
              el("div", { class: "sub" }, sub)
            ),
            el("div", { class: "chev" }, icon("chevron"))
          )
        );
      }
      body.append(plist);
    }

    body.append(
      el("div", { class: "divider" }),
      el("div", { class: "flex between center", style: "margin-bottom:10px" },
        el("h2", {}, "Recent"),
        el("button", { class: "btn ghost sm", onclick: () => ctx.navigate("#/history") }, "All history")
      )
    );

    if (!sessions.length) {
      body.append(
        el("div", { class: "empty" },
          el("div", { class: "big" }, "◇"),
          el("div", {}, "No sessions yet."),
          el("div", { class: "muted", style: "margin-top:6px" }, "Tap “Start new session”, or import your past workouts from Settings.")
        )
      );
      return;
    }

    const list = el("div", { class: "list" });
    for (const s of sessions.slice(0, 8)) {
      const item = el("div", { class: "item", onclick: () => ctx.navigate(`#/session/${s.id}`) },
        el("div", { class: "meta" },
          el("div", { class: "title" }, s.name || "Workout"),
          el("div", { class: "sub" }, fmtDate(s.workout_date))
        ),
        el("div", { class: "chev" }, icon("chevron"))
      );
      list.append(item);

      // load volume async (cheap, small N)
      listSetsForSession(s.id).then((sets) => {
        const vol = sets.reduce((sum, x) => sum + setVolume({ reps: x.reps, weight_kg: x.weight_kg, is_dumbbell: x.exercises?.is_dumbbell }), 0);
        if (vol) {
          item.querySelector(".meta").append(el("div", { class: "sub num" }, `${fmtKg(vol)} kg volume`));
        }
      }).catch(() => {});
    }
    body.append(list);
  } catch (err) {
    clear(body);
    body.append(el("div", { class: "empty" }, el("div", {}, "Could not load."), el("div", { class: "muted" }, err.message)));
  }
}

function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

// Prepare a pre-filled session from a program-day template, then open the
// editor. The session is created as a draft — the user taps Start in the
// editor to begin the chrono. Tap-guarded to prevent duplicate sessions.
async function startDay(day, ctx) {
  if (startingDay) return;
  startingDay = true;
  toast(`Preparing ${day.label}…`);
  try {
    const s = await prepareProgramDay(day);
    toast(`${day.label} ready — tap Start when you begin`);
    ctx.navigate(`#/session/${s.id}`);
  } catch (e) {
    toast("Could not start: " + e.message, { type: "err" });
  } finally {
    startingDay = false;
  }
}