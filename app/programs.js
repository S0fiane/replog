// Replog — workout program templates.
//
// A program is a set of named days; each day is an ordered list of slots. A
// slot is either a single exercise or a superset group (2+ exercises that
// share a letter — A, B, C). Starting a day creates a new session pre-filled
// with the prescribed sets (reps pre-filled; weight pre-filled only where the
// template specifies one, e.g. Slam Ball 3.6kg; everything else left blank to
// fill in at the gym).
//
// Exercise names should match the seeded library (see supabase/seed-data.json)
// so they resolve to existing exercise ids. Any name not found in the library
// is created on the fly when the day is started, so programs are self-healing.
//
// This is a static, shipped template — the foundation for the "start from
// program" flow. Custom, user-authored programs (DB-backed) can plug into the
// same UI later without changing the shape below.

export const PROGRAMS = [
  {
    id: "azamat",
    name: "Azamat 3-Day",
    coach: "Azamat Mazhitov",
    days: [
      {
        id: "azamat-d1",
        label: "Day 1",
        slots: [
          // "Slam / up right with kettlebell" — superset pair, 12×4
          { superset: "A", exercises: [
            { name: "Slam Ball", reps: 12, sets: 4 },
            { name: "Upright Row (Kettlebell)", reps: 12, sets: 4 },
          ]},
          { exercises: [{ name: "Box Squat", reps: 12, sets: 4 }] },
          { exercises: [{ name: "Leg Extension", reps: 12, sets: 4 }] },
          { exercises: [{ name: "Leg Curl (Lying)", reps: 12, sets: 4 }] },
          { exercises: [{ name: "Barbell Bench Press", reps: 12, sets: 4 }] },
          { exercises: [{ name: "Shoulder Fly Machine", reps: 12, sets: 4 }] },
        ],
      },
      {
        id: "azamat-d2",
        label: "Day 2",
        slots: [
          // "Up right (kettlebell) / Slam ball 3,6 kg" — superset pair, 10×4
          { superset: "A", exercises: [
            { name: "Upright Row (Kettlebell)", reps: 10, sets: 4 },
            { name: "Slam Ball", reps: 10, sets: 4, weight: 3.6 },
          ]},
          { exercises: [{ name: "Incline DB Press", reps: 10, sets: 4 }] },
          { exercises: [{ name: "Seated Wide Grip Row", reps: 10, sets: 4 }] },
          { exercises: [{ name: "Barbell Bench Press", reps: 10, sets: 4 }] },
          { exercises: [{ name: "Arnold Press", reps: 12, sets: 4 }] },
          { exercises: [{ name: "Hammer Curl", reps: 12, sets: 4 }] },
        ],
      },
      {
        id: "azamat-d3",
        label: "Day 3",
        slots: [
          // "Gorilla row (kettlebells) / Slam ball" — superset pair, 10×4
          { superset: "A", exercises: [
            { name: "Gorilla Row", reps: 10, sets: 4 },
            { name: "Slam Ball", reps: 10, sets: 4 },
          ]},
          { exercises: [{ name: "Lat Pulldown", reps: 10, sets: 4 }] },
          { exercises: [{ name: "Single Arm Row", reps: 10, sets: 4 }] },
          { exercises: [{ name: "Close Grip Cable Row", reps: 10, sets: 4 }] },
          { exercises: [{ name: "Triceps Cable Extension", reps: 10, sets: 4 }] },
          { exercises: [{ name: "Bent-over Row (Dumbbell)", reps: 10, sets: 4 }] },
        ],
      },
    ],
  },
];

// Flat list of exercise names in a day, in order (superset pairs expanded).
export function dayExerciseNames(day) {
  return day.slots.flatMap((s) => s.exercises.map((e) => e.name));
}

// Count of distinct exercises in a day.
export function dayExerciseCount(day) {
  return day.slots.reduce((n, s) => n + s.exercises.length, 0);
}