import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Fab as GSFab } from "@/components/ui/fab";
import { colors } from "@/src/theme/colors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type FABProps = {
  icon?: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
};

export function FAB({ icon = "add", onPress, accessibilityLabel }: FABProps) {
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  return (
    <GSFab
      placement="bottom right"
      onPress={handlePress}
      accessibilityLabel={accessibilityLabel}
      className="h-14 w-14 rounded-full bg-brand-primary p-0 items-center justify-center"
      style={{ bottom: 24 + insets.bottom, right: 20 }}
    >
      <Ionicons name={icon} size={28} color={colors.white} />
    </GSFab>
  );
}
