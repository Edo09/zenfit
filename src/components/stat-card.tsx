import { Text, View } from "@/src/tw";
import React from "react";

type Props = {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
};

export function StatCard({ label, value, unit, color = "#16A34A" }: Props) {
  return (
    <View
      className="flex-1 bg-white rounded-2xl p-4 gap-1"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
    >
      <Text className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </Text>
      <View className="flex-row items-end gap-1">
        <Text
          className="text-2xl font-bold"
          style={{ color, fontVariant: ["tabular-nums"] as any }}
        >
          {value}
        </Text>
        {unit != null && (
          <Text className="text-xs text-gray-400 mb-1">{unit}</Text>
        )}
      </View>
    </View>
  );
}
