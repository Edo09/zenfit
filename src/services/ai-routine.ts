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

function sanitize(raw: unknown): AIRoutine[] {
  const routines = Array.isArray((raw as { routines?: unknown })?.routines)
    ? ((raw as { routines: unknown[] }).routines as Record<string, unknown>[])
    : [];

  return routines
    .filter((r) => typeof r?.name === "string" && Array.isArray(r?.exercises))
    .slice(0, 7)
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
  language: string
): Promise<AIRoutine[]> {
  const availableDays = (profile.available_days ?? [])
    .map((d) => SHORT_TO_DAY[d.toLowerCase()] ?? d.toLowerCase())
    .filter((d) => VALID_DAYS.includes(d));

  const languageName = language === "es" ? "Spanish" : "English";

  const system = [
    "You are a certified fitness coach. Create a personalized weekly training plan.",
    "Respond ONLY with strict JSON matching this schema:",
    '{"routines":[{"name":string,"description":string,"day_of_week":string,"exercises":[{"name":string,"sets":number,"reps":number,"weight_kg":number|null}]}]}',
    "Rules:",
    "- One routine per training day, using ONLY the user's available days.",
    "- day_of_week must be a lowercase English day name (monday..sunday).",
    "- 4 to 7 exercises per routine, realistic sets (2-5) and reps (5-20).",
    "- weight_kg: null for bodyweight/cardio; conservative starter weights otherwise.",
    "- Session must fit the user's session duration.",
    `- Routine names, descriptions and exercise names in ${languageName}.`,
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
  });

  const parsed = await completeJSON(system, user);

  const routines = sanitize(parsed);
  if (routines.length === 0) throw new Error("AI returned no usable routines");
  return routines;
}
