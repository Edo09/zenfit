import React, { useState } from "react";

import { colors } from "@/src/theme/colors";
import { Text, TextInput, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type InputProps = React.ComponentProps<typeof TextInput> & {
  label?: string;
  error?: string;
  helper?: string;
  containerClassName?: string;
};

export function Input({
  label,
  error,
  helper,
  containerClassName,
  className,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label != null && (
        <Text className="text-sm font-medium text-content-secondary">{label}</Text>
      )}
      <TextInput
        placeholderTextColor={colors.contentMuted}
        className={cn(
          "bg-surface border border-border rounded-xl px-6 py-3 text-base text-content-primary",
          focused && "border-border-strong",
          error != null && "border-error",
          className
        )}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error != null ? (
        <Text className="text-xs text-error">{error}</Text>
      ) : helper != null ? (
        <Text className="text-xs text-content-muted">{helper}</Text>
      ) : null}
    </View>
  );
}
