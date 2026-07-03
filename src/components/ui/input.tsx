import React from "react";

import { Input as GSInput, InputField } from "@/components/ui/input";
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
  ...rest
}: InputProps) {
  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label != null && (
        <Text className="text-sm font-medium text-content-secondary">{label}</Text>
      )}
      <GSInput
        isInvalid={error != null}
        className={cn(
          "bg-surface border-border rounded-xl px-0 min-h-0 shadow-none",
          error != null && "border-error data-[focus=true]:border-error"
        )}
        // gluestack's tva doesn't reliably let className overrides beat its
        // base px-3, so horizontal padding is pinned with inline style
        style={{ paddingHorizontal: 0 }}
      >
        <InputField
          placeholderTextColor={colors.contentMuted}
          className={cn("py-3 text-base text-content-primary h-auto", className)}
          style={{ paddingHorizontal: 24 }}
          {...(rest as React.ComponentProps<typeof InputField>)}
        />
      </GSInput>
      {error != null ? (
        <Text className="text-xs text-error">{error}</Text>
      ) : helper != null ? (
        <Text className="text-xs text-content-muted">{helper}</Text>
      ) : null}
    </View>
  );
}
