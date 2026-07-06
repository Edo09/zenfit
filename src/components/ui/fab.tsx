import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { exit, pop, PressableScale } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type FABProps = {
  icon?: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
};

export function FAB({ icon = "add", onPress, accessibilityLabel }: FABProps) {
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
      className="absolute h-14 w-14 rounded-full bg-brand-primary items-center justify-center shadow-lg"
      style={{ bottom: 24 + insets.bottom, right: 20 }}
    >
      <Ionicons name={icon} size={28} color={colors.white} />
    </PressableScale>
  );
}
