import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { colors } from "@/src/theme/colors";

export default function ProgressLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.brandDark },
        headerTintColor: colors.contentPrimary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: t("tabs.progress") }} />
    </Stack>
  );
}
