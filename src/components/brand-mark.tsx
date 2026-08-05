import React from "react";
import Svg, { Circle } from "react-native-svg";

import { DisplayText } from "@/src/components/ui";
import { useColors } from "@/src/theme/colors";
import { View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

/**
 * The Habbito ring-mark: an ink disc with a cyan arc riding three-quarters
 * of the way round it — the same gesture as the progress rings the app uses
 * everywhere. Pair it with the lowercase wordmark.
 */
export function RingMark({ size = 64 }: { size?: number }) {
  const colors = useColors();
  const stroke = Math.max(4, Math.round(size * 0.11));
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={colors.contentPrimary} strokeWidth={stroke} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={colors.brandPrimary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference * 0.72} ${circumference}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
    </View>
  );
}

/** Ring-mark + the lowercase `habbito` wordmark, stacked or inline. */
export function BrandMark({
  size = 64,
  wordmarkSize = 34,
  className,
}: {
  size?: number;
  wordmarkSize?: number;
  className?: string;
}) {
  return (
    <View className={cn("items-center gap-3", className)}>
      <RingMark size={size} />
      <DisplayText size={wordmarkSize} weight="extrabold">
        habbito
      </DisplayText>
    </View>
  );
}
