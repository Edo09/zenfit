import { Image } from "expo-image";
import React from "react";
import { useTranslation } from "react-i18next";

import { Card, DisplayText } from "@/src/components/ui";
import { Icon, type IconName } from "@/src/components/ui/icon";
import { enter, exit } from "@/src/lib/motion";
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

const SLOT_ICON: Record<MealType, IconName> = {
  breakfast: "coffee",
  lunch: "utensils",
  dinner: "moon",
  snack: "salad",
};

/**
 * One meal card: slot header with kcal total, the slot's food rows (flattened
 * across that day's container meals), and a dashed camera "Add food" row.
 */
export function DiarySlot({ slot, entries, onAdd, onEdit, onRemove }: Props) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const slotLabel = t(`meals.${slot}`, { defaultValue: slot });
  const kcal = entries.reduce((sum, e) => sum + e.item.calories, 0);
  const kcalFmt = Math.round(kcal).toLocaleString(
    i18n.language === "es" ? "es-ES" : "en-US",
  );

  return (
    <Card className="gap-3 p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-surface-elevated">
          <Icon name={SLOT_ICON[slot]} size={18} color={colors.contentSecondary} />
        </View>
        <DisplayText size={17} className="flex-1 capitalize">
          {slotLabel}
        </DisplayText>
        {entries.length > 0 && (
          <View className="flex-row items-baseline gap-1">
            <DisplayText size={17} tabular>
              {kcalFmt}
            </DisplayText>
            <Text className="text-2xs text-content-muted">{t("meals.kcal")}</Text>
          </View>
        )}
      </View>

      {entries.map((entry) => (
        <AnimatedView key={entry.item.id} entering={enter()} exiting={exit()}>
          {/* Tapping the row opens the item editor (assigned items are read-only).
              Delete is an absolute sibling, NOT nested in the row's pressable —
              a nested <button> on web re-parents and shifts the row out of place. */}
          <View>
            <Pressable
              onPress={entry.assigned ? undefined : () => onEdit(entry)}
              accessibilityRole={entry.assigned ? undefined : "button"}
              className="flex-row items-center gap-3 rounded-2xl bg-surface-sunken px-3.5 py-3"
            >
              {entry.item.photo_path != null && (
                <Image
                  source={{ uri: mealPhotoUrl(entry.item.photo_path) }}
                  style={{ width: 48, height: 48, borderRadius: 14 }}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="disk"
                />
              )}
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="font-semibold text-content-primary flex-shrink" numberOfLines={1}>
                    {entry.item.name}
                  </Text>
                  {entry.assigned && (
                    <View className="flex-row items-center gap-1 bg-brand-primary rounded-full px-2 py-0.5">
                      <Icon name="award" size={10} color={colors.onAccent} />
                      <Text className="text-2xs font-semibold text-on-accent">
                        {t("coach.badge")}
                      </Text>
                    </View>
                  )}
                </View>
                {entry.item.portion != null && entry.item.portion !== "" && (
                  <Text className="text-content-tertiary text-xs">{entry.item.portion}</Text>
                )}
                <View className="flex-row items-center flex-wrap gap-x-3">
                  <MacroTag
                    label={t("meals.proteinName")}
                    grams={entry.item.protein_g}
                    color={colors.macroProtein}
                  />
                  <MacroTag
                    label={t("meals.carbsName")}
                    grams={entry.item.carbs_g}
                    color={colors.macroCarbs}
                  />
                  <MacroTag
                    label={t("meals.fatName")}
                    grams={entry.item.fat_g}
                    color={colors.macroFat}
                  />
                </View>
              </View>
              <View className={`items-end ${!entry.assigned ? "pr-5" : ""}`}>
                <DisplayText size={18} tabular>
                  {entry.item.calories}
                </DisplayText>
                <Text className="text-2xs text-content-muted">{t("meals.kcal")}</Text>
              </View>
            </Pressable>
            {!entry.assigned && (
              <Pressable
                onPress={() => onRemove(entry)}
                className="absolute right-0.5 top-0 bottom-0 justify-center px-2"
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("meals.removeFoodItem")}
              >
                <Icon name="trash" size={16} color={colors.contentMuted} />
              </Pressable>
            )}
          </View>
        </AnimatedView>
      ))}

      {/* Dashed camera affordance — also the empty state for the slot */}
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={t("meals.addToSlot", { slot: slotLabel })}
        className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong py-3"
      >
        <Icon name="camera" size={16} color={colors.brandPrimaryDark} />
        <Text className="text-sm font-bold text-brand-primary-dark">
          {entries.length === 0 ? t("meals.emptySlotHint") : t("meals.addFood")}
        </Text>
      </Pressable>
    </Card>
  );
}

function MacroTag({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <Text
      className="text-xs font-semibold"
      style={{ color, fontVariant: ["tabular-nums"] }}
    >
      {label} {grams}g
    </Text>
  );
}
