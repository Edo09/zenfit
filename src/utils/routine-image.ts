// Maps a routine name to a representative category image.
// Keyword matching covers English and Spanish routine names.

export const ROUTINE_IMAGES = {
  strength: require("@/assets/images/routines/strength_card.jpg"),
  cardio: require("@/assets/images/routines/cardio_card.jpg"),
} as const;

const STRENGTH_KEYWORDS = [
  "strength",
  "power",
  "lift",
  "fuerza",
  "pesas",
  "musculacion",
  "musculación",
  "hipertrofia",
  "torso",
  "pierna",
  "empuje",
  "jalón",
  "jalon",
  "upper",
  "lower",
  "push",
  "pull",
];

export function getRoutineImage(routineName: string) {
  const name = routineName.toLowerCase();
  if (STRENGTH_KEYWORDS.some((k) => name.includes(k))) return ROUTINE_IMAGES.strength;
  return ROUTINE_IMAGES.cardio;
}
