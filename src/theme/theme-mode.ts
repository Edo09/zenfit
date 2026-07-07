import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { Appearance, type ColorSchemeName } from "react-native";

import { palettes } from "./colors";

const THEME_KEY = "app_theme";

// Keep the native window background in sync with the scheme — it's what
// shows through while screens animate, so leaving it at the platform
// default (white) flashes on every transition in dark mode.
function syncWindowBackground(scheme: ColorSchemeName | null | undefined) {
  void SystemUI.setBackgroundColorAsync(
    palettes[scheme === "dark" ? "dark" : "light"].brandDark,
  );
}

Appearance.addChangeListener(({ colorScheme }) => {
  syncWindowBackground(colorScheme);
});

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
    "unspecified" = follow the OS setting (RN 0.86+; was null before). */
export function applyThemeMode(mode: ThemeMode) {
  Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
  syncWindowBackground(
    mode === "system" ? Appearance.getColorScheme() : mode,
  );
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
