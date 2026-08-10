// Replog — data layer. Supabase client + all queries.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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

export async function deleteSession(id) {
  await one(supabase.from("sessions").delete().eq("id", id));
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