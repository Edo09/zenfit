import { Pressable, Text, View } from "@/src/tw";
import type { Routine } from "@/src/types/database";
import React from "react";
import { Alert } from "react-native";

type Props = {
  routine: Routine;
  onPress: () => void;
  onDelete: () => void;
};

export function RoutineCard({ routine, onPress, onDelete }: Props) {
  const handleDelete = () => {
    Alert.alert(
      "Delete Routine",
      `Delete "${routine.name}"? All exercises in this routine will also be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-gray-900">
            {routine.name}
          </Text>
          {routine.description != null && routine.description.length > 0 && (
            <Text className="text-sm text-gray-500" numberOfLines={2}>
              {routine.description}
            </Text>
          )}
          {routine.day_of_week != null && (
            <View className="self-start bg-green-50 rounded-full px-3 py-1 mt-1">
              <Text className="text-xs font-medium text-green-700 capitalize">
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
