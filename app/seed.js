// Replog — seed + history import.
import { supabase, upsertExercises, createSession, insertSets, findSessionsByDateName, listExercises } from "./db.js";

let _seed = null;

// Load seed-data.json once.
async function loadSeed() {
  if (_seed) return _seed;
  const res = await fetch("supabase/seed-data.json");
  if (!res.ok) throw new Error("Could not load seed-data.json");
  _seed = await res.json();
  return _seed;
}

// Seed the exercise library for the current user (idempotent — skips existing names).
// Returns the user's full library after seeding.
export async function seedLibrary() {
  const seed = await loadSeed();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const rows = seed.library.map((e) => ({
    user_id: user.id,
    name: e.name,
    is_dumbbell: !!e.is_dumbbell,
  }));
  await upsertExercises(rows);
  return listExercises();
}

// True if the user has any exercises in their library yet.
export async function libraryIsEmpty() {
  const ex = await listExercises();
  return ex.length === 0;
}

// Canonicalize a raw exercise name using the alias map; fall back to the raw name.
export async function canonicalName(raw) {
  const seed = await loadSeed();
  const key = (raw || "").trim().toLowerCase();
  return seed.aliases[key] || raw.trim();
}

// Import the parsed history. Idempotent: skips sessions that already exist
// for this user with the same workout_date + name.
// onProgress optional callback (done, total, msg).
export async function importHistory(onProgress) {
  const seed = await loadSeed();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // 1. make sure the library exists so exercise ids resolve
  await seedLibrary();
  const library = await listExercises();
  const byName = new Map(library.map((e) => [e.name, e]));

  const total = seed.history.length;
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < seed.history.length; i++) {
    const h = seed.history[i];
    const name = h.name || null;

    // idempotency check
    const existing = await findSessionsByDateName(h.workout_date, name);
    if (existing.length) {
      skipped++;
      onProgress?.(i + 1, total, `Skipped ${name || "session"} (${h.workout_date}) — already imported`);
      continue;
    }

    // create the session
    const session = await createSession({
      name,
      workoutDate: h.workout_date,
      notes: h.notes || null,
    });

    // build all sets for this session
    const setRows = [];
    let globalSetIndex = 1;
    for (const ex of h.exercises) {
      const lib = byName.get(ex.exercise);
      // If the canonical name isn't in the library (shouldn't happen), skip gracefully.
      if (!lib) {
        console.warn("Seed: missing library entry for", ex.exercise);
        continue;
      }
      ex.sets.forEach((s) => {
        setRows.push({
          user_id: user.id,
          session_id: session.id,
          exercise_id: lib.id,
          set_index: globalSetIndex++,
          reps: Number(s.reps) || 0,
          weight_kg: Number(s.weight_kg) || 0,
          rest_sec: null,
          superset_group: ex.superset_group ?? null,
        });
      });
    }

    if (setRows.length) await insertSets(setRows);
    imported++;
    onProgress?.(i + 1, total, `Imported ${name || "session"} (${h.workout_date})`);
  }

  return { imported, skipped, total };
}