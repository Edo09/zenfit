import { Stack } from "expo-router";

export default function MealsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: "#111827",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "My Meals" }} />
      <Stack.Screen name="[id]" options={{ title: "Meal Detail" }} />
      <Stack.Screen name="create" options={{ title: "Log Meal" }} />
    </Stack>
  );
}
