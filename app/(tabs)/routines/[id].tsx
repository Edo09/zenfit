import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ScrollView as RNScrollView } from "react-native";

import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  LoadingBlock,
  Screen,
  SelectField,
  useToast,
} from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import { useExercises } from "@/src/hooks/use-exercises";
import { useProfile } from "@/src/hooks/use-profile";
import { useProgress } from "@/src/hooks/use-progress";
import { useRoutineDetail, useRoutines } from "@/src/hooks/use-routines";
import { useIsOnline } from "@/src/lib/online";
import { enter, exit, pop, staggered } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { RoutineExercise } from "@/src/types/database";
import { dayLabel } from "@/src/utils/day-label";
import { ExerciseVideoModal } from "@/src/components/exercise-video-modal";
import { Ionicons } from "@expo/vector-icons";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";

// Numbered-badge colors, cycled per exercise (mirrors the reference's
// multi-color exercise thumbnails).
const BADGE_COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#22c55e", "#a78bfa"];

/** Rest seconds → mm:ss. */
function formatRest(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function RoutineDetailScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const toast = useToast();
  const online = useIsOnline();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addExercise, removeExercise } = useRoutines();
  const { exercises } = useExercises();
  const { createLog } = useProgress();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  // Derived from the persisted routines cache — renders offline, and
  // mutations flow back in without manual refreshes.
  const { data: routine = null, isPending: loading, isError } = useRoutineDetail(id);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const scrollViewRef = useRef<RNScrollView>(null);

  function openAddExerciseForm() {
    setShowAddExercise(true);
    // Wait for form to mount/animate in before scrolling to it.
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
  }
  const [loggingWorkout, setLoggingWorkout] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<RoutineExercise | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  // Single active rest countdown (one timer at a time).
  const [rest, setRest] = useState<{ exId: string; remaining: number } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // New exercise form state
  const [exExerciseId, setExExerciseId] = useState<string | null>(null);
  const [exExerciseError, setExExerciseError] = useState<string | undefined>();
  const [exSets, setExSets] = useState("3");
  const [exReps, setExReps] = useState("10");
  const [exWeight, setExWeight] = useState("");

  useEffect(() => {
    if (isError) {
      toast.show({ type: "error", message: t("routines.couldNotLoad") });
      router.back();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  // Tick the active rest timer down to zero, then celebrate + clear.
  useEffect(() => {
    if (rest == null) return;
    if (rest.remaining <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Avoid calling setState synchronously inside the effect to prevent cascading renders
      // Schedule state update on next tick
      setTimeout(() => setRest(null), 0);
      return;
    }
    const id = setTimeout(
      () => setRest((r) => (r ? { ...r, remaining: r.remaining - 1 } : null)),
      1000,
    );
    return () => clearTimeout(id);
  }, [rest]);

  const toggleRest = (ex: RoutineExercise) => {
    Haptics.selectionAsync().catch(() => {});
    setRest((prev) =>
      prev?.exId === ex.id ? null : { exId: ex.id, remaining: ex.rest_seconds || 60 },
    );
  };

  const handleAddExercise = async () => {
    if (!routine) return;
    const selected = exercises.find((e) => e.id === exExerciseId);
    if (!selected) {
      setExExerciseError(t("common.fieldRequired"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    try {
      await addExercise({
        routine_id: routine.id,
        exercise_id: selected.id,
        exercise: selected,
        sets: parseInt(exSets, 10) || 3,
        reps: parseInt(exReps, 10) || 10,
        weight_kg: exWeight ? parseFloat(exWeight) : undefined,
      });
      setExExerciseId(null);
      setExSets("3");
      setExReps("10");
      setExWeight("");
      setShowAddExercise(false);
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    }
  };

  const handleConfirmRemove = async () => {
    const target = pendingRemove;
    setPendingRemove(null);
    if (target == null) return;
    try {
      await removeExercise(target.id);
      toast.show({ type: "success", message: t("routines.exerciseRemoved") });
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    }
  };

  const openDemo = (ex: RoutineExercise) => {
    if (!ex.exercise?.video_url) {
      toast.show({ type: "info", message: t("routines.noVideoYet") });
      return;
    }
    if (!online) {
      toast.show({ type: "info", message: t("common.requiresInternet") });
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setVideoUri(ex.exercise.video_url);
  };

  const toggleExercise = (exId: string) => {
    // Haptic on completion only — un-checking shouldn't celebrate
    if (!completedExercises[exId]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setCompletedExercises((prev) => ({
      ...prev,
      [exId]: !prev[exId],
    }));
  };

  const openLogDialog = () => {
    setWorkoutDuration(profile?.session_duration ? String(profile.session_duration) : "");
    setWorkoutNotes("");
    setShowLogDialog(true);
  };

  const handleLogWorkout = async (durationVal: string, notesVal: string) => {
    if (!routine) return;
    setLoggingWorkout(true);

    const completedNames = routine.routine_exercises
      .filter((ex) => completedExercises[ex.id])
      .map((ex) => ex.exercise?.name)
      .filter((name): name is string => !!name);

    try {
      await createLog({
        routine_id: routine.id,
        routine_name: routine.name,
        duration_minutes: durationVal ? parseInt(durationVal, 10) : undefined,
        notes: notesVal.trim() || undefined,
        completed_exercises: completedNames.length > 0 ? completedNames : null,
      });
      toast.show({ type: "success", message: t("routines.workoutLogged") });
      setShowLogDialog(false);
      setWorkoutDuration("");
      setWorkoutNotes("");
      setCompletedExercises({});
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    } finally {
      setLoggingWorkout(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-dark">
        <LoadingBlock />
      </View>
    );
  }

  if (!routine) return null;

  // Coach-assigned routines are read-only for the client (no add/remove exercises).
  const isAssigned = routine.assigned_by != null;

  return (
    <>
      <Stack.Screen
        options={{
          title: routine.name.toUpperCase(),
          headerTitleAlign: "center",
          headerRight: () => (
            <Pressable
              onPress={() => setShowInfo(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("common.info")}
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={colors.contentPrimary}
              />
            </Pressable>
          ),
        }}
      />
      <Screen
        keyboard
        scrollRef={scrollViewRef}
        contentContainerClassName="pb-6"
        footer={
          <View className="px-4 pt-2 pb-6 bg-brand-dark border-t border-border">
            <Pressable
              onPress={openLogDialog}
              accessibilityRole="button"
              className="rounded-2xl py-4 items-center active:opacity-90"
              style={{ backgroundColor: colors.brandAccent }}
            >
              <Text className="font-bold text-base" style={{ color: colors.brandDark }}>
                {t("routines.finishWorkout")}
              </Text>
            </Pressable>
          </View>
        }
      >
        {/* Assigned badge */}
        {isAssigned && (
          <View className="self-start flex-row items-center gap-1.5 bg-brand-primary rounded-full px-3 py-1">
            <Ionicons name="ribbon-outline" size={14} color={colors.white} />
            <Text className="text-white text-sm font-semibold">
              {t("coach.assignedBadge")}
            </Text>
          </View>
        )}

        {/* Muscle-group / description title */}
        <Text className="text-3xl font-bold text-content-primary">
          {routine.description ?? routine.name}
        </Text>

        {routine.day_of_week && (
          <View className="self-start bg-info-soft rounded-full px-3 py-1">
            <Text className="text-brand-primary text-sm font-medium">
              {t("routines.every", { day: dayLabel(routine.day_of_week, t) })}
            </Text>
          </View>
        )}

        {/* Exercise list */}
        <Text className="text-content-primary font-bold text-base">
          {t("routines.exerciseList")}
        </Text>

        <View className="gap-3">
          <View className="-mx-4">
            {routine.routine_exercises.map((ex, index) => {
              const isCompleted = !!completedExercises[ex.id];
              const badge = BADGE_COLORS[index % BADGE_COLORS.length];
              const isResting = rest?.exId === ex.id;
              const restLabel = formatRest(
                isResting ? rest!.remaining : ex.rest_seconds || 60,
              );
              return (
                <AnimatedView key={ex.id} entering={staggered(index)} exiting={exit()}>
                  {/* Exercise row */}
                  <View
                    className={`flex-row items-center gap-3 px-4 py-3 bg-surface ${isCompleted ? "opacity-60" : ""}`}
                  >
                    <Pressable
                      onPress={() => toggleExercise(ex.id)}
                      hitSlop={8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isCompleted }}
                    >
                      {/* Keyed by state so the icon pops on every toggle */}
                      <AnimatedView key={isCompleted ? "done" : "todo"} entering={pop()}>
                        <Ionicons
                          name={isCompleted ? "checkbox" : "square-outline"}
                          size={26}
                          color={isCompleted ? colors.brandAccent : colors.contentTertiary}
                        />
                      </AnimatedView>
                    </Pressable>

                    {/* Thumbnail with numbered badge — opens the demo */}
                    <Pressable
                      onPress={() => openDemo(ex)}
                      className="w-16 h-16 rounded-xl overflow-hidden bg-surface-elevated items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel={t("routines.watchDemo")}
                    >
                      <Ionicons name="barbell-outline" size={26} color={colors.contentMuted} />
                      {ex.exercise?.video_url ? (
                        <View className="absolute inset-0 items-center justify-center bg-black/30">
                          <Ionicons name="play-circle" size={30} color="#fff" />
                        </View>
                      ) : null}
                      <View
                        className="absolute top-0 left-0 px-1.5 py-0.5 rounded-br-lg"
                        style={{ backgroundColor: badge }}
                      >
                        <Text
                          className="text-white text-xs font-bold"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </Text>
                      </View>
                    </Pressable>

                    {/* Name + reps — opens the demo */}
                    <Pressable onPress={() => openDemo(ex)} className="flex-1">
                      <Text
                        className={`font-bold text-base ${isCompleted ? "text-content-secondary line-through" : "text-content-primary"}`}
                      >
                        {ex.exercise?.name}
                      </Text>
                      <Text className="text-content-tertiary text-sm mt-0.5">
                        {ex.sets} × {ex.reps}
                        {ex.weight_kg != null ? ` · ${ex.weight_kg} kg` : ""}
                      </Text>
                    </Pressable>

                    {!isAssigned && (
                      <Pressable
                        onPress={() => setPendingRemove(ex)}
                        hitSlop={8}
                        className="p-1"
                        accessibilityRole="button"
                        accessibilityLabel={t("routines.removeExercise")}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </Pressable>
                    )}

                    <Pressable
                      onPress={() => openDemo(ex)}
                      hitSlop={8}
                      className="pl-0.5"
                      accessibilityRole="button"
                      accessibilityLabel={t("routines.watchDemo")}
                    >
                      <Ionicons name="chevron-forward" size={22} color={colors.brandAccent} />
                    </Pressable>
                  </View>

                  {/* Rest timer row */}
                  <Pressable
                    onPress={() => toggleRest(ex)}
                    className="flex-row items-center gap-2 px-4 py-2.5 bg-surface border-t border-border"
                    accessibilityRole="button"
                    accessibilityLabel={t("routines.restBetweenSets")}
                  >
                    <Text
                      className="text-content-primary font-semibold text-sm"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {restLabel}
                    </Text>
                    <Text className="text-content-tertiary text-sm flex-1">
                      ({t("routines.restBetweenSets")})
                    </Text>
                    <Ionicons
                      name={isResting ? "pause" : "play"}
                      size={18}
                      color={isResting ? colors.brandAccent : colors.contentSecondary}
                    />
                  </Pressable>

                  {/* Gap between exercise blocks */}
                  <View className="h-2 bg-brand-dark" />
                </AnimatedView>
              );
            })}
          </View>

          {/* Add exercise form — hidden for coach-assigned routines */}
          {isAssigned ? null : showAddExercise ? (
            <AnimatedView entering={enter()} exiting={exit()}>
            <Card className="gap-3">
              <Text className="font-semibold text-content-primary">
                {t("routines.addExercise")}
              </Text>
              <SelectField
                placeholder={t("routines.pickExercise")}
                value={exExerciseId}
                options={exercises.map((e) => ({
                  label: e.body_part?.name ? `${e.name} (${e.body_part.name})` : e.name,
                  value: e.id,
                }))}
                onChange={(value) => {
                  setExExerciseId(value);
                  if (exExerciseError != null) setExExerciseError(undefined);
                }}
                helper={
                  exExerciseError ??
                  (exercises.length === 0 ? t("routines.noExercisesInCatalog") : undefined)
                }
              />
              <View className="flex-row gap-2">
                <Input
                  label={t("routines.sets")}
                  keyboardType="number-pad"
                  value={exSets}
                  onChangeText={setExSets}
                  containerClassName="flex-1"
                  textAlign="center"
                  className="bg-brand-dark"
                />
                <Input
                  label={t("routines.reps")}
                  keyboardType="number-pad"
                  value={exReps}
                  onChangeText={setExReps}
                  containerClassName="flex-1"
                  textAlign="center"
                  className="bg-brand-dark"
                />
                <Input
                  label={t("routines.weightOpt")}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  value={exWeight}
                  onChangeText={setExWeight}
                  containerClassName="flex-1"
                  textAlign="center"
                  className="bg-brand-dark"
                />
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button variant="secondary" onPress={() => setShowAddExercise(false)} className="w-full">
                    {t("common.cancel")}
                  </Button>
                </View>
                <View className="flex-1">
                  <Button onPress={handleAddExercise} className="w-full">
                    {t("common.add")}
                  </Button>
                </View>
              </View>
            </Card>
            </AnimatedView>
          ) : (
            <Pressable
              onPress={openAddExerciseForm}
              accessibilityRole="button"
              className="border-2 border-dashed border-border-strong rounded-2xl py-4 items-center"
            >
              <Text className="text-content-tertiary font-medium">
                {t("routines.addExerciseButton")}
              </Text>
            </Pressable>
          )}
        </View>

      </Screen>

      <ConfirmDialog
        visible={pendingRemove != null}
        destructive
        title={t("routines.removeExercise")}
        message={pendingRemove != null ? t("routines.removeConfirm", { name: pendingRemove.exercise?.name }) : undefined}
        confirmLabel={t("common.remove")}
        onConfirm={handleConfirmRemove}
        onClose={() => setPendingRemove(null)}
      />

      <AlertDialog isOpen={showInfo} onClose={() => setShowInfo(false)} size="md">
        <AlertDialogBackdrop />
        <AlertDialogContent className="bg-surface border-border rounded-3xl gap-3 p-6">
          <AlertDialogHeader>
            <Text className="text-lg font-semibold text-content-primary">
              {routine.name}
            </Text>
          </AlertDialogHeader>
          <AlertDialogBody className="gap-2">
            {routine.description ? (
              <Text className="text-content-secondary text-sm">
                {routine.description}
              </Text>
            ) : null}
            {routine.day_of_week ? (
              <Text className="text-content-tertiary text-sm">
                {t("routines.every", { day: dayLabel(routine.day_of_week, t) })}
              </Text>
            ) : null}
            <Text className="text-content-tertiary text-sm">
              {t("routines.exercises", { count: routine.routine_exercises.length })}
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              variant="secondary"
              onPress={() => setShowInfo(false)}
              className="w-full"
            >
              {t("common.close")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog isOpen={showLogDialog} onClose={() => setShowLogDialog(false)} size="md">
        <AlertDialogBackdrop />
        <AlertDialogContent className="bg-surface border-border rounded-3xl gap-4 p-6">
          <AlertDialogHeader>
            <Text className="text-lg font-semibold text-content-primary">
              {t("progress.logAWorkout")}
            </Text>
          </AlertDialogHeader>
          <AlertDialogBody className="gap-4">
            <Text className="text-sm text-content-secondary mb-1">
              {t("routines.greatJob")}
            </Text>
            <Input
              label={t("progress.duration")}
              keyboardType="number-pad"
              placeholder="45"
              value={workoutDuration}
              onChangeText={setWorkoutDuration}
              className="bg-brand-dark"
            />
            <Input
              label={t("progress.notes")}
              placeholder={t("progress.notesPlaceholder")}
              value={workoutNotes}
              onChangeText={setWorkoutNotes}
              containerClassName="mt-2"
              className="bg-brand-dark"
            />
          </AlertDialogBody>
          <AlertDialogFooter className="mt-4 flex-row gap-2">
            <View className="flex-1">
              <Button
                variant="secondary"
                onPress={() => setShowLogDialog(false)}
                className="w-full"
              >
                {t("common.cancel")}
              </Button>
            </View>
            <View className="flex-1">
              <Button
                onPress={() => handleLogWorkout(workoutDuration, workoutNotes)}
                loading={loggingWorkout}
                className="w-full bg-brand-secondary"
              >
                {t("common.save")}
              </Button>
            </View>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExerciseVideoModal uri={videoUri} onClose={() => setVideoUri(null)} />
    </>
  );
}
