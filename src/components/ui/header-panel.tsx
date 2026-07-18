import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { useColors } from "@/src/theme/colors";
import { useThemeScheme } from "@/src/theme/theme-store";
import { View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type HeaderPanelProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Dojo Poster page header: vertical surface→bg gradient, decorative skewed
 * ghost rectangle off the top-right corner, safe-area-aware padding.
 * Light scheme adds the specced 1px bottom hairline.
 */
export function HeaderPanel({ className, children }: HeaderPanelProps) {
  const colors = useColors();
  const scheme = useThemeScheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn("overflow-hidden", scheme === "light" && "border-b border-border", className)}
      style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 18 }}
    >
      <Svg
        width="100%"
        height="100%"
        style={{ position: "absolute", top: 0, left: 0 }}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="hp-grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.headerGradFrom} />
            <Stop offset="1" stopColor={colors.headerGradTo} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#hp-grad)" />
      </Svg>
      {/* Decorative skewed ghost, clipped by the panel (README: ~220×300,
          skewX(-18°), off the top-right corner) */}
      <View
        pointerEvents="none"
        className="absolute"
        style={{
          top: -40,
          right: -60,
          width: 220,
          height: 300,
          backgroundColor: colors.skewGhost,
          transform: [{ skewX: "-18deg" }],
        }}
      />
      {children}
    </View>
  );
}
