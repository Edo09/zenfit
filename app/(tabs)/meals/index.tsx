import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, RefreshControl } from "react-native";
import RAnimated from "react-native-reanimated";

import { EmptyState } from "@/src/components/empty-state";
import { MealCard } from "@/src/components/meal-card";
import {
  Chip,
  ConfirmDialog,
  ErrorState,
  FAB,
  LoadingBlock,
  useToast,
} from "@/src/components/ui";
import { useMeals } from "@/src/hooks/use-meals";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { exit, layout, staggered } from "@/src/lib/motion";
import { colors } from "@/src/theme/colors";
import { View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { Meal, MealType } from "@/src/types/database";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function MealsScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { meals, loading, error, refreshing, refresh, deleteMeal } = useMeals();
  const [activeFilter, setActiveFilter] = useState<MealType | "all">("all");
  const [pendingDelete, setPendingDelete] = useState<Meal | null>(null);
  useRefreshOnFocus(refresh);

  const filtered =
    activeFilter === "all" ? meals : meals.filter((m) => m.meal_type === activeFilter);

  const handleConfirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target == null) return;
    try {
      await deleteMeal(target.id);
      toast.show({ type: "success", message: t("meals.mealDeleted") });
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    }
  };

  if (loading && meals.length === 0) {
    return (
      <View className="flex-1 bg-brand-dark">
        <LoadingBlock />
      </View>
    );
  }

  if (error && meals.length === 0) {
    return (
      <View className="flex-1 bg-brand-dark">
        <ErrorState onRetry={refresh} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-dark">
      {/* Filter pills */}
      <View className="flex-row flex-wrap gap-2 px-4 pt-4 pb-2">
        <Chip
          label={t("meals.all")}
          selected={activeFilter === "all"}
          onPress={() => setActiveFilter("all")}
        />
        {MEAL_TYPES.map((type) => (
          <Chip
            key={type}
            label={t(`meals.${type}`, { defaultValue: type })}
            selected={activeFilter === type}
            onPress={() => setActiveFilter(type)}
          />
        ))}
      </View>

      <RAnimated.FlatList
        data={filtered}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        // Siblings slide up to close the gap on delete (unreliable on web)
        itemLayoutAnimation={Platform.OS !== "web" ? layout() : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.brandPrimary}
            colors={[colors.brandPrimary]}
            progressBackgroundColor={colors.surface}
          />
        }
        renderItem={({ item, index }) => (
          <AnimatedView entering={staggered(index)} exiting={exit()}>
            <MealCard
              meal={item}
              onPress={() => router.push(`/(tabs)/meals/${item.id}`)}
              onDelete={() => setPendingDelete(item)}
            />
          </AnimatedView>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title={t("meals.noMealsYet")}
            subtitle={t("meals.startTracking")}
            actionLabel={t("meals.logMeal")}
            onAction={() => router.push("/(tabs)/meals/create")}
          />
        }
      />

      <FAB
        onPress={() => router.push("/(tabs)/meals/create")}
        accessibilityLabel={t("meals.logMeal")}
      />

      <ConfirmDialog
        visible={pendingDelete != null}
        destructive
        title={t("meals.deleteMeal")}
        message={pendingDelete != null ? t("meals.deleteConfirm", { name: pendingDelete.name }) : undefined}
        confirmLabel={t("common.delete")}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </View>
  );
}
