import { Stack } from "expo-router";
import { Platform } from "react-native";

import { useColors } from "@/src/theme/colors";

export default function AuthLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.brandDark },
        ...(Platform.OS === "android" && { animation: "slide_from_right" as const }),
      }}
    />
  );
}
