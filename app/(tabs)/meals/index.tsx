import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl } from "react-native";

import { DiaryEntry, DiarySlot } from "@/src/components/diary-slot";
import { NutritionPlanView } from "@/src/components/nutrition/nutrition-plan-view";
import { SupplementStackView } from "@/src/components/nutrition/supplement-stack-view";
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
  Screen,
  SegmentedControl,
  useToast,
} from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import { useMeals } from "@/src/hooks/use-meals";
import { useNutritionPlan } from "@/src/hooks/use-nutrition-plan";
import { useProfile } from "@/src/hooks/use-profile";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { useSupplementPlan } from "@/src/hooks/use-supplement-plan";
import { PressableScale, slideEnter, staggered } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Pressable, ScrollView, Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type {
  MealItem,
  MealType,
  NutritionPlanMeal,
  NutritionPlanOption,
} from "@/src/types/database";
import {
  caloriesConsumed,
  macroTargets,
  macroTotals,
  recommendedCalorieGoal,
} from "@/src/utils/calories";
import { addDays, formatDayLabel, toDateKey } from "@/src/utils/dates";
import { MEAL_SLOTS, suggestedSlot } from "@/src/utils/meal-slots";
import { mealTypeToDiarySlot, visibleItems } from "@/src/utils/nutrition-plan";

type Pane = "plan" | "supplements" | "diary";

/**
 * The Nutrición tab. One pane for a self-serve client — their diary, exactly as
 * it always was — and up to three once a coach assigns something:
 *
 *   Plan        — the coach's protocol for today's day type
 *   Suplementos — the coach's stack, assigned SEPARATELY (a client may have
 *                 either, both, or neither)
 *   Diario      — the client's own log
 *
 * The segmented control only appears when there's a second pane to switch to,
 * and a pane is never offered with nothing behind it.
 */
export default function NutritionScreen() {
  const { t } = useTranslation();
  const plan = useNutritionPlan();
  const supplements = useSupplementPlan();
  useRefreshOnFocus(plan.refresh);
  useRefreshOnFocus(supplements.refresh);

  const hasPlan = plan.plan != null;
  const hasSupplements = supplements.plan != null;

  // Seeded from what exists; after the first tap the client's choice wins, so a
  // refetch can't yank the pane out from under them. Clamped to the panes that
  // are actually available — a plan the coach archives mid-session falls back
  // to the diary rather than rendering an empty screen.
  const [pane, setPane] = useState<Pane | null>(null);
  const available: Pane[] = [
    ...(hasPlan ? (["plan"] as const) : []),
    ...(hasSupplements ? (["supplements"] as const) : []),
    "diary",
  ];
  const resolvedPane: Pane =
    pane != null && available.includes(pane) ? pane : available[0];

  // Hand the prescription to the existing add-food screen rather than writing a
  // macro-less row: plan foods carry no numbers, so the photo + AI estimator is
  // what makes the diary entry honest. planOptionId rides along as the
  // adherence link.
  const registerOption = (meal: NutritionPlanMeal, option: NutritionPlanOption) => {
    const foods = visibleItems(option, plan.day);
    router.push({
      pathname: "/(tabs)/meals/create",
      params: {
        mealType: mealTypeToDiarySlot(meal.meal_type),
        date: toDateKey(),
        // The first visible food seeds the name; the client edits it to match
        // what they actually plated before the photo goes in.
        prefillName: foods[0]?.name ?? "",
        planOptionId: option.id,
      },
    });
  };

  return (
    <View className="flex-1 bg-brand-dark">
      <HeaderPanel>
        <DisplayText size={27}>
          {available.length > 1 ? t("nutritionPlan.tabTitle") : t("meals.diary")}
        </DisplayText>
      </HeaderPanel>

      {available.length > 1 && (
        <View className="px-5 pb-2">
          <SegmentedControl
            segments={available.map((key) => ({
              key,
              label: t(
                key === "plan"
                  ? "nutritionPlan.segmentPlan"
                  : key === "supplements"
                    ? "nutritionPlan.segmentSupplements"
                    : "nutritionPlan.segmentDiary",
              ),
            }))}
            value={resolvedPane}
            onChange={(k) => setPane(k as Pane)}
          />
        </View>
      )}

      {resolvedPane === "plan" && plan.plan != null ? (
        <Screen
          refreshing={plan.refreshing}
          onRefresh={plan.refresh}
          contentContainerClassName="px-5 pt-1 pb-32 gap-3"
        >
          <NutritionPlanView
            plan={plan.plan}
            day={plan.day}
            autoDay={plan.autoDay}
            overridden={plan.overridden}
            onSelectDay={plan.setViewDay}
            onRegister={registerOption}
          />
        </Screen>
      ) : resolvedPane === "supplements" && supplements.plan != null ? (
        <Screen
          refreshing={supplements.refreshing}
          onRefresh={supplements.refresh}
          contentContainerClassName="px-5 pt-1 pb-32 gap-3"
        >
          <SupplementStackView
            plan={supplements.plan}
            day={plan.day}
            cycling={plan.plan?.day_cycling ?? false}
          />
        </Screen>
      ) : (
        <DiaryPane />
      )}
    </View>
  );
}

// The diary itself — date navigation, day summary, per-slot entries, the
// add-food FAB and photo logging. Unchanged behaviour; it just no longer owns
// the screen header.
function DiaryPane() {
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
