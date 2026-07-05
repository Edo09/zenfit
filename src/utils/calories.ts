import type { MealWithItems, Profile, WorkoutLog } from "@/src/types/database";

// Daily-calorie math shared by the dashboard KPIs and the profile screen.

const ACTIVITY_FACTOR: Record<NonNullable<Profile["activity_level"]>, number> = {
  sedentary: 1.2,
  active: 1.55,
  very_active: 1.725,
};

// Strength training ≈ MET 5.0; kcal/min = MET × 3.5 × kg / 200
const WORKOUT_MET = 5.0;
const DEFAULT_WEIGHT_KG = 70;

type RecommendInput = Pick<
  Profile,
  "age" | "sex" | "height_cm" | "weight_kg" | "activity_level"
>;

/**
 * Maintenance-calorie recommendation from the Mifflin-St Jeor BMR equation
 * scaled by activity level. Null until the profile has the required fields.
 * (No goal/objective field exists yet, so this targets maintenance.)
 */
export function recommendedCalorieGoal(
  profile: RecommendInput | null,
): number | null {
  if (
    profile == null ||
    profile.age == null ||
    profile.sex == null ||
    profile.height_cm == null ||
    profile.weight_kg == null
  ) {
    return null;
  }
  const base =
    10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age;
  // "other" uses the midpoint of the male (+5) and female (−161) constants
  const sexConstant =
    profile.sex === "male" ? 5 : profile.sex === "female" ? -161 : -78;
  const factor = ACTIVITY_FACTOR[profile.activity_level ?? "sedentary"];
  const goal = (base + sexConstant) * factor;
  return Math.max(0, Math.round(goal / 50) * 50);
}

/** Estimated kcal burned by one workout log (duration × MET × body weight). */
export function estimateCaloriesBurned(
  log: WorkoutLog,
  profile: Pick<Profile, "weight_kg" | "session_duration"> | null,
): number {
  // Logs without a duration fall back to the user's usual session length
  const minutes = log.duration_minutes ?? profile?.session_duration ?? 0;
  const weight = profile?.weight_kg ?? DEFAULT_WEIGHT_KG;
  return Math.round(((WORKOUT_MET * 3.5 * weight) / 200) * minutes);
}

/** Total kcal across the given meals' items. */
export function caloriesConsumed(meals: MealWithItems[]): number {
  return meals.reduce(
    (total, meal) =>
      total + meal.meal_items.reduce((sum, item) => sum + item.calories, 0),
    0,
  );
}
