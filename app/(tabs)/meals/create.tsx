import { useMeals } from "@/src/hooks/use-meals";
import { Pressable, ScrollView, Text, TextInput, View } from "@/src/tw";
import type { MealType } from "@/src/types/database";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert } from "react-native";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function CreateMealScreen() {
  const { createMeal } = useMeals();
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Meal name is required");
      return;
    }
    try {
      setLoading(true);
      const meal = await createMeal({ name: name.trim(), meal_type: mealType });
      router.replace(`/(tabs)/meals/${meal.id}`);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not create meal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-gray-50"
      contentContainerClassName="px-4 py-6 gap-5"
    >
      <View className="gap-4">
        <View className="gap-1">
          <Text className="text-sm font-medium text-gray-700">Meal Name *</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholder="e.g. Chicken & Rice Bowl"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-gray-700">Meal Type</Text>
          <View className="flex-row gap-2 flex-wrap">
            {MEAL_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setMealType(type)}
                className={`rounded-full px-4 py-2 ${mealType === type ? "bg-green-600" : "bg-white border border-gray-200"}`}
              >
                <Text
                  className={`text-sm font-medium capitalize ${mealType === type ? "text-white" : "text-gray-600"}`}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Text className="text-gray-400 text-sm text-center">
        You can add food items with nutritional info after creating the meal.
      </Text>

      <Pressable
        onPress={handleCreate}
        disabled={loading}
        className="bg-green-600 rounded-2xl py-4 items-center mt-2"
        style={{ boxShadow: "0 4px 12px rgba(22, 163, 74, 0.35)" }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold text-base">Log Meal</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
