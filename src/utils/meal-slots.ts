import type { MealType } from "@/src/types/database";

/** Diary slot order — also the canonical list of meal types. */
export const MEAL_SLOTS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

/** Slot to preselect when the user adds food without picking one. */
export function suggestedSlot(now: Date = new Date()): MealType {
  const h = now.getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 22) return "dinner";
  return "snack";
}
