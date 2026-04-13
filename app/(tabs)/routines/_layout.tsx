import { Stack } from "expo-router";

export default function RoutinesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: "#111827",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "My Routines" }} />
      <Stack.Screen name="[id]" options={{ title: "Routine" }} />
      <Stack.Screen name="create" options={{ title: "New Routine" }} />
    </Stack>
  );
}
