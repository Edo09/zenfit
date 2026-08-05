import React from "react";
import { useTranslation } from "react-i18next";

import { CapsLabel, Card, DisplayText } from "@/src/components/ui";
import { kgToUnit, kgToUnit1, useWeightUnit } from "@/src/lib/weight-unit";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type { PersonalRecord } from "@/src/utils/progress";
import { Icon } from "@/src/components/ui/icon";

const TABULAR = { fontVariant: ["tabular-nums" as const] };
const BAR_AREA_HEIGHT = 72;

type StrengthCardProps = {
  weekVolume: number;
  series: number[];
  deltaPct: number | null;
  /** Best logged lifts (Phase 4). Empty when nothing logged. */
  prs?: PersonalRecord[];
  /** true = volume is plan-estimated; false = measured from logged sets. */
  estimated?: boolean;
};

// Progressive overload made visible. P0 volume is ESTIMATED from the routine
// plan (sets×reps×weight over completed exercises) — the caption says so and
// goes away when P2 ships real per-set logging. The PR block renders its
// pending state until workout_log_sets exists (migration B).
export function StrengthCard({
  weekVolume,
  series,
  deltaPct,
  prs = [],
  estimated = true,
}: StrengthCardProps) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "es" ? "es-ES" : "en-US";
  const unit = useWeightUnit();

  const max = Math.max(...series, 1);
  const w1 = (kg: number) =>
    kgToUnit1(kg, unit).toLocaleString(locale, { maximumFractionDigits: 1 });

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <DisplayText size={17}>{t("progress.fuerzaVolumen")}</DisplayText>
        <Text className="text-[11px] text-content-muted">
          {t("progress.ochoSemanas")}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-baseline gap-1.5">
          <DisplayText size={24} weight="extrabold" tabular>
            {Math.round(kgToUnit(weekVolume, unit)).toLocaleString(locale)}
          </DisplayText>
          <Text className="text-[13px] text-content-tertiary">
            {t("progress.kgEstaSemana", { unit })}
          </Text>
        </View>
        {deltaPct != null && (
          <View className="flex-row items-center gap-1">
            <Icon
              name={deltaPct >= 0 ? "trending-up" : "trending-down"}
              size={12}
              color={deltaPct >= 0 ? colors.success : colors.contentTertiary}
            />
            <Text
              className={
                deltaPct >= 0
                  ? "text-xs font-semibold text-success"
                  : "text-xs font-semibold text-content-tertiary"
              }
              style={TABULAR}
            >
              {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
            </Text>
          </View>
        )}
      </View>

      {/* History bars sit on the sunken surface; the current week is cyan. */}
      <View className="flex-row items-end gap-2" style={{ height: BAR_AREA_HEIGHT }}>
        {series.map((value, i) => (
          <View
            key={i}
            className={
              i === series.length - 1
                ? "flex-1 rounded-full bg-brand-primary"
                : "flex-1 rounded-full bg-surface-elevated"
            }
            style={{ height: Math.max(6, (value / max) * BAR_AREA_HEIGHT) }}
          />
        ))}
      </View>
      {estimated && (
        <Text className="text-[10px] text-content-muted">
          {t("progress.estimadoPlan")}
        </Text>
      )}

      <View className="gap-2 border-t border-border pt-3">
        <CapsLabel size={10}>{t("progress.records")}</CapsLabel>
        {prs.length === 0 ? (
          <Text className="text-xs text-content-muted">
            {t("progress.emptyRecords")}
          </Text>
        ) : (
          prs.map((pr) => (
            <View key={pr.name} className="flex-row items-center gap-2">
              <Icon name="trophy" size={13} color={colors.brandAccent} />
              <Text className="flex-1 text-[13px] text-content-secondary" numberOfLines={1}>
                {pr.name}
              </Text>
              <Text className="text-[13px] font-semibold text-content-primary" style={TABULAR}>
                {t("progress.prWeight", { weight: w1(pr.weightKg), unit, reps: pr.reps })}
              </Text>
              <Text className="text-[11px] text-content-tertiary" style={TABULAR}>
                {t("progress.prE1rm", { value: w1(pr.e1rm), unit })}
              </Text>
            </View>
          ))
        )}
      </View>
    </Card>
  );
}
