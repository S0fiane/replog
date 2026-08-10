// Replog — session editor. Add exercises + sets, superset grouping, autosave.
import {
  getSession, createSession, updateSession, deleteSession, finishSession, startSession, resetSession,
  listSetsForSession, addSet, updateSet, deleteSet,
  listExercises, createExercise,
} from "../db.js";
import { el, mount, icon, topbar, toast, fmtDateFull, fmtDuration, normNum, fmtKg, setVolume } from "../ui.js";

const SUPERSET_LABELS = ["—", "A", "B", "C"];

// Live elapsed-timer interval for the current editor instance. Cleared at the
// start of draw() so re-renders/reloads don't leak overlapping intervals.
let timerInterval = null;

export async function render(ctx) {
  const id = ctx.params?.id;
  if (id === "new") {
    try {
      const s = await createSession();
      location.hash = `#/session/${s.id}`;
      return;
    } catch (err) {
      toast("Could not start session: " + err.message, { type: "err" });
      return;
    }
  }

  const root = el("div", {},
    topbar({
      title: "Session",
      onBack: () => ctx.navigate("#/"),
      right: el("button", { class: "btn ghost icon", "aria-label": "Done", onclick: () => ctx.navigate("#/") }, icon("x")),
    }),
    el("div", { class: "screen container", id: "sess-body" }, el("div", { class: "empty" }, "Loading…"))
  );
  mount(root);
  const body = root.querySelector("#sess-body");

  try {
    const [session, sets, library] = await Promise.all([
      getSession(id),
      listSetsForSession(id),
      listExercises(),
    ]);
    if (!session) { body.textContent = "Session not found."; return; }

    const libByName = new Map(library.map((e) => [e.name.toLowerCase(), e]));
    const state = { session, library, libByName, blocks: [] };

    // group sets into blocks by exercise, preserving first-appearance order
    const order = [];
    const byEx = new Map();
    for (const s of sets) {
      const key = s.exercise_id;
      if (!byEx.has(key)) { byEx.set(key, []); order.push(key); }
      byEx.get(key).push(s);
    }
    for (const key of order) {
      const ss = byEx.get(key);
      const ex = ss[0].exercises;
      state.blocks.push({
        exerciseId: key,
        exerciseName: ex.name,
        isDumbbell: ex.is_dumbbell,
        group: ss[0].superset_group ?? 0, // 0 = none
        sets: ss,
      });
    }

    draw(body, state, ctx);
  } catch (err) {
    clear(body);
    body.append(el("div", { class: "empty" }, "Could not load session: " + err.message));
  }
}

