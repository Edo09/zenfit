import React from "react";
import Svg, { Path } from "react-native-svg";

import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

/**
 * ZYRON brand marks. The geometry here is the same path data the asset
 * generator emits — edit scripts/brand/generate-brand-assets.py and rerun it
 * rather than nudging numbers in one place only.
 */

/** ZYRON blue. Fixed in both schemes: the logo does not follow the theme. */
export const ZYRON_BLUE = "#1A56F0";
export const ZYRON_BLUE_DEEP = "#0B3FD4";

// Two nested chevrons reading as an "A", drawn in a tight 120 x 92 box.
const MARK_VIEWBOX = "0 0 120 92";
const MARK_RATIO = 92 / 120;
const MARK_OUTER = "M60 0L120 92L60 36L0 92Z";
const MARK_INNER = "M60 50L98 92L60 71L22 92Z";

// ZYRON as outlines on a 100-unit cap height, 774 wide with the tracking
// baked into each glyph's x offset.
const WORD_VIEWBOX = "0 0 774 100";
const WORD_RATIO = 774 / 100;
const GLYPHS: { d: string; x: number }[] = [
  { x: 0, d: "M0 0H108V14L21 86H108V100H0V86L87 14H0Z" },
  { x: 166, d: "M0 0L48 58V100H62V58L110 0H92L55 45L18 0Z" },
  {
    x: 334,
    d:
      "M0 0H84A20 20 0 0 1 104 20V32A20 20 0 0 1 84 52H60L104 100H82L38 52H14V100H0Z" +
      "M14 14H84A6 6 0 0 1 90 20V32A6 6 0 0 1 84 38H14Z",
  },
  {
    x: 496,
    d:
      "M34 0H78A34 30 0 0 1 112 30V70A34 30 0 0 1 78 100H34A34 30 0 0 1 0 70V30A34 30 0 0 1 34 0Z" +
      "M36 14H76A22 20 0 0 1 98 34V66A22 20 0 0 1 76 86H36A22 20 0 0 1 14 66V34A22 20 0 0 1 36 14Z",
  },
  { x: 666, d: "M0 0H14L94 81V0H108V100H94L14 19V100H0Z" },
];

/** The chevron mark on its own. `size` is the width; height follows. */
export function ZyronMark({ size = 120, color = ZYRON_BLUE }: { size?: number; color?: string }) {
  const height = Math.round(size * MARK_RATIO);
  return (
    <Svg width={size} height={height} viewBox={MARK_VIEWBOX}>
      <Path d={MARK_OUTER} fill={color} />
      <Path d={MARK_INNER} fill={color} />
    </Svg>
  );
}

/** The ZYRON wordmark. `size` is the cap height; width follows. */
export function ZyronWordmark({ size = 36, color }: { size?: number; color?: string }) {
  const colors = useColors();
  const fill = color ?? colors.contentPrimary;
  return (
    <Svg width={Math.round(size * WORD_RATIO)} height={size} viewBox={WORD_VIEWBOX}>
      {GLYPHS.map((g) => (
        <Path key={g.x} d={g.d} fill={fill} fillRule="evenodd" transform={`translate(${g.x} 0)`} />
      ))}
    </Svg>
  );
}

/**
 * The stacked lockup: chevron over the wordmark, with the tagline optional.
 * `size` is the mark width — the wordmark scales off it at the ratio the
 * vertical lockup uses (cap height = 19% of the mark width).
 */
export function BrandMark({
  size = 190,
  tagline = false,
  className,
}: {
  size?: number;
  tagline?: boolean;
  className?: string;
}) {
  return (
    <View className={cn("items-center", className)}>
      <ZyronMark size={size} />
      <View style={{ height: size * 0.14 }} />
      <ZyronWordmark size={size * 0.19} />
      {tagline ? (
        <Text
          className="font-semibold"
          style={{
            color: ZYRON_BLUE,
            fontSize: Math.max(9, size * 0.062),
            letterSpacing: size * 0.021,
            marginTop: size * 0.075,
          }}
        >
          TRAIN • EVOLVE • CONQUER
        </Text>
      ) : null}
    </View>
  );
}
