import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";
import { BarChart3, Dumbbell, Home, User, Utensils } from "lucide-react-native";

import { useColors } from "@/src/theme/colors";
import { Pressable, Text } from "@/src/tw";

/**
 * Habbito floating dock — replaces the Dojo Poster bordered tab bar with the
 * red 3px tick. Drop this <FloatingTabBar /> into <Tabs tabBar={...}> in
 * app/(tabs)/_layout.tsx. Active item = ink icon/label + a 5px lime dot above.
 *
 * Order/labels: Home · Train · Fuel · Progress · You
 */
const ICONS: Record<string, React.ComponentType<any>> = {
  index: Home,
  routines: Dumbbell,
  meals: Utensils,
  progress: BarChart3,
  profile: User,
};
const LABELS: Record<string, string> = {
  index: "Home",
  routines: "Train",
  meals: "Fuel",
  progress: "Progress",
  profile: "You",
};

export function FloatingTabBar({ state, navigation }: any) {
  const c = useColors();
  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 14,
        height: 66,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingHorizontal: 6,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 26,
        shadowColor: "#000",
        shadowOpacity: 0.16,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
      }}
    >
      {state.routes
        .filter((r: any) => ICONS[r.name])
        .map((route: any) => {
          const idx = state.routes.indexOf(route);
          const focused = state.index === idx;
          const Icon = ICONS[route.name];
          const color = focused ? c.contentPrimary : c.contentMuted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ flex: 1, alignItems: "center", gap: 2, paddingVertical: 6 }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 9,
                  marginBottom: 1,
                  backgroundColor: focused ? c.brandPrimary : "transparent",
                }}
              />
              <Icon size={23} color={color} strokeWidth={1.9} />
              <Text
                style={{ fontSize: 9.5, letterSpacing: 0.2, color }}
                className="font-bold"
              >
                {LABELS[route.name]}
              </Text>
            </Pressable>
          );
        })}
    </View>
  );
}

/* Usage in app/(tabs)/_layout.tsx:
 *
 *   import { FloatingTabBar } from "@/src/components/floating-tab-bar";
 *   ...
 *   <Tabs
 *     tabBar={(props) => <FloatingTabBar {...props} />}
 *     screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.brandDark } }}
 *   >
 *     ...same <Tabs.Screen /> entries as today (remove the old TabIcon)...
 *   </Tabs>
 *
 * Give scroll content paddingBottom ~96 so it clears the floating dock.
 */
