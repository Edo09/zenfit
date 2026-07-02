import { Ionicons } from "@expo/vector-icons";
import React from "react";

import { Spinner } from "@/src/components/ui";
import { colors } from "@/src/theme/colors";
import { View } from "@/src/tw";

// This route shows a loader while AuthGate in _layout.tsx handles the redirect.
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-brand-dark">
      <View className="w-20 h-20 bg-brand-primary rounded-2xl items-center justify-center">
        <Ionicons name="barbell" size={40} color={colors.white} />
      </View>
      <Spinner size="large" />
    </View>
  );
}
