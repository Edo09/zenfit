import React from "react";

import { Card, DisplayText } from "@/src/components/ui";
import { Icon, type IconName } from "@/src/components/ui/icon";
import { PressableScale } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";

type Props = {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
  icon?: IconName;
  /** Makes the card tappable (e.g. deep-link to the metric's source screen). */
  onPress?: () => void;
  /** Tighter layout for 3-up rows: icon+label stacked over the value. */
  compact?: boolean;
};

/** KPI tile — sunken icon chip, Hanken caption, Schibsted numeral. */
export function StatCard({
  label,
  value,
  unit,
  color,
  icon,
  onPress,
  compact = false,
}: Props) {
  const colors = useColors();
  const iconColor = color ?? colors.brandPrimaryDark;
  const card = compact ? (
    <Card className="flex-1 gap-1.5 px-3.5 py-3.5">
      <View className="flex-row items-center gap-1.5">
        {icon != null && <Icon name={icon} size={14} color={iconColor} />}
        <Text className="text-xs text-content-tertiary flex-1" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View className="flex-row items-baseline gap-1">
        <DisplayText size={20} tabular numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </DisplayText>
        {unit != null && <Text className="text-2xs text-content-tertiary">{unit}</Text>}
      </View>
    </Card>
  ) : (
    <Card className="flex-1 gap-2.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-content-tertiary flex-1" numberOfLines={1}>
          {label}
        </Text>
        {icon != null && (
          <View className="h-9 w-9 items-center justify-center rounded-2xl bg-surface-elevated">
            <Icon name={icon} size={17} color={iconColor} />
          </View>
        )}
      </View>
      <View className="flex-row items-baseline gap-1">
        <DisplayText size={24} tabular>
          {value}
        </DisplayText>
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
