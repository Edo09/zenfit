import { Pressable, Text, View } from "@/src/tw";
import type { Routine } from "@/src/types/database";
import React from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

type Props = {
  routine: Routine;
  onPress: () => void;
  onDelete: () => void;
};

export function RoutineCard({ routine, onPress, onDelete }: Props) {
  const { t } = useTranslation();
  const handleDelete = () => {
    Alert.alert(
      t("routines.deleteRoutine"),
      t("routines.deleteConfirm", { name: routine.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface rounded-2xl p-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-white">
            {routine.name}
          </Text>
          {routine.description != null && routine.description.length > 0 && (
            <Text className="text-sm text-gray-500" numberOfLines={2}>
              {routine.description}
            </Text>
          )}
          {routine.day_of_week != null && (
            <View className="self-start bg-brand-primary/10 rounded-full px-3 py-1 mt-1">
              <Text className="text-xs font-medium text-brand-primary capitalize">
                {routine.day_of_week}
              </Text>
            </View>
          )}
        </View>
        <Pressable onPress={handleDelete} className="p-2 ml-2" hitSlop={8}>
          <Text className="text-red-400 text-base">✕</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
