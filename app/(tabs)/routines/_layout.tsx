import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { useColors } from "@/src/theme/colors";

// Deep-linking straight to "[id]"/"create" (e.g. from the Home tab) otherwise
// builds this stack with no "index" beneath it — no parent screen means no
// back button. This forces index to always be inserted first.
export const unstable_settings = {
  initialRouteName: "index",
};

export default function RoutinesLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.brandDark },
        headerTintColor: colors.contentPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.brandDark },
        // iOS keeps the native push (parallax + swipe-back); Android's OEM
        // default varies, so pin it
        ...(Platform.OS === "android" && { animation: "slide_from_right" as const }),
      }}
    >
      <Stack.Screen name="index" options={{ title: t("routines.myRoutines") }} />
      <Stack.Screen name="[id]" options={{ title: t("routines.routineTitle") }} />
      <Stack.Screen
        name="create"
        options={{
          title: t("routines.newRoutine"),
          presentation: "modal",
          ...(Platform.OS === "android" && { animation: "slide_from_bottom" as const }),
        }}
      />
    </Stack>
  );
}
