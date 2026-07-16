import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { Appearance, type ColorSchemeName, Platform } from "react-native";

import { palettes } from "./colors";
// Web-only CSS override blocks (:root.light/.dark) — empty module on native.
import "./theme-overrides";
import { getThemeMode, setThemeModeState, type ThemeMode } from "./theme-store";

const THEME_KEY = "app_theme";

export type { ThemeMode } from "./theme-store";

// Keep the native window background in sync with the scheme — it's what
// shows through while screens animate, so leaving it at the platform
// default (white) flashes on every transition in dark mode.
function syncWindowBackground(scheme: ColorSchemeName | null | undefined) {
  void SystemUI.setBackgroundColorAsync(
    palettes[scheme === "dark" ? "dark" : "light"].brandDark,
  );
}

Appearance.addChangeListener(({ colorScheme }) => {
  // Web only follows the OS in "system" mode — an explicit choice wins
  // (native never diverges: Appearance itself carries the override there).
  const mode = getThemeMode();
  const overridden =
    Platform.OS === "web" && (mode === "light" || mode === "dark");
  syncWindowBackground(overridden ? mode : colorScheme);
});

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

/** Stored preference. Defaults: "dark" on native (dark-first brand — the
    logo, brush wordmark, and gym photography all belong on the dark canvas),
    "system" on web (first visits keep following the OS, matching how web
    behaved before the toggle worked there). */
export async function getStoredThemeMode(): Promise<ThemeMode> {
  const fallback: ThemeMode = Platform.OS === "web" ? "system" : "dark";
  try {
    const stored = await AsyncStorage.getItem(THEME_KEY);
    return isThemeMode(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

/** Web: react-native-web has no Appearance.setColorScheme, so the override
    is a documentElement class + inline color-scheme. The class drives the
    :root.light/.dark blocks (theme-overrides.css) and the gluestack
    provider's injected .dark vars; the theme-store carries it to JS
    consumers (useColors / useThemeScheme). "system" resolves to the OS
    scheme rather than clearing the class — the gluestack :root/.dark var
    blocks rely on the class being present (same as the provider's own
    script), and the provider's media listener keeps it updated on OS
    changes while in system mode. */
function applyWebThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const scheme =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  root.classList.remove(scheme === "light" ? "dark" : "light");
  root.classList.add(scheme);
  root.style.colorScheme = scheme;
}

/** Apply a mode at runtime. Native: RN Appearance is the single theme
    signal — "unspecified" follows the OS (RN 0.86+; was null before), and
    the CSS dark media block, useColors() consumers, and the gluestack
    provider vars all re-theme via Appearance subscribers. Web: see
    applyWebThemeMode. */
export function applyThemeMode(mode: ThemeMode) {
  if (Platform.OS === "web") {
    applyWebThemeMode(mode);
  } else if (typeof Appearance.setColorScheme === "function") {
    Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
  }
  setThemeModeState(mode);
  syncWindowBackground(
    mode === "system" ? Appearance.getColorScheme() : mode,
  );
}

/** Persist + apply. */
export async function setThemeMode(mode: ThemeMode) {
  applyThemeMode(mode);
  try {
    await AsyncStorage.setItem(THEME_KEY, mode);
  } catch {
    // Non-fatal: theme still applies for this session
  }
}
