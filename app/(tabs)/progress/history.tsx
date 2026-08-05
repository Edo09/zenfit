import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionList } from "react-native";

import { EmptyState } from "@/src/components/empty-state";
import { StatCard } from "@/src/components/stat-card";
import { CapsLabel, Card, ConfirmDialog, DisplayText, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/ui/icon";
import { useAuth } from "@/src/hooks/use-auth";
import { useProfile } from "@/src/hooks/use-profile";
import { useProgress } from "@/src/hooks/use-progress";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import type { WorkoutLog } from "@/src/types/database";
import { addDays, toDateKey } from "@/src/utils/dates";
import { formatMinutes, mondayOf, trainedMinutes } from "@/src/utils/progress";

const TABULAR = { fontVariant: ["tabular-nums" as const] };

// Full workout-log list, pushed from the collapsed history section. Reuses
// the same view/delete behavior as the dashboard's history card, grouped into
// This week / Last week / Earlier.
export default function HistoryScreen() {
  const colors = useColors();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { logs, deleteLog } = useProgress();
  const [pendingDelete, setPendingDelete] = useState<WorkoutLog | null>(null);

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString(
      i18n.language === "es" ? "es-ES" : "en-US",
      { weekday: "short", month: "short", day: "numeric" },
    );

  const sections = useMemo(() => {
    const thisMon = mondayOf(toDateKey());
    const lastMon = addDays(thisMon, -7);
    const buckets: Record<string, WorkoutLog[]> = { week: [], last: [], earlier: [] };
    for (const log of logs) {
      if (log.date >= thisMon) buckets.week.push(log);
      else if (log.date >= lastMon) buckets.last.push(log);
      else buckets.earlier.push(log);
    }
    return [
      { key: "week", title: t("progress.groupThisWeek"), data: buckets.week },
      { key: "last", title: t("progress.groupLastWeek"), data: buckets.last },
      { key: "earlier", title: t("progress.groupEarlier"), data: buckets.earlier },
    ].filter((s) => s.data.length > 0);
  }, [logs, t]);

  const totalExercises = logs.reduce(
    (sum, log) => sum + (log.completed_exercises?.length ?? 0),
    0,
  );

  const handleConfirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target == null) return;
    try {
      await deleteLog(target.id);
      toast.show({ type: "success", message: t("progress.logDeleted") });
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    }
  };

  return (
    <View className="flex-1 bg-brand-dark">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 10 }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          logs.length > 0 ? (
            <View className="flex-row gap-3 mb-2">
              <StatCard
                compact
                icon="check-circle"
                label={t("progress.sesiones")}
                value={logs.length}
              />
              <StatCard
                compact
                icon="clock"
                label={t("progress.entrenados")}
                value={formatMinutes(trainedMinutes(logs, profile))}
              />
              <StatCard
                compact
                icon="dumbbell"
                label={t("progress.ejercicios", { count: totalExercises })}
                value={totalExercises}
              />
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <CapsLabel size={10} className="pt-4 pb-1">
            {section.title}
          </CapsLabel>
        )}
        renderItem={({ item }) => (
          <View className="mb-2.5">
            <Card className="flex-row items-start gap-3.5 px-4 py-4">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary-soft">
                <Icon name="dumbbell" size={18} color={colors.brandPrimaryDark} />
              </View>
              <View className="flex-1 gap-1">
                <DisplayText size={16} numberOfLines={1}>
                  {item.routine_name}
                </DisplayText>
                <Text className="text-sm text-content-tertiary">{formatDate(item.date)}</Text>
                {item.duration_minutes != null && (
                  <View className="mt-1 self-start rounded-full bg-surface-elevated px-3 py-0.5">
                    <Text
                      className="text-xs font-semibold text-content-secondary"
                      style={TABULAR}
                    >
                      {t("progress.min", { count: item.duration_minutes })}
                    </Text>
                  </View>
                )}
                {item.notes != null && item.notes.length > 0 && (
                  <Text className="mt-1 text-sm text-content-tertiary" selectable>
                    {item.notes}
                  </Text>
                )}
                {item.completed_exercises != null && item.completed_exercises.length > 0 && (
                  <View className="mt-2 gap-1 border-t border-border pt-2">
                    {item.completed_exercises.map((exName, idx) => (
                      <View key={idx} className="flex-row items-center gap-1.5">
                        <Icon name="check" size={14} color={colors.brandPrimaryDark} />
                        <Text className="text-sm text-content-secondary">{exName}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => setPendingDelete(item)}
                className="p-2"
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("progress.deleteLog")}
              >
                <Icon name="trash" size={17} color={colors.contentMuted} />
              </Pressable>
            </Card>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="chart"
            title={t("progress.noWorkoutsLogged")}
            subtitle={t("progress.logFirstWorkout")}
          />
        }
      />

      <ConfirmDialog
        visible={pendingDelete != null}
        destructive
        title={t("progress.deleteLog")}
        message={
          pendingDelete != null
            ? t("progress.deleteConfirm", { name: pendingDelete.routine_name })
            : undefined
        }
        confirmLabel={t("common.delete")}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </View>
  );
}
