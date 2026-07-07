import React from "react";
import { useTranslation } from "react-i18next";

import { Card } from "@/src/components/ui";
import { Text, View } from "@/src/tw";
import type { Membership, MembershipStatus } from "@/src/types/database";

type Props = { membership: Membership | null };

// Soft badge styles per status, using the theme's semantic tokens.
const STATUS_STYLE: Record<MembershipStatus, { bg: string; text: string }> = {
  active: { bg: "bg-success-soft", text: "text-success" },
  expired: { bg: "bg-error-soft", text: "text-error" },
  paused: { bg: "bg-warning-soft", text: "text-warning" },
  cancelled: { bg: "bg-info-soft", text: "text-content-tertiary" },
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function MembershipCard({ membership }: Props) {
  const { t, i18n } = useTranslation();

  if (membership == null) {
    return (
      <Card className="gap-1">
        <Text className="text-sm font-semibold text-content-primary">
          {t("coach.membership")}
        </Text>
        <Text className="text-sm text-content-tertiary">{t("coach.noMembership")}</Text>
      </Card>
    );
  }

  const style = STATUS_STYLE[membership.status];
  const locale = i18n.language === "es" ? "es-ES" : "en-US";
  const fmtDate = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  let expiryLine: string | null = null;
  let warn = false;
  if (membership.expires_at != null) {
    const dLeft = daysUntil(membership.expires_at);
    if (membership.status === "expired" || dLeft < 0) {
      expiryLine = t("coach.expiredOn", { date: fmtDate(membership.expires_at) });
      warn = true;
    } else if (dLeft <= 7) {
      expiryLine = t("coach.expiresInDays", { count: dLeft });
      warn = true;
    } else {
      expiryLine = t("coach.expiresOn", { date: fmtDate(membership.expires_at) });
    }
  }

  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-content-primary">
          {t("coach.membership")}
        </Text>
        <View className={`rounded-full px-2.5 py-1 ${style.bg}`}>
          <Text className={`text-xs font-semibold ${style.text}`}>
            {t(`coach.membershipStatus_${membership.status}`)}
          </Text>
        </View>
      </View>

      {membership.plan_name != null && membership.plan_name !== "" && (
        <Text className="text-base font-semibold text-content-primary">
          {membership.plan_name}
        </Text>
      )}

      {expiryLine != null && (
        <Text className={`text-sm ${warn ? "text-warning" : "text-content-tertiary"}`}>
          {expiryLine}
        </Text>
      )}
      {warn && <Text className="text-xs text-content-tertiary">{t("coach.renewHint")}</Text>}
    </Card>
  );
}
