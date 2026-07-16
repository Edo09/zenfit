import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/src/hooks/use-auth";
import { useWeightUnit } from "@/src/lib/weight-unit";
import { generateWeeklyInsight, type WeeklyInsightStats } from "@/src/services/ai-insight";
import { useExercises } from "@/src/hooks/use-exercises";
import { useMeals } from "@/src/hooks/use-meals";
import { useProfile } from "@/src/hooks/use-profile";
import { useProgress } from "@/src/hooks/use-progress";
import { useRoutines } from "@/src/hooks/use-routines";
import type { BodyMeasurement } from "@/src/types/database";
import { recommendedCalorieGoal } from "@/src/utils/calories";
import { addDays, toDateKey } from "@/src/utils/dates";
import {
  achievements,
  bestMonth,
  buildPlanIndex,
  burnedKcal,
  compliance,
  estimatedVolume,
  lastWeekCompliance,
  mondayOf,
  monthWeekPills,
  muscleAlert,
  muscleDistribution,
  nutritionStats,
  ruleInsights,
  trainedMinutes,
  volumeSeries8w,
  weekDayDots,
  weeklyStreak,
  weightStats,
  type Periodo,
} from "@/src/utils/progress";
import { supabase } from "@/src/utils/supabase";

// Aggregation layer for the progress dashboard. Deliberately composes the
// existing per-domain hooks instead of running its own Promise.all fetch:
// those hooks apply the offline outbox overlay, so the dashboard reflects
// pending local writes exactly like every other screen. All math lives in
// utils/progress.ts.

const measurementsKey = (userId: string | undefined) =>
  ["body-measurements", userId] as const;

async function fetchMeasurements(userId: string): Promise<BodyMeasurement[]> {
  const cutoff = addDays(toDateKey(), -60);
  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", userId)
    .gte("measured_on", cutoff)
    .order("measured_on", { ascending: true });
  // P1 table may not exist yet — degrade to the weight card's empty state
  if (error) return [];
  return data as BodyMeasurement[];
}

