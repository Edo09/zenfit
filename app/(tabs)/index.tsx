import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
} from "@/components/ui/actionsheet";
import { AIPlanCard } from "@/src/components/ai-plan-card";
import { StatCard } from "@/src/components/stat-card";
import {
  CapsLabel,
  Card,
  DisplayText,
  ErrorState,
  FeatureCard,
  HeaderPanel,
  Icon,
  LoadingBlock,
  ProgressBar,
  Screen,
  SectionHeader,
} from "@/src/components/ui";
import { WorkoutCarousel } from "@/src/components/workout-carousel";
import { useAuth } from "@/src/hooks/use-auth";
import { useMeals } from "@/src/hooks/use-meals";
import { useProfile } from "@/src/hooks/use-profile";
import { useProgress } from "@/src/hooks/use-progress";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { useRoutines } from "@/src/hooks/use-routines";
import { enterFade, exit, staggered } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import {
  caloriesConsumed,
  estimateCaloriesBurned,
  macroTargets,
  macroTotals,
  recommendedCalorieGoal,
} from "@/src/utils/calories";
import { addDays, toDateKey } from "@/src/utils/dates";
import { MEAL_SLOTS, suggestedSlot } from "@/src/utils/meal-slots";
import { mondayOf, weeklyStreak } from "@/src/utils/progress";

