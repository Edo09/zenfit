import { router } from "expo-router";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { CapsLabel, DisplayText, FeatureCard } from "@/src/components/ui";
import { Icon } from "@/src/components/ui/icon";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type { RoutineWithExercises } from "@/src/types/database";
import { pickAssignedRoutine } from "@/src/utils/assigned-routine";
import { dayLabel } from "@/src/utils/day-label";

type Props = {
  assigned: RoutineWithExercises[];
};

/**
 * Home hero for coach-assigned work: the one routine the client should be
 * looking at right now, on the app's loud surface so it outranks their own
 * routines below it. Renders nothing when no coach has assigned anything —
 * a self-serve client never sees an empty coaching slot.
 */
export function CoachRoutineCard({ assigned }: Props) {
  const { t } = useTranslation();
  const colors = useColors();

  const picked = useMemo(() => pickAssignedRoutine(assigned), [assigned]);
  if (picked == null) return null;

  const { routine, daysAway } = picked;
  const count = routine.routine_exercises.length;
  const day = dayLabel(routine.day_of_week, t);

  // "Hoy toca" / "Mañana toca" / "En N días" / "Cuando quieras" — the same
  // fact the day pill carries, said in the tense that makes it actionable.
  const when =
    daysAway == null
      ? t("coach.anyDay")
      : daysAway === 0
        ? t("coach.todayPlan")
        : daysAway === 1
          ? t("coach.tomorrowPlan")
          : t("coach.inDays", { count: daysAway });

  return (
    <FeatureCard onPress={() => router.push(`/(tabs)/routines/${routine.id}`)}>
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1.5 rounded-full bg-brand-primary px-2.5 py-1">
            <Icon name="award" size={12} color={colors.onAccent} />
            <Text className="text-xs font-semibold text-on-accent">{t("coach.badge")}</Text>
          </View>
          <CapsLabel size={10} className="text-on-hero-dim">
            {when}
          </CapsLabel>
        </View>

        <View className="gap-1">
          <DisplayText size={22} className="text-on-hero" numberOfLines={2}>
            {routine.name}
          </DisplayText>
          <Text className="text-sm text-on-hero-dim">
            {t("coach.exercisesCount", { count })}
            {day != null ? ` · ${day}` : ""}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5 pt-1">
          <Text className="text-sm font-semibold text-brand-primary">
            {t("coach.trainNow")}
          </Text>
          <Icon name="arrow-right" size={16} color={colors.brandPrimary} />
        </View>
      </View>
    </FeatureCard>
  );
}
