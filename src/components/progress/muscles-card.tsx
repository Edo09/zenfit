import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/ui";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type { MuscleAlert, MuscleRow, Periodo } from "@/src/utils/progress";

const TABULAR = { fontVariant: ["tabular-nums" as const] };

type MusclesCardProps = {
  periodo: Periodo;
  rows: MuscleRow[];
  alert: MuscleAlert | null;
};

// Diagnosis card: raw logs → "what am I neglecting". Amber marks a group
// under 25% of the leader; the "other" bucket is informational and never
// flagged. No LLM anywhere.
export function MusclesCard({ periodo, rows, alert }: MusclesCardProps) {
  const colors = useColors();
  const { t } = useTranslation();

  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => r.sets), 1);
  const groupName = (group: string) => t(`progress.musculo_${group}`);

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-content-primary">
          {t("progress.gruposMusculares")}
        </Text>
        <Text className="text-[11px] text-content-muted">
          {periodo === "week" ? t("progress.ultimos14") : t("progress.ultimos30")}
        </Text>
      </View>

      <View className="gap-2.5">
        {rows.map((row) => {
          const weak = row.group !== "other" && row.sets < 0.25 * max;
          return (
            <View key={row.group} className="flex-row items-center gap-2">
              <Text className="w-[66px] text-xs font-medium text-content-secondary">
                {groupName(row.group)}
              </Text>
              <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-dark">
                <View
                  className={weak ? "h-full rounded-full bg-warning" : "h-full rounded-full bg-brand-secondary"}
                  style={{ width: `${Math.max(4, (row.sets / max) * 100)}%` }}
                />
              </View>
              <Text
                className="w-14 text-right text-[11px] text-content-tertiary"
                style={TABULAR}
              >
                {t("progress.setsCount", { count: row.sets })}
              </Text>
            </View>
          );
        })}
      </View>

      {alert != null && (
        <View className="flex-row items-start gap-2 rounded-xl bg-warning-soft px-3 py-2.5">
          <Ionicons name="pulse-outline" size={15} color={colors.warning} />
          <Text className="flex-1 text-xs leading-4 text-warning">
            {alert.kind === "recency" ? (
              <>
                <Text className="text-xs font-bold text-warning">
                  {groupName(alert.group)}
                </Text>
                {alert.routineDayKey != null
                  ? t("progress.sinEstimuloSugerencia", {
                      count: alert.days,
                      dia: t(`daysLong.${alert.routineDayKey}`).toLowerCase(),
                    })
                  : t("progress.sinEstimulo", { count: alert.days })}
              </>
            ) : (
              <>
                <Text className="text-xs font-bold text-warning">
                  {groupName(alert.group)}
                </Text>
                {t("progress.desbalance")}
              </>
            )}
          </Text>
        </View>
      )}
    </Card>
  );
}
