import type { ImageSourcePropType } from "react-native";

import type { RoutineFocusKey } from "@/src/services/ai-routine";

// Maps a routine name to a representative category photo. Detection covers
// English and Spanish, and the buckets are the exact same RoutineFocusKey
// taxonomy the AI generator uses — "chest" means the same thing everywhere
// in the app, not two independent guesses that can drift apart.
//
// Real per-category photography landed for all 7 buckets (2026-08-06); `mix`
// (no keyword match) still falls back to the generic strength photo, which
// is the intended permanent behavior — a routine with no detectable focus
// doesn't need its own dedicated photo.
//
// Source spec for new photos: ~1200px on the longest edge, subject centered
// and not cropped tight to the frame edges — the same file gets `cover`-
// cropped to a 1:1 thumb (68px), a ~2.3:1 card, and a ~1.4:1 hero, all
// center-anchored, so an off-center subject reads fine in one spot and gets
// clipped in another. Compress to roughly 100-150KB (the shipped photos
// were regenerated at JPEG quality 78 from ~1.5-1.9MB PNG-quality originals
// down to that range, visually indistinguishable at display size) — these
// ship inside the app binary, not over the network, so size here is
// permanent install-size weight, not a one-time load cost.

const strength = require("@/assets/images/routines/strength_card.jpg");
const cardio = require("@/assets/images/routines/cardio_card.jpg");
const chest = require("@/assets/images/routines/chest_card.jpg");
const back = require("@/assets/images/routines/back_card.jpg");
const shoulders = require("@/assets/images/routines/shoulders_card.jpg");
const core = require("@/assets/images/routines/core_card.jpg");
const legs = require("@/assets/images/routines/legs_card.jpg");
const arms = require("@/assets/images/routines/arms_card.jpg");

export const ROUTINE_IMAGES = {
  mix: strength,
  chest,
  back,
  shoulders,
  arms,
  legs,
  core,
  cardio,
} satisfies Record<RoutineFocusKey, ImageSourcePropType>;

// Keyword buckets, ES + EN, matched against the routine name. First match
// wins — order isn't load-bearing today since the lists don't overlap, but
// keeps future edits predictable if that changes.
const FOCUS_KEYWORDS: Record<Exclude<RoutineFocusKey, "mix">, string[]> = {
  chest: ["pecho", "pectoral", "chest"],
  back: [
    "espalda",
    "dominada",
    "remo",
    "jalón",
    "jalon",
    "back",
    "pull-up",
    "pullup",
    "row",
  ],
  shoulders: ["hombro", "deltoide", "militar", "arnold", "shoulder", "overhead press"],
  arms: [
    "brazo",
    "bíceps",
    "biceps",
    "tríceps",
    "triceps",
    "antebrazo",
    "curl",
    "arm",
    "forearm",
  ],
  legs: [
    "pierna",
    "cuádriceps",
    "cuadriceps",
    "isquio",
    "glúteo",
    "gluteo",
    "pantorrilla",
    "sentadilla",
    "zancada",
    "leg",
    "squat",
    "lunge",
    "quad",
    "hamstring",
    "glute",
    "calf",
  ],
  core: ["abdomen", "abdominal", "core", "plancha", "oblicuo", "waist", "crunch"],
  cardio: [
    "cardio",
    "correr",
    "running",
    "burpee",
    "salto",
    "jump",
    "bici",
    "spinning",
    "hiit",
  ],
};

/** Best-effort focus bucket for a routine, from its name alone. */
export function getRoutineFocus(routineName: string): RoutineFocusKey {
  const name = routineName.toLowerCase();
  for (const [focus, keywords] of Object.entries(FOCUS_KEYWORDS)) {
    if (keywords.some((k) => name.includes(k))) return focus as RoutineFocusKey;
  }
  return "mix";
}

export function getRoutineImage(routineName: string) {
  return ROUTINE_IMAGES[getRoutineFocus(routineName)];
}
