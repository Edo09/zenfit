import { useAuth } from "@/src/hooks/use-auth";
import type {
    Meal,
    MealInsert,
    MealItem,
    MealItemInsert,
    MealWithItems,
} from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

export function useMeals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: meals = [],
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["meals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Meal[];
    },
    enabled: !!user,
  });

  const todaysMeals = useMemo(
    () => meals.filter((m) => m.date === todayDateString()),
    [meals],
  );

  const createMealMutation = useMutation({
    mutationFn: async (data: MealInsert) => {
      const { data: meal, error } = await supabase
        .from("meals")
        .insert({ ...data, date: todayDateString() })
        .select()
        .single();
      if (error) throw error;
      return meal as Meal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
    },
  });

  const getMealWithItems = async (
    id: string,
  ): Promise<MealWithItems | null> => {
    const { data, error } = await supabase
      .from("meals")
      .select("*, meal_items(*)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as MealWithItems;
  };

  const addMealItemMutation = useMutation({
    mutationFn: async (data: MealItemInsert) => {
      const { data: item, error } = await supabase
        .from("meal_items")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return item as MealItem;
    },
  });

  const removeMealItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_items").delete().eq("id", id);
      if (error) throw error;
    },
  });

  return {
    meals,
    loading,
    todaysMeals,
    createMeal: createMealMutation.mutateAsync,
    deleteMeal: deleteMealMutation.mutateAsync,
    getMealWithItems,
    addMealItem: addMealItemMutation.mutateAsync,
    removeMealItem: removeMealItemMutation.mutateAsync,
    refresh: refetch,
  };
}
