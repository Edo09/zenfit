import { Pressable, Text, View } from "@/src/tw";
import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View className="items-center justify-center py-20 gap-3">
      <Text className="text-5xl">🏋️</Text>
      <Text className="text-lg font-semibold text-gray-700 text-center">
        {title}
      </Text>
      {subtitle != null && (
        <Text className="text-sm text-gray-400 text-center px-6">{subtitle}</Text>
      )}
      {actionLabel != null && onAction != null && (
        <Pressable
          onPress={onAction}
          className="bg-green-600 rounded-xl px-6 py-3 mt-2"
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
