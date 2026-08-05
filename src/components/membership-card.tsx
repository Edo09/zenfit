import React from "react";
import { useTranslation } from "react-i18next";

import { CapsLabel, DisplayText, FeatureCard } from "@/src/components/ui";
import { Icon } from "@/src/components/ui/icon";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type { Membership, MembershipStatus } from "@/src/types/database";

type Props = { membership: Membership | null };

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** The membership panel — a dark feature card, cyan pill for a live plan. */
export function MembershipCard({ membership }: Props) {
  const colors = useColors();
  const { t, i18n } = useTranslation();

  // Only an active plan gets the cyan treatment; everything else is a
  // muted state pill so the card never celebrates a lapsed membership.
  const statusColor: Record<MembershipStatus, string> = {
    active: colors.brandPrimary,
    expired: colors.error,
    paused: colors.warning,
    cancelled: colors.heroTrack,
  };

  if (membership == null) {
    return (
      <FeatureCard className="gap-1.5">
        <View className="flex-row items-center gap-2">
          <Icon name="sparkles" size={16} color={colors.brandPrimary} />
          <CapsLabel size={10} className="text-on-hero-dim">
            {t("coach.membership")}
          </CapsLabel>
        </View>
        <Text className="text-sm text-on-hero-dim">{t("coach.noMembership")}</Text>
      </FeatureCard>
    );
  }

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

  const pill = statusColor[membership.status];
  const onPill = membership.status === "cancelled" ? colors.onHero : colors.onAccent;

  return (
    <FeatureCard className="gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Icon name="sparkles" size={16} color={colors.brandPrimary} />
          <CapsLabel size={10} className="text-on-hero-dim">
            {t("coach.membership")}
          </CapsLabel>
        </View>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: pill }}>
          <Text className="text-xs font-bold" style={{ color: onPill }}>
            {t(`coach.membershipStatus_${membership.status}`)}
          </Text>
        </View>
      </View>

      {membership.plan_name != null && membership.plan_name !== "" && (
        <DisplayText size={22} className="text-on-hero">
          {membership.plan_name}
        </DisplayText>
      )}

      {expiryLine != null && (
        <Text
          className="text-sm"
          style={{ color: warn ? colors.warning : colors.onHeroDim }}
        >
          {expiryLine}
        </Text>
      )}
      {warn && <Text className="text-xs text-on-hero-dim">{t("coach.renewHint")}</Text>}
    </FeatureCard>
  );
}
