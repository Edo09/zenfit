import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

// User-facing weight unit. The DB stores kg everywhere (weight_kg columns,
// volume math, BMI, calorie estimates) — this is a DISPLAY/INPUT layer only:
// convert at the edge, never persist lb.

export type WeightUnit = "kg" | "lb";

const UNIT_KEY = "app_weight_unit";
export const KG_PER_LB = 0.45359237;

let unit: WeightUnit = "kg";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

// Restore once at module load; default kg until it resolves (metric-first
// brand, and the flash is at most one frame of "kg" labels).
void AsyncStorage.getItem(UNIT_KEY)
  .then((stored) => {
    if (stored === "kg" || stored === "lb") {
      unit = stored;
      emit();
    }
  })
  .catch(() => {});

export function getWeightUnit(): WeightUnit {
  return unit;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWeightUnit(): WeightUnit {
  return useSyncExternalStore(subscribe, getWeightUnit, getWeightUnit);
}

/** Persist + apply. */
export async function setWeightUnit(next: WeightUnit) {
  if (unit !== next) {
    unit = next;
    emit();
  }
  try {
    await AsyncStorage.setItem(UNIT_KEY, next);
  } catch {
    // Non-fatal: unit still applies for this session
  }
}

/** Stored kg → display value in the given unit. */
export function kgToUnit(kg: number, u: WeightUnit): number {
  return u === "lb" ? kg / KG_PER_LB : kg;
}

/** User input in the given unit → kg for storage. */
export function unitToKg(value: number, u: WeightUnit): number {
  return u === "lb" ? value * KG_PER_LB : value;
}

/** kg → display value rounded to 1 decimal. */
export function kgToUnit1(kg: number, u: WeightUnit): number {
  return Math.round(kgToUnit(kg, u) * 10) / 10;
}
