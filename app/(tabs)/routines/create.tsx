import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AddExerciseForm,
  type NewRoutineExercise,
} from "@/src/components/add-exercise-form";
import { Button, Chip, Input, Screen, useToast } from "@/src/components/ui";
import { useRoutines } from "@/src/hooks/use-routines";
import { kgToUnit1, useWeightUnit } from "@/src/lib/weight-unit";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import { Ionicons } from "@expo/vector-icons";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function CreateRoutineScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const colors = useColors();
  const weightUnit = useWeightUnit();
  const { createRoutine, addExercise } = useRoutines();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Exercises staged locally until the routine itself is created.
  const [staged, setStaged] = useState<NewRoutineExercise[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      setNameError(t("routines.routineNameRequired"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    try {
      setLoading(true);
      const routine = await createRoutine({
        name: name.trim(),
        description: description.trim() || undefined,
        day_of_week: dayOfWeek ?? undefined,
      });
      for (const [i, entry] of staged.entries()) {
        await addExercise({
          routine_id: routine.id,
          exercise_id: entry.exercise.id,
          exercise: entry.exercise,
          sets: entry.sets,
          reps: entry.reps,
          weight_kg: entry.weight_kg,
          sort_order: i,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch {
      toast.show({ type: "error", message: t("routines.couldNotCreate") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard>
      <View className="gap-4">
        <Input
          label={t("routines.routineName")}
          placeholder={t("routines.routineNamePlaceholder")}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (nameError != null) setNameError(undefined);
          }}
          error={nameError}
        />

        <Input
          label={t("routines.description")}
          placeholder={t("routines.descriptionPlaceholder")}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        <View className="gap-2">
          <Text className="text-sm font-medium text-content-secondary">
            {t("routines.scheduledDay")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {DAYS.map((day) => (
              <Chip
                key={day}
                label={t(`days.${day.slice(0, 3)}`, { defaultValue: day.slice(0, 3) })}
                selected={dayOfWeek === day}
                onPress={() => setDayOfWeek(dayOfWeek === day ? null : day)}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-content-secondary">
            {t("routines.exerciseList")}
          </Text>

          {staged.map((entry, index) => (
            <View
              key={`${entry.exercise.id}-${index}`}
              className="flex-row items-center gap-3 bg-surface rounded-xl px-4 py-3"
            >
              <View className="flex-1">
                <Text className="font-semibold text-content-primary">
                  {entry.exercise.name}
                </Text>
                <Text className="text-content-tertiary text-sm mt-0.5">
                  {entry.sets} × {entry.reps}
                  {entry.weight_kg != null
                    ? ` · ${kgToUnit1(entry.weight_kg, weightUnit)} ${weightUnit}`
                    : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => setStaged((prev) => prev.filter((_, i) => i !== index))}
                hitSlop={8}
                className="p-1"
                accessibilityRole="button"
                accessibilityLabel={t("routines.removeExercise")}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))}

          {showAddExercise ? (
            <AddExerciseForm
              onAdd={(entry) => {
                setStaged((prev) => [...prev, entry]);
                setShowAddExercise(false);
              }}
              onCancel={() => setShowAddExercise(false)}
            />
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
      </View>

      <Button size="lg" onPress={handleCreate} loading={loading} className="mt-2">
        {t("routines.createRoutine")}
      </Button>
    </Screen>
  );
}
