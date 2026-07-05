import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  LoadingBlock,
  Screen,
  useToast,
} from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import { useProfile } from "@/src/hooks/use-profile";
import { useProgress } from "@/src/hooks/use-progress";
import { useRoutineDetail, useRoutines } from "@/src/hooks/use-routines";
import { enter, exit, pop, staggered } from "@/src/lib/motion";
import { colors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { RoutineExercise } from "@/src/types/database";
import { Ionicons } from "@expo/vector-icons";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";

export default function RoutineDetailScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addExercise, removeExercise } = useRoutines();
  const { createLog } = useProgress();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  // Derived from the persisted routines cache — renders offline, and
  // mutations flow back in without manual refreshes.
  const { data: routine = null, isPending: loading, isError } = useRoutineDetail(id);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [loggingWorkout, setLoggingWorkout] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<RoutineExercise | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});

  // New exercise form state
  const [exName, setExName] = useState("");
  const [exNameError, setExNameError] = useState<string | undefined>();
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

  const handleAddExercise = async () => {
    if (!routine) return;
    if (!exName.trim()) {
      setExNameError(t("common.fieldRequired"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    try {
      await addExercise({
        routine_id: routine.id,
        name: exName.trim(),
        sets: parseInt(exSets, 10) || 3,
        reps: parseInt(exReps, 10) || 10,
        weight_kg: exWeight ? parseFloat(exWeight) : undefined,
      });
      setExName("");
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
      .map((ex) => ex.name);

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

  return (
    <>
      <Stack.Screen options={{ title: routine.name }} />
      <Screen keyboard contentContainerClassName="pb-10">
        {/* Info */}
        {routine.description && (
          <Text className="text-content-tertiary">{routine.description}</Text>
        )}
        {routine.day_of_week && (
          <View className="self-start bg-info-soft rounded-full px-3 py-1">
            <Text className="text-brand-primary text-sm font-medium capitalize">
              {t("routines.every", { day: routine.day_of_week })}
            </Text>
          </View>
        )}

        {/* Exercises */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-content-primary">
            {t("routines.exercises", { count: routine.routine_exercises.length })}
          </Text>

          {routine.routine_exercises.map((ex, index) => {
            const isCompleted = !!completedExercises[ex.id];
            return (
              <AnimatedView key={ex.id} entering={staggered(index)} exiting={exit()}>
              <Card className={`px-4 py-3 flex-row items-center justify-between ${isCompleted ? "opacity-60" : ""}`}>
                <Pressable
                  onPress={() => toggleExercise(ex.id)}
                  className="p-2 mr-2"
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isCompleted }}
                >
                  {/* Keyed by state so the icon pops on every toggle */}
                  <AnimatedView key={isCompleted ? "done" : "todo"} entering={pop()}>
                    <Ionicons
                      name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={isCompleted ? colors.brandSecondary : colors.contentTertiary}
                    />
                  </AnimatedView>
                </Pressable>
                <View className="flex-1 gap-0.5">
                  <Text className={`font-medium ${isCompleted ? "text-content-secondary line-through" : "text-content-primary"}`}>
                    {index + 1}. {ex.name}
                  </Text>
                  <Text className="text-content-tertiary text-sm">
                    {ex.sets} × {ex.reps}
                    {ex.weight_kg != null ? ` · ${ex.weight_kg} kg` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setPendingRemove(ex)}
                  className="p-2 ml-2"
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("routines.removeExercise")}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </Card>
              </AnimatedView>
            );
          })}

          {/* Add exercise form */}
          {showAddExercise ? (
            <AnimatedView entering={enter()} exiting={exit()}>
            <Card className="gap-3">
              <Text className="font-semibold text-content-primary">
                {t("routines.addExercise")}
              </Text>
              <Input
                placeholder={t("routines.exerciseName")}
                value={exName}
                onChangeText={(text) => {
                  setExName(text);
                  if (exNameError != null) setExNameError(undefined);
                }}
                error={exNameError}
                className="bg-brand-dark"
              />
              <View className="flex-row gap-2">
                <Input
                  label={t("routines.sets")}
                  keyboardType="number-pad"
                  value={exSets}
                  onChangeText={setExSets}
                  containerClassName="flex-1"
                  className="bg-brand-dark text-center"
                />
                <Input
                  label={t("routines.reps")}
                  keyboardType="number-pad"
                  value={exReps}
                  onChangeText={setExReps}
                  containerClassName="flex-1"
                  className="bg-brand-dark text-center"
                />
                <Input
                  label={t("routines.weightOpt")}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  value={exWeight}
                  onChangeText={setExWeight}
                  containerClassName="flex-1"
                  className="bg-brand-dark text-center"
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
              onPress={() => setShowAddExercise(true)}
              accessibilityRole="button"
              className="border-2 border-dashed border-border-strong rounded-2xl py-4 items-center"
            >
              <Text className="text-content-tertiary font-medium">
                {t("routines.addExerciseButton")}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Log Workout */}
        <Button
          size="lg"
          onPress={openLogDialog}
          loading={loggingWorkout}
          className="bg-brand-secondary mt-2"
        >
          {t("routines.logWorkout")}
        </Button>
      </Screen>

      <ConfirmDialog
        visible={pendingRemove != null}
        destructive
        title={t("routines.removeExercise")}
        message={pendingRemove != null ? t("routines.removeConfirm", { name: pendingRemove.name }) : undefined}
        confirmLabel={t("common.remove")}
        onConfirm={handleConfirmRemove}
        onClose={() => setPendingRemove(null)}
      />

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
    </>
  );
}
