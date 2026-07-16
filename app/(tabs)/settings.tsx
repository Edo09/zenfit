import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";

import { CoachSection } from "@/src/components/coach-section";
import { Card, Screen } from "@/src/components/ui";
import { setLanguage } from "@/src/i18n";
import { setWeightUnit, useWeightUnit } from "@/src/lib/weight-unit";
import { useColors } from "@/src/theme/colors";
import { setThemeMode } from "@/src/theme/theme-mode";
import { useThemeScheme } from "@/src/theme/theme-store";
import { Pressable, Text, View } from "@/src/tw";

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
};

// Tappable preference row: label left, current value + chevron right.
// Tapping cycles the setting (all three prefs are binary toggles today).
function SettingsRow({ icon, label, value, onPress, last = false }: RowProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      className={`flex-row items-center gap-3 py-3.5 ${last ? "" : "border-b border-border"}`}
    >
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-brand-dark">
        <Ionicons name={icon} size={16} color={colors.contentSecondary} />
      </View>
      <Text className="flex-1 text-[15px] font-medium text-content-primary">{label}</Text>
      <Text className="text-sm text-content-tertiary">{value}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.contentMuted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const scheme = useThemeScheme();
  const isDark = scheme === "dark";
  const weightUnit = useWeightUnit();

  return (
    <Screen contentContainerClassName="gap-4">
      <Card className="py-0">
        <SettingsRow
          icon={isDark ? "moon-outline" : "sunny-outline"}
          label={t("settings.theme")}
          value={t(isDark ? "home.dark" : "home.light")}
          onPress={() => void setThemeMode(isDark ? "light" : "dark")}
        />
        <SettingsRow
          icon="language-outline"
          label={t("settings.language")}
          value={i18n.language === "es" ? t("common.spanish") : t("common.english")}
          onPress={() => setLanguage(i18n.language === "en" ? "es" : "en")}
        />
        <SettingsRow
          icon="scale-outline"
          label={t("settings.weightUnit")}
          value={t(weightUnit === "kg" ? "settings.unitKgLabel" : "settings.unitLbLabel")}
          onPress={() => void setWeightUnit(weightUnit === "kg" ? "lb" : "kg")}
          last
        />
      </Card>

      {/* Coach + membership (moved from Profile — read-only, coach manages on web) */}
      <CoachSection />
    </Screen>
  );
}
