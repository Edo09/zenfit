import { useProgress } from "@/src/hooks/use-progress";
import { useRoutines } from "@/src/hooks/use-routines";
import { Pressable, ScrollView, Text, TextInput, View } from "@/src/tw";
import type { RoutineWithExercises } from "@/src/types/database";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert } from "react-native";

export default function RoutineDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRoutineWithExercises, addExercise, removeExercise } = useRoutines();
  const { createLog } = useProgress();

  const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [loggingWorkout, setLoggingWorkout] = useState(false);

  // New exercise form state
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState("3");
  const [exReps, setExReps] = useState("10");
  const [exWeight, setExWeight] = useState("");

  const fetchRoutine = async () => {
    if (!id) return;
    try {
      const data = await getRoutineWithExercises(id);
      setRoutine(data);
    } catch {
      Alert.alert(t("common.error"), t("routines.couldNotLoad"));
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutine();
  }, [id]);

  const handleAddExercise = async () => {
    if (!exName.trim() || !routine) return;
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
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message);
    }
  };

  const handleRemoveExercise = (exerciseId: string, name: string) => {
    Alert.alert(t("routines.removeExercise"), t("routines.removeConfirm", { name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: async () => {
          await removeExercise(exerciseId);
          fetchRoutine();
        },
      },
    ]);
  };

  const handleLogWorkout = async () => {
    if (!routine) return;
    setLoggingWorkout(true);
    try {
      await createLog({ routine_id: routine.id, routine_name: routine.name });
      Alert.alert(t("routines.workoutLogged"), t("routines.greatJob"));
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message);
    } finally {
      setLoggingWorkout(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-dark">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!routine) return null;

  return (
    <>
      <Stack.Screen options={{ title: routine.name }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-brand-dark"
        contentContainerClassName="px-4 py-6 gap-5 pb-10"
      >
        {/* Info */}
        {routine.description && (
          <Text className="text-gray-400">{routine.description}</Text>
        )}
        {routine.day_of_week && (
          <View className="self-start bg-brand-primary/10 rounded-full px-3 py-1">
            <Text className="text-brand-primary text-sm font-medium capitalize">
              Every {routine.day_of_week}
            </Text>
          </View>
        )}

        {/* Exercises */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-white">
            {t("routines.exercises", { count: routine.routine_exercises.length })}
          </Text>

          {routine.routine_exercises.map((ex, index) => (
            <View
              key={ex.id}
              className="bg-surface rounded-2xl px-4 py-3 flex-row items-center justify-between"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            >
              <View className="flex-1 gap-0.5">
                <Text className="font-medium text-white">
                  {index + 1}. {ex.name}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {ex.sets} sets × {ex.reps} reps
                  {ex.weight_kg != null ? ` · ${ex.weight_kg} kg` : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => handleRemoveExercise(ex.id, ex.name)}
                className="p-2 ml-2"
                hitSlop={8}
              >
                <Text className="text-red-400">✕</Text>
              </Pressable>
            </View>
          ))}

          {/* Add exercise form */}
          {showAddExercise ? (
            <View
              className="bg-surface rounded-2xl p-4 gap-3"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            >
              <Text className="font-semibold text-white">{t("routines.addExercise")}</Text>
              <TextInput
                className="bg-brand-dark border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder={t("routines.exerciseName")}
                placeholderTextColor="#64748B"
                value={exName}
                onChangeText={setExName}
              />
              <View className="flex-row gap-2">
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-gray-400">{t("routines.sets")}</Text>
                  <TextInput
                    className="bg-brand-dark border border-surface-elevated rounded-xl px-3 py-2 text-white text-center"
                    keyboardType="number-pad"
                    value={exSets}
                    onChangeText={setExSets}
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-gray-400">{t("routines.reps")}</Text>
                  <TextInput
                    className="bg-brand-dark border border-surface-elevated rounded-xl px-3 py-2 text-white text-center"
                    keyboardType="number-pad"
                    value={exReps}
                    onChangeText={setExReps}
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-gray-400">{t("routines.weightOpt")}</Text>
                  <TextInput
                    className="bg-brand-dark border border-surface-elevated rounded-xl px-3 py-2 text-white text-center"
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor="#64748B"
                    value={exWeight}
                    onChangeText={setExWeight}
                  />
                </View>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setShowAddExercise(false)}
                  className="flex-1 border border-surface-elevated rounded-xl py-3 items-center"
                >
                  <Text className="text-gray-400 font-medium">{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddExercise}
                  className="flex-1 bg-brand-primary rounded-xl py-3 items-center"
                >
                  <Text className="text-white font-medium">{t("common.add")}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowAddExercise(true)}
              className="border-2 border-dashed border-surface-elevated rounded-2xl py-4 items-center"
            >
              <Text className="text-gray-400 font-medium">{t("routines.addExerciseButton")}</Text>
            </Pressable>
          )}
        </View>

        {/* Log Workout */}
        <Pressable
          onPress={handleLogWorkout}
          disabled={loggingWorkout}
          className="bg-brand-secondary rounded-2xl py-4 items-center mt-2"
          style={{ boxShadow: "0 4px 12px rgba(34, 197, 94, 0.35)" }}
        >
          {loggingWorkout ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {t("routines.logWorkout")}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}
