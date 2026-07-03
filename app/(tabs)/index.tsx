import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { useTranslation } from "react-i18next";

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
import { useProgress } from "@/src/hooks/use-progress";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { useRoutines } from "@/src/hooks/use-routines";
import { setLanguage } from "@/src/i18n";
import { colors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const meals = useMeals();
  const progress = useProgress();
  const routinesData = useRoutines();

  const { todaysMeals } = meals;
  const { todaysLogs } = progress;
  const { routines } = routinesData;

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
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-6 pb-6" style={{ paddingTop: insets.top + 16 }}>
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            accessibilityRole="button"
            accessibilityLabel={t("tabs.profile")}
          >
            <Text className="text-brand-primary text-xs font-semibold uppercase tracking-wider mb-1">
              {t("home.welcomeBack")}
            </Text>
            <Text className="text-2xl font-bold text-content-primary">
              {t("home.hey", { name: displayName })}
            </Text>
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setLanguage(i18n.language === "en" ? "es" : "en")}
              accessibilityRole="button"
              accessibilityLabel={t("common.language")}
              className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-border"
            >
              <Text className="text-sm font-semibold text-content-secondary">
                {i18n.language === "en" ? "ES" : "EN"}
              </Text>
            </Pressable>
            <Pressable
              onPress={signOut}
              accessibilityRole="button"
              accessibilityLabel={t("auth.signOut")}
              className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-border"
            >
              <Ionicons name="log-out-outline" size={20} color={colors.contentMuted} />
            </Pressable>
          </View>
        </View>
        <Text className="text-content-tertiary">{today}</Text>
      </View>

      {loading && !hasData ? (
        <LoadingBlock />
      ) : error && !hasData ? (
        <ErrorState onRetry={refreshAll} />
      ) : (
        <>
          {/* Stats */}
          <View className="px-6 flex-row gap-4 mb-8">
            <StatCard
              label={t("home.mealsLabel")}
              value={todaysMeals.length}
              unit={t("home.mealsUnit")}
              color={colors.brandPrimary}
              icon="restaurant-outline"
            />
            <StatCard
              label={t("home.workoutLabel")}
              value={todaysLogs.length}
              unit={t("home.workoutUnit")}
              color={colors.success}
              icon="barbell-outline"
            />
          </View>

          {/* AI training plan */}
          <View className="px-6 mb-8">
            <AIPlanCard />
          </View>

          {/* Routines carousel */}
          <View className="mb-8">
            <SectionHeader title={t("home.yourRoutines")} className="px-6 mb-2" />
            <WorkoutCarousel routines={routines} />
          </View>

          {/* Today's meals */}
          <View className="px-6 gap-4 mb-8">
            <SectionHeader
              title={t("home.todaysNutrition")}
              actionLabel={t("common.seeAll")}
              onAction={() => router.push("/(tabs)/meals")}
            />

            {todaysMeals.length === 0 ? (
              <Pressable
                key="meals-empty"
                onPress={() => router.push("/(tabs)/meals/create")}
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
                {todaysMeals.slice(0, 3).map((meal) => (
                  <Pressable
                    key={meal.id}
                    onPress={() => router.push(`/(tabs)/meals/${meal.id}`)}
                    className="bg-surface rounded-2xl px-5 py-4 flex-row items-center justify-between border border-border"
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-10 h-10 bg-info-soft rounded-xl items-center justify-center">
                        <Ionicons name="restaurant-outline" size={18} color={colors.brandPrimary} />
                      </View>
                      <View>
                        <Text className="font-semibold text-content-primary">{meal.name}</Text>
                        <Text className="text-content-muted text-xs capitalize">
                          {t(`meals.${meal.meal_type}`, { defaultValue: meal.meal_type })}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.contentMuted} />
                  </Pressable>
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
                onPress={() => router.push("/(tabs)/routines")}
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
                {todaysLogs.slice(0, 3).map((log) => (
                  <View
                    key={log.id}
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
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}
