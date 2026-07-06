import { Image } from "expo-image";
import React from "react";

import { Spinner } from "@/src/components/ui";
import { useColors } from "@/src/theme/colors";
import { View } from "@/src/tw";

// This route shows a loader while AuthGate in _layout.tsx handles the redirect.
// Styled to match the native splash (black canvas, same logo) so the handoff
// from splash to this screen reads as one continuous loading state.
export default function Index() {
  const colors = useColors();
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-black">
      <Image
        source={require("@/assets/images/app-icon/splash-icon.png")}
        style={{ width: 200, height: 200 }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
      <Spinner size="large" color={colors.brandSecondary} />
    </View>
  );
}
