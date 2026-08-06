import React from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/src/components/ui/icon";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";

/**
 * Habbito floating dock. Active item = ink icon/label plus a 5px cyan dot
 * above the glyph — the dot, not color alone, signals the active tab.
 * Order/labels: Home · Train · Fuel · Progress · You.
 *
 * The dock is `position: absolute` and floats over EVERY screen inside the
 * Tabs navigator — including screens pushed onto a tab's own nested Stack
 * (e.g. a routine's detail view), not just the 5 tab roots. Anything with
 * its own sticky bottom bar (a Screen `footer`, a FAB) must add
 * DOCK_CLEARANCE + insets.bottom of space itself or the dock silently
 * overlaps and hides it — scrollable content instead uses a flat pb-28
 * since it can scroll clear on its own.
 */
export const DOCK_CLEARANCE = 96;

const ICONS: Record<string, IconName> = {
  index: "home",
  routines: "dumbbell",
  meals: "utensils",
  progress: "chart",
  profile: "user",
};

const LABEL_KEYS: Record<string, string> = {
  index: "tabs.home",
  routines: "tabs.train",
  meals: "tabs.fuel",
  progress: "tabs.progress",
  profile: "tabs.you",
};

// Structurally typed: @react-navigation/bottom-tabs is a transitive dep of
// expo-router, so importing BottomTabBarProps from it isn't resolvable here.
type TabRoute = { key: string; name: string };
type TabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
      className="absolute flex-row items-center bg-surface border border-border"
      style={{
        left: 16,
        right: 16,
        bottom: 14 + insets.bottom,
        height: 66,
        paddingHorizontal: 6,
        borderRadius: 26,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.16,
        shadowRadius: 26,
        elevation: 14,
      }}
    >
      {state.routes
        .filter((route) => ICONS[route.name] != null)
        .map((route) => {
          const focused = state.index === state.routes.indexOf(route);
          const color = focused ? colors.contentPrimary : colors.contentMuted;
          const label = t(LABEL_KEYS[route.name]);
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              className="flex-1 items-center gap-0.5 py-1.5"
            >
              <View
                className="rounded-full"
                style={{
                  width: 5,
                  height: 5,
                  marginBottom: 1,
                  backgroundColor: focused ? colors.brandPrimary : "transparent",
                }}
              />
              <Icon name={ICONS[route.name]} size={23} color={color} />
              <Text className="font-bold" style={{ fontSize: 9.5, letterSpacing: 0.2, color }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
    </View>
  );
}
