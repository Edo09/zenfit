import React from "react";

import { DisplayText } from "@/src/components/ui/typography";
import { Pressable, Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

/** Schibsted 19 title + a quiet cyan-deep action link. */
export function SectionHeader({ title, actionLabel, onAction, className }: SectionHeaderProps) {
  return (
    <View className={cn("flex-row items-center justify-between", className)}>
      <DisplayText size={19}>{title}</DisplayText>
      {actionLabel != null && onAction != null && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text className="text-sm font-semibold text-brand-primary-dark">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
