import React from "react";
import type { StyleProp, TextStyle } from "react-native";

import { Text } from "@/src/tw";
import { cn } from "@/src/utils/cn";

/* Habbito type primitives. Two faces only: Schibsted Grotesk for titles and
   every numeral (DisplayText), Hanken Grotesk for everything else. Mixed
   case throughout — caps are a sparing accent, never a headline. */

type DisplayWeight = "semibold" | "bold" | "extrabold";

const WEIGHT_CLASS: Record<DisplayWeight, string> = {
  semibold: "font-display-semibold",
  bold: "font-display",
  extrabold: "font-display-extrabold",
};

type DisplayTextProps = {
  /** Font size in px. Tracking tightens automatically as size grows. */
  size: number;
  weight?: DisplayWeight;
  /** Lock digit widths so counters don't jitter while animating. */
  tabular?: boolean;
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  children: React.ReactNode;
};

/**
 * Schibsted Grotesk — screen titles, card titles, stat and hero numerals.
 * Letter-spacing follows the spec ramp: −0.01em at body sizes down to
 * −0.03em on the big hero numerals.
 */
export function DisplayText({
  size,
  weight = "bold",
  tabular = false,
  className,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
  children,
}: DisplayTextProps) {
  const trackingEm = size >= 32 ? -0.03 : size >= 22 ? -0.02 : -0.01;
  return (
    <Text
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      className={cn(WEIGHT_CLASS[weight], "text-content-primary", className)}
      style={[
        {
          fontSize: size,
          lineHeight: Math.round(size * (size >= 32 ? 1.04 : 1.18)),
          letterSpacing: size * trackingEm,
        },
        tabular && { fontVariant: ["tabular-nums"] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

type CapsLabelProps = {
  /** Font size in px; letter-spacing derives from it. */
  size?: number;
  /** Letter-spacing in em (spec: 0.12–0.16em). */
  em?: number;
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children: React.ReactNode;
};

/**
 * Small uppercase eyebrow — Hanken 700, wide tracking. Used sparingly for
 * section eyebrows and tile captions; never for headlines.
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
      className={cn("font-bold uppercase text-content-tertiary", className)}
      style={[{ fontSize: size, letterSpacing: size * em }, style]}
    >
      {children}
    </Text>
  );
}
