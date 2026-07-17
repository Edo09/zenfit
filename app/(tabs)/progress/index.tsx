import * as Haptics from "expo-haptics";
import { useHeaderHeight } from "expo-router/react-navigation";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Modal, Platform, RefreshControl } from "react-native";
import RAnimated from "react-native-reanimated";

import { AchievementChips } from "@/src/components/progress/achievement-chips";
import { HeroCard } from "@/src/components/progress/hero-card";
import { HistorySection } from "@/src/components/progress/history-section";
import { InsightCard } from "@/src/components/progress/insight-card";
import { MusclesCard } from "@/src/components/progress/muscles-card";
import { NutritionCard } from "@/src/components/progress/nutrition-card";
import { PeriodToggle } from "@/src/components/progress/period-toggle";
import { SkeletonDashboard } from "@/src/components/progress/skeleton-dashboard";
import { StrengthCard } from "@/src/components/progress/strength-card";
import { WeightCard } from "@/src/components/progress/weight-card";
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  ErrorState,
  FAB,
  Input,
  useToast,
} from "@/src/components/ui";
import { useProgressDashboard } from "@/src/hooks/use-progress-dashboard";
import { useRefreshOnFocus } from "@/src/hooks/use-refresh-on-focus";
import { useRoutines } from "@/src/hooks/use-routines";
import { staggered } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { Periodo } from "@/src/utils/progress";
import type { WorkoutLog } from "@/src/types/database";

export default function ProgressScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const toast = useToast();
  const headerHeight = useHeaderHeight();
  const [periodo, setPeriodo] = useState<Periodo>("week");
  const dashboard = useProgressDashboard(periodo);
  const { routines } = useRoutines();
  useRefreshOnFocus(dashboard.refresh);

  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [routineError, setRoutineError] = useState<string | undefined>();
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WorkoutLog | null>(null);

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
      await dashboard.createLog({
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
      await dashboard.deleteLog(target.id);
      toast.show({ type: "success", message: t("progress.logDeleted") });
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    }
  };

  if (dashboard.loading && dashboard.logs.length === 0) {
    return (
      <View className="flex-1 bg-brand-dark">
        <SkeletonDashboard />
      </View>
    );
  }

  if (dashboard.error && dashboard.logs.length === 0) {
    return (
      <View className="flex-1 bg-brand-dark">
        <ErrorState onRetry={dashboard.refresh} />
      </View>
    );
  }

  const { isEmpty } = dashboard;

  return (
    <View className="flex-1 bg-brand-dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        <RAnimated.ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 72 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={dashboard.refreshing}
              onRefresh={dashboard.refresh}
              tintColor={colors.brandPrimary}
              colors={[colors.brandPrimary]}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          {!isEmpty && (
            <AnimatedView entering={staggered(0)}>
              <PeriodToggle value={periodo} onChange={setPeriodo} />
            </AnimatedView>
          )}

          <AnimatedView entering={staggered(1)}>
            <HeroCard
              periodo={periodo}
              hero={dashboard.hero}
              firstRun={isEmpty}
              onLogFirst={() => setShowLogForm(true)}
            />
          </AnimatedView>

          <AnimatedView entering={staggered(2)}>
            <WeightCard
              weight={dashboard.weight}
              profile={dashboard.profile}
              onLogWeight={dashboard.logWeight}
            />
          </AnimatedView>

          {!isEmpty && (
            <>
              <AnimatedView entering={staggered(3)}>
                <StrengthCard
                  weekVolume={dashboard.strength.weekVolume}
                  series={dashboard.strength.series}
                  deltaPct={dashboard.strength.deltaPct}
                  prs={dashboard.strength.prs}
                  estimated={dashboard.strength.estimated}
                />
              </AnimatedView>

              <AnimatedView entering={staggered(4)}>
                <NutritionCard periodo={periodo} nutrition={dashboard.nutrition} />
              </AnimatedView>

              <AnimatedView entering={staggered(5)}>
                <MusclesCard
                  periodo={periodo}
                  rows={dashboard.muscles.rows}
                  alert={dashboard.muscles.alert}
                />
              </AnimatedView>

              {(dashboard.insight != null || dashboard.aiInsight != null) && (
                <AnimatedView entering={staggered(6)}>
                  <InsightCard insight={dashboard.insight} ai={dashboard.aiInsight} />
                </AnimatedView>
              )}

              <AnimatedView entering={staggered(6)}>
                <AchievementChips chips={dashboard.logros} />
              </AnimatedView>
            </>
          )}

          {isEmpty && (
            <NutritionCard periodo={periodo} nutrition={dashboard.nutrition} />
          )}

          <AnimatedView entering={staggered(6)}>
            <HistorySection
              logs={dashboard.logs}
              onDelete={setPendingDelete}
              onLogWorkout={() => setShowLogForm(true)}
            />
          </AnimatedView>
        </RAnimated.ScrollView>
      </KeyboardAvoidingView>

      {/* Log form as a real modal: dim backdrop over the whole screen (header
          included), tap-outside to dismiss. Same form + handlers as before. */}
      <Modal
        visible={showLogForm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowLogForm(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <Pressable
            className="flex-1 justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
            onPress={() => setShowLogForm(false)}
            accessibilityRole="button"
            accessibilityLabel={t("common.cancel")}
          >
            {/* Swallow taps on the card so they don't close the modal */}
            <Pressable onPress={() => {}} className="mx-4">
              <Card className="gap-3">
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
                    <Button variant="secondary" onPress={() => setShowLogForm(false)} className="w-full">
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
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {!showLogForm && (
        <FAB onPress={() => setShowLogForm(true)} accessibilityLabel={t("progress.logWorkout")} />
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
