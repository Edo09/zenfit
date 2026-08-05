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
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: "SchibstedGrotesk_700Bold", fontSize: 18 },
        contentStyle: { backgroundColor: colors.brandDark },
        ...(Platform.OS === "android" && { animation: "slide_from_right" as const }),
      }}
    >
      {/* index draws its own screen title (spec: 26–29px in content) */}
      <Stack.Screen
        name="index"
        options={{ title: t("tabs.progress"), headerShown: false }}
      />
      <Stack.Screen name="history" options={{ title: t("progress.historial") }} />
    </Stack>
  );
}
