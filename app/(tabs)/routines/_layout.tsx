import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { colors } from "@/src/theme/colors";

export default function RoutinesLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.brandDark },
        headerTintColor: colors.contentPrimary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: t("routines.myRoutines") }} />
      <Stack.Screen name="[id]" options={{ title: t("routines.routineTitle") }} />
      <Stack.Screen name="create" options={{ title: t("routines.newRoutine") }} />
    </Stack>
  );
}
