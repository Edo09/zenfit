import type { Routine } from "@/src/types/database";
import { dateKeyToDate, toDateKey } from "@/src/utils/dates";

// `routines.day_of_week` holds an English day name. The create form writes it
// lowercase ("thursday"); some seed and admin-panel rows are capitalized, so
// everything here compares on the normalized value. Indexed by Date.getDay().
const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export function weekdayKeyOf(dateKey: string = toDateKey()): WeekdayKey {
  return WEEKDAY_KEYS[dateKeyToDate(dateKey).getDay()];
}

function normalizedDay(routine: Routine): string | null {
  const raw = routine.day_of_week;
  if (raw == null || raw.trim() === "") return null;
  return raw.trim().toLowerCase();
}

/**
 * Which coach-assigned routine to put in front of the client right now.
 *
 * Preference order: something pinned to today, then the soonest day later this
 * week, then — for a coach who assigned work without pinning any weekday — the
 * first unpinned routine, which is "do this whenever".
 *
 * `daysAway` is 0 for today and null for the unpinned case, so a caller can
 * tell "train today" apart from "your plan, no fixed day".
 */
export function pickAssignedRoutine<T extends Routine>(
  assigned: T[],
  dateKey: string = toDateKey(),
): { routine: T; daysAway: number | null } | null {
  if (assigned.length === 0) return null;

  const todayIndex = dateKeyToDate(dateKey).getDay();
  for (let offset = 0; offset < 7; offset++) {
    const key = WEEKDAY_KEYS[(todayIndex + offset) % 7];
    const match = assigned.find((r) => normalizedDay(r) === key);
    if (match != null) return { routine: match, daysAway: offset };
  }

  const unpinned = assigned.find((r) => normalizedDay(r) == null);
  return unpinned != null ? { routine: unpinned, daysAway: null } : null;
}

/**
 * Is `dateKey` a training day according to the coach's assignments? Read from
 * the plan rather than asking the client — the assigned routines already pin
 * the split to weekdays, so anything that needs the training calendar (the
 * nutrition plan's day cycling) gets it for free.
 *
 * A client with no assigned routines, or assignments with no weekday pinned at
 * all, has no calendar to read: "rest" is the safer default to show, and the
 * manual toggle is then the only signal.
 */
export function isTrainingDay(
  assigned: Routine[],
  dateKey: string = toDateKey(),
): boolean {
  const today = weekdayKeyOf(dateKey);
  return assigned.some((r) => normalizedDay(r) === today);
}
