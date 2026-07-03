import React from "react";

import { Spinner as GSSpinner } from "@/components/ui/spinner";
import { colors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type SpinnerProps = {
  size?: "small" | "large";
  color?: string;
};

export function Spinner({ size = "small", color = colors.brandPrimary }: SpinnerProps) {
  return <GSSpinner size={size} color={color} />;
}

type LoadingBlockProps = {
  label?: string;
  className?: string;
};

export function LoadingBlock({ label, className }: LoadingBlockProps) {
  return (
    <View className={cn("flex-1 items-center justify-center gap-3 py-16", className)}>
      <Spinner size="large" />
      {label != null && <Text className="text-sm text-content-tertiary">{label}</Text>}
    </View>
  );
}
