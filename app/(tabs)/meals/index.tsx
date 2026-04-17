import { EmptyState } from "@/src/components/empty-state";
import { MealCard } from "@/src/components/meal-card";
import { useMeals } from "@/src/hooks/use-meals";
import { Pressable, Text, View } from "@/src/tw";
import type { MealType } from "@/src/types/database";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList } from "react-native";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function MealsScreen() {
  const { t } = useTranslation();
  const { meals, loading, deleteMeal } = useMeals();
  const [activeFilter, setActiveFilter] = useState<MealType | "all">("all");

  const filtered = activeFilter === "all"
    ? meals
    : meals.filter((m) => m.meal_type === activeFilter);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-dark">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-dark">
      {/* Filter pills */}
      <View className="flex-row gap-2 px-4 pt-4 pb-2">
        <Pressable
          onPress={() => setActiveFilter("all")}
          className={`rounded-full px-4 py-2 ${activeFilter === "all" ? "bg-brand-primary" : "bg-surface border border-surface-elevated"}`}
        >
          <Text className={`text-sm font-medium ${activeFilter === "all" ? "text-white" : "text-gray-400"}`}>
            {t("meals.all")}
          </Text>
        </Pressable>
        {MEAL_TYPES.map((type) => (
          <Pressable
            key={type}
            onPress={() => setActiveFilter(type)}
            className={`rounded-full px-4 py-2 ${activeFilter === type ? "bg-brand-primary" : "bg-surface border border-surface-elevated"}`}
          >
            <Text className={`text-sm font-medium capitalize ${activeFilter === type ? "text-white" : "text-gray-400"}`}>
              {type}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <MealCard
            meal={item}
            onPress={() => router.push(`/(tabs)/meals/${item.id}`)}
            onDelete={() => deleteMeal(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={t("meals.noMealsYet")}
            subtitle={t("meals.startTracking")}
            actionLabel={t("meals.logMeal")}
            onAction={() => router.push("/(tabs)/meals/create")}
          />
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/(tabs)/meals/create")}
        className="absolute bottom-8 right-6 bg-brand-primary rounded-full w-14 h-14 items-center justify-center"
        style={{ boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)" }}
      >
        <Text className="text-white text-3xl font-light leading-none">+</Text>
      </Pressable>
    </View>
  );
}
