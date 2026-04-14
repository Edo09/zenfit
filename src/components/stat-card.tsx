import { Text, View } from "@/src/tw";
import React from "react";

type Props = {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
};

export function StatCard({ label, value, unit, color = "#2563EB" }: Props) {
  return (
    <View
      className="flex-1 bg-surface rounded-3xl p-5 gap-0 overflow-hidden"
      style={{
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)"
      }}
    >
      <View
        className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-10"
        style={{ backgroundColor: color }}
      />

      <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-1">
        {label}
      </Text>

      <View className="flex-row items-baseline gap-1">
        <Text
          className="text-3xl font-black tracking-tight"
          style={{ color, fontVariant: ["tabular-nums"] as any }}
        >
          {value}
        </Text>
        {unit != null && (
          <Text className="text-xs font-bold text-gray-500 mb-1">{unit}</Text>
        )}
      </View>

      <View className="h-1 w-8 rounded-full mt-2" style={{ backgroundColor: color, opacity: 0.3 }} />
    </View>
  );
}
