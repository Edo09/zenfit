import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, color }: { name: IoniconName; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

export default function TabsLayout() {
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
          title: "Home",
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: "Routines",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="barbell" color={color} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="restaurant" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="bar-chart" color={color} />,
        }}
      />
    </Tabs>
  );
}
