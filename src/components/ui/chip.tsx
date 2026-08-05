import React from "react";

import { Icon, type IconName } from "@/src/components/ui/icon";
import { PressableScale } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type ChipTone = "default" | "ai";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** "ai" paints the violet AI family instead of the neutral/cyan one. */
  tone?: ChipTone;
  className?: string;
};

/**
 * Rounded pill filter/tag. Unselected = surface + hairline; selected = the
 * cyan-soft tint with cyan-deep label (violet-soft/violet for AI).
 */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  tone = "default",
  className,
}: ChipProps) {
  const colors = useColors();
  const ai = tone === "ai";

  const container = ai
    ? "bg-brand-accent-soft border border-brand-accent-border"
    : selected
      ? "bg-brand-primary-soft border border-brand-primary"
      : "bg-surface border border-border";

  const labelClass = ai
    ? "text-brand-accent"
    : selected
      ? "text-brand-primary-dark"
      : "text-content-secondary";

  const iconColor = ai
    ? colors.brandAccent
    : selected
      ? colors.brandPrimaryDark
      : colors.contentTertiary;

  return (
    <PressableScale
      onPress={onPress}
      disabled={onPress == null}
      haptic
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn("rounded-full px-3.5 py-2", container, className)}
    >
      <View className="flex-row items-center gap-1.5">
        {icon != null && <Icon name={icon} size={14} color={iconColor} />}
        <Text className={cn("text-sm font-semibold", labelClass)}>{label}</Text>
      </View>
    </PressableScale>
  );
}
