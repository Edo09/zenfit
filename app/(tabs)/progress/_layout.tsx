import { Stack } from "expo-router";

export default function ProgressLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: "#111827",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Progress" }} />
    </Stack>
  );
}
