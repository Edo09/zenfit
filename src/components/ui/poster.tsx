import React from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

/* Dojo Poster primitives — the skew/caps/dash language shared by every
   redesigned screen. Values from the design handoff README (exact). */

type SkewedProps = {
  /** Skew angle in degrees (negative = leaning forward). */
  deg?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Layout style for the counter-skewed inner wrapper. */
  contentClassName?: string;
  children: React.ReactNode;
};

/**
 * Skewed block with counter-skewed content so text/icons stay upright.
 * Buttons/segments/badges: -10°, FAB/day markers: -8°, chart bars: -6°.
 */
export function Skewed({ deg = -10, className, style, contentClassName, children }: SkewedProps) {
  return (
    <View className={className} style={[{ transform: [{ skewX: `${deg}deg` }] }, style]}>
      <View
        className={cn("flex-row items-center justify-center", contentClassName)}
        style={{ transform: [{ skewX: `${-deg}deg` }] }}
      >
        {children}
      </View>
    </View>
  );
}

type CapsLabelProps = {
  /** Font size in px; letter-spacing derives from it. */
  size?: number;
  /** Letter-spacing in em (README label style: 0.08–0.18em). */
  em?: number;
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children: React.ReactNode;
};

/**
 * Recurring caps label: Inter bold, uppercase, wide tracking.
 * Letter-spacing computed in px (RN has no em units).
 */
export function CapsLabel({
  size = 10,
  em = 0.14,
  className,
  style,
  numberOfLines,
  children,
}: CapsLabelProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      className={cn("font-bold uppercase text-content-secondary", className)}
      style={[{ fontSize: size, letterSpacing: size * em }, style]}
    >
      {children}
    </Text>
  );
}

/**
 * Anton display text — poster titles and large numerals. Always uppercase,
 * tight line-height (README: 0.95–1.05), optional tabular numerals.
 */
export function PosterText({
  size,
  tabular = false,
  className,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
  children,
}: {
  size: number;
  tabular?: boolean;
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      className={cn("font-anton uppercase text-content-primary", className)}
      style={[
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.05),
          letterSpacing: size * 0.01,
        },
        tabular && { fontVariant: ["tabular-nums"] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Red dash (22×3) + caps label — sits under every screen title. */
export function DashLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  const colors = useColors();
  return (
    <View className={cn("flex-row items-center gap-2", className)}>
      <View style={{ width: 22, height: 3, backgroundColor: colors.brandPrimary }} />
      <CapsLabel size={11} em={0.18}>
        {children}
      </CapsLabel>
    </View>
  );
}
