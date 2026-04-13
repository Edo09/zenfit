import { useRoutines } from "@/src/hooks/use-routines";
import { Pressable, ScrollView, Text, TextInput, View } from "@/src/tw";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert } from "react-native";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function CreateRoutineScreen() {
  const { createRoutine } = useRoutines();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Routine name is required");
      return;
    }
    try {
      setLoading(true);
      await createRoutine({
        name: name.trim(),
        description: description.trim() || undefined,
        day_of_week: dayOfWeek ?? undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not create routine");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-gray-50"
      contentContainerClassName="px-4 py-6 gap-5"
    >
      <View className="gap-4">
        <View className="gap-1">
          <Text className="text-sm font-medium text-gray-700">Routine Name *</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholder="e.g. Upper Body Strength"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="gap-1">
          <Text className="text-sm font-medium text-gray-700">Description</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholder="Optional description..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-gray-700">Scheduled Day (optional)</Text>
          <View className="flex-row flex-wrap gap-2">
            {DAYS.map((day) => (
              <Pressable
                key={day}
                onPress={() => setDayOfWeek(dayOfWeek === day ? null : day)}
                className={`rounded-full px-4 py-2 ${dayOfWeek === day ? "bg-green-600" : "bg-white border border-gray-200"}`}
              >
                <Text
                  className={`text-sm font-medium capitalize ${dayOfWeek === day ? "text-white" : "text-gray-600"}`}
                >
                  {day.slice(0, 3)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Pressable
        onPress={handleCreate}
        disabled={loading}
        className="bg-green-600 rounded-2xl py-4 items-center mt-2"
        style={{ boxShadow: "0 4px 12px rgba(22, 163, 74, 0.35)" }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold text-base">Create Routine</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
