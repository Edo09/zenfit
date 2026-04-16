import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, color }: { name: IoniconName; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#0F172A",
          borderTopColor: "#1E293B",
        },
        headerStyle: { backgroundColor: "#0F172A" },
        headerTintColor: "#F8FAFC",
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
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
    </Tabs>
  );
}
