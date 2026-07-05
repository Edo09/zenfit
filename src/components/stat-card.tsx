import { Ionicons } from "@expo/vector-icons";
import React from "react";

import { Card } from "@/src/components/ui";
import { PressableScale } from "@/src/lib/motion";
import { colors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
  icon?: IoniconName;
  /** Makes the card tappable (e.g. deep-link to the metric's source screen). */
  onPress?: () => void;
};

export function StatCard({
  label,
  value,
  unit,
  color = colors.brandPrimary,
  icon,
  onPress,
}: Props) {
  const card = (
    <Card className="flex-1 gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-content-tertiary">{label}</Text>
        {icon != null && (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-info-soft">
            <Ionicons name={icon} size={16} color={color} />
          </View>
        )}
      </View>
      <View className="flex-row items-baseline gap-1">
        <Text
          className="text-2xl font-bold text-content-primary"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {value}
        </Text>
        {unit != null && <Text className="text-xs text-content-tertiary">{unit}</Text>}
      </View>
    </Card>
  );

  if (onPress == null) return card;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1"
    >
      {card}
    </PressableScale>
  );
}
