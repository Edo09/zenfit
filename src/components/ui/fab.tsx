import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { exit, pop, PressableScale } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { View } from "@/src/tw";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type FABProps = {
  icon?: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
};

// Dojo Poster FAB: 56px red square, skewX(-8°), counter-skewed icon, red
// glow shadow (README: 0 12px 24px -8px rgba(239,68,68,0.6)).
// Skew on a nested View — PressableScale's animated press style owns
// `transform`, so a transform in its style prop would be replaced.
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
      className="absolute"
      style={{ bottom: 24 + insets.bottom, right: 20 }}
    >
      <View
        className="h-14 w-14 bg-brand-primary items-center justify-center"
        style={{
          transform: [{ skewX: "-8deg" }],
          shadowColor: colors.brandPrimary,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.6,
          shadowRadius: 24,
          elevation: 12,
        }}
      >
        <View style={{ transform: [{ skewX: "8deg" }] }}>
          <Ionicons name={icon} size={28} color={colors.white} />
        </View>
      </View>
    </PressableScale>
  );
}
