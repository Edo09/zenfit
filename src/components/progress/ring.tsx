import React from "react";
import Svg, { Circle } from "react-native-svg";

import { View } from "@/src/tw";

type RingProps = {
  size?: number;
  strokeWidth?: number;
  /** 0..1, clamped */
  frac: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
};

// Compliance ring. SVG because NativeWind can't draw arcs; colors come in as
// props from useColors() so both schemes work.
export function Ring({
  size = 88,
  strokeWidth = 8,
  frac,
  color,
  trackColor,
  children,
}: RingProps) {
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, frac));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {clamped > 0 && (
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference * clamped} ${circumference}`}
            transform={`rotate(-90 ${c} ${c})`}
          />
        )}
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        {children}
      </View>
    </View>
  );
}
