/**
 * Raw color constants mirroring the CSS tokens in src/global.css.
 * Only for places className can't reach: navigation options,
 * placeholderTextColor, ActivityIndicator/Ionicons/RefreshControl colors.
 * Keep in sync with global.css @theme.
 */
export const colors = {
  white: "#ffffff",
  brandPrimary: "#0d7ff2",
  brandSecondary: "#22c55e",
  brandDark: "#0f172a",
  brandLight: "#f8fafc",
  surface: "#1e293b",
  surfaceElevated: "#334155",
  contentPrimary: "#f8fafc",
  contentSecondary: "#cbd5e1",
  contentTertiary: "#94a3b8",
  contentMuted: "#64748b",
  border: "#334155",
  borderStrong: "#475569",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b9ff5",
  macroProtein: "#3b82f6",
  macroCarbs: "#f59e0b",
  macroFat: "#ec4899",
} as const;
