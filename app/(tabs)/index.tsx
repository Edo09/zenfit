import { StatCard } from "@/src/components/stat-card";
import { WorkoutCarousel } from "@/src/components/workout-carousel";
import { useAuth } from "@/src/hooks/use-auth";
import { useMeals } from "@/src/hooks/use-meals";
import { useProgress } from "@/src/hooks/use-progress";
import { useRoutines } from "@/src/hooks/use-routines";
import { Pressable, ScrollView, Text, View } from "@/src/tw";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { todaysMeals, refresh: refreshMeals } = useMeals();
  const { todaysLogs, refresh: refreshProgress } = useProgress();
  const { routines, refresh: refreshRoutines } = useRoutines();
  const [carouselTheme, setCarouselTheme] = useState<"light" | "dark">("dark");

  useFocusEffect(
    useCallback(() => {
      refreshMeals();
      refreshProgress();
      refreshRoutines();
    }, [refreshMeals, refreshProgress, refreshRoutines])
  );

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "there";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const toggleTheme = () => {
    setCarouselTheme(prev => prev === "light" ? "dark" : "light");
  };

  return (
    <View className="flex-1 bg-brand-dark">
      <StatusBar style="light" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1"
        contentContainerClassName="pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View className="px-6 pt-12 pb-6">
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-brand-primary text-xs font-black uppercase tracking-[3px] mb-1">
                Welcome back
              </Text>
              <Text className="text-3xl font-black text-white tracking-tighter">
                Hey, {displayName}! 👋
              </Text>
            </View>
            <Pressable 
              onPress={signOut} 
              className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-surface-elevated"
            >
              <Ionicons name="log-out-outline" size={20} color="#64748B" />
            </Pressable>
          </View>
          <Text className="text-gray-400 font-medium">{today}</Text>
        </View>

        {/* Stats Grid */}
        <View className="px-6 flex-row gap-4 mb-8">
          <StatCard
            label="Meals"
            value={todaysMeals.length}
            unit="logged"
            color="#2563EB"
          />
          <StatCard
            label="Workout"
            value={todaysLogs.length}
            unit="today"
            color="#22C55E"
          />
        </View>

        {/* Workout Carousel Section */}
        <View className="mb-8">
          <View className="px-6 flex-row items-center justify-between mb-2">
            <Text className="text-xl font-black text-white tracking-tight">Your Routines</Text>
            <Pressable 
              onPress={toggleTheme}
              className="flex-row items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full"
            >
              <Ionicons 
                name={carouselTheme === "dark" ? "moon" : "sunny"} 
                size={14} 
                color={carouselTheme === "dark" ? "#94a3b8" : "#f59e0b"} 
              />
              <Text className="text-[10px] font-bold text-gray-400 uppercase">
                {carouselTheme === "dark" ? "Dark" : "Light"}
              </Text>
            </Pressable>
          </View>
          <WorkoutCarousel routines={routines} theme={carouselTheme} />
        </View>

        {/* Today's Meals Section */}
        <View className="px-6 gap-4 mb-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-black text-white tracking-tight">Today's Nutrition</Text>
            <Pressable onPress={() => router.push("/(tabs)/meals")}>
              <Text className="text-brand-primary font-black text-xs uppercase tracking-wider">See all</Text>
            </Pressable>
          </View>

          {todaysMeals.length === 0 ? (
            <Pressable 
              onPress={() => router.push("/(tabs)/meals/create")}
              className="bg-surface rounded-[32px] p-8 items-center border border-dashed border-surface-elevated"
            >
              <View className="w-12 h-12 bg-brand-dark rounded-2xl items-center justify-center mb-3 shadow-sm">
                <Ionicons name="restaurant-outline" size={24} color="#2563EB" />
              </View>
              <Text className="text-gray-400 font-bold mb-1">Fuel your body</Text>
              <Text className="text-brand-primary font-black">+ Log a meal</Text>
            </Pressable>
          ) : (
            <View className="gap-3">
              {todaysMeals.slice(0, 3).map((meal) => (
                <Pressable
                  key={meal.id}
                  onPress={() => router.push(`/(tabs)/meals/${meal.id}`)}
                  className="bg-surface rounded-3xl px-5 py-4 flex-row items-center justify-between border border-surface-elevated"
                >
                  <View className="flex-row items-center gap-4">
                    <View className="w-10 h-10 bg-brand-primary/10 rounded-xl items-center justify-center">
                      <Text className="text-lg">🍱</Text>
                    </View>
                    <View>
                      <Text className="font-black text-white tracking-tight">{meal.name}</Text>
                      <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{meal.meal_type}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#475569" />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Recent Workouts Section */}
        <View className="px-6 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-black text-white tracking-tight">Recent Activity</Text>
            <Pressable onPress={() => router.push("/(tabs)/progress")}>
              <Text className="text-brand-primary font-black text-xs uppercase tracking-wider">See all</Text>
            </Pressable>
          </View>

          {todaysLogs.length === 0 ? (
            <Pressable 
              onPress={() => router.push("/(tabs)/routines")}
              className="bg-surface rounded-[32px] p-8 items-center border border-dashed border-surface-elevated"
            >
              <View className="w-12 h-12 bg-brand-dark rounded-2xl items-center justify-center mb-3 shadow-sm">
                <Ionicons name="fitness-outline" size={24} color="#22C55E" />
              </View>
              <Text className="text-gray-400 font-bold mb-1">No activity logged today</Text>
              <Text className="text-brand-secondary font-black">Start a routine →</Text>
            </Pressable>
          ) : (
            <View className="gap-3">
              {todaysLogs.slice(0, 3).map((log) => (
                <View
                  key={log.id}
                  className="bg-surface rounded-3xl px-5 py-4 flex-row items-center justify-between border border-surface-elevated"
                >
                  <View className="flex-row items-center gap-4">
                    <View className="w-10 h-10 bg-brand-secondary/10 rounded-xl items-center justify-center">
                      <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                    </View>
                    <View>
                      <Text className="font-black text-white tracking-tight">{log.routine_name}</Text>
                      {log.duration_minutes != null && (
                        <Text className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">{log.duration_minutes} Minutes</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