function draw(body, state, ctx) {
  clear(body);
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  const { session } = state;

  // ---- session header (editable name + date) ----
  const header = el("div", { class: "card", style: "margin-bottom:14px" },
    el("label", { class: "field", style: "margin:0 0 10px" },
      el("span", {}, "Session name"),
      el("input", { class: "input", id: "sess-name", value: session.name || "", placeholder: "e.g. Push Day (optional)" })
    ),
    el("label", { class: "field", style: "margin:0" },
      el("span", {}, "Date"),
      el("input", { class: "input", id: "sess-date", type: "date", value: session.workout_date })
    )
  );
  body.append(header);

  // ---- chrono: prepare → start → stop ----
  // Three phases driven by session.started_at / ended_at:
  //   draft    (no started_at) → "Ready" + Start button (stamps started_at)
  //   active   (started, no ended) → live elapsed timer + Finish + Reset
  //   finished (ended set)        → frozen total duration + disabled Finished + Reset
  // renderMeta() re-renders just this row in place on a phase change, so
  // starting/finishing/resetting never disturbs the set inputs below it.
  const meta = el("div", { class: "flex between center", style: "margin-bottom:14px" });
  function renderMeta() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    clear(meta);
    const timerEl = el("div", { class: "muted num", id: "sess-timer", style: "font-size:1.05rem" });
    const actions = el("div", { class: "flex gap" });
    const startMs = session.started_at ? new Date(session.started_at).getTime() : null;
    const endMs = session.ended_at ? new Date(session.ended_at).getTime() : null;

    // Reset (clear start/end → back to draft). Shown in active + finished only.
    const addReset = () => {
      const resetBtn = el("button", { class: "btn ghost sm", "aria-label": "Reset timer", title: "Reset timer" }, icon("history"));
      resetBtn.onclick = async () => {
        if (!confirm("Reset the timer? This clears the start/end time so you can re-time the session. Your logged sets are kept.")) return;
        try {
          const updated = await resetSession(session.id);
          Object.assign(session, updated);
          toast("Timer reset");
          renderMeta();
        } catch (e) { toast("Could not reset: " + e.message, { type: "err" }); }
      };
      actions.append(resetBtn);
    };

    if (endMs && startMs) {
      timerEl.textContent = `Done · ${fmtDuration(endMs - startMs)}`;
      actions.append(el("button", { class: "btn", disabled: true }, icon("check"), "Finished"));
      addReset();
    } else if (startMs) {
      const tick = () => { timerEl.textContent = `Elapsed ${fmtDuration(Date.now() - startMs)}`; };
      tick();
      timerInterval = setInterval(tick, 1000);
      const finishBtn = el("button", { class: "btn primary" }, icon("check"), "Finish");
      finishBtn.onclick = async () => {
        finishBtn.disabled = true;
        try {
          const updated = await finishSession(session.id);
          Object.assign(session, updated);
          toast("Session finished");
          renderMeta();
        } catch (e) {
          finishBtn.disabled = false;
          toast("Could not finish: " + e.message, { type: "err" });
        }
      };
      actions.append(finishBtn);
      addReset();
    } else {
      // draft — prepared but not started yet (no reset needed)
      timerEl.textContent = "Ready · tap Start when you begin";
      const startBtn = el("button", { class: "btn primary" }, icon("play"), "Start");
      startBtn.onclick = async () => {
        startBtn.disabled = true;
        try {
          const updated = await startSession(session.id);
          Object.assign(session, updated);
          toast("Go");
          renderMeta();
        } catch (e) {
          startBtn.disabled = false;
          toast("Could not start: " + e.message, { type: "err" });
        }
      };
      actions.append(startBtn);
    }
    meta.append(timerEl, actions);
  }
  renderMeta();
  body.append(meta);

  // persist name/date on blur
  const nameInput = header.querySelector("#sess-name");
  const dateInput = header.querySelector("#sess-date");
  const persistHeader = async () => {
    try {
      await updateSession(session.id, { name: nameInput.value.trim() || null, workout_date: dateInput.value });
    } catch (e) { toast("Save failed", { type: "err" }); }
  };
  nameInput.addEventListener("blur", persistHeader);
  dateInput.addEventListener("change", persistHeader);

  // ---- blocks ----
  const blocksWrap = el("div", { id: "blocks" });
  state.blocks.forEach((b) => blocksWrap.append(blockEl(b, state)));
  body.append(blocksWrap);

  // ---- add-exercise bar ----
  body.append(addExerciseBar(state, blocksWrap));

  // ---- total volume + delete ----
  let totalVol = 0;
  state.blocks.forEach((b) => b.sets.forEach((s) => {
    totalVol += setVolume({ reps: s.reps, weight_kg: s.weight_kg, is_dumbbell: b.isDumbbell });
  }));
  body.append(
    el("div", { class: "divider" }),
    el("div", { class: "flex between center", style: "margin-bottom:10px" },
      el("div", { class: "muted" }, "Total volume"),
      el("div", { class: "num", style: "font-size:1.2rem" }, `${fmtKg(totalVol)} kg`)
    ),
    el("div", { class: "flex gap" },
      el("button", { class: "btn danger", style: "flex:1", onclick: () => deleteAndExit(state, ctx) }, icon("trash"), "Delete session")
    )
  );
}

function addExerciseBar(state, blocksWrap) {
  const wrap = el("div", { class: "card", style: "margin-top:14px" },
    el("div", { class: "head", style: "margin-bottom:8px; color:var(--muted); font-size:.8rem; text-transform:uppercase; letter-spacing:.06em" }, "Add exercise"),
    el("div", { class: "row" },
      el("input", {
        class: "input", id: "new-ex-name", list: "ex-list",
        placeholder: "Type or pick an exercise", autocomplete: "off"
      }),
      el("button", { class: "btn primary", id: "new-ex-add" }, icon("plus"), "Add")
    ),
    el("datalist", { id: "ex-list" },
      ...state.library.map((e) => el("option", { value: e.name }))
    )
  );

  const input = wrap.querySelector("#new-ex-name");
  const addBtn = wrap.querySelector("#new-ex-add");

  const doAdd = async () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    addBtn.disabled = true;
    try {
      let ex = state.libByName.get(name.toLowerCase());
      if (!ex) {
        ex = await createExercise(name);
        state.library.push(ex);
        state.libByName.set(ex.name.toLowerCase(), ex);
        // refresh datalist
        wrap.querySelector("#ex-list").append(el("option", { value: ex.name }));
        toast(`Added "${ex.name}" to your library`);
      }
      // skip if already in this session
      if (state.blocks.some((b) => b.exerciseId === ex.id)) {
        toast("Already in this session");
        addBtn.disabled = false;
        input.value = "";
        input.focus();
        return;
      }
      const block = { exerciseId: ex.id, exerciseName: ex.name, isDumbbell: ex.is_dumbbell, group: 0, sets: [] };
      state.blocks.push(block);
      blocksWrap.append(blockEl(block, state));
      input.value = "";
      input.focus();
    } catch (e) {
      toast("Could not add: " + e.message, { type: "err" });
    } finally {
      addBtn.disabled = false;
    }
  };

  addBtn.addEventListener("click", doAdd);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });
  return wrap;
}

