import { useThemeScheme } from "./theme-store";

/**
 * Raw color constants mirroring the CSS tokens in src/global.css.
 * Only for places className can't reach: navigation options,
 * placeholderTextColor, ActivityIndicator/icon/RefreshControl colors.
 * Keep in sync with global.css (:root light block + dark media block).
 *
 * Scheme-aware: components read the palette via useColors(), which follows
 * the effective scheme (RN Appearance, plus the web override — see
 * theme-store.ts). There is deliberately no static `colors` export — every
 * consumer must go through the hook so no site can silently stay light-only.
 *
 * HABBITO palette. Token names kept from the dark era — brandDark is the
 * CANVAS color, brandLight the INK color, in both schemes.
 *
 * Three systemic rules:
 *  1. brandPrimary is VOLT CYAN — a FILL color. Text/icons ON it must be
 *     onAccent (near-black), never white.
 *  2. The fill is too light to read as text on light surfaces. As a
 *     foreground use brandPrimaryDark (cyan-deep); on dark both resolve to
 *     the same bright cyan.
 *  3. brandAccent is VIOLET and marks AI features.
 */
const lightPalette = {
    white: "#ffffff",
    brandPrimary: "#22d3ee",        // volt cyan — CTA/FAB/active FILL (ink text on it)
    brandPrimaryDark: "#0e7490",    // cyan-deep — readable cyan TEXT/icon on light
    brandSecondary: "#4e6bf0",      // periwinkle — links, protein, info data
    brandAccent: "#8e7bf0",         // violet — AI features
    brandDark: "#f4f5f7",           // CANVAS (cool slate)
    brandLight: "#12151a",          // INK
    // Text/icons ON a cyan fill. Dark in BOTH schemes — brandLight flips
    // with the scheme and would go near-white on a cyan button in dark.
    onAccent: "#0e1a1c",
    surface: "#ffffff",
    surfaceElevated: "#ebedf1",     // sunken — insets, tracks, tiles
    surfaceSunken: "#f7f8fa",       // sunken2 — subtle tiles / thumbs
    contentPrimary: "#12151a",
    contentSecondary: "#565c66",
    contentTertiary: "#6b727d",
    contentMuted: "#9aa1ac",
    border: "#e3e6ea",
    borderStrong: "#d2d7de",
    // Web-only: page background behind the centered app column
    // (app/_layout.tsx). TS-only token — no className counterpart needed.
    webGutter: "#e7e9ed",
    success: "#2e9f66",
    error: "#e1553c",               // warm coral (never a pure red)
    warning: "#d6971f",
    info: "#4e6bf0",
    infoSoft: "rgba(78, 107, 240, 0.1)",
    macroProtein: "#4e6bf0",
    macroCarbs: "#e39a2e",
    macroFat: "#ec6a88",
    // Soft / tint fills
    brandPrimarySoft: "#defafb",    // cyan-soft — selected-state tint
    brandAccentSoft: "#eeeafb",     // violet-soft — AI card bg
    brandAccentBorder: "rgba(142, 123, 240, 0.35)",
    successSoft: "rgba(46, 159, 102, 0.12)",
    // Dark "feature" cards (energy card, active workout, membership)
    heroFrom: "#1b2027",
    heroTo: "#0b0e12",
    onHero: "#f2f4f7",
    onHeroDim: "rgba(242, 244, 247, 0.58)",
    heroTrack: "rgba(242, 244, 247, 0.10)",
    headerGradFrom: "#ffffff",
    headerGradTo: "#f4f5f7",
};

export type Palette = { [K in keyof typeof lightPalette]: string };
export type PaletteColor = keyof Palette;

const darkPalette: Palette = {
    white: "#ffffff",
    brandPrimary: "#3ee0f0",        // bright cyan reads as fill AND text on dark
    brandPrimaryDark: "#3ee0f0",
    brandSecondary: "#7a93ff",
    brandAccent: "#a594ff",
    brandDark: "#101317",           // CANVAS (cool charcoal)
    brandLight: "#f2f4f7",          // INK
    onAccent: "#0a1517",
    surface: "#1a1e24",
    surfaceElevated: "#242a32",
    surfaceSunken: "#20242b",
    contentPrimary: "#f2f4f7",
    contentSecondary: "#a9b0ba",
    contentTertiary: "#8b929d",
    contentMuted: "#6d7480",
    border: "#262b33",
    borderStrong: "#333944",
    // Darker than the canvas so the app column pops on dark web
    webGutter: "#070909",
    success: "#37c07e",
    error: "#f26b52",
    warning: "#e7ae3f",
    info: "#7a93ff",
    infoSoft: "rgba(122, 147, 255, 0.16)",
    macroProtein: "#7a93ff",
    macroCarbs: "#eeaa4a",
    macroFat: "#f284a0",
    brandPrimarySoft: "#123338",
    brandAccentSoft: "#2a2540",
    brandAccentBorder: "rgba(165, 148, 255, 0.35)",
    successSoft: "rgba(55, 192, 126, 0.15)",
    heroFrom: "#1a1f26",
    heroTo: "#080a0e",
    onHero: "#f2f4f7",
    onHeroDim: "rgba(242, 244, 247, 0.58)",
    heroTrack: "rgba(242, 244, 247, 0.10)",
    headerGradFrom: "#1a1e24",
    headerGradTo: "#101317",
};

export const palettes: { light: Palette; dark: Palette } = {
  light: lightPalette,
  dark: darkPalette,
};

export function useColors(): Palette {
  // useThemeScheme (not RN useColorScheme): on web an explicit toggle can't
  // reach Appearance, so the effective scheme lives in the theme store.
  const scheme = useThemeScheme();
  return palettes[scheme];
}
