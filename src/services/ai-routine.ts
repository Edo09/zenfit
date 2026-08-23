import { completeJSON } from "@/src/services/llm";
import type { Profile } from "@/src/types/database";

export type AIExercise = {
  name: string;
  sets: number;
  reps: number;
  weight_kg?: number | null;
};

export type AIRoutine = {
  name: string;
  description?: string | null;
  day_of_week?: string | null;
  exercises: AIExercise[];
};

/**
 * "mix" = the original weekly-split behavior (one routine per available
 * day, spanning the whole catalog). Anything else narrows the catalog to a
 * body-part bucket and asks for exactly ONE single-session routine — there's
 * no such thing as a week of all-chest days.
 *
 * Focus is picked as a LIST: several body parts combine into one session
 * (chest + back = a push/pull day) over the union of their buckets. "mix"
 * is exclusive — it is the absence of a focus, not another bucket.
 */
export type RoutineFocusKey =
  | "mix"
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "cardio";

// Keyed off the real bodyparts.name values (back, cardio, chest, lower arms,
// lower legs, neck, shoulders, upper arms, upper legs, waist) — there is no
// per-muscle tag (e.g. no standalone "biceps"), so "arms"/"legs" are unions
// and the prompt label says so explicitly rather than implying more
// precision than the catalog actually has. `neck` has no bucket of its own:
// too thin a slice of the catalog to be worth a pill.
export const ROUTINE_FOCUS: Record<
  Exclude<RoutineFocusKey, "mix">,
  { bodyParts: string[]; promptLabel: string }
> = {
  chest: { bodyParts: ["chest"], promptLabel: "chest" },
  back: { bodyParts: ["back"], promptLabel: "back" },
  shoulders: { bodyParts: ["shoulders"], promptLabel: "shoulders" },
  arms: {
    bodyParts: ["upper arms", "lower arms"],
    promptLabel: "arms (biceps, triceps, forearms)",
  },
  legs: {
    bodyParts: ["upper legs", "lower legs"],
    promptLabel: "legs (quads, hamstrings, glutes, calves)",
  },
  core: { bodyParts: ["waist"], promptLabel: "core / abdominals" },
  cardio: { bodyParts: ["cardio"], promptLabel: "cardio / conditioning" },
};

