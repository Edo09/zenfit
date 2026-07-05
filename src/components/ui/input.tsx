import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Input as GSInput, InputField } from "@/components/ui/input";
import { colors } from "@/src/theme/colors";
import { Pressable, Text, TextInput, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type InputProps = React.ComponentProps<typeof TextInput> & {
  label?: string;
  error?: string;
  helper?: string;
  containerClassName?: string;
  /** Leading icon inside the field (e.g. mail/key on auth screens). */
  leftIcon?: React.ComponentProps<typeof Ionicons>["name"];
  /** "lg" = taller field, bigger text/icons (auth screens). */
  size?: "md" | "lg";
};

export function Input({
  label,
  error,
  helper,
  containerClassName,
  className,
  secureTextEntry,
  leftIcon,
  size = "md",
  ...rest
}: InputProps) {
  const { t } = useTranslation();
  // Password fields get an eye toggle to reveal what was typed
  const [revealed, setRevealed] = useState(false);
  const isSecure = secureTextEntry === true;
  const lg = size === "lg";
  const iconSize = lg ? 22 : 20;

  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label != null && (
        <Text className="text-sm font-medium text-content-secondary">{label}</Text>
      )}
      <GSInput
        isInvalid={error != null}
        className={cn(
          "bg-surface border-border px-0 min-h-0 shadow-none",
          lg ? "rounded-2xl" : "rounded-xl",
          error != null && "border-error data-[focus=true]:border-error"
        )}
        // gluestack's tva doesn't reliably let className overrides beat its
        // base px-3, so horizontal padding is pinned with inline style
        style={{ paddingHorizontal: 0 }}
      >
        {leftIcon != null && (
          <View className="justify-center pl-4">
            <Ionicons name={leftIcon} size={iconSize} color={colors.contentMuted} />
          </View>
        )}
        <InputField
          placeholderTextColor={colors.contentMuted}
          secureTextEntry={isSecure && !revealed}
          className={cn(
            "flex-1 text-content-primary h-auto",
            lg ? "py-5 text-xl" : "py-3 text-base",
            className
          )}
          style={{ paddingLeft: leftIcon != null ? 12 : 24, paddingRight: 24 }}
          {...(rest as React.ComponentProps<typeof InputField>)}
        />
        {isSecure && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t(revealed ? "auth.hidePassword" : "auth.showPassword")}
            className="justify-center pr-4"
          >
            <Ionicons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={iconSize}
              color={colors.contentMuted}
            />
          </Pressable>
        )}
      </GSInput>
      {error != null ? (
        <Text className="text-xs text-error">{error}</Text>
      ) : helper != null ? (
        <Text className="text-xs text-content-muted">{helper}</Text>
      ) : null}
    </View>
  );
}
