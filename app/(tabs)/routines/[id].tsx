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
import { useProgress } from "@/src/hooks/use-progress";
import { useRoutines } from "@/src/hooks/use-routines";
import { colors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import type { RoutineExercise, RoutineWithExercises } from "@/src/types/database";
import { Ionicons } from "@expo/vector-icons";

export default function RoutineDetailScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRoutineWithExercises, addExercise, removeExercise } = useRoutines();
  const { createLog } = useProgress();

  const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [loggingWorkout, setLoggingWorkout] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<RoutineExercise | null>(null);

  // New exercise form state
  const [exName, setExName] = useState("");
  const [exNameError, setExNameError] = useState<string | undefined>();
  const [exSets, setExSets] = useState("3");
  const [exReps, setExReps] = useState("10");
  const [exWeight, setExWeight] = useState("");

  const fetchRoutine = async () => {
    if (!id) return;
    try {
      const data = await getRoutineWithExercises(id);
      setRoutine(data);
    } catch {
      toast.show({ type: "error", message: t("routines.couldNotLoad") });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      fetchRoutine();
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
      fetchRoutine();
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    }
  };

  const handleLogWorkout = async () => {
    if (!routine) return;
    setLoggingWorkout(true);
    try {
      await createLog({ routine_id: routine.id, routine_name: routine.name });
      toast.show({ type: "success", message: t("routines.workoutLogged") });
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

          {routine.routine_exercises.map((ex, index) => (
            <Card key={ex.id} className="px-4 py-3 flex-row items-center justify-between">
              <View className="flex-1 gap-0.5">
                <Text className="font-medium text-content-primary">
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
          ))}

          {/* Add exercise form */}
          {showAddExercise ? (
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
          onPress={handleLogWorkout}
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
    </>
  );
}