/** "chest" / "chest and back" / "chest, back and arms" — prompt prose. */
function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// Profile "available_days" stores short values ("Mon".."Sun");
// routines use full lowercase day names.
const SHORT_TO_DAY: Record<string, string> = {
  mon: "monday",
  tue: "tuesday",
  wed: "wednesday",
  thu: "thursday",
  fri: "friday",
  sat: "saturday",
  sun: "sunday",
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? Math.round(value) : parseInt(String(value), 10);
  if (isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitize(raw: unknown, maxRoutines: number): AIRoutine[] {
  const routines = Array.isArray((raw as { routines?: unknown })?.routines)
    ? ((raw as { routines: unknown[] }).routines as Record<string, unknown>[])
    : [];

  return routines
    .filter((r) => typeof r?.name === "string" && Array.isArray(r?.exercises))
    .slice(0, maxRoutines)
    .map((r) => {
      const day =
        typeof r.day_of_week === "string" && VALID_DAYS.includes(r.day_of_week.toLowerCase())
          ? r.day_of_week.toLowerCase()
          : null;
      const exercises = (r.exercises as Record<string, unknown>[])
        .filter((e) => typeof e?.name === "string" && (e.name as string).trim().length > 0)
        .slice(0, 10)
        .map((e) => ({
          name: (e.name as string).trim(),
          sets: clampInt(e.sets, 1, 10, 3),
          reps: clampInt(e.reps, 1, 50, 10),
          weight_kg:
            typeof e.weight_kg === "number" && e.weight_kg > 0 ? e.weight_kg : null,
        }));
      return {
        name: (r.name as string).trim().slice(0, 80),
        description:
          typeof r.description === "string" ? r.description.trim().slice(0, 300) : null,
        day_of_week: day,
        exercises,
      };
    })
    .filter((r) => r.exercises.length > 0);
}

export async function generateRoutines(
  profile: Profile,
  language: string,
  catalogNames: string[],
  focus: RoutineFocusKey[] = ["mix"],
): Promise<AIRoutine[]> {
  const availableDays = (profile.available_days ?? [])
    .map((d) => SHORT_TO_DAY[d.toLowerCase()] ?? d.toLowerCase())
    .filter((d) => VALID_DAYS.includes(d));

  const languageName = language === "es" ? "Spanish" : "English";

  // A focus pick means "give me one session for this body part right now",
  // not "make every day of my week this one muscle group" — different shape
  // of request, so it gets its own single-routine rules instead of the
  // weekly-split ones.
  // "mix" is the absence of a focus, so any real pick alongside it wins
  // (the picker keeps them exclusive, but don't depend on the caller).
  const focused = focus.filter((f): f is Exclude<RoutineFocusKey, "mix"> => f !== "mix");
  const singleSession = focused.length > 0;
  const focusLabel = singleSession
    ? joinLabels(focused.map((f) => ROUTINE_FOCUS[f].promptLabel))
    : null;

  const system = [
    singleSession
      ? `You are a certified fitness coach. Create ONE single-session training routine focused entirely on: ${focusLabel}.`
      : "You are a certified fitness coach. Create a personalized weekly training plan.",
    "Respond ONLY with strict JSON matching this schema:",
    '{"routines":[{"name":string,"description":string,"day_of_week":string|null,"exercises":[{"name":string,"sets":number,"reps":number,"weight_kg":number|null}]}]}',
    "Rules:",
    singleSession
      ? '- Return EXACTLY ONE routine in the "routines" array.'
      : "- One routine per training day, using ONLY the user's available days.",
    singleSession
      ? "- day_of_week: pick one of the user's available days if any were given, otherwise null."
      : "- day_of_week must be a lowercase English day name (monday..sunday).",
    "- 4 to 7 exercises per routine, realistic sets (2-5) and reps (5-20).",
    "- weight_kg: null for bodyweight/cardio; conservative starter weights otherwise.",
    "- Session must fit the user's session duration.",
    "- Exercise names MUST be copied verbatim from `exercise_catalog` in the user message — do not invent, translate, or reword any exercise name. Pick the closest matches for the user's goals.",
    ...(singleSession
      ? [
          `- EVERY exercise must target${focused.length > 1 ? " one of" : ""}: ${focusLabel}. Do not include exercises for any other muscle group — exercise_catalog is already filtered to this focus, so pick from it freely.`,
        ]
      : []),
    ...(focused.length > 1
      ? [
          "- Balance the session across ALL of the focus areas listed above — do not spend every exercise on just one of them.",
        ]
      : []),
    "- Tailor exercise selection and set/rep ranges to the user's `goal`:",
    "  lose_weight → higher reps (12-20), shorter rest, favor full-body/compound and cardio-style catalog exercises;",
    "  gain_muscle → moderate reps (6-12), heavier weight_kg, split by muscle group, favor compound lifts;",
    "  maintain → balanced mix of both.",
    `- Routine names and descriptions in ${languageName}.`,
  ].join("\n");

  const user = JSON.stringify({
    age: profile.age,
    sex: profile.sex,
    height_cm: profile.height_cm,
    weight_kg: profile.weight_kg,
    activity_level: profile.activity_level,
    profession_type: profile.profession_type,
    days_per_week: profile.days_per_week,
    session_duration_minutes: profile.session_duration,
    available_days: availableDays,
    goal: profile.goal,
    exercise_catalog: catalogNames,
  });

  const parsed = await completeJSON(system, user);

  const routines = sanitize(parsed, singleSession ? 1 : 7);
  if (routines.length === 0) throw new Error("AI returned no usable routines");
  return routines;
}
