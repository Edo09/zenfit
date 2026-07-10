import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { Appearance, type ColorSchemeName, Platform } from "react-native";

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

/** Stored preference; "dark" (dark-first brand default) when nothing saved
    yet — the logo, brush wordmark, and gym photography all belong on the
    dark canvas. Users can still switch to light via the header toggle. */
export async function getStoredThemeMode(): Promise<ThemeMode> {
  // Web can't override the scheme (see applyThemeMode) — honoring a stored
  // "dark" there would desync gluestack (forced dark) from the CSS/useColors
  // layer (following the OS). Everything follows the OS instead.
  if (Platform.OS === "web") return "system";
  try {
    const stored = await AsyncStorage.getItem(THEME_KEY);
    return isThemeMode(stored) ? stored : "dark";
  } catch {
    return "dark";
  }
}

/** Apply a mode to RN Appearance — the single runtime theme signal.
    "unspecified" = follow the OS setting (RN 0.86+; was null before).
    react-native-web has no setColorScheme — there the CSS dark block and
    useColorScheme() already follow the OS via prefers-color-scheme, so the
    override is a native-only capability and web always behaves as "system". */
export function applyThemeMode(mode: ThemeMode) {
  if (typeof Appearance.setColorScheme === "function") {
    Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
  }
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
