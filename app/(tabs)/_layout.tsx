import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import type { ColorValue } from "react-native";

import { useColors } from "@/src/theme/colors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, color }: { name: IoniconName; color: ColorValue }) {
  return <Ionicons name={name} size={24} color={color} />;
}

export default function TabsLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        animation: "shift",
        // Native scene container — themed so tab switches never flash
        // white in dark mode
        sceneStyle: { backgroundColor: colors.brandDark },
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.contentMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.brandDark },
        headerTintColor: colors.contentPrimary,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: t("tabs.routines"),
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="barbell" color={color} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: t("tabs.meals"),
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="restaurant" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t("tabs.progress"),
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
