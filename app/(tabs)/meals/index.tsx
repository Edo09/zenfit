import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl } from "react-native";

import { DiaryEntry, DiarySlot } from "@/src/components/diary-slot";
import { Ring } from "@/src/components/progress/ring";
import {
  Card,
  CapsLabel,
  ConfirmDialog,
  DisplayText,
  ErrorState,
  FAB,
  HeaderPanel,
  Icon,
  LoadingBlock,
  ProgressBar,
  useToast,
} from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import { useMeals } from "@/src/hooks/use-meals";
import { useProfile } from "@/src/hooks/use-profile";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { PressableScale, slideEnter, staggered } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Pressable, ScrollView, Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { MealItem, MealType } from "@/src/types/database";
import {
  caloriesConsumed,
  macroTargets,
  macroTotals,
  recommendedCalorieGoal,
} from "@/src/utils/calories";
import { addDays, formatDayLabel, toDateKey } from "@/src/utils/dates";
import { MEAL_SLOTS, suggestedSlot } from "@/src/utils/meal-slots";

export default function DiaryScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { meals, loading, error, refreshing, refresh, removeDiaryItem } = useMeals();
  useRefreshOnFocus(refresh);

  // Date navigation. todayKey is recomputed per render so the diary heals
  // itself across midnight (label flips to a date, "›" re-enables).
  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [direction, setDirection] = useState<1 | -1>(1);
  const todayKey = toDateKey();
  const onToday = dateKey === todayKey;

  const [pendingRemove, setPendingRemove] = useState<MealItem | null>(null);

  const goToDay = (delta: 1 | -1) => {
    Haptics.selectionAsync().catch(() => {});
    setDirection(delta);
    setDateKey((k) => {
      const next = addDays(k, delta);
      return next > todayKey ? k : next; // forward capped at today
    });
  };

  const jumpToToday = () => {
    setDirection(1);
    setDateKey(todayKey);
  };

  const dayMeals = useMemo(() => meals.filter((m) => m.date === dateKey), [meals, dateKey]);

  // Flatten items across ALL meals of (date, slot) — legacy multi-meal slots
  // merge naturally. mealId kept per entry so removal cleans the right container.
  const bySlot = useMemo(() => {
    const map: Record<MealType, DiaryEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const meal of dayMeals) {
      const assigned = meal.assigned_by != null;
      for (const item of meal.meal_items) {
        map[meal.meal_type].push({ item, mealId: meal.id, assigned });
      }
    }
    for (const slot of MEAL_SLOTS) {
      map[slot].sort((a, b) => a.item.created_at.localeCompare(b.item.created_at));
    }
    return map;
  }, [dayMeals]);

  const consumed = caloriesConsumed(dayMeals);
  const goal = profile?.calorie_goal ?? recommendedCalorieGoal(profile);
  const numberLocale = i18n.language === "es" ? "es-ES" : "en-US";
  const kcalFmt = (v: number) => Math.round(v).toLocaleString(numberLocale);
  const fuelFrac = goal != null && goal > 0 ? consumed / goal : 0;

  const dayItems = useMemo(() => dayMeals.flatMap((m) => m.meal_items), [dayMeals]);
  const totals = macroTotals(dayMeals);
  const targets = macroTargets(goal);
  const dayMacros = [
    {
      key: "protein",
      label: t("meals.proteinName"),
      grams: totals.protein,
      target: targets?.protein ?? null,
      color: colors.macroProtein,
    },
    {
      key: "carbs",
      label: t("meals.carbsName"),
      grams: totals.carbs,
      target: targets?.carbs ?? null,
      color: colors.macroCarbs,
    },
    {
      key: "fat",
      label: t("meals.fatName"),
      grams: totals.fat,
      target: targets?.fat ?? null,
      color: colors.macroFat,
    },
  ];

  const openAdd = (slot: MealType) =>
    router.push({
      pathname: "/(tabs)/meals/create",
      params: { mealType: slot, date: dateKey },
    });

  const handleConfirmRemove = async () => {
    const target = pendingRemove;
    setPendingRemove(null);
    if (target == null) return;
    try {
      await removeDiaryItem(target.id);
      toast.show({ type: "success", message: t("meals.itemRemoved") });
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
      <HeaderPanel>
        <DisplayText size={27}>{t("meals.diary")}</DisplayText>
      </HeaderPanel>

      {/* ‹ Today › */}
      <View className="flex-row items-center justify-between px-5 pb-2">
        <PressableScale
          haptic
          onPress={() => goToDay(-1)}
          accessibilityRole="button"
          accessibilityLabel={t("meals.previousDay")}
          className="h-10 w-10 rounded-full bg-surface border border-border items-center justify-center"
        >
          <Icon name="chevron-left" size={20} color={colors.contentSecondary} />
        </PressableScale>
        <Pressable
          onPress={onToday ? undefined : jumpToToday}
          accessibilityRole="button"
          className="items-center"
        >
          <DisplayText size={17}>{formatDayLabel(dateKey, i18n.language, t)}</DisplayText>
          {!onToday && (
            <Text className="text-xs font-semibold text-brand-primary-dark">
              {t("meals.backToToday")}
            </Text>
          )}
        </Pressable>
        <PressableScale
          haptic
          onPress={() => goToDay(1)}
          disabled={onToday}
          accessibilityRole="button"
          accessibilityLabel={t("meals.nextDay")}
          className={`h-10 w-10 rounded-full bg-surface border border-border items-center justify-center ${onToday ? "opacity-30" : ""}`}
        >
          <Icon name="chevron-right" size={20} color={colors.contentSecondary} />
        </PressableScale>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pt-1 pb-32 gap-3"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.brandPrimary}
            colors={[colors.brandPrimary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* Keyed by date: day changes slide in from the travel direction */}
        <AnimatedView key={dateKey} entering={slideEnter(direction)} className="gap-3">
          {/* Day summary — calorie ring + macro capsule bars */}
          <Card className="flex-row items-center gap-5">
            <Ring
              size={104}
              strokeWidth={10}
              frac={fuelFrac}
              color={colors.brandPrimary}
              trackColor={colors.surfaceElevated}
            >
              <DisplayText size={22} tabular>
                {kcalFmt(consumed)}
              </DisplayText>
              <CapsLabel size={9}>{t("meals.kcal")}</CapsLabel>
            </Ring>

            <View className="flex-1 gap-2.5">
              <View className="flex-row items-baseline justify-between">
                <Text className="text-xs text-content-tertiary">{t("meals.dayTotal")}</Text>
                {goal != null && (
                  <Text
                    className={`text-xs font-semibold ${goal - consumed < 0 ? "text-error" : "text-success"}`}
                  >
                    {goal - consumed < 0
                      ? t("meals.kcalOver", { kcal: kcalFmt(consumed - goal) })
                      : t("meals.kcalLeft", { kcal: kcalFmt(goal - consumed) })}
                  </Text>
                )}
              </View>

              {dayMacros.map((macro) => (
                <View key={macro.key} className="gap-1">
                  <View className="flex-row items-baseline justify-between">
                    <Text className="text-xs text-content-tertiary">{macro.label}</Text>
                    <DisplayText size={13} tabular>
                      {`${Math.round(macro.grams)}g`}
                    </DisplayText>
                  </View>
                  <ProgressBar
                    value={macro.target != null ? macro.grams / macro.target : 0}
                    height={6}
                    color={macro.color}
                  />
                </View>
              ))}
            </View>
          </Card>

          {dayItems.length === 0 && goal == null && (
            <Text className="text-center text-xs text-content-muted px-6">
              {t("home.setCalorieGoalHint")}
            </Text>
          )}

          {MEAL_SLOTS.map((slot, i) => (
            <AnimatedView key={slot} entering={staggered(i)}>
              <DiarySlot
                slot={slot}
                entries={bySlot[slot]}
                onAdd={() => openAdd(slot)}
                onEdit={(entry) =>
                  router.push({
                    pathname: "/(tabs)/meals/edit",
                    params: { itemId: entry.item.id },
                  })
                }
                onRemove={(entry) => setPendingRemove(entry.item)}
              />
            </AnimatedView>
          ))}
        </AnimatedView>
      </ScrollView>

      <FAB
        icon="plus"
        label={t("meals.addFood")}
        onPress={() => openAdd(suggestedSlot())}
        accessibilityLabel={t("meals.addFood")}
      />

      <ConfirmDialog
        visible={pendingRemove != null}
        destructive
        title={t("meals.removeFoodItem")}
        message={
          pendingRemove != null
            ? t("meals.removeConfirm", { name: pendingRemove.name })
            : undefined
        }
        confirmLabel={t("common.remove")}
        onConfirm={handleConfirmRemove}
        onClose={() => setPendingRemove(null)}
      />
    </View>
  );
}
