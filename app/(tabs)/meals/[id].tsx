import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  LoadingBlock,
  Screen,
  useToast,
} from "@/src/components/ui";
import { useMealDetail, useMeals } from "@/src/hooks/use-meals";
import { colors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import type { MealItem } from "@/src/types/database";

const MACRO_COLORS: Record<string, string> = {
  protein: colors.macroProtein,
  carbs: colors.macroCarbs,
  fat: colors.macroFat,
};

export default function MealDetailScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addMealItem, removeMealItem } = useMeals();
  // Derived from the persisted meals cache — renders offline, and mutations
  // flow back in without manual refreshes.
  const { data: meal = null, isPending: loading, isError } = useMealDetail(id);
  const [showAddItem, setShowAddItem] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<MealItem | null>(null);

  // New item form
  const [itemName, setItemName] = useState("");
  const [itemNameError, setItemNameError] = useState<string | undefined>();
  const [itemCalories, setItemCalories] = useState("");
  const [itemProtein, setItemProtein] = useState("");
  const [itemCarbs, setItemCarbs] = useState("");
  const [itemFat, setItemFat] = useState("");
  const [itemPortion, setItemPortion] = useState("");

  useEffect(() => {
    if (isError) {
      toast.show({ type: "error", message: t("meals.couldNotLoad") });
      router.back();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const handleAddItem = async () => {
    if (!meal) return;
    if (!itemName.trim()) {
      setItemNameError(t("common.fieldRequired"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    try {
      await addMealItem({
        meal_id: meal.id,
        name: itemName.trim(),
        calories: parseInt(itemCalories, 10) || 0,
        protein_g: parseFloat(itemProtein) || 0,
        carbs_g: parseFloat(itemCarbs) || 0,
        fat_g: parseFloat(itemFat) || 0,
        portion: itemPortion.trim() || undefined,
      });
      setItemName("");
      setItemCalories("");
      setItemProtein("");
      setItemCarbs("");
      setItemFat("");
      setItemPortion("");
      setShowAddItem(false);
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    }
  };

  const handleConfirmRemove = async () => {
    const target = pendingRemove;
    setPendingRemove(null);
    if (target == null) return;
    try {
      await removeMealItem(target.id);
      toast.show({ type: "success", message: t("meals.itemRemoved") });
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-dark">
        <LoadingBlock />
      </View>
    );
  }

  if (!meal) return null;

  const totalCalories = meal.meal_items.reduce((sum, i) => sum + i.calories, 0);
  const totalProtein = meal.meal_items.reduce((sum, i) => sum + i.protein_g, 0);
  const totalCarbs = meal.meal_items.reduce((sum, i) => sum + i.carbs_g, 0);
  const totalFat = meal.meal_items.reduce((sum, i) => sum + i.fat_g, 0);

  const macros = [
    { key: "protein", label: t("meals.protein"), value: totalProtein },
    { key: "carbs", label: t("meals.carbs"), value: totalCarbs },
    { key: "fat", label: t("meals.fat"), value: totalFat },
  ];

  return (
    <>
      <Stack.Screen options={{ title: meal.name }} />
      <Screen keyboard contentContainerClassName="pb-10">
        {/* Meal info */}
        <View className="flex-row items-center gap-2">
          <View className="bg-info-soft rounded-full px-3 py-1">
            <Text className="text-brand-primary text-sm font-medium capitalize">
              {t(`meals.${meal.meal_type}`, { defaultValue: meal.meal_type })}
            </Text>
          </View>
          <Text className="text-content-tertiary text-sm">{meal.date}</Text>
        </View>

        {/* Nutrition summary */}
        {meal.meal_items.length > 0 && (
          <Card className="gap-3">
            <Text className="font-semibold text-content-primary">
              {t("meals.nutritionSummary")}
            </Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text
                  className="text-xl font-bold text-content-primary"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {totalCalories}
                </Text>
                <Text className="text-xs text-content-tertiary">{t("meals.kcal")}</Text>
              </View>
              {macros.map(({ key, label, value }) => (
                <View key={key} className="items-center">
                  <Text
                    className="text-xl font-bold"
                    style={{ color: MACRO_COLORS[key], fontVariant: ["tabular-nums"] }}
                  >
                    {value.toFixed(1)}g
                  </Text>
                  <Text className="text-xs text-content-tertiary">{label}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Food items */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-content-primary">
            {t("meals.foodItems", { count: meal.meal_items.length })}
          </Text>

          {meal.meal_items.map((item) => (
            <Card key={item.id} className="px-4 py-3 flex-row items-center justify-between">
              <View className="flex-1 gap-0.5">
                <Text className="font-medium text-content-primary">{item.name}</Text>
                <Text className="text-content-tertiary text-sm">
                  {item.calories} {t("meals.kcal")}
                  {item.portion ? ` · ${item.portion}` : ""}
                  {` · P ${item.protein_g}g C ${item.carbs_g}g F ${item.fat_g}g`}
                </Text>
              </View>
              <Pressable
                onPress={() => setPendingRemove(item)}
                className="p-2 ml-2"
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("meals.removeFoodItem")}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </Card>
          ))}

          {/* Add item form */}
          {showAddItem ? (
            <Card className="gap-3">
              <Text className="font-semibold text-content-primary">
                {t("meals.addFoodItem")}
              </Text>
              <Input
                placeholder={t("meals.foodName")}
                value={itemName}
                onChangeText={(text) => {
                  setItemName(text);
                  if (itemNameError != null) setItemNameError(undefined);
                }}
                error={itemNameError}
                className="bg-brand-dark"
              />
              <View className="flex-row gap-2">
                <Input
                  label={t("meals.calories")}
                  keyboardType="number-pad"
                  value={itemCalories}
                  onChangeText={setItemCalories}
                  containerClassName="flex-1"
                  className="bg-brand-dark text-center"
                />
                <Input
                  label={t("meals.protein")}
                  keyboardType="decimal-pad"
                  value={itemProtein}
                  onChangeText={setItemProtein}
                  containerClassName="flex-1"
                  className="bg-brand-dark text-center"
                />
              </View>
              <View className="flex-row gap-2">
                <Input
                  label={t("meals.carbs")}
                  keyboardType="decimal-pad"
                  value={itemCarbs}
                  onChangeText={setItemCarbs}
                  containerClassName="flex-1"
                  className="bg-brand-dark text-center"
                />
                <Input
                  label={t("meals.fat")}
                  keyboardType="decimal-pad"
                  value={itemFat}
                  onChangeText={setItemFat}
                  containerClassName="flex-1"
                  className="bg-brand-dark text-center"
                />
                <Input
                  label={t("meals.portion")}
                  placeholder={t("meals.portionPlaceholder")}
                  value={itemPortion}
                  onChangeText={setItemPortion}
                  containerClassName="flex-1"
                  className="bg-brand-dark text-center"
                />
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button variant="secondary" onPress={() => setShowAddItem(false)} className="w-full">
                    {t("common.cancel")}
                  </Button>
                </View>
                <View className="flex-1">
                  <Button onPress={handleAddItem} className="w-full">
                    {t("common.add")}
                  </Button>
                </View>
              </View>
            </Card>
          ) : (
            <Pressable
              onPress={() => setShowAddItem(true)}
              accessibilityRole="button"
              className="border-2 border-dashed border-border-strong rounded-2xl py-4 items-center"
            >
              <Text className="text-content-tertiary font-medium">
                {t("meals.addFoodItemButton")}
              </Text>
            </Pressable>
          )}
        </View>
      </Screen>

      <ConfirmDialog
        visible={pendingRemove != null}
        destructive
        title={t("meals.removeFoodItem")}
        message={pendingRemove != null ? t("meals.removeConfirm", { name: pendingRemove.name }) : undefined}
        confirmLabel={t("common.remove")}
        onConfirm={handleConfirmRemove}
        onClose={() => setPendingRemove(null)}
      />
    </>
  );
}