function blockEl(block, state) {
  const isSS = block.group > 0;
  const wrap = el("div", { class: `ex-block${isSS ? " superset" : ""}` });

  // head: name + superset control + remove
  const head = el("div", { class: "ex-head" },
    el("div", { class: "ex-name" },
      el("span", {}, block.exerciseName),
      block.isDumbbell ? el("span", { class: "ex-db" }, "kg/hand ×2") : null
    ),
    supersetControl(block, state, wrap),
    el("button", { class: "btn ghost icon sm", "aria-label": "Remove exercise", onclick: () => removeBlock(block, state, wrap) }, icon("trash"))
  );
  wrap.append(head);

  // set header
  wrap.append(
    el("div", { class: "set-head" },
      el("span", {}, "#"),
      el("span", {}, "Reps"),
      el("span", {}, block.isDumbbell ? "kg/hand" : "kg"),
      el("span", {}, "Rest s"),
      el("span", {}, "")
    )
  );

  const rowsWrap = el("div", { class: "rows" });
  block.sets.forEach((s) => rowsWrap.append(setRow(s, block, state)));
  wrap.append(rowsWrap);

  // add-set button
  wrap.append(
    el("button", { class: "btn ghost sm", style: "margin-top:4px", onclick: () => rowsWrap.append(setRow(null, block, state)) },
      icon("plus"), "Add set"
    )
  );

  return wrap;
}

function supersetControl(block, state, wrap) {
  const btn = el("button", {
    class: `chip${block.group > 0 ? " on" : ""}`,
    title: "Superset group",
    onclick: async () => {
      block.group = (block.group + 1) % SUPERSET_LABELS.length;
      btn.classList.toggle("on", block.group > 0);
      btn.textContent = `SS ${SUPERSET_LABELS[block.group]}`;
      wrap.classList.toggle("superset", block.group > 0);
      // persist to every saved set in this block
      try {
        await Promise.all(block.sets.filter((s) => s.id).map((s) =>
          updateSet(s.id, { superset_group: block.group > 0 ? block.group : null })
        ));
        // reflect in-memory for unsaved rows
        block.sets.forEach((s) => { s.superset_group = block.group > 0 ? block.group : null; });
      } catch (e) { toast("Could not save superset", { type: "err" }); }
    }
  }, `SS ${SUPERSET_LABELS[block.group]}`);
  return btn;
}

function setRow(set, block, state) {
  // set: existing db row OR null for a brand-new empty row
  const row = el("div", { class: "set-row" });
  const idx = el("div", { class: "idx" }, set ? String(set.set_index) : "·");
  const reps = el("input", { class: "input", type: "text", inputmode: "numeric", placeholder: "0", value: set ? String(set.reps || "") : "" });
  const weight = el("input", { class: "input", type: "text", inputmode: "decimal", placeholder: "0", value: set ? fmtKg(set.weight_kg || 0) : "" });
  const rest = el("input", { class: "input", type: "text", inputmode: "numeric", placeholder: "—", value: set && set.rest_sec ? String(set.rest_sec) : "" });
  const del = el("button", { class: "del", "aria-label": "Delete set", onclick: () => removeSet(row, set, block) }, icon("trash", { size: 16 }));

  row.append(idx, reps, weight, rest, del);

  const save = async () => {
    const repsN = parseInt(normNum(reps.value), 10) || 0;
    const wN = parseFloat(normNum(weight.value)) || 0;
    const restN = rest.value ? parseInt(normNum(rest.value), 10) || null : null;
    // skip saving totally empty rows
    if (!repsN && !wN && !restN) return;
    try {
      if (set && set.id) {
        await updateSet(set.id, { reps: repsN, weight_kg: wN, rest_sec: restN });
      } else {
        const created = await addSet({
          sessionId: state.session.id,
          exerciseId: block.exerciseId,
          setIndex: block.sets.length + 1,
          reps: repsN,
          weightKg: wN,
          restSec: restN,
          supersetGroup: block.group > 0 ? block.group : null,
        });
        set = created;
        block.sets.push(set);
        idx.textContent = String(created.set_index);
      }
      set.reps = repsN; set.weight_kg = wN; set.rest_sec = restN;
    } catch (e) {
      toast("Save failed", { type: "err" });
    }
  };

  const debounced = debounce(save, 350);
  [reps, weight, rest].forEach((inp) => {
    inp.addEventListener("input", debounced);
    inp.addEventListener("blur", save);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
    });
  });

  row._set = () => set;
  return row;
}

async function removeSet(row, set, block) {
  if (set && set.id) {
    try { await deleteSet(set.id); } catch (e) { toast("Delete failed", { type: "err" }); return; }
    block.sets = block.sets.filter((s) => s.id !== set.id);
  }
  row.remove();
}

async function removeBlock(block, state, wrap) {
  if (!confirm(`Remove ${block.exerciseName} and all its sets from this session?`)) return;
  try {
    await Promise.all(block.sets.filter((s) => s.id).map((s) => deleteSet(s.id)));
  } catch (e) { toast("Could not remove", { type: "err" }); return; }
  state.blocks = state.blocks.filter((b) => b !== block);
  wrap.remove();
}

async function deleteAndExit(state, ctx) {
  if (!confirm("Delete this entire session? This cannot be undone.")) return;
  try {
    await deleteSession(state.session.id);
    ctx.navigate("#/");
  } catch (e) { toast("Could not delete", { type: "err" }); }
}

// little helpers
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }