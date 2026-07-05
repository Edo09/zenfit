import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { colors } from "@/src/theme/colors";

export default function MealsLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.brandDark },
        headerTintColor: colors.contentPrimary,
        headerShadowVisible: false,
        // iOS keeps the native push (parallax + swipe-back); Android's OEM
        // default varies, so pin it
        ...(Platform.OS === "android" && { animation: "slide_from_right" as const }),
      }}
    >
      <Stack.Screen name="index" options={{ title: t("meals.myMeals") }} />
      <Stack.Screen name="[id]" options={{ title: t("meals.mealDetail") }} />
      <Stack.Screen
        name="create"
        options={{
          title: t("meals.logMeal"),
          presentation: "modal",
          ...(Platform.OS === "android" && { animation: "slide_from_bottom" as const }),
        }}
      />
    </Stack>
  );
}
