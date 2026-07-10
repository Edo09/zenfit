import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/ui";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type { Insight } from "@/src/utils/progress";

type InsightCardProps = {
  insight: Insight;
};

type Action = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: "info" | "success";
  label: string;
};

// P0: deterministic rule-based synthesis (utils/progress.ts ruleInsights).
// P3 swaps the body for the cached ai_insights.summary — the layout stays.
// Only card with a tinted (gold) border, marking the AI/insight accent.
export function InsightCard({ insight }: InsightCardProps) {
  const colors = useColors();
  const { t } = useTranslation();

  const groupName = (group: string) => t(`progress.musculo_${group}`);

  let body: string;
  let actions: Action[];
  switch (insight.kind) {
    case "muscle":
      body = t("progress.insightMusculo", {
        grupo: groupName(insight.group),
        count: insight.days,
      });
      actions = [
        {
          icon: "barbell-outline",
          color: "info",
          label: t("progress.accionEntrenar", { grupo: groupName(insight.group) }),
        },
      ];
      break;
    case "protein":
      body = t("progress.insightProteina", {
        actual: insight.avg,
        objetivo: insight.target,
      });
      actions = [
        { icon: "nutrition-outline", color: "success", label: t("progress.accionProteina") },
      ];
      break;
    case "adherence":
      body = t("progress.insightAdherencia", {
        done: insight.done,
        plan: insight.plan,
      });
      actions = [
        { icon: "barbell-outline", color: "info", label: t("progress.accionRegistrar") },
      ];
      break;
    case "encourage":
      body = t("progress.insightAnimo");
      actions = [
        { icon: "barbell-outline", color: "info", label: t("progress.accionRutina") },
      ];
      break;
  }

  return (
    <Card className="gap-3 border-brand-accent-soft">
      <View className="flex-row items-center gap-2.5">
        <View className="h-7 w-7 items-center justify-center rounded-lg bg-brand-accent-soft">
          <Ionicons name="sparkles" size={15} color={colors.brandAccent} />
        </View>
        <Text className="flex-1 text-[15px] font-bold text-content-primary">
          {t("progress.analisisSemana")}
        </Text>
        <Text
          className="text-[10px] font-semibold text-brand-accent"
          style={{ letterSpacing: 0.4 }}
        >
          IA
        </Text>
      </View>

      <Text className="text-[13px] leading-5 text-content-secondary">{body}</Text>

      <View className="flex-row flex-wrap gap-2">
        {actions.map((action) => (
          <View
            key={action.label}
            className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5"
          >
            <Ionicons
              name={action.icon}
              size={13}
              color={action.color === "info" ? colors.brandSecondary : colors.success}
            />
            <Text className="text-xs font-medium text-content-secondary">
              {action.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
