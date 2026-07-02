import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable as RNPressable, StyleSheet } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";

const TOAST_MS = 3000;

export type ToastType = "success" | "error" | "info";

type ToastOptions = { type: ToastType; message: string };
type ToastItem = ToastOptions & { id: number };

const ICONS: Record<ToastType, React.ComponentProps<typeof Ionicons>["name"]> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
};

const ICON_COLORS: Record<ToastType, string> = {
  success: colors.success,
  error: colors.error,
  info: colors.info,
};

const ACCENT_CLASS: Record<ToastType, string> = {
  success: "bg-success",
  error: "bg-error",
  info: "bg-info",
};

const ToastContext = createContext<{ show: (opts: ToastOptions) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx == null) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current != null) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    ({ type, message }: ToastOptions) => {
      if (timer.current != null) clearTimeout(timer.current);
      nextId.current += 1;
      setToast({ id: nextId.current, type, message });
      timer.current = setTimeout(dismiss, TOAST_MS);
      const feedback =
        type === "success"
          ? Haptics.NotificationFeedbackType.Success
          : type === "error"
            ? Haptics.NotificationFeedbackType.Error
            : null;
      if (feedback != null) {
        Haptics.notificationAsync(feedback).catch(() => {});
      }
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { top: insets.top + 8 }]}
      >
        {toast != null && (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.duration(200)}
            exiting={FadeOutUp.duration(150)}
          >
            <RNPressable onPress={dismiss} style={{ marginHorizontal: 16 }}>
              <View className="flex-row items-center gap-3 bg-surface border border-border rounded-2xl px-4 py-3 overflow-hidden">
                <View
                  className={ACCENT_CLASS[toast.type]}
                  style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4 }}
                />
                <Ionicons name={ICONS[toast.type]} size={22} color={ICON_COLORS[toast.type]} />
                <Text className="flex-1 text-sm font-medium text-content-primary">
                  {toast.message}
                </Text>
              </View>
            </RNPressable>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}
