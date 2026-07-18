import { Ionicons } from "@expo/vector-icons";
import React from "react";

import { useColors, type Palette } from "@/src/theme/colors";
import { View } from "@/src/tw";
import { CapsLabel } from "@/src/components/ui/poster";
import { cn } from "@/src/utils/cn";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export type BadgeVariant = "ai" | "schedule" | "streak" | "trend-up" | "trend-down" | "accent";

// Tinted bg + colored caps text per handoff: AI/streak gold, schedule red,
// trend green. All sharp rectangles (radius 0).
const VARIANT: Record<
  BadgeVariant,
  { color: keyof Palette; bg: keyof Palette; icon?: IoniconName }
> = {
  ai: { color: "brandAccent", bg: "brandAccentSoft", icon: "sparkles-outline" },
  streak: { color: "brandAccent", bg: "brandAccentSoft", icon: "flame" },
  schedule: { color: "brandPrimary", bg: "brandPrimarySoft" },
  "trend-up": { color: "success", bg: "successSoft", icon: "trending-up" },
  "trend-down": { color: "success", bg: "successSoft", icon: "trending-down" },
  accent: { color: "brandPrimary", bg: "brandPrimarySoft" },
};

type BadgeProps = {
  variant: BadgeVariant;
  children: string;
  /** Override the variant's default leading icon (null hides it). */
  icon?: IoniconName | null;
  className?: string;
};

/** Dojo Poster chip: sharp rectangle, tinted fill, 10px/800 caps label. */
export function Badge({ variant, children, icon, className }: BadgeProps) {
  const colors = useColors();
  const spec = VARIANT[variant];
  const iconName = icon === null ? undefined : (icon ?? spec.icon);

  return (
    <View
      className={cn("flex-row items-center gap-1 self-start", className)}
      style={{ backgroundColor: colors[spec.bg], paddingHorizontal: 8, paddingVertical: 4 }}
    >
      {iconName != null && <Ionicons name={iconName} size={11} color={colors[spec.color]} />}
      <CapsLabel size={10} em={0.1} className="font-extrabold" style={{ color: colors[spec.color] }}>
        {children}
      </CapsLabel>
    </View>
  );
}
