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
import { Icon, type IconName } from "@/src/components/ui/icon";
import { Spinner } from "@/src/components/ui/spinner";
import { DUR, EASE_OUT } from "@/src/lib/motion";
import { useColors, type PaletteColor } from "@/src/theme/colors";
import { View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import { cn } from "@/src/utils/cn";

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
  secondary: "bg-surface border border-border-strong",
  ghost: "bg-transparent",
  destructive: "bg-error-soft",
};

// brand-primary is a cyan FILL — its label is ink, never white.
const VARIANT_LABEL: Record<ButtonVariant, string> = {
  primary: "text-on-accent",
  secondary: "text-content-primary",
  ghost: "text-brand-primary-dark",
  destructive: "text-error",
};

const VARIANT_SPINNER: Record<ButtonVariant, PaletteColor> = {
  primary: "onAccent",
  secondary: "contentPrimary",
  ghost: "brandPrimaryDark",
  destructive: "error",
};

const SIZE_CONTAINER: Record<ButtonSize, string> = {
  sm: "px-4 py-2.5 rounded-full",
  md: "px-5 py-3.5 rounded-2xl",
  lg: "w-full py-4 rounded-2xl",
};

const SIZE_LABEL: Record<ButtonSize, string> = {
  sm: "text-sm font-bold",
  md: "text-base font-display",
  lg: "text-base font-display",
};

const SIZE_ICON: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  /** Render the icon after the label instead of before it. */
  iconTrailing?: boolean;
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
  iconTrailing = false,
  onPress,
  children,
  className,
  containerClassName,
  haptic = true,
}: ButtonProps) {
  const inactive = disabled || loading;
  const colors = useColors();
  const accentColor = colors[VARIANT_SPINNER[variant]];
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

  const glyph =
    icon != null ? <Icon name={icon} size={SIZE_ICON[size]} color={accentColor} /> : null;

  return (
    <AnimatedView className={containerClassName} style={pressStyle}>
    <GSButton
      variant={VARIANT_GS[variant]}
      onPress={handlePress}
      onPressIn={() => {
        // Large surfaces need less travel than the standard 0.97
        // (.set(), not .value=: React Compiler treats the assignment as an
        // illegal mutation — Reanimated added get/set for compiler compat)
        scale.set(withTiming(0.98, { duration: 100, easing: EASE_OUT }));
      }}
      onPressOut={() => {
        scale.set(withTiming(1, { duration: DUR.fast, easing: EASE_OUT }));
      }}
      isDisabled={inactive}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={cn(
        "gap-2 h-auto",
        VARIANT_CONTAINER[variant],
        SIZE_CONTAINER[size],
        disabled && "opacity-45",
        loading && "opacity-70",
        className
      )}
      // Subtle cyan glow under the primary CTA (spec: 0 8–14px …-8px cyan)
      style={
        variant === "primary" && !inactive
          ? {
              shadowColor: colors.brandPrimary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.45,
              shadowRadius: 16,
              elevation: 6,
            }
          : undefined
      }
    >
      {loading ? (
        <View className="py-0.5">
          <Spinner color={accentColor} />
        </View>
      ) : (
        <>
          {!iconTrailing && glyph}
          <ButtonText className={cn(VARIANT_LABEL[variant], SIZE_LABEL[size])}>
            {children}
          </ButtonText>
          {iconTrailing && glyph}
        </>
      )}
    </GSButton>
    </AnimatedView>
  );
}
