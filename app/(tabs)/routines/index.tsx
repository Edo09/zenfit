import { EmptyState } from "@/src/components/empty-state";
import { RoutineCard } from "@/src/components/routine-card";
import { useRoutines } from "@/src/hooks/use-routines";
import { Pressable, Text, View } from "@/src/tw";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, FlatList } from "react-native";

export default function RoutinesScreen() {
  const { routines, loading, deleteRoutine } = useRoutines();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={routines}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <RoutineCard
            routine={item}
            onPress={() => router.push(`/(tabs)/routines/${item.id}`)}
            onDelete={() => deleteRoutine(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No routines yet"
            subtitle="Create your first workout routine to get started"
            actionLabel="Create Routine"
            onAction={() => router.push("/(tabs)/routines/create")}
          />
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/(tabs)/routines/create")}
        className="absolute bottom-8 right-6 bg-green-600 rounded-full w-14 h-14 items-center justify-center"
        style={{ boxShadow: "0 4px 12px rgba(22, 163, 74, 0.4)" }}
      >
        <Text className="text-white text-3xl font-light leading-none">+</Text>
      </Pressable>
    </View>
  );
}
