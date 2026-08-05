import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type HeaderPanelProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Page header: flat canvas, safe-area-aware padding, screen gutter of 20.
 * Deliberately undecorated — the hierarchy comes from type and from the
 * feature card underneath it, not from a panel treatment.
 */
export function HeaderPanel({ className, children }: HeaderPanelProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn("bg-brand-dark", className)}
      style={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 12 }}
    >
      {children}
    </View>
  );
}
