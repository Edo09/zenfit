import { useMeals } from "@/src/hooks/use-meals";
import { Pressable, ScrollView, Text, TextInput, View } from "@/src/tw";
import type { MealWithItems } from "@/src/types/database";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert } from "react-native";

const MACRO_COLORS: Record<string, string> = {
  Protein: "#3B82F6",
  Carbs: "#F59E0B",
  Fat: "#EC4899",
};

export default function MealDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMealWithItems, addMealItem, removeMealItem } = useMeals();
  const [meal, setMeal] = useState<MealWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);

  // New item form
  const [itemName, setItemName] = useState("");
  const [itemCalories, setItemCalories] = useState("");
  const [itemProtein, setItemProtein] = useState("");
  const [itemCarbs, setItemCarbs] = useState("");
  const [itemFat, setItemFat] = useState("");
  const [itemPortion, setItemPortion] = useState("");

  const fetchMeal = async () => {
    if (!id) return;
    try {
      const data = await getMealWithItems(id);
      setMeal(data);
    } catch {
      Alert.alert(t("common.error"), t("meals.couldNotLoad"));
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeal();
  }, [id]);

  const handleAddItem = async () => {
    if (!itemName.trim() || !meal) return;
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
      fetchMeal();
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message);
    }
  };

  const handleRemoveItem = (itemId: string, name: string) => {
    Alert.alert(t("meals.removeFoodItem"), t("meals.removeConfirm", { name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: async () => {
          await removeMealItem(itemId);
          fetchMeal();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-dark">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!meal) return null;

  const totalCalories = meal.meal_items.reduce((sum, i) => sum + i.calories, 0);
  const totalProtein = meal.meal_items.reduce((sum, i) => sum + i.protein_g, 0);
  const totalCarbs = meal.meal_items.reduce((sum, i) => sum + i.carbs_g, 0);
  const totalFat = meal.meal_items.reduce((sum, i) => sum + i.fat_g, 0);

  return (
    <>
      <Stack.Screen options={{ title: meal.name }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-brand-dark"
        contentContainerClassName="px-4 py-6 gap-5 pb-10"
      >
        {/* Meal info */}
        <View className="flex-row items-center gap-2">
          <View className="bg-brand-primary/10 rounded-full px-3 py-1">
            <Text className="text-brand-primary text-sm font-medium capitalize">{meal.meal_type}</Text>
          </View>
          <Text className="text-gray-400 text-sm">{meal.date}</Text>
        </View>

        {/* Nutrition summary */}
        {meal.meal_items.length > 0 && (
          <View
            className="bg-surface rounded-2xl p-4 gap-3"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <Text className="font-semibold text-white">{t("meals.nutritionSummary")}</Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-xl font-bold text-white" style={{ fontVariant: ["tabular-nums"] }}>{totalCalories}</Text>
                <Text className="text-xs text-gray-400">kcal</Text>
              </View>
              {[
                { label: "Protein", value: totalProtein },
                { label: "Carbs", value: totalCarbs },
                { label: "Fat", value: totalFat },
              ].map(({ label, value }) => (
                <View key={label} className="items-center">
                  <Text
                    className="text-xl font-bold"
                    style={{ color: MACRO_COLORS[label], fontVariant: ["tabular-nums"] }}
                  >
                    {value.toFixed(1)}g
                  </Text>
                  <Text className="text-xs text-gray-400">{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Food items */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-white">
            {t("meals.foodItems", { count: meal.meal_items.length })}
          </Text>

          {meal.meal_items.map((item) => (
            <View
              key={item.id}
              className="bg-surface rounded-2xl px-4 py-3 flex-row items-center justify-between"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            >
              <View className="flex-1 gap-0.5">
                <Text className="font-medium text-white">{item.name}</Text>
                <Text className="text-gray-400 text-sm">
                  {item.calories} kcal
                  {item.portion ? ` · ${item.portion}` : ""}
                  {` · P ${item.protein_g}g C ${item.carbs_g}g F ${item.fat_g}g`}
                </Text>
              </View>
              <Pressable
                onPress={() => handleRemoveItem(item.id, item.name)}
                className="p-2 ml-2"
                hitSlop={8}
              >
                <Text className="text-red-400">✕</Text>
              </Pressable>
            </View>
          ))}

          {/* Add item form */}
          {showAddItem ? (
            <View
              className="bg-surface rounded-2xl p-4 gap-3"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            >
              <Text className="font-semibold text-white">{t("meals.addFoodItem")}</Text>
              <TextInput
                className="bg-brand-dark border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder={t("meals.foodName")}
                placeholderTextColor="#64748B"
                value={itemName}
                onChangeText={setItemName}
              />
              <View className="flex-row gap-2">
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-gray-400">{t("meals.calories")}</Text>
                  <TextInput
                    className="bg-brand-dark border border-surface-elevated rounded-xl px-3 py-2 text-white text-center"
                    keyboardType="number-pad"
                    value={itemCalories}
                    onChangeText={setItemCalories}
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-gray-400">{t("meals.protein")}</Text>
                  <TextInput
                    className="bg-brand-dark border border-surface-elevated rounded-xl px-3 py-2 text-white text-center"
                    keyboardType="decimal-pad"
                    value={itemProtein}
                    onChangeText={setItemProtein}
                  />
                </View>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-gray-400">{t("meals.carbs")}</Text>
                  <TextInput
                    className="bg-brand-dark border border-surface-elevated rounded-xl px-3 py-2 text-white text-center"
                    keyboardType="decimal-pad"
                    value={itemCarbs}
                    onChangeText={setItemCarbs}
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-gray-400">{t("meals.fat")}</Text>
                  <TextInput
                    className="bg-brand-dark border border-surface-elevated rounded-xl px-3 py-2 text-white text-center"
                    keyboardType="decimal-pad"
                    value={itemFat}
                    onChangeText={setItemFat}
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-gray-400">{t("meals.portion")}</Text>
                  <TextInput
                    className="bg-brand-dark border border-surface-elevated rounded-xl px-3 py-2 text-white text-center"
                    placeholder={t("meals.portionPlaceholder")}
                    placeholderTextColor="#64748B"
                    value={itemPortion}
                    onChangeText={setItemPortion}
                  />
                </View>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setShowAddItem(false)}
                  className="flex-1 border border-surface-elevated rounded-xl py-3 items-center"
                >
                  <Text className="text-gray-400 font-medium">{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddItem}
                  className="flex-1 bg-brand-primary rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-medium">{t("common.add")}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowAddItem(true)}
              className="border-2 border-dashed border-surface-elevated rounded-2xl py-4 items-center"
            >
              <Text className="text-gray-400 font-medium">{t("meals.addFoodItemButton")}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </>
  );
}
