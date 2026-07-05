import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...(Platform.OS === "android" && { animation: "slide_from_right" as const }),
      }}
    />
  );
}
