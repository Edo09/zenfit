import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/src/components/ui/icon";
import { exit, pop, PressableScale } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";

type FABProps = {
  icon?: IconName;
  /** Short verb shown beside the icon ("New", "Log food"). */
  label?: string;
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * Habbito FAB: cyan pill (icon + short label), full radius, cyan glow.
 * Sits above the floating dock, so the bottom offset clears both it and the
 * safe area.
 */
export function FAB({ icon = "plus", label, onPress, accessibilityLabel }: FABProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <PressableScale
      onPress={onPress}
      haptic
      scaleTo={0.94}
      entering={pop().delay(200)}
      exiting={exit()}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="absolute"
      style={{ bottom: 96 + insets.bottom, right: 20 }}
    >
      <View
        className="flex-row items-center gap-1.5 rounded-full bg-brand-primary px-5 h-14"
        style={{
          shadowColor: colors.brandPrimary,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        <Icon name={icon} size={22} color={colors.onAccent} strokeWidth={2.2} />
        {label != null && (
          <Text className="font-display text-base text-on-accent">{label}</Text>
        )}
      </View>
    </PressableScale>
  );
}
