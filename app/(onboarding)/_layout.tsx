import { Stack } from "expo-router";

import { useColors } from "@/src/theme/colors";

export default function OnboardingLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.brandDark },
      }}
    />
  );
}
