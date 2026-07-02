import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Chip, Input, Screen, useToast } from "@/src/components/ui";
import { useRoutines } from "@/src/hooks/use-routines";
import { Text, View } from "@/src/tw";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function CreateRoutineScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { createRoutine } = useRoutines();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      setNameError(t("routines.routineNameRequired"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    try {
      setLoading(true);
      await createRoutine({
        name: name.trim(),
        description: description.trim() || undefined,
        day_of_week: dayOfWeek ?? undefined,
      });
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
      </View>

      <Button size="lg" onPress={handleCreate} loading={loading} className="mt-2">
        {t("routines.createRoutine")}
      </Button>
    </Screen>
  );
}