export function useProgressDashboard(periodo: Periodo) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const progress = useProgress();
  const routinesData = useRoutines();
  const { exercises, loading: exercisesLoading } = useExercises();
  const mealsData = useMeals();
  const { profile, updateProfile } = useProfile(user?.id);

  const { data: measurements = [] } = useQuery({
    queryKey: measurementsKey(user?.id),
    queryFn: () => fetchMeasurements(user!.id),
    enabled: !!user,
  });

  const { logs } = progress;
  const { routines } = routinesData;
  const { meals } = mealsData;

  const loading = progress.loading || routinesData.loading || mealsData.loading;
  const error = progress.error;
  const refreshing = progress.refreshing || mealsData.refreshing;

  const progressRefresh = progress.refresh;
  const mealsRefresh = mealsData.refresh;
  const routinesRefresh = routinesData.refresh;
  const refresh = useCallback(() => {
    progressRefresh();
    mealsRefresh();
    routinesRefresh();
    queryClient.invalidateQueries({ queryKey: ["body-measurements"] });
  }, [progressRefresh, mealsRefresh, routinesRefresh, queryClient]);

  /** Quick weight log. Writes profiles.weight_kg through the offline-first
   *  profile upsert; once migration A is applied, a DB trigger mirrors it
   *  into body_measurements. The cache gets the point optimistically so the
   *  chart updates immediately. */
  const logWeight = useCallback(
    async (weightKg: number) => {
      await updateProfile({ weight_kg: weightKg });
      const today = toDateKey();
      queryClient.setQueryData<BodyMeasurement[]>(
        measurementsKey(user?.id),
        (old = []) => {
          const existing = old.find((m) => m.measured_on === today);
          if (existing != null)
            return old.map((m) =>
              m.measured_on === today ? { ...m, weight_kg: weightKg } : m,
            );
          if (old.length === 0) return old; // table absent — stay in empty state
          return [
            ...old,
            {
              id: `local-${today}`,
              user_id: user!.id,
              measured_on: today,
              weight_kg: weightKg,
              body_fat_pct: null,
              waist_cm: null,
              chest_cm: null,
              arm_cm: null,
              thigh_cm: null,
            },
          ];
        },
      );
    },
    [updateProfile, queryClient, user],
  );

  const vm = useMemo(() => {
    const now = new Date();
    const daysPerWeek = Math.max(
      1,
      profile?.days_per_week ?? profile?.available_days?.length ?? 3,
    );
    const plan = buildPlanIndex(routines);
    const today = toDateKey(now);

    const periodFrom =
      periodo === "week"
        ? addDays(today, -((now.getDay() + 6) % 7))
        : toDateKey(new Date(now.getFullYear(), now.getMonth(), 1, 12));
    const periodLogs = logs.filter((l) => l.date >= periodFrom && l.date <= today);

    const { done, plan: planCount } = compliance(logs, daysPerWeek, periodo, now);
    const streak = weeklyStreak(logs, daysPerWeek, now);
    const dots = weekDayDots(logs, daysPerWeek, profile?.available_days ?? null, now);
    const pills = monthWeekPills(logs, daysPerWeek, now);

    const goalKcal = profile?.calorie_goal ?? recommendedCalorieGoal(profile);
    const nutrition = nutritionStats(meals, goalKcal, periodo === "week" ? 7 : 30, now);

    const windowDays = periodo === "week" ? 14 : 30;
    const muscles = muscleDistribution(logs, exercises, plan, windowDays, now);
    const alert = muscleAlert(muscles, logs, exercises, plan, routines, now);

    const weekLogs =
      periodo === "week"
        ? periodLogs
        : logs.filter((l) => l.date >= addDays(today, -((now.getDay() + 6) % 7)));
    const series8w = volumeSeries8w(logs, plan, now);
    const lastWeek = lastWeekCompliance(logs, daysPerWeek, now);
    const weekCompliance = compliance(logs, daysPerWeek, "week", now);

    const lifetimeVolume = estimatedVolume(logs, plan);
    const totalWorkouts = logs.length;

    const hasMeals = meals.some((m) => m.meal_items.length > 0);
    const isEmpty = logs.length === 0 && !hasMeals;

    const weight = weightStats(
      measurements.filter(
        (m): m is BodyMeasurement & { weight_kg: number } => m.weight_kg != null,
      ),
      profile,
      now,
    );
    const strength = {
      weekVolume: estimatedVolume(weekLogs, plan),
      series: series8w,
      deltaPct:
        series8w[6] > 0
          ? Math.round(((series8w[7] - series8w[6]) / series8w[6]) * 100)
          : null,
    };

    // Snapshot for the AI weekly analysis — aggregates only, no raw rows.
    const insightStats: WeeklyInsightStats = {
      goal: profile?.goal ?? null,
      week: { done: weekCompliance.done, plan: weekCompliance.plan },
      lastWeek: { done: lastWeek.done, plan: lastWeek.plan },
      streakWeeks: streak,
      weekVolumeKg: strength.weekVolume,
      volumeDeltaPct: strength.deltaPct,
      avgKcal: nutrition.avgKcal,
      kcalGoal: goalKcal,
      avgProteinG: nutrition.avgProtein,
      // Same 1.4 g/kg heuristic the rule-based insight uses.
      proteinTargetG:
        profile?.weight_kg != null ? Math.round(1.4 * profile.weight_kg) : null,
      weightKg: weight.current,
      weightDelta30dKg: weight.delta30,
      muscleSets: muscles.map((m) => ({ group: m.group, sets: m.sets })),
      neglected: alert != null ? { group: alert.group, days: alert.days } : null,
    };

    return {
      isEmpty,
      daysPerWeek,
      hero: {
        done,
        plan: planCount,
        streak,
        dots,
        pills,
        best: bestMonth(logs, now),
        minutes: trainedMinutes(periodLogs, profile),
        kcal: burnedKcal(periodLogs, profile),
        volumeKg: estimatedVolume(periodLogs, plan),
      },
      weight,
      strength,
      nutrition: { ...nutrition, goal: goalKcal, hasData: hasMeals },
      insightStats,
      muscles: { rows: muscles, alert },
      insight: ruleInsights({
        alert,
        avgProtein: nutrition.avgProtein,
        weightKg: profile?.weight_kg ?? null,
        lastWeekDone: lastWeek.done,
        lastWeekPlan: lastWeek.plan,
        weekDone: weekCompliance.done,
        weekPlan: weekCompliance.plan,
      }),
      logros: achievements(totalWorkouts, streak, lifetimeVolume),
    };
  }, [logs, routines, exercises, meals, profile, measurements, periodo]);

  // AI weekly analysis (P3). Keyed per user+week+language: generated once
  // per Monday-based week, regenerated on language switch, served from the
  // persisted react-query cache otherwise (works offline once fetched).
  // Failure/offline is fine — the UI falls back to the rule-based insight.
  const { i18n } = useTranslation();
  const weightUnit = useWeightUnit();
  const { data: aiInsight = null } = useQuery({
    queryKey: ["ai-insight", user?.id, mondayOf(toDateKey()), i18n.language, weightUnit],
    queryFn: () => generateWeeklyInsight(vm.insightStats, i18n.language, weightUnit),
    // exercisesLoading gate: muscleSets is computed through the exercise
    // catalog — generating before it loads would freeze a wrong snapshot
    // into the week's cached insight.
    enabled: !!user && !loading && !exercisesLoading && !vm.isEmpty,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24 * 21,
    retry: 1,
  });

  return {
    ...vm,
    aiInsight,
    logs,
    profile,
    loading,
    error,
    refreshing,
    refresh,
    createLog: progress.createLog,
    deleteLog: progress.deleteLog,
    logWeight,
  };
}

export type ProgressDashboard = ReturnType<typeof useProgressDashboard>;
