import React from "react";

import { Pressable, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type CardProps = {
  className?: string;
  onPress?: () => void;
  children: React.ReactNode;
};

export function Card({ className, onPress, children }: CardProps) {
  const classes = cn("bg-surface border border-border rounded-2xl p-4", className);

  if (onPress != null) {
    return (
      <Pressable onPress={onPress} className={classes} accessibilityRole="button">
        {children}
      </Pressable>
    );
  }
  return <View className={classes}>{children}</View>;
}
