import React, { useEffect } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { DUR, EASE_OUT } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import { cn } from "@/src/utils/cn";

type ProgressBarProps = {
  /** 0..1; clamped. */
  value: number;
  /** Track + fill height in px. */
  height?: number;
  /** Fill color; defaults to cyan. */
  color?: string;
  /** Track color; defaults to the sunken surface (use hero-track on dark cards). */
  trackColor?: string;
  className?: string;
};

/**
 * Capsule progress bar — the app's one bar shape. Grows from the left via
 * scaleX so the animation stays on the UI thread.
 */
export function ProgressBar({
  value,
  height = 10,
  color,
  trackColor,
  className,
}: ProgressBarProps) {
  const colors = useColors();
  const frac = Math.min(1, Math.max(0, value));
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.set(withTiming(frac, { duration: DUR.slow * 2, easing: EASE_OUT }));
  }, [frac, grow]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: grow.value }],
  }));

  return (
    <View
      className={cn("w-full overflow-hidden rounded-full", className)}
      style={{ height, backgroundColor: trackColor ?? colors.surfaceElevated }}
    >
      <AnimatedView
        className="h-full w-full rounded-full"
        style={[
          { backgroundColor: color ?? colors.brandPrimary, transformOrigin: "left" },
          fillStyle,
        ]}
      />
    </View>
  );
}
