import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Chip, Input, Screen, useToast } from "@/src/components/ui";
import { useMeals } from "@/src/hooks/use-meals";
import { Text, View } from "@/src/tw";
import type { MealType } from "@/src/types/database";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function CreateMealScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { createMeal } = useMeals();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      setNameError(t("meals.mealNameRequired"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    try {
      setLoading(true);
      const meal = await createMeal({ name: name.trim(), meal_type: mealType });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace(`/(tabs)/meals/${meal.id}`);
    } catch {
      toast.show({ type: "error", message: t("meals.couldNotCreate") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard>
      <View className="gap-4">
        <Input
          label={t("meals.mealName")}
          placeholder={t("meals.mealNamePlaceholder")}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (nameError != null) setNameError(undefined);
          }}
          error={nameError}
        />

        <View className="gap-2">
          <Text className="text-sm font-medium text-content-secondary">
            {t("meals.mealType")}
          </Text>
          <View className="flex-row gap-2 flex-wrap">
            {MEAL_TYPES.map((type) => (
              <Chip
                key={type}
                label={t(`meals.${type}`, { defaultValue: type })}
                selected={mealType === type}
                onPress={() => setMealType(type)}
              />
            ))}
          </View>
        </View>
      </View>

      <Text className="text-content-muted text-sm text-center">{t("meals.addItemsNote")}</Text>

      <Button size="lg" onPress={handleCreate} loading={loading} className="mt-2">
        {t("meals.logMeal")}
      </Button>
    </Screen>
  );
}
