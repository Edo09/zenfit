import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Card,
  Input,
  SearchableSelectField,
  useToast,
} from "@/src/components/ui";
import { useExercises } from "@/src/hooks/use-exercises";
import { unitToKg, useWeightUnit } from "@/src/lib/weight-unit";
import { Text, View } from "@/src/tw";
import type { Exercise } from "@/src/types/database";
import { muscleGroupForBodyPart } from "@/src/utils/progress";

/** A picked exercise with its plan numbers; weight already converted to kg. */
export type NewRoutineExercise = {
  exercise: Exercise;
  sets: number;
  reps: number;
  weight_kg?: number;
};

type AddExerciseFormProps = {
  /**
   * Receives the validated entry. May persist (routine detail) or stage
   * locally (create screen). Throw/reject to keep the form open with its
   * values — the form shows the generic error toast.
   */
  onAdd: (entry: NewRoutineExercise) => void | Promise<void>;
  onCancel: () => void;
};

/** Inline "add exercise" card: catalog picker + sets/reps/weight. */
export function AddExerciseForm({ onAdd, onCancel }: AddExerciseFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const weightUnit = useWeightUnit();
  const { exercises } = useExercises();

  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [exerciseError, setExerciseError] = useState<string | undefined>();
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  // Name as the row label, localized muscle group as the sublabel (the raw
  // bodyparts table is English — "upper legs" etc.).
  const exerciseOptions = useMemo(
    () =>
      exercises.map((e) => ({
        label: e.name,
        sublabel: e.body_part?.name
          ? t(`progress.musculo_${muscleGroupForBodyPart(e.body_part.name)}`)
          : undefined,
        value: e.id,
      })),
    [exercises, t],
  );

  const handleAdd = async () => {
    const selected = exercises.find((e) => e.id === exerciseId);
    if (!selected) {
      setExerciseError(t("common.fieldRequired"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    try {
      setSaving(true);
      await onAdd({
        exercise: selected,
        sets: parseInt(sets, 10) || 3,
        reps: parseInt(reps, 10) || 10,
        // Typed in the display unit; stored in kg.
        weight_kg: weight
          ? Math.round(unitToKg(parseFloat(weight), weightUnit) * 10) / 10
          : undefined,
      });
      setExerciseId(null);
      setSets("3");
      setReps("10");
      setWeight("");
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="gap-3">
      <Text className="font-semibold text-content-primary">
        {t("routines.addExercise")}
      </Text>
      <SearchableSelectField
        placeholder={t("routines.pickExercise")}
        title={t("routines.pickExercise")}
        searchPlaceholder={t("routines.searchExercise")}
        emptyText={t("routines.noExerciseResults")}
        value={exerciseId}
        options={exerciseOptions}
        onChange={(value) => {
          setExerciseId(value);
          if (exerciseError != null) setExerciseError(undefined);
        }}
        helper={
          exerciseError ??
          (exercises.length === 0 ? t("routines.noExercisesInCatalog") : undefined)
        }
      />
      <View className="flex-row gap-2">
        <Input
          label={t("routines.sets")}
          keyboardType="number-pad"
          value={sets}
          onChangeText={setSets}
          containerClassName="flex-1"
          textAlign="center"
          className="bg-brand-dark"
        />
        <Input
          label={t("routines.reps")}
          keyboardType="number-pad"
          value={reps}
          onChangeText={setReps}
          containerClassName="flex-1"
          textAlign="center"
          className="bg-brand-dark"
        />
        <Input
          label={t("routines.weightOpt", { unit: weightUnit })}
          keyboardType="decimal-pad"
          placeholder="—"
          value={weight}
          onChangeText={setWeight}
          containerClassName="flex-1"
          textAlign="center"
          className="bg-brand-dark"
        />
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button variant="secondary" onPress={onCancel} className="w-full">
            {t("common.cancel")}
          </Button>
        </View>
        <View className="flex-1">
          <Button onPress={handleAdd} loading={saving} className="w-full">
            {t("common.add")}
          </Button>
        </View>
      </View>
    </Card>
  );
}
