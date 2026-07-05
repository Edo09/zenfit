import { Ionicons } from "@expo/vector-icons";
import React from "react";

import { Button } from "@/src/components/ui";
import { enter } from "@/src/lib/motion";
import { colors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IoniconName;
};

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon = "file-tray-outline",
}: Props) {
  return (
    <AnimatedView entering={enter()} className="items-center justify-center py-20 gap-3">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-surface border border-border">
        <Ionicons name={icon} size={30} color={colors.contentTertiary} />
      </View>
      <Text className="text-lg font-semibold text-content-primary text-center">{title}</Text>
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
