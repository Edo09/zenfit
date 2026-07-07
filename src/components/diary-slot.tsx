import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/ui";
import { enter, exit, PressableScale } from "@/src/lib/motion";
import { mealPhotoUrl } from "@/src/services/meal-photos";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { MealItem, MealType } from "@/src/types/database";

// `assigned` marks items that belong to a coach-assigned meal — read-only.
export type DiaryEntry = { item: MealItem; mealId: string; assigned?: boolean };

type Props = {
  slot: MealType;
  entries: DiaryEntry[];
  onAdd: () => void;
  onEdit: (entry: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
};

const SLOT_ICON: Record<MealType, React.ComponentProps<typeof Ionicons>["name"]> = {
  breakfast: "cafe-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "nutrition-outline",
};

// One fixed diary section: slot header with kcal total + add button, then the
// slot's food items (flattened across that day's container meals).
export function DiarySlot({ slot, entries, onAdd, onEdit, onRemove }: Props) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const slotLabel = t(`meals.${slot}`, { defaultValue: slot });
  const kcal = entries.reduce((sum, e) => sum + e.item.calories, 0);
  const kcalFmt = Math.round(kcal).toLocaleString(
    i18n.language === "es" ? "es-ES" : "en-US",
  );

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name={SLOT_ICON[slot]} size={16} color={colors.contentTertiary} />
          <Text className="text-base font-semibold text-content-primary capitalize">
            {slotLabel}
          </Text>
          {entries.length > 0 && (
            <Text
              className="text-sm text-content-tertiary"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {kcalFmt} {t("meals.kcal")}
            </Text>
          )}
        </View>
        <PressableScale
          onPress={onAdd}
          haptic
          accessibilityRole="button"
          accessibilityLabel={t("meals.addToSlot", { slot: slotLabel })}
          className="h-8 w-8 items-center justify-center rounded-full bg-info-soft"
        >
          <Ionicons name="add" size={20} color={colors.brandPrimary} />
        </PressableScale>
      </View>

      {entries.length === 0 ? (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          className="border-2 border-dashed border-border-strong rounded-2xl py-4 items-center"
        >
          <Text className="text-content-muted text-sm">{t("meals.emptySlotHint")}</Text>
        </Pressable>
      ) : (
        <View className="gap-2">
          {entries.map((entry) => (
            <AnimatedView key={entry.item.id} entering={enter()} exiting={exit()}>
              {/* Tapping the row opens the item editor (assigned items are read-only) */}
              <Card
                onPress={entry.assigned ? undefined : () => onEdit(entry)}
                className="px-4 py-3 flex-row items-center justify-between"
              >
                {entry.item.photo_path != null && (
                  <Image
                    source={{ uri: mealPhotoUrl(entry.item.photo_path) }}
                    style={{ width: 52, height: 52, borderRadius: 12, marginRight: 12 }}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="disk"
                  />
                )}
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-semibold text-content-primary">
                      {entry.item.name}
                    </Text>
                    {entry.assigned && (
                      <View className="flex-row items-center gap-1 bg-brand-primary rounded-full px-2 py-0.5">
                        <Ionicons name="ribbon-outline" size={10} color={colors.white} />
                        <Text className="text-[10px] font-semibold text-white">
                          {t("coach.badge")}
                        </Text>
                      </View>
                    )}
                  </View>
                  {entry.item.portion != null && entry.item.portion !== "" && (
                    <Text className="text-content-tertiary text-xs">
                      {entry.item.portion}
                    </Text>
                  )}
                  <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1">
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: colors.macroProtein, fontVariant: ["tabular-nums"] }}
                    >
                      {t("meals.proteinName")} {entry.item.protein_g}g
                    </Text>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: colors.macroCarbs, fontVariant: ["tabular-nums"] }}
                    >
                      {t("meals.carbsName")} {entry.item.carbs_g}g
                    </Text>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: colors.macroFat, fontVariant: ["tabular-nums"] }}
                    >
                      {t("meals.fatName")} {entry.item.fat_g}g
                    </Text>
                  </View>
                </View>
                <View className="items-end ml-2">
                  <Text
                    className="text-lg font-bold text-content-primary"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {entry.item.calories}
                  </Text>
                  <Text className="text-xs text-content-tertiary">{t("meals.kcal")}</Text>
                </View>
                {!entry.assigned && (
                  <Pressable
                    onPress={() => onRemove(entry)}
                    className="p-2 ml-2"
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t("meals.removeFoodItem")}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                )}
              </Card>
            </AnimatedView>
          ))}
        </View>
      )}
    </View>
  );
}
