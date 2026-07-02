import React from "react";

import { Pressable, Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function SectionHeader({ title, actionLabel, onAction, className }: SectionHeaderProps) {
  return (
    <View className={cn("flex-row items-center justify-between", className)}>
      <Text className="text-lg font-semibold text-content-primary">{title}</Text>
      {actionLabel != null && onAction != null && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text className="text-sm font-medium text-brand-primary">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
