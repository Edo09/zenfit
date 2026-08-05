import React from "react";
import { useTranslation } from "react-i18next";

import { Card, DisplayText } from "@/src/components/ui";
import type { AIInsight } from "@/src/services/ai-insight";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type { Insight } from "@/src/utils/progress";
import { Icon, type IconName } from "@/src/components/ui/icon";

type InsightCardProps = {
  /** Rule-based fallback (instant/offline); may be null when only AI has content. */
  insight: Insight | null;
  /** LLM-written weekly analysis — wins over the rule-based body when present. */
  ai?: AIInsight | null;
};

type Action = {
  icon: IconName;
  color: "info" | "success";
  label: string;
};

// Body priority: AI summary (use-progress-dashboard `aiInsight`, cached per
// week+language) → rule-based synthesis (utils/progress.ts ruleInsights).
// Only card with a tinted (gold) border, marking the AI/insight accent.
export function InsightCard({ insight, ai }: InsightCardProps) {
  const colors = useColors();
  const { t } = useTranslation();

  const groupName = (group: string) => t(`progress.musculo_${group}`);

  let body: string;
  let actions: Action[];
  if (ai != null) {
    body = ai.summary;
    actions = ai.actions.map((action) => ({
      icon:
        action.type === "nutrition"
          ? ("salad" as const)
          : ("dumbbell" as const),
      color: action.type === "nutrition" ? ("success" as const) : ("info" as const),
      label: action.label,
    }));
  } else if (insight == null) {
    return null;
  } else {
    switch (insight.kind) {
    case "muscle":
      body = t("progress.insightMusculo", {
        grupo: groupName(insight.group),
        count: insight.days,
      });
      actions = [
        {
          icon: "dumbbell",
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
        { icon: "salad", color: "success", label: t("progress.accionProteina") },
      ];
      break;
    case "adherence":
      body = t("progress.insightAdherencia", {
        done: insight.done,
        plan: insight.plan,
      });
      actions = [
        { icon: "dumbbell", color: "info", label: t("progress.accionRegistrar") },
      ];
      break;
    case "encourage":
      body = t("progress.insightAnimo");
      actions = [
        { icon: "dumbbell", color: "info", label: t("progress.accionRutina") },
      ];
      break;
    }
  }

  return (
    <Card className="gap-3 border-brand-accent-soft">
      <View className="flex-row items-center gap-2.5">
        <View className="h-7 w-7 items-center justify-center rounded-lg bg-brand-accent-soft">
          <Icon name="sparkles" size={15} color={colors.brandAccent} />
        </View>
        <DisplayText size={17} className="flex-1">{t("progress.analisisSemana")}</DisplayText>
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
            <Icon
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
