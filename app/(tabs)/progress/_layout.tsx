import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { useColors } from "@/src/theme/colors";

export default function ProgressLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.brandDark },
        headerTintColor: colors.contentPrimary,
        // Elevation/hairline under the header so the scrolling dashboard
        // reads as separate from the title (other tabs stay flat by default).
        headerShadowVisible: true,
        contentStyle: { backgroundColor: colors.brandDark },
        ...(Platform.OS === "android" && { animation: "slide_from_right" as const }),
      }}
    >
      <Stack.Screen name="index" options={{ title: t("tabs.progress") }} />
      <Stack.Screen name="history" options={{ title: t("progress.historial") }} />
    </Stack>
  );
}
