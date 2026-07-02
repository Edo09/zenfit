import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/ui";
import { colors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import type { Routine } from "@/src/types/database";

type Props = {
  routine: Routine;
  onPress: () => void;
  onDelete: () => void;
};

export function RoutineCard({ routine, onPress, onDelete }: Props) {
  const { t } = useTranslation();

  return (
    <Card onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-content-primary">{routine.name}</Text>
          {routine.description != null && routine.description.length > 0 && (
            <Text className="text-sm text-content-tertiary" numberOfLines={2}>
              {routine.description}
            </Text>
          )}
          {routine.day_of_week != null && (
            <View className="self-start bg-info-soft rounded-full px-3 py-1 mt-1">
              <Text className="text-xs font-medium text-brand-primary capitalize">
                {routine.day_of_week}
              </Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={onDelete}
          className="p-2 ml-2"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("routines.deleteRoutine")}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </Pressable>
      </View>
    </Card>
  );
}