export default function HomeScreen() {
  const colors = useColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const meals = useMeals();
  const progress = useProgress();
  const routinesData = useRoutines();
  const { profile } = useProfile(user?.id);

  const { todaysMeals } = meals;
  const { todaysLogs, logs } = progress;
  const { routines } = routinesData;

  // Daily calorie KPIs — recompute whenever today's meals/logs change, so
  // logging a meal or workout updates the dashboard immediately.
  const calorieGoal = profile?.calorie_goal ?? recommendedCalorieGoal(profile);
  const consumed = caloriesConsumed(todaysMeals);
  const burned = todaysLogs.reduce(
    (sum, log) => sum + estimateCaloriesBurned(log, profile),
    0,
  );
  const remaining = calorieGoal != null ? calorieGoal - consumed + burned : null;
  const budget = calorieGoal != null ? calorieGoal + burned : null;
  const fuelFrac = budget != null && budget > 0 ? consumed / budget : 0;

  const macros = macroTotals(todaysMeals);
  const macroGoal = macroTargets(calorieGoal);

  const numberLocale = i18n.language === "es" ? "es-ES" : "en-US";
  const kcal = (value: number | null) =>
    value != null ? Math.round(value).toLocaleString(numberLocale) : "—";

  // Per-slot summary for the fuel section (only slots with items)
  const slotSummaries = MEAL_SLOTS.map((slot) => {
    const items = todaysMeals
      .filter((m) => m.meal_type === slot)
      .flatMap((m) => m.meal_items);
    return {
      slot,
      count: items.length,
      kcal: items.reduce((sum, i) => sum + i.calories, 0),
    };
  }).filter((s) => s.count > 0);

  // Weekly KPI tiles. daysPerWeek drives the streak rule; without a profile
  // plan, treat one session a week as the bar.
  const daysPerWeek = profile?.days_per_week ?? 1;
  const streak = weeklyStreak(logs, daysPerWeek);
  const weekStart = mondayOf(toDateKey());
  const weekEnd = addDays(weekStart, 6);
  const weekWorkouts = new Set(
    logs.filter((l) => l.date >= weekStart && l.date <= weekEnd).map((l) => l.date),
  ).size;

  const loading = meals.loading || progress.loading || routinesData.loading;
  const error = meals.error || progress.error || routinesData.error;
  const refreshing = meals.refreshing || progress.refreshing || routinesData.refreshing;
  const hasData = meals.meals.length > 0 || progress.logs.length > 0 || routines.length > 0;

  const mealsRefresh = meals.refresh;
  const progressRefresh = progress.refresh;
  const routinesRefresh = routinesData.refresh;

  const refreshAll = React.useCallback(() => {
    mealsRefresh();
    progressRefresh();
    routinesRefresh();
  }, [mealsRefresh, progressRefresh, routinesRefresh]);

  // Tab switches don't trigger react-query refetches in RN — refetch
  // whenever the dashboard regains focus so it reflects changes made
  // on other tabs.
  useRefreshOnFocus(refreshAll);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "there";

  const today = new Date().toLocaleDateString(numberLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const activityRows = todaysLogs
    .map((l) => ({
      key: l.id,
      title: l.routine_name,
      sub: l.duration_minutes != null ? `${l.duration_minutes} ${t("home.minutes")}` : null,
    }))
    .slice(0, 3);

  // Macro mini-bars under the energy budget
  const macroBars = [
    {
      key: "protein",
      label: t("meals.proteinName"),
      grams: macros.protein,
      target: macroGoal?.protein ?? null,
      color: colors.macroProtein,
    },
    {
      key: "carbs",
      label: t("meals.carbsName"),
      grams: macros.carbs,
      target: macroGoal?.carbs ?? null,
      color: colors.macroCarbs,
    },
    {
      key: "fat",
      label: t("meals.fatName"),
      grams: macros.fat,
      target: macroGoal?.fat ?? null,
      color: colors.macroFat,
    },
  ];

  const openCalorieGoal = () =>
    router.push({
      pathname: "/(tabs)/profile",
      params: { highlight: "calorie-goal", ts: String(Date.now()) },
    });

  // Seed the target tab's own stack with its index first, then push the
  // detail on the next tick — pushing both in the same tick gets coalesced
  // into a single history entry (no parent screen, no back button).
  const pushInTab = (tab: "/(tabs)/meals" | "/(tabs)/routines", go: () => void) => {
    router.push(tab);
    setTimeout(go, 0);
  };

  const addFood = (slot = suggestedSlot()) =>
    pushInTab("/(tabs)/meals", () =>
      router.push({
        pathname: "/(tabs)/meals/create",
        params: { mealType: slot, date: toDateKey() },
      }),
    );

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refreshAll}
      contentContainerClassName="px-0 py-0 pb-28 gap-0"
    >
      <HeaderPanel>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <DisplayText size={27} numberOfLines={1} adjustsFontSizeToFit>
              {t("home.hey", { name: displayName })}
            </DisplayText>
            <Text className="text-sm text-content-tertiary mt-1.5 capitalize">{today}</Text>
          </View>
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("common.menu")}
            className="w-11 h-11 rounded-full bg-surface items-center justify-center border border-border"
          >
            <Icon name="more-vertical" size={18} color={colors.contentSecondary} />
          </Pressable>
        </View>
      </HeaderPanel>

      <Actionsheet isOpen={menuOpen} onClose={() => setMenuOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <ActionsheetItem
            onPress={() => {
              setMenuOpen(false);
              router.push("/(tabs)/profile");
            }}
          >
            <Icon name="user" size={20} color={colors.contentSecondary} />
            <ActionsheetItemText>{t("tabs.profile")}</ActionsheetItemText>
          </ActionsheetItem>
          {/* Theme/language/unit toggles live in Settings now */}
          <ActionsheetItem
            onPress={() => {
              setMenuOpen(false);
              router.push("/(tabs)/settings");
            }}
          >
            <Icon name="settings" size={20} color={colors.contentSecondary} />
            <ActionsheetItemText>{t("settings.title")}</ActionsheetItemText>
          </ActionsheetItem>
          <ActionsheetItem
            onPress={() => {
              setMenuOpen(false);
              signOut();
            }}
          >
            <Icon name="log-out" size={20} color={colors.error} />
            <ActionsheetItemText className="text-error">
              {t("auth.signOut")}
            </ActionsheetItemText>
          </ActionsheetItem>
        </ActionsheetContent>
      </Actionsheet>

      {loading && !hasData ? (
        <LoadingBlock />
      ) : error && !hasData ? (
        <ErrorState onRetry={refreshAll} />
      ) : (
        <AnimatedView entering={enterFade()}>
          {/* Energy budget — the screen's one loud surface. Tapping opens the
              profile's calorie-goal section (unchanged behavior). */}
          <View className="px-5 pt-1">
            <FeatureCard onPress={openCalorieGoal}>
              <View className="flex-row items-center justify-between">
                <CapsLabel size={10} className="text-on-hero-dim">
                  {t("home.energyLeft")}
                </CapsLabel>
                {remaining != null && (
                  <View
                    className="rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor: remaining < 0 ? colors.error : colors.brandPrimary,
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: remaining < 0 ? colors.onHero : colors.onAccent }}
                    >
                      {remaining < 0 ? t("home.overBudget") : t("home.onTrack")}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-baseline gap-1.5 mt-2">
                <DisplayText
                  size={52}
                  weight="extrabold"
                  tabular
                  className="text-on-hero"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {kcal(remaining != null ? Math.abs(remaining) : null)}
                </DisplayText>
                <Text className="text-sm text-on-hero-dim">{t("home.kcal")}</Text>
              </View>

              <Text className="text-xs text-on-hero-dim mt-1">
                {`${kcal(consumed)} ${t("home.eatenLower")} · ${kcal(burned)} ${t("home.burnedLower")} · ${kcal(calorieGoal)} ${t("home.goalLower")}`}
              </Text>

              <ProgressBar
                value={fuelFrac}
                height={10}
                color={colors.brandPrimary}
                trackColor={colors.heroTrack}
                className="mt-4"
              />

              <View className="flex-row gap-3 mt-4">
                {macroBars.map((macro) => (
                  <View key={macro.key} className="flex-1 gap-1.5">
                    <View className="flex-row items-baseline justify-between">
                      <Text className="text-2xs text-on-hero-dim">{macro.label}</Text>
                      <DisplayText size={13} tabular className="text-on-hero">
                        {`${Math.round(macro.grams)}g`}
                      </DisplayText>
                    </View>
                    <ProgressBar
                      value={macro.target != null ? macro.grams / macro.target : 0}
                      height={5}
                      color={macro.color}
                      trackColor={colors.heroTrack}
                    />
                  </View>
                ))}
              </View>
            </FeatureCard>

            {calorieGoal == null && (
              <Pressable
                onPress={openCalorieGoal}
                accessibilityRole="button"
                className="bg-brand-primary-soft rounded-2xl px-4 py-3 mt-3"
              >
                <Text className="text-brand-primary-dark text-sm font-semibold text-center">
                  {t("home.setCalorieGoalHint")}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Weekly KPIs */}
          <View className="px-5 pt-3 flex-row gap-3">
            <StatCard
              icon="flame"
              label={t("home.weekStreak")}
              value={streak}
              onPress={() => router.push("/(tabs)/progress")}
            />
            <StatCard
              icon="dumbbell"
              label={t("home.workoutsThisWeek")}
              value={weekWorkouts}
              onPress={() => router.push("/(tabs)/progress")}
            />
          </View>

          {/* Up next — the user's routines + AI plan generator. */}
          <View className="pt-7">
            <SectionHeader
              title={t("home.upNext")}
              actionLabel={t("common.seeAll")}
              onAction={() => router.push("/(tabs)/routines")}
              className="px-5 mb-3"
            />
            <WorkoutCarousel routines={routines} />
            <View className="px-5 pt-4">
              <AIPlanCard />
            </View>
          </View>

          {/* Today's fuel */}
          <View className="px-5 pt-7 gap-3">
            <SectionHeader
              title={t("home.todaysNutrition")}
              actionLabel={t("common.seeAll")}
              onAction={() => router.push("/(tabs)/meals")}
            />

            {slotSummaries.length === 0 ? (
              <Pressable
                key="meals-empty"
                onPress={() => addFood()}
                className="bg-surface rounded-3xl p-7 items-center border border-dashed border-border-strong"
              >
                <Text className="text-content-tertiary font-medium mb-2">
                  {t("home.fuelYourBody")}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <Icon name="plus" size={16} color={colors.brandPrimaryDark} />
                  <Text className="text-sm font-bold text-brand-primary-dark">
                    {t("home.logMeal")}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <View key="meals-list" className="gap-2.5">
                {slotSummaries.map((summary, index) => (
                  <AnimatedView key={summary.slot} entering={staggered(index)} exiting={exit()}>
                    <Pressable
                      onPress={() => router.push("/(tabs)/meals")}
                      className="bg-surface rounded-2xl px-4 py-3.5 flex-row items-center gap-3.5 border border-border"
                    >
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
                        <Icon
                          name={summary.slot === "breakfast" ? "coffee" : "utensils"}
                          size={18}
                          color={colors.brandPrimaryDark}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-content-primary capitalize">
                          {t(`meals.${summary.slot}`, { defaultValue: summary.slot })}
                        </Text>
                        <Text className="text-content-muted text-xs">
                          {t("meals.itemCount", { count: summary.count })}
                        </Text>
                      </View>
                      <View className="flex-row items-baseline gap-1">
                        <DisplayText size={17} tabular>
                          {kcal(summary.kcal)}
                        </DisplayText>
                        <Text className="text-2xs text-content-muted">{t("home.kcal")}</Text>
                      </View>
                    </Pressable>
                  </AnimatedView>
                ))}
              </View>
            )}

            {/* Always-present quick log for the slot that fits the time of day */}
            <Pressable
              onPress={() => addFood()}
              accessibilityRole="button"
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong py-3.5"
            >
              <Icon name="camera" size={17} color={colors.brandPrimaryDark} />
              <Text className="text-sm font-bold text-brand-primary-dark">
                {t("meals.addToSlot", {
                  slot: t(`meals.${suggestedSlot()}`),
                })}
              </Text>
            </Pressable>
          </View>

          {/* Recent activity */}
          <View className="px-5 pt-7 gap-3">
            <SectionHeader
              title={t("home.recentActivity")}
              actionLabel={t("common.seeAll")}
              onAction={() => router.push("/(tabs)/progress")}
            />

            {activityRows.length === 0 ? (
              <Pressable
                key="logs-empty"
                onPress={() =>
                  pushInTab("/(tabs)/routines", () =>
                    router.push(
                      routines.length > 0
                        ? `/(tabs)/routines/${routines[0].id}`
                        : "/(tabs)/routines/create",
                    ),
                  )
                }
                className="bg-surface rounded-3xl p-7 items-center border border-dashed border-border-strong"
              >
                <Text className="text-content-tertiary font-medium mb-2">
                  {t("home.noActivityToday")}
                </Text>
                <Text className="text-sm font-bold text-brand-primary-dark">
                  {t("home.startRoutine")}
                </Text>
              </Pressable>
            ) : (
              <View key="logs-list" className="gap-2.5">
                {activityRows.map((row, index) => (
                  <AnimatedView key={row.key} entering={staggered(index)} exiting={exit()}>
                    <Card className="flex-row items-center gap-3.5 rounded-2xl px-4 py-3.5">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-soft">
                        <Icon name="check" size={18} color={colors.brandPrimaryDark} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-sm font-bold text-content-primary"
                          numberOfLines={1}
                        >
                          {row.title}
                        </Text>
                        {row.sub != null && (
                          <Text className="text-content-muted text-xs" numberOfLines={1}>
                            {row.sub}
                          </Text>
                        )}
                      </View>
                    </Card>
                  </AnimatedView>
                ))}
              </View>
            )}
          </View>
        </AnimatedView>
      )}
    </Screen>
  );
}
