import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";

import { useColors } from "@/src/theme/colors";
import { ScrollView, Text, View } from "@/src/tw";
import type { AchievementChip } from "@/src/utils/progress";

const TABULAR = { fontVariant: ["tabular-nums" as const] };

type AchievementChipsProps = {
  chips: AchievementChip[];
};

// Lightweight milestones row — no badge art, no dedicated screen, no table.
// Chips with value 0 are filtered upstream; the whole row hides when empty.
export function AchievementChips({ chips }: AchievementChipsProps) {
  const colors = useColors();
  const { t } = useTranslation();

  if (chips.length === 0) return null;

  const render = (chip: AchievementChip) => {
    switch (chip.kind) {
      case "streak":
        return {
          icon: "flame" as const,
          color: colors.warning,
          label: t("progress.chipRacha", { count: chip.value }),
        };
      case "workouts":
        return {
          icon: "trophy-outline" as const,
          color: colors.brandAccent,
          label: t("progress.chipEntrenos", { count: chip.value }),
        };
      case "tonnage":
        return {
          icon: "barbell-outline" as const,
          color: colors.brandSecondary,
          label: t("progress.chipToneladas", { count: chip.value }),
        };
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2"
    >
      {chips.map((chip) => {
        const { icon, color, label } = render(chip);
        return (
          <View
            key={chip.kind}
            className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5"
          >
            <Ionicons name={icon} size={14} color={color} />
            <Text className="text-xs font-semibold text-content-secondary" style={TABULAR}>
              {label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
