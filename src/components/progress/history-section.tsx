import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/src/components/empty-state";
import { Card } from "@/src/components/ui";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import type { WorkoutLog } from "@/src/types/database";

const TABULAR = { fontVariant: ["tabular-nums" as const] };
const STORAGE_KEY = "progress:historyOpen";
const PREVIEW_COUNT = 5;

type HistorySectionProps = {
  logs: WorkoutLog[];
  onDelete: (log: WorkoutLog) => void;
  onLogWorkout: () => void;
};

// Collapsed-by-default admin: keeps 100% of the old screen's function
// (view/delete logs) without letting the list dominate the dashboard.
// Open/closed state persists across sessions.
export function HistorySection({ logs, onDelete, onLogWorkout }: HistorySectionProps) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => setOpen(v === "1"))
      .catch(() => {});
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    AsyncStorage.setItem(STORAGE_KEY, next ? "1" : "0").catch(() => {});
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString(
      i18n.language === "es" ? "es-ES" : "en-US",
      { weekday: "short", month: "short", day: "numeric" },
    );

  return (
    <Card className="p-0">
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-center gap-2 px-4 py-3.5"
      >
        <Text className="text-[15px] font-bold text-content-primary">
          {t("progress.historial")}
        </Text>
        {logs.length > 0 && (
          <View className="rounded-full bg-brand-dark px-2 py-0.5">
            <Text className="text-[11px] font-semibold text-content-tertiary" style={TABULAR}>
              {logs.length}
            </Text>
          </View>
        )}
        <View className="flex-1" />
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.contentTertiary}
        />
      </Pressable>

      {open &&
        (logs.length === 0 ? (
          <EmptyState
            icon="bar-chart-outline"
            title={t("progress.noWorkoutsLogged")}
            subtitle={t("progress.logFirstWorkout")}
            actionLabel={t("progress.logWorkout")}
            onAction={onLogWorkout}
          />
        ) : (
          <View className="px-4 pb-3">
            {logs.slice(0, PREVIEW_COUNT).map((log) => (
              <View
                key={log.id}
                className="flex-row items-center gap-2 border-t border-border py-3"
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-semibold text-content-primary">
                    {log.routine_name}
                  </Text>
                  <Text className="text-xs text-content-tertiary">
                    {formatDate(log.date)}
                    {log.completed_exercises != null &&
                      log.completed_exercises.length > 0 &&
                      ` · ${t("progress.ejercicios", { count: log.completed_exercises.length })}`}
                  </Text>
                </View>
                {log.duration_minutes != null && (
                  <View className="rounded-full bg-success-soft px-2.5 py-0.5">
                    <Text className="text-xs font-medium text-success" style={TABULAR}>
                      {t("progress.min", { count: log.duration_minutes })}
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={() => onDelete(log)}
                  className="p-1.5"
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("progress.deleteLog")}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </Pressable>
              </View>
            ))}
            {logs.length > PREVIEW_COUNT && (
              <Pressable
                onPress={() => router.push("/(tabs)/progress/history")}
                accessibilityRole="button"
                className="items-center border-t border-border py-3"
              >
                <Text className="text-[13px] font-semibold text-brand-primary">
                  {t("progress.verTodo")}
                </Text>
              </Pressable>
            )}
          </View>
        ))}
    </Card>
  );
}
