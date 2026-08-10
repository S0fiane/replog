// Replog — "New session" chooser: start blank or pre-fill from a program day.
// Program pre-sets live here (one tap away from New session) instead of as a
// dedicated section on Home.
import { createSession, prepareProgramDay } from "../db.js";
import { PROGRAMS, dayExerciseNames } from "../programs.js";
import { el, mount, icon, topbar, toast } from "../ui.js";

// Guard against double-taps while a session is being created (several DB
// round-trips for program days) — prevents duplicate sessions.
let creating = false;

export async function render(ctx) {
  const root = el("div", {},
    topbar({ title: "New session", onBack: () => ctx.navigate("#/") }),
    el("div", { class: "screen container", id: "new-body" })
  );
  mount(root);
  const body = root.querySelector("#new-body");

  const startBlank = async () => {
    if (creating) return;
    creating = true;
    try {
      const s = await createSession();
      ctx.navigate(`#/session/${s.id}`);
    } catch (e) {
      toast("Could not start: " + e.message, { type: "err" });
    } finally { creating = false; }
  };

  const startDay = async (day) => {
    if (creating) return;
    creating = true;
    toast(`Preparing ${day.label}…`);
    try {
      const s = await prepareProgramDay(day);
      toast(`${day.label} ready — tap Start when you begin`);
      ctx.navigate(`#/session/${s.id}`);
    } catch (e) {
      toast("Could not start: " + e.message, { type: "err" });
    } finally { creating = false; }
  };

  // blank option first
  body.append(
    el("button", { class: "btn primary block", style: "margin-bottom:18px", onclick: startBlank },
      icon("plus"), "Blank session"),
  );

  // program pre-sets
  for (const prog of PROGRAMS) {
    body.append(
      el("div", { class: "divider" }),
      el("div", { class: "flex between center", style: "margin-bottom:10px" },
        el("h2", {}, prog.name),
        prog.coach ? el("span", { class: "muted", style: "font-size:.78rem" }, prog.coach) : null
      )
    );
    const list = el("div", { class: "list" });
    for (const day of prog.days) {
      const full = dayExerciseNames(day).join(" · ");
      const sub = full.length > 56 ? full.slice(0, 55) + "…" : full;
      list.append(
        el("div", { class: "item", onclick: () => startDay(day) },
          el("div", { class: "meta" },
            el("div", { class: "title" }, day.label),
            el("div", { class: "sub" }, sub)
          ),
          el("div", { class: "chev" }, icon("chevron"))
        )
      );
    }
    body.append(list);
  }
}