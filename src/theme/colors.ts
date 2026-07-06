/**
 * Raw color constants mirroring the CSS tokens in src/global.css.
 * Only for places className can't reach: navigation options,
 * placeholderTextColor, ActivityIndicator/Ionicons/RefreshControl colors.
 * Keep in sync with global.css @theme.
 *
 * Red primary / blue secondary rebrand: token names kept from the dark era —
 * brandDark is now the LIGHT canvas color, brandLight the dark ink.
 */
export const colors = {
  white: "#ffffff",
  brandPrimary: "#dc2626",
  brandPrimaryDark: "#b91c1c",
  brandSecondary: "#2563eb",
  brandDark: "#f8fafc",
  brandLight: "#0f172a",
  surface: "#ffffff",
  surfaceElevated: "#f1f5f9",
  contentPrimary: "#0f172a",
  contentSecondary: "#334155",
  contentTertiary: "#64748b",
  contentMuted: "#94a3b8",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  success: "#16a34a",
  error: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
  macroProtein: "#2563eb",
  macroCarbs: "#d97706",
  macroFat: "#e11d48",
} as const;
