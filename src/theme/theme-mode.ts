import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

const THEME_KEY = "app_theme";

export type ThemeMode = "light" | "dark" | "system";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

/** Stored preference; "system" (follow the OS) when nothing saved yet. */
export async function getStoredThemeMode(): Promise<ThemeMode> {
  try {
    const stored = await AsyncStorage.getItem(THEME_KEY);
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/** Apply a mode to RN Appearance — the single runtime theme signal.
    null = follow the OS setting. */
export function applyThemeMode(mode: ThemeMode) {
  Appearance.setColorScheme(mode === "system" ? null : mode);
}

/** Persist + apply. Everything re-themes via Appearance subscribers:
    the CSS dark media block (react-native-css), useColors() consumers,
    and the gluestack provider vars. */
export async function setThemeMode(mode: ThemeMode) {
  applyThemeMode(mode);
  try {
    await AsyncStorage.setItem(THEME_KEY, mode);
  } catch {
    // Non-fatal: theme still applies for this session
  }
}
