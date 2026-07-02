import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { Modal, Pressable as RNPressable, StyleSheet } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text, View } from "@/src/tw";

import { Button } from "./button";

const ANIM_MS = 220;

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: ANIM_MS });
      if (destructive) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    } else {
      progress.value = withTiming(0, { duration: ANIM_MS }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, destructive, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 80 }],
    opacity: progress.value,
  }));

  if (!mounted) return null;

  return (
    <Modal transparent statusBarTranslucent visible animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0, 0, 0, 0.55)" }, backdropStyle]}
      >
        <RNPressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={cancelLabel ?? t("common.cancel")} />
      </Animated.View>
      <View className="flex-1 justify-end" pointerEvents="box-none">
        <Animated.View style={sheetStyle}>
          <View
            className="bg-surface rounded-t-3xl px-6 pt-6 gap-2"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="self-center h-1 w-10 rounded-full bg-surface-elevated mb-2" />
            <Text className="text-lg font-semibold text-content-primary">{title}</Text>
            {message != null && (
              <Text className="text-base text-content-secondary">{message}</Text>
            )}
            <View className="flex-row gap-3 mt-4">
              <View className="flex-1">
                <Button variant="secondary" onPress={onClose} className="w-full">
                  {cancelLabel ?? t("common.cancel")}
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  variant={destructive ? "destructive" : "primary"}
                  onPress={onConfirm}
                  className="w-full"
                >
                  {confirmLabel}
                </Button>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
