import { useThemeScheme } from "./theme-store";

/**
 * HABBITO palette — drop-in replacement for the Dojo Poster colors.ts.
 * Same token KEYS as before, so screens/components need no renaming.
 * Keep in sync with global.css (:root light + dark @media block).
 *
 * Semantics kept: brandDark = CANVAS (bg), brandLight = INK, in both schemes.
 *
 * ⚠ Two systemic notes when porting (see APPLY.md):
 *  1. brandPrimary is now LIME — a FILL color. Text/icons ON a lime fill must
 *     be brandLight (ink), NOT white. Update your Button's on-primary color.
 *  2. Lime is illegible as text on light surfaces. Anywhere you used
 *     `text-brand-primary` as a foreground, switch to `text-brand-primary-dark`
 *     (= lime-deep) so it stays readable.
 *  3. brandAccent is now VIOLET and is the AI-feature accent (replaces gold).
 */
const lightPalette = {
    white: "#ffffff",
    brandPrimary: "#c4ed4b",        // lime — CTA/FAB/active FILL (ink text on it)
    brandPrimaryDark: "#5e7a0c",    // lime-deep — readable lime TEXT/icon on light
    brandSecondary: "#4e6bf0",      // periwinkle — links, protein, info data
    brandAccent: "#8e7bf0",         // violet — AI features (was gold)
    brandDark: "#f3f1ea",           // CANVAS (warm paper)
    brandLight: "#1a1915",          // INK
    surface: "#ffffff",
    surfaceElevated: "#edeae1",     // sunken tiles/tracks
    contentPrimary: "#1a1915",
    contentSecondary: "#5f5d54",
    contentTertiary: "#74716a",
    contentMuted: "#9c998e",
    border: "#e7e3d8",
    borderStrong: "#d9d4c7",
    webGutter: "#e6e3da",
    success: "#2e9f66",
    error: "#e1553c",               // warm coral (NOT the old red)
    warning: "#d6971f",
    info: "#4e6bf0",
    infoSoft: "rgba(78, 107, 240, 0.1)",
    macroProtein: "#4e6bf0",
    macroCarbs: "#e39a2e",
    macroFat: "#ec6a88",
    // soft / tint tokens
    brandPrimarySoft: "rgba(150, 190, 40, 0.14)",   // lime selected-state tint
    brandAccentSoft: "rgba(142, 123, 240, 0.12)",   // violet AI-card tint
    brandAccentBorder: "rgba(142, 123, 240, 0.35)",
    successSoft: "rgba(46, 159, 102, 0.12)",
    skewGhost: "transparent",       // skew decor removed — keep transparent
    headerGradFrom: "#ffffff",
    headerGradTo: "#f3f1ea",
};

export type Palette = { [K in keyof typeof lightPalette]: string };
export type PaletteColor = keyof Palette;

const darkPalette: Palette = {
    white: "#ffffff",
    brandPrimary: "#cbf556",        // bright lime reads as fill AND text on dark
    brandPrimaryDark: "#cbf556",
    brandSecondary: "#7a93ff",
    brandAccent: "#a594ff",         // violet — AI
    brandDark: "#151410",           // CANVAS (warm charcoal, never slate)
    brandLight: "#f3f1ea",          // INK
    surface: "#201e18",
    surfaceElevated: "#2a281f",
    contentPrimary: "#f3f1ea",
    contentSecondary: "#b3b0a4",
    contentTertiary: "#93908a",
    contentMuted: "#7c796d",
    border: "#302d24",
    borderStrong: "#3b382e",
    webGutter: "#0b0a07",
    success: "#37c07e",
    error: "#f26b52",
    warning: "#e7ae3f",
    info: "#7a93ff",
    infoSoft: "rgba(122, 147, 255, 0.16)",
    macroProtein: "#7a93ff",
    macroCarbs: "#eeaa4a",
    macroFat: "#f284a0",
    brandPrimarySoft: "rgba(203, 245, 86, 0.14)",
    brandAccentSoft: "rgba(165, 148, 255, 0.18)",
    brandAccentBorder: "rgba(165, 148, 255, 0.35)",
    successSoft: "rgba(55, 192, 126, 0.15)",
    skewGhost: "transparent",
    headerGradFrom: "#201e18",
    headerGradTo: "#151410",
};

export const palettes: { light: Palette; dark: Palette } = {
  light: lightPalette,
  dark: darkPalette,
};

export function useColors(): Palette {
  const scheme = useThemeScheme();
  return palettes[scheme];
}
