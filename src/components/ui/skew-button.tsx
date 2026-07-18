import { Ionicons } from "@expo/vector-icons";
import React from "react";

import { Spinner } from "@/src/components/ui/spinner";
import { PressableScale } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type SkewButtonProps = {
  onPress: () => void;
  children: string;
  /** compact: trailing card actions (11px label); default: primary CTA. */
  size?: "default" | "compact";
  icon?: IoniconName;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  accessibilityLabel?: string;
};

/**
 * Dojo Poster primary button: red block, skewX(-10°), sharp corners,
 * counter-skewed caps label. Disabled = opacity 0.45 (README).
 *
 * The skew lives on a nested View, NOT on the PressableScale: its animated
 * press style owns `transform`, and a transform in the style prop would be
 * silently replaced by the scale animation.
 */
export function SkewButton({
  onPress,
  children,
  size = "default",
  icon,
  disabled = false,
  loading = false,
  className,
  accessibilityLabel,
}: SkewButtonProps) {
  const colors = useColors();
  const compact = size === "compact";
  const fontSize = compact ? 11 : 13;
  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptic
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={className}
    >
      <View
        className={cn("bg-brand-primary", disabled && "opacity-45")}
        style={{
          transform: [{ skewX: "-10deg" }],
          paddingVertical: compact ? 10 : 12,
          paddingHorizontal: compact ? 14 : 20,
        }}
      >
        <View
          className="flex-row items-center justify-center gap-2"
          style={{ transform: [{ skewX: "10deg" }] }}
        >
          {loading ? (
            <Spinner color="white" />
          ) : (
            <>
              {icon != null && (
                <Ionicons name={icon} size={compact ? 13 : 15} color={colors.white} />
              )}
              <Text
                className="font-extrabold uppercase text-white"
                style={{ fontSize, letterSpacing: fontSize * 0.1 }}
              >
                {children}
              </Text>
            </>
          )}
        </View>
      </View>
    </PressableScale>
  );
}
