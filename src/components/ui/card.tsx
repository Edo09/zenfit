import React from "react";

import { Card as GSCard } from "@/components/ui/card";
import { PressableScale } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type CardProps = {
  className?: string;
  onPress?: () => void;
  /**
   * Dojo Poster signature top-accent: 3px bar across the card top, red for
   * this fraction (0..1) of the width, border color for the rest.
   */
  topAccent?: number;
  children: React.ReactNode;
};

function TopAccentBar({ frac }: { frac: number }) {
  const colors = useColors();
  const pct = Math.round(Math.min(1, Math.max(0, frac)) * 100);
  return (
    <View
      pointerEvents="none"
      className="absolute top-0 left-0 right-0 flex-row"
      style={{ height: 3 }}
    >
      <View style={{ width: `${pct}%`, backgroundColor: colors.brandPrimary }} />
      <View className="flex-1" style={{ backgroundColor: colors.border }} />
    </View>
  );
}

export function Card({ className, onPress, topAccent, children }: CardProps) {
  const classes = cn(
    "bg-surface border border-border rounded-2xl p-4",
    topAccent != null && "overflow-hidden",
    className,
  );
  const accent = topAccent != null ? <TopAccentBar frac={topAccent} /> : null;

  if (onPress != null) {
    // No haptic: pressable cards are navigation taps, buzzing every one is noisy
    return (
      <PressableScale onPress={onPress} className={classes} accessibilityRole="button">
        {accent}
        {children}
      </PressableScale>
    );
  }
  return (
    <GSCard className={classes}>
      {accent}
      {children}
    </GSCard>
  );
}
