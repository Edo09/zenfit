import { Pressable, Text, View } from "@/src/tw";
import type { Meal } from "@/src/types/database";
import React from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

type Props = {
  meal: Meal;
  onPress: () => void;
  onDelete: () => void;
};

const TYPE_BG: Record<string, string> = {
  breakfast: "#FEF3C7",
  lunch: "#DCFCE7",
  dinner: "#EDE9FE",
  snack: "#FEE2E2",
};

const TYPE_TEXT: Record<string, string> = {
  breakfast: "#92400E",
  lunch: "#166534",
  dinner: "#5B21B6",
  snack: "#991B1B",
};

export function MealCard({ meal, onPress, onDelete }: Props) {
  const { t } = useTranslation();
  const handleDelete = () => {
    Alert.alert(t("meals.deleteMeal"), t("meals.deleteConfirm", { name: meal.name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface rounded-2xl p-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-white">
            {meal.name}
          </Text>
          <Text className="text-sm text-gray-400">{meal.date}</Text>
          <View
            className="self-start rounded-full px-3 py-1 mt-1"
            style={{ backgroundColor: TYPE_BG[meal.meal_type] ?? "#F3F4F6" }}
          >
            <Text
              className="text-xs font-medium capitalize"
              style={{ color: TYPE_TEXT[meal.meal_type] ?? "#374151" }}
            >
              {meal.meal_type}
            </Text>
          </View>
        </View>
        <Pressable onPress={handleDelete} className="p-2 ml-2" hitSlop={8}>
          <Text className="text-red-400 text-base">✕</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
