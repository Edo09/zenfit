import { Stack } from "expo-router";

export default function ProgressLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0F172A" },
        headerTintColor: "#F8FAFC",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Progress" }} />
    </Stack>
  );
}
