import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
  ErrorState,
  LoadingBlock,
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
import { setLanguage } from "@/src/i18n";
import { enterFade, exit, staggered } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { AnimatedView } from "@/src/tw/animated";
import {
  caloriesConsumed,
  estimateCaloriesBurned,
  recommendedCalorieGoal,
} from "@/src/utils/calories";
import { toDateKey } from "@/src/utils/dates";
import { MEAL_SLOTS, suggestedSlot } from "@/src/utils/meal-slots";
import { setThemeMode } from "@/src/theme/theme-mode";
import { Pressable, Text, View } from "@/src/tw";
import { useColorScheme as useRNColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const colors = useColors();
  const scheme = useRNColorScheme();
  const isDark = scheme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const meals = useMeals();
  const progress = useProgress();
  const routinesData = useRoutines();
  const { profile } = useProfile(user?.id);

  const { todaysMeals } = meals;
  const { todaysLogs } = progress;
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

  const numberLocale = i18n.language === "es" ? "es-ES" : "en-US";
  const kcal = (value: number | null) =>
    value != null ? Math.round(value).toLocaleString(numberLocale) : "—";

  // Per-slot summary for the nutrition section (only slots with items)
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

  const today = new Date().toLocaleDateString(i18n.language === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refreshAll}
      contentContainerClassName="px-0 py-0 pb-12 gap-0"
    >
      {/* Header */}
      <View className="px-6 pb-6" style={{ paddingTop: insets.top + 16 }}>
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            accessibilityRole="button"
            accessibilityLabel={t("tabs.profile")}
            className="flex-row items-center gap-3 flex-1 mr-2"
          >
            <Image
              source={require("@/assets/images/app-icon/icon.png")}
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              accessibilityIgnoresInvertColors
            />
            <View className="flex-1">
              <Text
                className="text-brand-primary font-display text-2xl mb-0.5"
                numberOfLines={1}
              >
                Hokage
              </Text>
              <Text className="text-2xl font-bold text-content-primary" numberOfLines={1}>
                {t("home.hey", { name: displayName })}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("common.menu")}
            className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-border"
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.contentSecondary} />
          </Pressable>
        </View>
        <Text className="text-content-tertiary">{today}</Text>
      </View>

      <Actionsheet isOpen={menuOpen} onClose={() => setMenuOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <ActionsheetItem
            onPress={() => {
              setMenuOpen(false);
              void setThemeMode(isDark ? "light" : "dark");
            }}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={20}
              color={colors.contentSecondary}
            />
            <ActionsheetItemText>{t(isDark ? "home.light" : "home.dark")}</ActionsheetItemText>
          </ActionsheetItem>
          <ActionsheetItem
            onPress={() => {
              setMenuOpen(false);
              setLanguage(i18n.language === "en" ? "es" : "en");
            }}
          >
            <Ionicons name="language-outline" size={20} color={colors.contentSecondary} />
            <ActionsheetItemText>
              {i18n.language === "en" ? t("common.spanish") : t("common.english")}
            </ActionsheetItemText>
          </ActionsheetItem>
          <ActionsheetItem
            onPress={() => {
              setMenuOpen(false);
              signOut();
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
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
          {/* Daily calorie KPIs — health/fitness metrics only */}
          <View className="px-6 gap-4 mb-8">
            <View className="flex-row gap-4">
              <StatCard
                label={t("home.calorieGoal")}
                value={kcal(calorieGoal)}
                unit={t("home.kcal")}
                color={colors.brandPrimary}
                icon="flag-outline"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/profile",
                    params: { highlight: "calorie-goal", ts: String(Date.now()) },
                  })
                }
              />
              <StatCard
                label={t("home.caloriesConsumed")}
                value={kcal(consumed)}
                unit={t("home.kcal")}
                color={colors.warning}
                icon="restaurant-outline"
                onPress={() => router.push("/(tabs)/meals")}
              />
            </View>
            <View className="flex-row gap-4">
              <StatCard
                label={t("home.caloriesBurned")}
                value={kcal(burned)}
                unit={t("home.kcal")}
                color={colors.brandSecondary}
                icon="flame-outline"
                onPress={() => router.push("/(tabs)/routines")}
              />
              <StatCard
                label={t("home.caloriesRemaining")}
                value={kcal(remaining)}
                unit={t("home.kcal")}
                color={remaining != null && remaining < 0 ? colors.error : colors.success}
                icon="speedometer-outline"
              />
            </View>
            {calorieGoal == null && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/profile",
                    params: { highlight: "calorie-goal", ts: String(Date.now()) },
                  })
                }
                accessibilityRole="button"
                className="bg-info-soft rounded-xl px-4 py-3"
              >
                <Text className="text-brand-primary text-sm font-medium text-center">
                  {t("home.setCalorieGoalHint")}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Routines — with the AI plan generator as the section's primary action */}
          <View className="mb-8">
            <SectionHeader title={t("home.yourRoutines")} className="px-6 mb-2" />
            <WorkoutCarousel routines={routines} />
            <View className="px-6 mt-4">
              <AIPlanCard />
            </View>
          </View>

          {/* Today's meals */}
          <View className="px-6 gap-4 mb-8">
            <SectionHeader
              title={t("home.todaysNutrition")}
              actionLabel={t("common.seeAll")}
              onAction={() => router.push("/(tabs)/meals")}
            />

            {slotSummaries.length === 0 ? (
              <Pressable
                key="meals-empty"
                onPress={() => {
                  // Seed the Meals tab's own stack with its index first, then
                  // push "create" on the next tick — pushing both in the same
                  // tick gets coalesced into one history entry (no parent
                  // screen, no back button); yielding first makes them two.
                  router.push("/(tabs)/meals");
                  setTimeout(
                    () =>
                      router.push({
                        pathname: "/(tabs)/meals/create",
                        params: { mealType: suggestedSlot(), date: toDateKey() },
                      }),
                    0
                  );
                }}
                className="bg-surface rounded-2xl p-8 items-center border border-dashed border-border-strong"
              >
                <View className="w-12 h-12 bg-info-soft rounded-2xl items-center justify-center mb-3">
                  <Ionicons name="restaurant-outline" size={24} color={colors.brandPrimary} />
                </View>
                <Text className="text-content-tertiary font-medium mb-1">
                  {t("home.fuelYourBody")}
                </Text>
                <Text className="text-brand-primary font-semibold">{t("home.logMeal")}</Text>
              </Pressable>
            ) : (
              <View key="meals-list" className="gap-3">
                {slotSummaries.map((summary, index) => (
                  <AnimatedView key={summary.slot} entering={staggered(index)} exiting={exit()}>
                  <Pressable
                    onPress={() => router.push("/(tabs)/meals")}
                    className="bg-surface rounded-2xl px-5 py-4 flex-row items-center justify-between border border-border"
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-10 h-10 bg-info-soft rounded-xl items-center justify-center">
                        <Ionicons name="restaurant-outline" size={18} color={colors.brandPrimary} />
                      </View>
                      <View>
                        <Text className="font-semibold text-content-primary capitalize">
                          {t(`meals.${summary.slot}`, { defaultValue: summary.slot })}
                        </Text>
                        <Text className="text-content-muted text-xs">
                          {t("meals.itemCount", { count: summary.count })}
                          {` · ${kcal(summary.kcal)} ${t("home.kcal")}`}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.contentMuted} />
                  </Pressable>
                  </AnimatedView>
                ))}
              </View>
            )}
          </View>

          {/* Recent activity */}
          <View className="px-6 gap-4">
            <SectionHeader
              title={t("home.recentActivity")}
              actionLabel={t("common.seeAll")}
              onAction={() => router.push("/(tabs)/progress")}
            />

            {todaysLogs.length === 0 ? (
              <Pressable
                key="logs-empty"
                onPress={() => {
                  // Seed the Routines tab's own stack with its index first,
                  // then push the target on the next tick — pushing both in
                  // the same tick gets coalesced into one history entry (no
                  // parent screen, no back button); yielding first makes
                  // them two.
                  router.push("/(tabs)/routines");
                  setTimeout(() => {
                    if (routines.length > 0) {
                      router.push(`/(tabs)/routines/${routines[0].id}`);
                    } else {
                      router.push("/(tabs)/routines/create");
                    }
                  }, 0);
                }}
                className="bg-surface rounded-2xl p-8 items-center border border-dashed border-border-strong"
              >
                <View className="w-12 h-12 bg-success-soft rounded-2xl items-center justify-center mb-3">
                  <Ionicons name="fitness-outline" size={24} color={colors.success} />
                </View>
                <Text className="text-content-tertiary font-medium mb-1">
                  {t("home.noActivityToday")}
                </Text>
                <Text className="text-brand-secondary font-semibold">{t("home.startRoutine")}</Text>
              </Pressable>
            ) : (
              <View key="logs-list" className="gap-3">
                {todaysLogs.slice(0, 3).map((log, index) => (
                  <AnimatedView
                    key={log.id}
                    entering={staggered(index)}
                    exiting={exit()}
                    className="bg-surface rounded-2xl px-5 py-4 flex-row items-center justify-between border border-border"
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-10 h-10 bg-success-soft rounded-xl items-center justify-center">
                        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                      </View>
                      <View>
                        <Text className="font-semibold text-content-primary">
                          {log.routine_name}
                        </Text>
                        {log.duration_minutes != null && (
                          <Text className="text-content-muted text-xs">
                            {log.duration_minutes} {t("home.minutes")}
                          </Text>
                        )}
                      </View>
                    </View>
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
