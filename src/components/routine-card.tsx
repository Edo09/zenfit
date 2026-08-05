import { Image } from "expo-image";
import React from "react";
import { useTranslation } from "react-i18next";

import { Card, DisplayText } from "@/src/components/ui";
import { Icon } from "@/src/components/ui/icon";
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

  const canDelete = !readOnly && onDelete != null;

  // The whole card is pressable (navigates), and delete is its own pressable.
  // On web both render as <button>; nesting one inside the other is invalid
  // HTML, so the browser re-parents the inner button and the card jumps
  // sideways on re-render. Keep the delete control OUTSIDE the card as an
  // absolute sibling overlaid top-right; `pr-8` reserves room so text clears it.
  return (
    <View>
      <Card onPress={onPress} className="p-3.5">
        <View className="flex-row items-center gap-3.5">
          <Image
            source={getRoutineImage(routine.name)}
            style={{ width: 68, height: 68, borderRadius: 16 }}
            contentFit="cover"
            transition={200}
          />
          <View className={`flex-1 gap-1 ${canDelete ? "pr-8" : ""}`}>
            <DisplayText size={17} numberOfLines={1}>
              {routine.name}
            </DisplayText>
            {routine.description != null && routine.description.length > 0 && (
              <Text className="text-sm text-content-tertiary" numberOfLines={1}>
                {routine.description}
              </Text>
            )}
            <View className="flex-row items-center gap-2 mt-1">
              {readOnly && (
                <View className="self-start flex-row items-center gap-1 bg-brand-primary rounded-full px-2.5 py-1">
                  <Icon name="award" size={12} color={colors.onAccent} />
                  <Text className="text-xs font-semibold text-on-accent">
                    {t("coach.badge")}
                  </Text>
                </View>
              )}
              {/* Provenance: AI-generated plans get the violet accent badge
                  (rows without the migrated column just show nothing). */}
              {!readOnly && routine.source === "ai" && (
                <View className="self-start flex-row items-center gap-1 bg-brand-accent-soft rounded-full px-2.5 py-1">
                  <Icon name="sparkles" size={12} color={colors.brandAccent} />
                  <Text className="text-xs font-semibold text-brand-accent">
                    {t("routines.aiBadge")}
                  </Text>
                </View>
              )}
              {day != null && (
                <View className="self-start bg-brand-primary-soft rounded-full px-3 py-1">
                  <Text className="text-xs font-semibold text-brand-primary-dark">{day}</Text>
                </View>
              )}
            </View>
          </View>
          <Icon name="chevron-right" size={20} color={colors.contentMuted} />
        </View>
      </Card>
      {canDelete && (
        <Pressable
          onPress={onDelete}
          className="absolute right-2.5 top-2.5 p-2"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("routines.deleteRoutine")}
        >
          <Icon name="trash" size={17} color={colors.contentMuted} />
        </Pressable>
      )}
    </View>
  );
}
