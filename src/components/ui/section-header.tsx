import React from "react";

import { CapsLabel, PosterText } from "@/src/components/ui/poster";
import { Pressable, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

// Dojo Poster section header: Anton 22 title + red caps action label.
export function SectionHeader({ title, actionLabel, onAction, className }: SectionHeaderProps) {
  return (
    <View className={cn("flex-row items-baseline justify-between", className)}>
      <PosterText size={19}>{title}</PosterText>
      {actionLabel != null && onAction != null && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <CapsLabel size={10} className="text-brand-primary font-bold">
            {actionLabel}
          </CapsLabel>
        </Pressable>
      )}
    </View>
  );
}
