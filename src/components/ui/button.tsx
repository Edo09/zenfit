import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  Button as GSButton,
  ButtonText,
} from "@/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { DUR, EASE_OUT } from "@/src/lib/motion";
import { colors } from "@/src/theme/colors";
import { View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import { cn } from "@/src/utils/cn";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

// gluestack variant that most closely matches, then className restores
// the exact Habbito look on top of it.
const VARIANT_GS: Record<ButtonVariant, "default" | "secondary" | "ghost"> = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "default",
};

const VARIANT_CONTAINER: Record<ButtonVariant, string> = {
  primary: "bg-brand-primary",
  secondary: "bg-surface border border-border",
  ghost: "bg-transparent",
  destructive: "bg-error-soft",
};

const VARIANT_LABEL: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-content-primary",
  ghost: "text-brand-primary",
  destructive: "text-error",
};

const VARIANT_SPINNER: Record<ButtonVariant, string> = {
  primary: colors.white,
  secondary: colors.contentPrimary,
  ghost: colors.brandPrimary,
  destructive: colors.error,
};

const SIZE_CONTAINER: Record<ButtonSize, string> = {
  sm: "px-4 py-2 rounded-full",
  md: "px-5 py-3.5 rounded-2xl",
  lg: "w-full py-4 rounded-2xl",
};

const SIZE_LABEL: Record<ButtonSize, string> = {
  sm: "text-sm font-semibold",
  md: "text-base font-semibold",
  lg: "text-base font-bold",
};

const SIZE_ICON: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: IoniconName;
  onPress: () => void;
  children: React.ReactNode;
  className?: string;
  /** Layout classes for the press-scale wrapper (e.g. "flex-1" in rows). */
  containerClassName?: string;
  haptic?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  onPress,
  children,
  className,
  containerClassName,
  haptic = true,
}: ButtonProps) {
  const inactive = disabled || loading;
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (haptic) {
      Haptics.selectionAsync().catch(() => {});
    }
    onPress();
  };

  return (
    <AnimatedView className={containerClassName} style={pressStyle}>
    <GSButton
      variant={VARIANT_GS[variant]}
      onPress={handlePress}
      onPressIn={() => {
        // Large surfaces need less travel than the standard 0.97
        scale.value = withTiming(0.98, { duration: 100, easing: EASE_OUT });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: DUR.fast, easing: EASE_OUT });
      }}
      isDisabled={inactive}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={cn(
        "gap-2 h-auto",
        VARIANT_CONTAINER[variant],
        SIZE_CONTAINER[size],
        disabled && "opacity-50",
        loading && "opacity-70",
        className
      )}
    >
      {loading ? (
        <View className="py-0.5">
          <Spinner color={VARIANT_SPINNER[variant]} />
        </View>
      ) : (
        <>
          {icon != null && (
            <Ionicons name={icon} size={SIZE_ICON[size]} color={VARIANT_SPINNER[variant]} />
          )}
          <ButtonText className={cn(VARIANT_LABEL[variant], SIZE_LABEL[size])}>
            {children}
          </ButtonText>
        </>
      )}
    </GSButton>
    </AnimatedView>
  );
}
