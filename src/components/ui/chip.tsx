import React from "react";

import { PressableScale } from "@/src/lib/motion";
import { Text } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
};

export function Chip({ label, selected = false, onPress, className }: ChipProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={onPress == null}
      haptic
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        "rounded-full px-4 py-2",
        selected ? "bg-brand-primary" : "bg-surface border border-border",
        className
      )}
    >
      <Text
        className={cn(
          "text-sm font-medium",
          selected ? "text-white" : "text-content-tertiary"
        )}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
