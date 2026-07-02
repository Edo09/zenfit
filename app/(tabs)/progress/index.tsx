import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useHeaderHeight } from "@react-navigation/elements";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, KeyboardAvoidingView, RefreshControl } from "react-native";

import { EmptyState } from "@/src/components/empty-state";
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  ErrorState,
  FAB,
  Input,
  LoadingBlock,
  useToast,
} from "@/src/components/ui";
import { useProgress } from "@/src/hooks/use-progress";
import { useRoutines } from "@/src/hooks/use-routines";
import { colors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import type { WorkoutLog } from "@/src/types/database";

export default function ProgressScreen() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const headerHeight = useHeaderHeight();
  const { logs, loading, error, refreshing, refresh, createLog, deleteLog } = useProgress();
  const { routines } = useRoutines();
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [routineError, setRoutineError] = useState<string | undefined>();
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WorkoutLog | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(i18n.language === "es" ? "es-ES" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleLogWorkout = async () => {
    if (!selectedRoutineId) {
      setRoutineError(t("progress.selectRoutine"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    const routine = routines.find((r) => r.id === selectedRoutineId);
    if (!routine) return;

    try {
      setSubmitting(true);
      await createLog({
        routine_id: selectedRoutineId,
        routine_name: routine.name,
        duration_minutes: duration ? parseInt(duration, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      setShowLogForm(false);
      setSelectedRoutineId(null);
      setDuration("");
      setNotes("");
      toast.show({ type: "success", message: t("routines.workoutLogged") });
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    } finally {
      setSubmitting(false);
    }
  };

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

  if (loading && logs.length === 0) {
    return (
      <View className="flex-1 bg-brand-dark">
        <LoadingBlock />
      </View>
    );
  }

  if (error && logs.length === 0) {
    return (
      <View className="flex-1 bg-brand-dark">
        <ErrorState onRetry={refresh} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // "padding" on Android too — edge-to-edge disables adjustResize (see Screen)
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        {/* Log workout inline form */}
        {showLogForm && (
          <Card className="mx-4 mt-4 gap-3">
            <Text className="font-semibold text-content-primary">
              {t("progress.logAWorkout")}
            </Text>

            {routines.length === 0 ? (
              <View className="items-center gap-2 py-2">
                <Text className="text-content-tertiary text-sm">
                  {t("progress.noRoutinesYet")}
                </Text>
                <Pressable
                  onPress={() => {
                    setShowLogForm(false);
                    router.push("/(tabs)/routines/create");
                  }}
                  accessibilityRole="button"
                >
                  <Text className="text-brand-primary font-medium text-sm">
                    {t("progress.createRoutineFirst")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text className="text-sm text-content-tertiary">
                  {t("progress.selectRoutine")}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {routines.map((r) => (
                    <Chip
                      key={r.id}
                      label={r.name}
                      selected={selectedRoutineId === r.id}
                      onPress={() => {
                        setSelectedRoutineId(r.id);
                        if (routineError != null) setRoutineError(undefined);
                      }}
                    />
                  ))}
                </View>
                {routineError != null && (
                  <Text className="text-xs text-error">{routineError}</Text>
                )}
              </>
            )}

            <View className="flex-row gap-2">
              <Input
                label={t("progress.duration")}
                keyboardType="number-pad"
                placeholder="45"
                value={duration}
                onChangeText={setDuration}
                containerClassName="flex-1"
                className="bg-brand-dark"
              />
              <Input
                label={t("progress.notes")}
                placeholder={t("progress.notesPlaceholder")}
                value={notes}
                onChangeText={setNotes}
                containerClassName="flex-[2]"
                className="bg-brand-dark"
              />
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  variant="secondary"
                  onPress={() => setShowLogForm(false)}
                  className="w-full"
                >
                  {t("common.cancel")}
                </Button>
              </View>
              <View className="flex-1">
                <Button onPress={handleLogWorkout} loading={submitting} className="w-full">
                  {t("common.save")}
                </Button>
              </View>
            </View>
          </Card>
        )}

        <FlatList
          data={logs}
          contentInsetAdjustmentBehavior="automatic"
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.brandPrimary}
              colors={[colors.brandPrimary]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item }) => (
            <Card className="px-4 py-4 flex-row items-start justify-between">
              <View className="flex-1 gap-1">
                <Text className="font-semibold text-content-primary">{item.routine_name}</Text>
                <Text className="text-content-tertiary text-sm">{formatDate(item.date)}</Text>
                {item.duration_minutes != null && (
                  <View className="self-start bg-success-soft rounded-full px-3 py-0.5 mt-1">
                    <Text className="text-brand-secondary text-xs font-medium">
                      {t("progress.min", { count: item.duration_minutes })}
                    </Text>
                  </View>
                )}
                {item.notes && (
                  <Text className="text-content-tertiary text-sm mt-1" selectable>
                    {item.notes}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => setPendingDelete(item)}
                className="p-2 ml-2"
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("progress.deleteLog")}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bar-chart-outline"
              title={t("progress.noWorkoutsLogged")}
              subtitle={t("progress.logFirstWorkout")}
              actionLabel={t("progress.logWorkout")}
              onAction={() => setShowLogForm(true)}
            />
          }
        />
      </KeyboardAvoidingView>

      {!showLogForm && (
        <FAB
          onPress={() => setShowLogForm(true)}
          accessibilityLabel={t("progress.logWorkout")}
        />
      )}

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
