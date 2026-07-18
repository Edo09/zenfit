// TEMPORARY dev-only harness for the Dojo Poster redesign — delete before
// commit. Renders real tab screens with a seeded, fetch-disabled query cache
// so the redesign can be verified in the browser without a session.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";

import { qk } from "@/src/lib/query-keys";
import { toDateKey } from "@/src/utils/dates";
import type { Meal, Profile, RoutineWithExercises, WorkoutLog } from "@/src/types/database";
import HomeScreen from "../(tabs)/index";

const today = toDateKey();
const uid = undefined; // hooks key on user?.id which is undefined without a session

const MOCK_ROUTINES = [
  {
    id: "r1",
    name: "Upper Body Strength",
    description: "Push day — chest, shoulders & triceps",
    day_of_week: "monday",
    assigned_by: null,
    source: "ai",
    routine_exercises: [],
  },
  {
    id: "r2",
    name: "Lower Body Power",
    description: "Squat-focused legs & glutes",
    day_of_week: "thursday",
    assigned_by: null,
    source: "ai",
    routine_exercises: [],
  },
  {
    id: "r3",
    name: "HIIT Cardio Blast",
    description: "30-minute conditioning circuit",
    day_of_week: null,
    assigned_by: null,
    source: "user",
    routine_exercises: [],
  },
] as unknown as RoutineWithExercises[];

const MOCK_MEALS = [
  {
    id: "m1",
    date: today,
    meal_type: "breakfast",
    name: "Breakfast",
    meal_items: [
      { id: "i1", name: "Oatmeal & Berries", calories: 320, protein_g: 12, carbs_g: 58, fat_g: 9, portion: "1 bowl" },
      { id: "i2", name: "Protein Shake", calories: 200, protein_g: 24, carbs_g: 8, fat_g: 3, portion: "1 scoop" },
    ],
  },
  {
    id: "m2",
    date: today,
    meal_type: "lunch",
    name: "Lunch",
    meal_items: [
      { id: "i3", name: "Chicken & Rice Bowl", calories: 640, protein_g: 42, carbs_g: 68, fat_g: 18, portion: "1 plate" },
    ],
  },
] as unknown as Meal[];

const MOCK_LOGS = [
  {
    id: "l1",
    date: today,
    routine_id: "r1",
    routine_name: "Upper Body Strength",
    duration_minutes: 55,
    completed_exercises: [],
  },
] as unknown as WorkoutLog[];

const MOCK_PROFILE = {
  id: "u1",
  display_name: "Alex",
  calorie_goal: 2200,
  weight_kg: 72.4,
  session_duration: 60,
} as unknown as Profile;

const testClient = new QueryClient({
  defaultOptions: { queries: { enabled: false } },
});
testClient.setQueryData(qk.routines(uid), MOCK_ROUTINES);
testClient.setQueryData(qk.meals(uid), MOCK_MEALS);
testClient.setQueryData(qk.progress(uid), MOCK_LOGS);
testClient.setQueryData(qk.profile(uid), MOCK_PROFILE);
testClient.setQueryData(qk.exercises(), []);

const SCREENS: Record<string, React.ComponentType> = {
  home: HomeScreen,
};

export default function PosterTestScreen() {
  const { screen } = useLocalSearchParams<{ screen?: string }>();
  const Target = SCREENS[screen ?? "home"] ?? HomeScreen;
  return (
    <QueryClientProvider client={testClient}>
      <Target />
    </QueryClientProvider>
  );
}
