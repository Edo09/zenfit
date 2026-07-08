import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/ui";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import type { Routine } from "@/src/types/database";
import { dayLabel } from "@/src/utils/day-label";
import { getRoutineImage } from "@/src/utils/routine-image";

type Props = {
  routine: Routine;
  onPress: () => void;
  // Coach-assigned routines are read-only: no delete, shown with a "Coach" badge.
  onDelete?: () => void;
  readOnly?: boolean;
};

export function RoutineCard({ routine, onPress, onDelete, readOnly = false }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const day = dayLabel(routine.day_of_week, t);

  return (
    <Card onPress={onPress} className="p-3">
      <View className="flex-row items-start justify-between gap-3">
        <Image
          source={getRoutineImage(routine.name)}
          style={{ width: 72, height: 72, borderRadius: 12 }}
          contentFit="cover"
          transition={200}
        />
        <View className="flex-1 gap-1 py-0.5">
          <Text className="text-base font-semibold text-content-primary">{routine.name}</Text>
          {routine.description != null && routine.description.length > 0 && (
            <Text className="text-sm text-content-tertiary" numberOfLines={2}>
              {routine.description}
            </Text>
          )}
          <View className="flex-row items-center gap-2 mt-1">
            {readOnly && (
              <View className="self-start flex-row items-center gap-1 bg-brand-primary rounded-full px-2.5 py-1">
                <Ionicons name="ribbon-outline" size={12} color={colors.white} />
                <Text className="text-xs font-semibold text-white">{t("coach.badge")}</Text>
              </View>
            )}
            {day != null && (
              <View className="self-start bg-info-soft rounded-full px-3 py-1">
                <Text className="text-xs font-medium text-brand-primary">{day}</Text>
              </View>
            )}
          </View>
        </View>
        {!readOnly && onDelete != null && (
          <Pressable
            onPress={onDelete}
            className="p-2"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("routines.deleteRoutine")}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        )}
      </View>
    </Card>
  );
}
