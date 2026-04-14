import { EmptyState } from "@/src/components/empty-state";
import { useProgress } from "@/src/hooks/use-progress";
import { useRoutines } from "@/src/hooks/use-routines";
import { Pressable, Text, TextInput, View } from "@/src/tw";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList } from "react-native";

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ProgressScreen() {
  const { logs, loading, createLog, deleteLog } = useProgress();
  const { routines } = useRoutines();
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogWorkout = async () => {
    if (!selectedRoutineId) {
      Alert.alert("Error", "Please select a routine");
      return;
    }
    const routine = routines.find((r) => r.id === selectedRoutineId);
    if (!routine) return;

    try {
      setSubmitting(true);
      await createLog({
        routine_id: selectedRoutineId,
        routine_name: routine.name,
        duration_minutes: duration ? parseInt(duration, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      setShowLogForm(false);
      setSelectedRoutineId(null);
      setDuration("");
      setNotes("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Log", `Remove workout log for "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteLog(id),
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-dark">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-dark">
      {/* Log workout inline form */}
      {showLogForm && (
        <View
          className="bg-surface mx-4 mt-4 rounded-2xl p-4 gap-3"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          <Text className="font-semibold text-white">Log a Workout</Text>

          {routines.length === 0 ? (
            <View className="items-center gap-2 py-2">
              <Text className="text-gray-400 text-sm">No routines yet.</Text>
              <Pressable onPress={() => { setShowLogForm(false); router.push("/(tabs)/routines/create"); }}>
                <Text className="text-brand-primary font-medium text-sm">Create a routine first</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text className="text-sm text-gray-400">Select Routine</Text>
              <View className="flex-row flex-wrap gap-2">
                {routines.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => setSelectedRoutineId(r.id)}
                    className={`rounded-full px-3 py-1.5 ${selectedRoutineId === r.id ? "bg-brand-primary" : "bg-brand-dark"}`}
                  >
                    <Text className={`text-sm font-medium ${selectedRoutineId === r.id ? "text-white" : "text-gray-300"}`}>
                      {r.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <View className="flex-row gap-2">
            <View className="flex-1 gap-1">
              <Text className="text-xs text-gray-400">Duration (min)</Text>
              <TextInput
                className="bg-brand-dark border border-surface-elevated rounded-xl px-3 py-2 text-white"
                keyboardType="number-pad"
                placeholder="45"
                placeholderTextColor="#64748B"
                value={duration}
                onChangeText={setDuration}
              />
            </View>
            <View className="flex-2 gap-1" style={{ flex: 2 }}>
              <Text className="text-xs text-gray-400">Notes (optional)</Text>
              <TextInput
                className="bg-brand-dark border border-surface-elevated rounded-xl px-3 py-2 text-white"
                placeholder="How did it go?"
                placeholderTextColor="#64748B"
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setShowLogForm(false)}
              className="flex-1 border border-surface-elevated rounded-xl py-3 items-center"
            >
              <Text className="text-gray-400 font-medium">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleLogWorkout}
              disabled={submitting}
              className="flex-1 bg-brand-primary rounded-xl py-3 items-center"
            >
              {submitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium">Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        data={logs}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View
            className="bg-surface rounded-2xl px-4 py-4 flex-row items-start justify-between"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <View className="flex-1 gap-1">
              <Text className="font-semibold text-white">{item.routine_name}</Text>
              <Text className="text-gray-400 text-sm">{formatDate(item.date)}</Text>
              {item.duration_minutes != null && (
                <View className="self-start bg-brand-secondary/10 rounded-full px-3 py-0.5 mt-1">
                  <Text className="text-brand-secondary text-xs font-medium">
                    {item.duration_minutes} min
                  </Text>
                </View>
              )}
              {item.notes && (
                <Text className="text-gray-400 text-sm mt-1" selectable>{item.notes}</Text>
              )}
            </View>
            <Pressable
              onPress={() => handleDelete(item.id, item.routine_name)}
              className="p-2 ml-2"
              hitSlop={8}
            >
              <Text className="text-red-400">✕</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No workouts logged"
            subtitle="Log your first workout to track your progress"
            actionLabel="Log Workout"
            onAction={() => setShowLogForm(true)}
          />
        }
      />

      {/* FAB */}
      {!showLogForm && (
        <Pressable
          onPress={() => setShowLogForm(true)}
          className="absolute bottom-8 right-6 bg-brand-primary rounded-full w-14 h-14 items-center justify-center"
          style={{ boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)" }}
        >
          <Text className="text-white text-3xl font-light leading-none">+</Text>
        </Pressable>
      )}
    </View>
  );
}
