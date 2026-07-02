import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/ui";
import { colors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import type { Meal } from "@/src/types/database";

type Props = {
  meal: Meal;
  onPress: () => void;
  onDelete: () => void;
};

const TYPE_BADGE_BG: Record<string, string> = {
  breakfast: "bg-badge-breakfast-soft",
  lunch: "bg-badge-lunch-soft",
  dinner: "bg-badge-dinner-soft",
  snack: "bg-badge-snack-soft",
};

const TYPE_BADGE_TEXT: Record<string, string> = {
  breakfast: "text-badge-breakfast",
  lunch: "text-badge-lunch",
  dinner: "text-badge-dinner",
  snack: "text-badge-snack",
};

export function MealCard({ meal, onPress, onDelete }: Props) {
  const { t } = useTranslation();

  return (
    <Card onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-content-primary">{meal.name}</Text>
          <Text className="text-sm text-content-tertiary">{meal.date}</Text>
          <View
            className={`self-start rounded-full px-3 py-1 mt-1 ${TYPE_BADGE_BG[meal.meal_type] ?? "bg-surface-elevated"}`}
          >
            <Text
              className={`text-xs font-medium capitalize ${TYPE_BADGE_TEXT[meal.meal_type] ?? "text-content-secondary"}`}
            >
              {t(`meals.${meal.meal_type}`, { defaultValue: meal.meal_type })}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onDelete}
          className="p-2 ml-2"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("meals.deleteMeal")}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </Pressable>
      </View>
    </Card>
  );
}
