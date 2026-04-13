import { StatCard } from "@/src/components/stat-card";
import { useAuth } from "@/src/hooks/use-auth";
import { useMeals } from "@/src/hooks/use-meals";
import { useProgress } from "@/src/hooks/use-progress";
import { Pressable, ScrollView, Text, View } from "@/src/tw";
import { router } from "expo-router";
import React from "react";

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { todaysMeals } = useMeals();
  const { todaysLogs } = useProgress();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "there";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-gray-50"
      contentContainerClassName="px-4 py-6 gap-6 pb-8"
    >
      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-gray-900">
            Hey, {displayName}! 👋
          </Text>
          <Text className="text-gray-500">{today}</Text>
        </View>
        <Pressable onPress={signOut} className="p-2">
          <Text className="text-gray-400 text-sm">Sign out</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View className="flex-row gap-3">
        <StatCard
          label="Meals Today"
          value={todaysMeals.length}
          unit="logged"
          color="#F97316"
        />
        <StatCard
          label="Workouts"
          value={todaysLogs.length}
          unit="today"
          color="#16A34A"
        />
      </View>

      {/* Today's Meals */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">Today's Meals</Text>
          <Pressable onPress={() => router.push("/(tabs)/meals")}>
            <Text className="text-green-600 font-medium text-sm">See all</Text>
          </Pressable>
        </View>

        {todaysMeals.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 items-center gap-2"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <Text className="text-gray-400">No meals logged today</Text>
            <Pressable onPress={() => router.push("/(tabs)/meals/create")}>
              <Text className="text-green-600 font-medium">+ Log a meal</Text>
            </Pressable>
          </View>
        ) : (
          todaysMeals.slice(0, 3).map((meal) => (
            <Pressable
              key={meal.id}
              onPress={() => router.push(`/(tabs)/meals/${meal.id}`)}
              className="bg-white rounded-2xl px-4 py-3 flex-row items-center justify-between"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            >
              <View>
                <Text className="font-medium text-gray-900">{meal.name}</Text>
                <Text className="text-gray-400 text-sm capitalize">{meal.meal_type}</Text>
              </View>
              <Text className="text-gray-300">›</Text>
            </Pressable>
          ))
        )}
      </View>

      {/* Recent Workouts */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">Recent Workouts</Text>
          <Pressable onPress={() => router.push("/(tabs)/progress")}>
            <Text className="text-green-600 font-medium text-sm">See all</Text>
          </Pressable>
        </View>

        {todaysLogs.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 items-center gap-2"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <Text className="text-gray-400">No workouts logged today</Text>
            <Pressable onPress={() => router.push("/(tabs)/routines")}>
              <Text className="text-green-600 font-medium">Start a routine</Text>
            </Pressable>
          </View>
        ) : (
          todaysLogs.slice(0, 3).map((log) => (
            <View
              key={log.id}
              className="bg-white rounded-2xl px-4 py-3"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            >
              <Text className="font-medium text-gray-900">{log.routine_name}</Text>
              {log.duration_minutes != null && (
                <Text className="text-gray-400 text-sm">{log.duration_minutes} min</Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
