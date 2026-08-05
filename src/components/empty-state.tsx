import React from "react";

import { Button, DisplayText } from "@/src/components/ui";
import { enter } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import { Icon, type IconName } from "@/src/components/ui/icon";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
};

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon = "inbox",
}: Props) {
  const colors = useColors();
  return (
    <AnimatedView entering={enter()} className="items-center justify-center py-20 gap-3">
      <View className="h-16 w-16 items-center justify-center rounded-3xl bg-surface border border-border">
        <Icon name={icon} size={28} color={colors.contentTertiary} />
      </View>
      <DisplayText size={19} className="text-center">
        {title}
      </DisplayText>
      {subtitle != null && (
        <Text className="text-sm text-content-tertiary text-center px-6">{subtitle}</Text>
      )}
      {actionLabel != null && onAction != null && (
        <Button onPress={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </AnimatedView>
  );
}
