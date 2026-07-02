import { Stack } from "expo-router";
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
      }}
    >
      <Stack.Screen name="index" options={{ title: t("meals.myMeals") }} />
      <Stack.Screen name="[id]" options={{ title: t("meals.mealDetail") }} />
      <Stack.Screen name="create" options={{ title: t("meals.logMeal") }} />
    </Stack>
  );
}
