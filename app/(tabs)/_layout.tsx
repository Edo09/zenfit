import { router, Tabs } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { FloatingTabBar } from "@/src/components/floating-tab-bar";
import { Icon } from "@/src/components/ui/icon";
import { useColors } from "@/src/theme/colors";
import { Pressable } from "@/src/tw";

export default function TabsLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Tabs
      // The dock floats over the scene, so screens add pb-28 to their scroll
      // content instead of the navigator reserving a bar-height inset.
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        animation: "shift",
        // Native scene container — themed so tab switches never flash
        // white in dark mode
        sceneStyle: { backgroundColor: colors.brandDark },
        headerStyle: { backgroundColor: colors.brandDark },
        headerTintColor: colors.contentPrimary,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: "SchibstedGrotesk_700Bold", fontSize: 18 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.home"), headerShown: false }} />
      <Tabs.Screen name="routines" options={{ title: t("tabs.routines"), headerShown: false }} />
      <Tabs.Screen name="meals" options={{ title: t("tabs.meals"), headerShown: false }} />
      <Tabs.Screen name="progress" options={{ title: t("tabs.progress"), headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile"), headerShown: false }} />
      {/* Reached from the home menu, not the dock (href: null hides it).
          Tabs headers have no native back button — provide one. */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: t("settings.title"),
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              className="pl-3 pr-2 py-1"
              hitSlop={8}
            >
              <Icon name="chevron-left" size={24} color={colors.contentPrimary} />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}
