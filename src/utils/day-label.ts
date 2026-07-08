import type { TFunction } from "i18next";

// day_of_week is stored as an English day name — lowercase from the create
// form ("thursday"), though some seed/legacy rows are capitalized ("Thursday").
// Normalize, then translate via the daysLong catalog. Falls back to the raw
// value for anything unexpected so it never renders blank.
export function dayLabel(
  day: string | null | undefined,
  t: TFunction,
): string | null {
  if (day == null || day.trim() === "") return null;
  const key = day.trim().toLowerCase();
  return t(`daysLong.${key}`, { defaultValue: day });
}
