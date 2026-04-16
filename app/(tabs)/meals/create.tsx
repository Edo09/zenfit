import { useMeals } from "@/src/hooks/use-meals";
import { Pressable, ScrollView, Text, TextInput, View } from "@/src/tw";
import type { MealType } from "@/src/types/database";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert } from "react-native";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function CreateMealScreen() {
  const { t } = useTranslation();
  const { createMeal } = useMeals();
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.error"), t("routines.routineNameRequired"));
      return;
    }
    try {
      setLoading(true);
      const meal = await createMeal({ name: name.trim(), meal_type: mealType });
      router.replace(`/(tabs)/meals/${meal.id}`);
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message ?? t("meals.couldNotCreate"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-brand-dark"
      contentContainerClassName="px-4 py-6 gap-5"
    >
      <View className="gap-4">
        <View className="gap-1">
          <Text className="text-sm font-medium text-gray-300">{t("meals.mealName")}</Text>
          <TextInput
            className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
            placeholder={t("meals.mealNamePlaceholder")}
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-gray-300">{t("meals.mealType")}</Text>
          <View className="flex-row gap-2 flex-wrap">
            {MEAL_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setMealType(type)}
                className={`rounded-full px-4 py-2 ${mealType === type ? "bg-brand-primary" : "bg-surface border border-surface-elevated"}`}
              >
                <Text
                  className={`text-sm font-medium capitalize ${mealType === type ? "text-white" : "text-gray-400"}`}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Text className="text-gray-500 text-sm text-center">
        {t("meals.addItemsNote")}
      </Text>

      <Pressable
        onPress={handleCreate}
        disabled={loading}
        className="bg-brand-primary rounded-2xl py-4 items-center mt-2"
        style={{ boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)" }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold text-base">{t("meals.logMeal")}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
