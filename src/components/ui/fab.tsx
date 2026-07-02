import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/theme/colors";
import { Pressable } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type FABProps = {
  icon?: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
};

export function FAB({ icon = "add", onPress, accessibilityLabel }: FABProps) {
  const insets = useSafeAreaInsets();
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-brand-primary",
        pressed && "opacity-80"
      )}
      style={{ bottom: 24 + insets.bottom }}
    >
      <Ionicons name={icon} size={28} color={colors.white} />
    </Pressable>
  );
}
