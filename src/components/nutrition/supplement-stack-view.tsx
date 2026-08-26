import React from "react";
import { useTranslation } from "react-i18next";

import { CapsLabel, Card, DisplayText } from "@/src/components/ui";
import { Icon } from "@/src/components/ui/icon";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type {
  SupplementPlanItem,
  SupplementPlanWithDetails,
  SupplementTier,
} from "@/src/types/database";
import {
  supplementSchedule,
  visibleSupplements,
  type ResolvedDay,
} from "@/src/utils/nutrition-plan";

const TIERS: SupplementTier[] = ["base", "conditional", "optional"];

export function SupplementStackView({
  plan,
  day,
  cycling,
}: {
  plan: SupplementPlanWithDetails;
  day: ResolvedDay;
  /** Only filter by day type when the nutrition plan actually cycles. */
  cycling: boolean;
}) {
  const { t } = useTranslation();
  const colors = useColors();

  const items = cycling
    ? visibleSupplements(plan.supplement_plan_items, day)
    : plan.supplement_plan_items;
  // The "horario" table is derived, never stored — group by when it's taken.
  const schedule = supplementSchedule(items);

  return (
    <View className="gap-3">
      <Card className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-2xl bg-brand-primary-soft">
          <Icon name="pill" size={17} color={colors.brandPrimaryDark} />
        </View>
        <DisplayText size={17} className="flex-1" numberOfLines={2}>
          {plan.name}
        </DisplayText>
        <View className="flex-row items-center gap-1.5 rounded-full bg-brand-primary px-2.5 py-1">
          <Icon name="award" size={12} color={colors.onAccent} />
          <Text className="text-xs font-semibold text-on-accent">{t("coach.badge")}</Text>
        </View>
      </Card>

      {TIERS.map((tier) => {
        const rows = items.filter((i) => i.tier === tier);
        if (rows.length === 0) return null;
        return (
          <Card key={tier} className="gap-2">
            <View className="flex-row items-baseline gap-2">
              <CapsLabel size={9.5} className="text-content-muted">
                {t(`supplements.tier${cap(tier)}` as "supplements.tierBase")}
              </CapsLabel>
              <Text className="text-xs text-content-tertiary">
                {t(`supplements.tier${cap(tier)}Hint` as "supplements.tierBaseHint")}
              </Text>
            </View>
            {rows.map((item) => (
              <SupplementRow key={item.id} item={item} />
            ))}
          </Card>
        );
      })}

      {schedule.length > 0 && (
        <Card className="gap-2">
          <CapsLabel size={9.5} className="text-content-muted">
            {t("supplements.scheduleTitle")}
          </CapsLabel>
          {schedule.map((group) => (
            <View key={group.slot} className="flex-row gap-2">
              <Text className="w-[104px] text-xs font-semibold text-content-secondary">
                {t(`supplements.timing_${group.slot}` as "supplements.timing_any")}
              </Text>
              <Text className="flex-1 text-xs text-content-tertiary">
                {group.items.map((i) => i.name).join(" + ")}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {plan.notes != null && (
        <Card>
          <Text className="text-sm text-content-secondary">{plan.notes}</Text>
        </Card>
      )}
    </View>
  );
}

function SupplementRow({ item }: { item: SupplementPlanItem }) {
  const { t } = useTranslation();
  return (
    <View className="rounded-2xl bg-surface-sunken p-3 gap-0.5">
      <Text className="text-sm font-semibold text-content-primary">{item.name}</Text>
      {item.dose != null && (
        <Text className="text-sm text-content-secondary">{item.dose}</Text>
      )}
      {(item.timing_note ?? item.timing_slot !== "any") && (
        <Text className="text-xs text-content-tertiary">
          {item.timing_note ??
            t(`supplements.timing_${item.timing_slot}` as "supplements.timing_any")}
        </Text>
      )}
      {item.purpose != null && (
        <Text className="text-xs text-content-tertiary">{item.purpose}</Text>
      )}
      {item.notes != null && (
        <Text className="text-xs italic text-content-tertiary">{item.notes}</Text>
      )}
    </View>
  );
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
