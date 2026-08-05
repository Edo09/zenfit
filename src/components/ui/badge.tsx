import React from "react";

import { Icon, type IconName } from "@/src/components/ui/icon";
import { useColors, type Palette } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

export type BadgeVariant = "ai" | "schedule" | "streak" | "trend-up" | "trend-down" | "accent";

// Tinted pill + colored label. AI is the violet family; cyan-accented
// variants use cyan-deep as the foreground so they stay readable on light.
const VARIANT: Record<
  BadgeVariant,
  { color: keyof Palette; bg: keyof Palette; icon?: IconName }
> = {
  ai: { color: "brandAccent", bg: "brandAccentSoft", icon: "sparkles" },
  streak: { color: "brandPrimaryDark", bg: "brandPrimarySoft", icon: "flame" },
  schedule: { color: "brandPrimaryDark", bg: "brandPrimarySoft" },
  "trend-up": { color: "success", bg: "successSoft", icon: "trending-up" },
  "trend-down": { color: "success", bg: "successSoft", icon: "trending-down" },
  accent: { color: "brandPrimaryDark", bg: "brandPrimarySoft" },
};

type BadgeProps = {
  variant: BadgeVariant;
  children: string;
  /** Override the variant's default leading icon (null hides it). */
  icon?: IconName | null;
  className?: string;
};

/** Habbito badge: rounded pill, tinted fill, 12px semibold label. */
export function Badge({ variant, children, icon, className }: BadgeProps) {
  const colors = useColors();
  const spec = VARIANT[variant];
  const iconName = icon === null ? undefined : (icon ?? spec.icon);

  return (
    <View
      className={cn("flex-row items-center gap-1 self-start rounded-full", className)}
      style={{ backgroundColor: colors[spec.bg], paddingHorizontal: 10, paddingVertical: 5 }}
    >
      {iconName != null && <Icon name={iconName} size={13} color={colors[spec.color]} />}
      <Text className="text-xs font-semibold" style={{ color: colors[spec.color] }}>
        {children}
      </Text>
    </View>
  );
}
