import React, { useId } from "react";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Card as GSCard } from "@/components/ui/card";
import { PressableScale } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type CardProps = {
  className?: string;
  onPress?: () => void;
  children: React.ReactNode;
};

/**
 * Habbito card: white/surface panel, 1px hairline, big soft radius. No
 * top-accent bar, no sharp corners. For the dark gradient "feature" variant
 * (energy budget, active workout, membership) use <FeatureCard>.
 */
export function Card({ className, onPress, children }: CardProps) {
  const classes = cn("bg-surface border border-border rounded-3xl p-5", className);

  if (onPress != null) {
    // No haptic: pressable cards are navigation taps, buzzing every one is noisy
    return (
      <PressableScale onPress={onPress} className={classes} accessibilityRole="button">
        {children}
      </PressableScale>
    );
  }
  return <GSCard className={classes}>{children}</GSCard>;
}

type FeatureCardProps = {
  className?: string;
  onPress?: () => void;
  children: React.ReactNode;
};

/**
 * Dark hero-gradient card — the app's one "loud" surface. Text on it uses
 * on-hero / on-hero-dim; tracks and dividers use hero-track.
 */
export function FeatureCard({ className, onPress, children }: FeatureCardProps) {
  const classes = cn("rounded-3xl p-5 overflow-hidden", className);
  const body = (
    <>
      <HeroGradient />
      {children}
    </>
  );

  if (onPress != null) {
    return (
      <PressableScale onPress={onPress} className={classes} accessibilityRole="button">
        {body}
      </PressableScale>
    );
  }
  return <View className={classes}>{body}</View>;
}

/**
 * Fills its parent with the hero-from → hero-to vertical wash. SVG rather
 * than a CSS gradient: it is the one gradient path proven on native + web in
 * this app, and the gradient id must be unique per instance (several hero
 * surfaces can be mounted at once).
 */
export function HeroGradient({ angle = "vertical" }: { angle?: "vertical" | "diagonal" }) {
  const colors = useColors();
  // useId() emits colons (":r0:"), which are illegal inside url(#…)
  const id = `hero-${useId().replace(/:/g, "")}`;
  const diagonal = angle === "diagonal";
  return (
    <Svg
      width="100%"
      height="100%"
      style={{ position: "absolute", top: 0, left: 0 }}
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={diagonal ? "1" : "0"} y2="1">
          <Stop offset="0" stopColor={colors.heroFrom} />
          <Stop offset="1" stopColor={colors.heroTo} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
