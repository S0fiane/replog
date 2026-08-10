// Replog — data layer. Supabase client + all queries.
// SDK is vendored locally (vendor/supabase-js.min.js, loaded as a classic
// script in index.html) and exposed as window.supabase — no runtime CDN dep.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const { createClient } = window.supabase;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Implicit flow: the magic link carries access_token + refresh_token
    // directly in the URL hash, so detectSessionInUrl parses them with NO
    // code exchange. PKCE (the v2 default) breaks on mobile, where clicking
    // the email opens an in-app webview whose localStorage lacks the
    // code_verifier — the exchange fails and the user lands back at login.
    flowType: "implicit",
  },
});

// Small helper: unwrap a single supabase response or throw.
async function one(p) {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

/* ---------------- exercises (library) ---------------- */

export async function listExercises() {
  const data = await one(
    supabase.from("exercises").select("*").order("name", { ascending: true })
  );
  return data;
}

// Insert a new exercise for the current user. Returns the row.
export async function createExercise(name, { isDumbbell = false } = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const clean = name.trim();
  // upsert so re-adding an existing name doesn't error on the unique constraint
  const data = await one(
    supabase
      .from("exercises")
      .upsert(
        { user_id: user.id, name: clean, is_dumbbell: isDumbbell },
        { onConflict: "user_id,name", ignoreDuplicates: true }
      )
      .select()
      .single()
  );
  return data;
}

// Bulk insert exercises (used by seed). Skips duplicates.
export async function upsertExercises(rows) {
  const data = await one(
    supabase
      .from("exercises")
      .upsert(rows, { onConflict: "user_id,name", ignoreDuplicates: true })
      .select("*")
  );
  return data;
}

export async function deleteExercise(id) {
  await one(supabase.from("exercises").delete().eq("id", id));
}

/* ---------------- sessions ---------------- */

export async function listSessions({ limit = 40 } = {}) {
  const data = await one(
    supabase
      .from("sessions")
      .select("*")
      .order("workout_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)
  );
  return data;
}

export async function getSession(id) {
  const data = await one(
    supabase.from("sessions").select("*").eq("id", id).single()
  );
  return data;
}

export async function createSession({ name = null, workoutDate = null, notes = null } = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const date = workoutDate || new Date().toISOString().slice(0, 10);
  const data = await one(
    supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        name,
        workout_date: date,
        notes,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()
  );
  return data;
}

export async function updateSession(id, patch) {
  const data = await one(
    supabase.from("sessions").update(patch).eq("id", id).select().single()
  );
  return data;
}

// Mark a session as finished by stamping ended_at. Returns the updated row.
export async function finishSession(id) {
  const data = await one(
    supabase.from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", id).select().single()
  );
  return data;
}

export async function deleteSession(id) {
  await one(supabase.from("sessions").delete().eq("id", id));
}

// Start a new session pre-filled from a program-day template (see programs.js).
// Creates the session, resolves/creates each exercise against the library, and
// bulk-inserts the prescribed sets: reps pre-filled, weight pre-filled only
// where the template specifies one (e.g. Slam Ball 3.6kg), rest left blank to
// fill in at the gym. Superset pairs share a superset_group. set_index restarts
// at 1 per exercise to match the editor's per-block convention. Returns the new
// session row so the caller can navigate to #/session/<id>.
export async function startProgramDay(day) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const session = await one(
    supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        name: day.label || null,
        workout_date: new Date().toISOString().slice(0, 10),
        started_at: new Date().toISOString(),
      })
      .select()
      .single()
  );

  const library = await listExercises();
  const byName = new Map(library.map((e) => [e.name.toLowerCase(), e]));

  const setRows = [];
  for (const slot of day.slots) {
    // "A" -> 1, "B" -> 2, … ; null for non-superset slots
    const group = slot.superset ? slot.superset.charCodeAt(0) - 64 : null;
    for (const ex of slot.exercises) {
      let lib = byName.get(ex.name.toLowerCase());
      if (!lib) {
        // template referenced a name not in the library — create it on the fly
        lib = await createExercise(ex.name, { isDumbbell: !!ex.isDumbbell });
        byName.set(lib.name.toLowerCase(), lib);
      }
      for (let i = 0; i < (ex.sets || 0); i++) {
        setRows.push({
          user_id: user.id,
          session_id: session.id,
          exercise_id: lib.id,
          set_index: i + 1,
          reps: ex.reps ?? 0,
          weight_kg: ex.weight != null ? ex.weight : null,
          rest_sec: null,
          superset_group: group,
        });
      }
    }
  }

  if (setRows.length) await insertSets(setRows);
  return session;
}

/* ---------------- sets ---------------- */

// Returns sets for a session, joined with exercise name.
export async function listSetsForSession(sessionId) {
  const data = await one(
    supabase
      .from("sets")
      .select(
        "id, session_id, exercise_id, set_index, reps, weight_kg, rest_sec, superset_group, created_at, exercises!inner(name, is_dumbbell)"
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
  );
  return data;
}

// Insert one set.
export async function addSet({
  sessionId,
  exerciseId,
  setIndex = 1,
  reps = 0,
  weightKg = 0,
  restSec = null,
  supersetGroup = null,
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const data = await one(
    supabase
      .from("sets")
      .insert({
        user_id: user.id,
        session_id: sessionId,
        exercise_id: exerciseId,
        set_index: setIndex,
        reps,
        weight_kg: weightKg,
        rest_sec: restSec,
        superset_group: supersetGroup,
      })
      .select()
      .single()
  );
  return data;
}

export async function updateSet(id, patch) {
  const data = await one(
    supabase.from("sets").update(patch).eq("id", id).select().single()
  );
  return data;
}

export async function deleteSet(id) {
  await one(supabase.from("sets").delete().eq("id", id));
}

// Bulk insert sets (used by history import).
export async function insertSets(rows) {
  const data = await one(supabase.from("sets").insert(rows).select("*"));
  return data;
}

/* ---------------- comparison ---------------- */

// All sets for a given exercise across all sessions, oldest first, with session date.
export async function listSetsForExercise(exerciseId) {
  const data = await one(
    supabase
      .from("sets")
      .select(
        "id, reps, weight_kg, rest_sec, set_index, superset_group, sessions!inner(workout_date, name)"
      )
      .eq("exercise_id", exerciseId)
      .order("sessions(workout_date)", { ascending: true })
      .order("created_at", { ascending: true })
  );
  return data;
}

/* ---------------- history import idempotency ---------------- */

// Find existing sessions matching a date+name+notes hash so import is idempotent.
export async function findSessionsByDateName(workoutDate, name) {
  let q = supabase.from("sessions").select("id, workout_date, name").eq("workout_date", workoutDate);
  if (name) q = q.eq("name", name);
  else q = q.is("name", null);
  const data = await one(q);
  return data;
}