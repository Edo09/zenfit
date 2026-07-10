import React, { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Card } from "@/src/components/ui";
import { View } from "@/src/tw";

// Loading state that mirrors the real dashboard layout (toggle + hero + three
// cards) so nothing jumps when data lands. Opacity pulses 0.45↔0.9, staggered
// per block. Never a spinner.

function Pulse({ delay, children }: { delay: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0.9, { duration: 800 }), -1, true),
    );
  }, [opacity, delay]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function Block({ className }: { className: string }) {
  return <View className={`rounded-lg bg-surface-elevated ${className}`} />;
}

export function SkeletonDashboard() {
  return (
    <View className="gap-3 p-4">
      <Pulse delay={0}>
        <Block className="h-11 rounded-2xl" />
      </Pulse>
      <Pulse delay={100}>
        <Card className="flex-row items-center gap-4">
          <View className="h-[88px] w-[88px] rounded-full bg-surface-elevated" />
          <View className="flex-1 gap-2">
            <Block className="h-4 w-2/5" />
            <Block className="h-3 w-4/5" />
            <Block className="h-3 w-3/5" />
          </View>
        </Card>
      </Pulse>
      {[96, 72, 96].map((height, i) => (
        <Pulse key={i} delay={200 + i * 100}>
          <Card className="gap-3">
            <Block className="h-4 w-2/5" />
            <View style={{ height }} className="rounded-lg bg-surface-elevated" />
            <Block className="h-3 w-1/3" />
          </Card>
        </Pulse>
      ))}
    </View>
  );
}
