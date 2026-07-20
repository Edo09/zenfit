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

/* Web: react-native-web's useColorScheme doesn't re-render on live OS
   scheme changes (the CSS media/class blocks switch but JS consumers kept
   the stale palette), so system mode tracks prefers-color-scheme directly. */
const darkQuery =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

function getWebSystemScheme(): "light" | "dark" {
  return darkQuery?.matches ? "dark" : "light";
}

function subscribeWebSystemScheme(listener: () => void): () => void {
  darkQuery?.addEventListener("change", listener);
  return () => darkQuery?.removeEventListener("change", listener);
}

/** Effective scheme for JS consumers (useColors, icon colors, isDark).
    Native: Appearance already reflects explicit modes (applyThemeMode calls
    Appearance.setColorScheme), so the RN hook is enough. Web: react-native-web
    cannot override Appearance — it always follows prefers-color-scheme — so
    an explicit mode from the store wins there, and "system" follows the
    matchMedia subscription above. */
export function useThemeScheme(): "light" | "dark" {
  const native = useColorScheme();
  const current = useThemeMode();
  const webSystem = useSyncExternalStore(
    subscribeWebSystemScheme,
    getWebSystemScheme,
    getWebSystemScheme,
  );
  if (Platform.OS === "web") {
    if (current === "light" || current === "dark") return current;
    return webSystem;
  }
  return native === "dark" ? "dark" : "light";
}
