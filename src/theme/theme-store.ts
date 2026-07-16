import { useSyncExternalStore } from "react";
import { Platform, useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark" | "system";

/* Currently applied mode. Lives in its own module so colors.ts can import
   the scheme hook without a cycle (theme-mode.ts → colors.ts → here).
   null = not restored from storage yet (gates first render in _layout). */
let mode: ThemeMode | null = null;
const listeners = new Set<() => void>();

export function getThemeMode(): ThemeMode | null {
  return mode;
}

/** Internal — applyThemeMode() is the only intended writer. */
export function setThemeModeState(next: ThemeMode) {
  if (mode === next) return;
  mode = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Applied mode; null until the stored preference is restored at startup. */
export function useThemeMode(): ThemeMode | null {
  return useSyncExternalStore(subscribe, getThemeMode, getThemeMode);
}

/** Effective scheme for JS consumers (useColors, icon colors, isDark).
    Native: Appearance already reflects explicit modes (applyThemeMode calls
    Appearance.setColorScheme), so the RN hook is enough. Web: react-native-web
    cannot override Appearance — it always follows prefers-color-scheme — so
    an explicit mode from the store wins there. */
export function useThemeScheme(): "light" | "dark" {
  const system = useColorScheme();
  const current = useThemeMode();
  if (Platform.OS === "web" && (current === "light" || current === "dark")) {
    return current;
  }
  return system === "dark" ? "dark" : "light";
}
