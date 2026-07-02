import { useHeaderHeight } from "@react-navigation/elements";
import React from "react";
import { KeyboardAvoidingView, RefreshControl } from "react-native";

import { colors } from "@/src/theme/colors";
import { ScrollView, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

type ScreenProps = {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Wrap in KeyboardAvoidingView — use on screens with text inputs. */
  keyboard?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
  contentContainerClassName?: string;
};

export function Screen({
  children,
  scroll = true,
  keyboard = false,
  refreshing = false,
  onRefresh,
  className,
  contentContainerClassName,
}: ScreenProps) {
  const headerHeight = useHeaderHeight();

  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn("px-4 py-6 gap-5", contentContainerClassName)}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh != null ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brandPrimary}
            colors={[colors.brandPrimary]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn("flex-1", contentContainerClassName)}>{children}</View>
  );

  return (
    <View className={cn("flex-1 bg-brand-dark", className)}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          // "padding" on Android too: with edge-to-edge enabled (SDK 54 default),
          // adjustResize no longer resizes the window, so KAV must do the work.
          behavior="padding"
          keyboardVerticalOffset={headerHeight}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}
