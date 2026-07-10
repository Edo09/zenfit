import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/ui";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";

const TABULAR = { fontVariant: ["tabular-nums" as const] };
const BAR_AREA_HEIGHT = 72;

type StrengthCardProps = {
  weekVolume: number;
  series: number[];
  deltaPct: number | null;
};

// Progressive overload made visible. P0 volume is ESTIMATED from the routine
// plan (sets×reps×weight over completed exercises) — the caption says so and
// goes away when P2 ships real per-set logging. The PR block renders its
// pending state until workout_log_sets exists (migration B).
export function StrengthCard({ weekVolume, series, deltaPct }: StrengthCardProps) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "es" ? "es-ES" : "en-US";

  const max = Math.max(...series, 1);

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-content-primary">
          {t("progress.fuerzaVolumen")}
        </Text>
        <Text className="text-[11px] text-content-muted">
          {t("progress.ochoSemanas")}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-baseline gap-1.5">
          <Text className="text-[22px] font-extrabold text-content-primary" style={TABULAR}>
            {weekVolume.toLocaleString(locale)}
          </Text>
          <Text className="text-[13px] text-content-tertiary">
            {t("progress.kgEstaSemana")}
          </Text>
        </View>
        {deltaPct != null && (
          <View className="flex-row items-center gap-1">
            <Ionicons
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

      <View className="flex-row items-end gap-2" style={{ height: BAR_AREA_HEIGHT }}>
        {series.map((value, i) => (
          <View
            key={i}
            className={
              i === series.length - 1
                ? "flex-1 rounded-t-[5px] rounded-b-sm bg-brand-secondary"
                : "flex-1 rounded-t-[5px] rounded-b-sm bg-brand-secondary opacity-50"
            }
            style={{ height: Math.max(3, (value / max) * BAR_AREA_HEIGHT) }}
          />
        ))}
      </View>
      <Text className="text-[10px] text-content-muted">
        {t("progress.estimadoPlan")}
      </Text>

      <View className="gap-2 border-t border-border pt-3">
        <Text
          className="text-xs font-semibold uppercase text-content-tertiary"
          style={{ letterSpacing: 0.4 }}
        >
          {t("progress.records")}
        </Text>
        <Text className="text-xs text-content-muted">
          {t("progress.emptyRecords")}
        </Text>
      </View>
    </Card>
  );
}
