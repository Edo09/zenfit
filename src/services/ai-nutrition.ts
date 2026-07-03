import { completeJSON, completeJSONWithImage, type ImageInput } from "@/src/services/llm";
import type { MealType } from "@/src/types/database";

export type NutritionEstimate = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  portion: string;
};

export type PhotoNutritionEstimate = NutritionEstimate & {
  /** Dish name detected from the photo, in the requested language. */
  name: string;
};

function clampNum(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}

export async function estimateMealNutrition(
  mealName: string,
  mealType: MealType,
  language: string
): Promise<NutritionEstimate> {
  const languageName = language === "es" ? "Spanish" : "English";

  const system = [
    "You are a nutritionist. Estimate the nutrition facts for one typical serving of the given meal.",
    "Respond ONLY with strict JSON matching this schema:",
    '{"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"portion":string}',
    "Rules:",
    "- Values are for ONE typical serving of the dish as commonly prepared.",
    "- calories in kcal; protein_g/carbs_g/fat_g in grams.",
    `- portion is a short human description of the serving (e.g. "1 bowl (400g)") in ${languageName}.`,
  ].join("\n");

  const user = JSON.stringify({ meal_name: mealName, meal_type: mealType });

  const raw = (await completeJSON(system, user)) as Record<string, unknown>;

  const calories = clampNum(raw?.calories, 0, 5000);
  const protein = clampNum(raw?.protein_g, 0, 500);
  const carbs = clampNum(raw?.carbs_g, 0, 1000);
  const fat = clampNum(raw?.fat_g, 0, 500);
  if (calories == null) throw new Error("AI returned no calories");

  return {
    calories: Math.round(calories),
    protein_g: protein ?? 0,
    carbs_g: carbs ?? 0,
    fat_g: fat ?? 0,
    portion:
      typeof raw?.portion === "string" && raw.portion.trim().length > 0
        ? raw.portion.trim().slice(0, 60)
        : "1 serving",
  };
}

export async function estimateMealNutritionFromPhoto(
  image: ImageInput,
  language: string,
  userMealName?: string
): Promise<PhotoNutritionEstimate> {
  const languageName = language === "es" ? "Spanish" : "English";

  const system = [
    "You are a nutritionist. Identify the food in the photo and estimate its nutrition facts for the visible portion.",
    "Respond ONLY with strict JSON matching this schema:",
    '{"name":string,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"portion":string}',
    "Rules:",
    `- name: a short dish name in ${languageName} (e.g. "Chicken & rice bowl").`,
    "- Estimate for the portion VISIBLE in the photo.",
    "- calories in kcal; protein_g/carbs_g/fat_g in grams.",
    `- portion: short description of the visible serving (e.g. "1 plate (~350g)") in ${languageName}.`,
    "- If the image is not food, return {\"name\":\"\"} only.",
  ].join("\n");

  const user =
    userMealName != null && userMealName.trim().length > 0
      ? `The user calls this meal: "${userMealName.trim()}"`
      : "Identify this meal.";

  const raw = (await completeJSONWithImage(system, user, image)) as Record<string, unknown>;

  const name = typeof raw?.name === "string" ? raw.name.trim().slice(0, 80) : "";
  if (name.length === 0) throw new Error("No food detected in photo");

  const calories = clampNum(raw?.calories, 0, 5000);
  if (calories == null) throw new Error("AI returned no calories");

  return {
    name,
    calories: Math.round(calories),
    protein_g: clampNum(raw?.protein_g, 0, 500) ?? 0,
    carbs_g: clampNum(raw?.carbs_g, 0, 1000) ?? 0,
    fat_g: clampNum(raw?.fat_g, 0, 500) ?? 0,
    portion:
      typeof raw?.portion === "string" && raw.portion.trim().length > 0
        ? raw.portion.trim().slice(0, 60)
        : "1 serving",
  };
}
