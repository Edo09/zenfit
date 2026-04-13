import { useAuth } from "@/src/hooks/use-auth";
import type {
    Meal,
    MealInsert,
    MealItem,
    MealItemInsert,
    MealWithItems,
} from "@/src/types/database";
import { supabase } from "@/src/utils/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";

function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

export function useMeals() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setMeals(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const todaysMeals = useMemo(
    () => meals.filter((m) => m.date === todayDateString()),
    [meals],
  );

  const createMeal = async (data: MealInsert): Promise<Meal> => {
    const { data: meal, error } = await supabase
      .from("meals")
      .insert({ ...data, date: todayDateString() })
      .select()
      .single();
    if (error) throw error;
    setMeals((prev) => [meal, ...prev]);
    return meal;
  };

  const deleteMeal = async (id: string) => {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) throw error;
    setMeals((prev) => prev.filter((m) => m.id !== id));
  };

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

  const addMealItem = async (data: MealItemInsert): Promise<MealItem> => {
    const { data: item, error } = await supabase
      .from("meal_items")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return item;
  };

  const removeMealItem = async (id: string) => {
    const { error } = await supabase.from("meal_items").delete().eq("id", id);
    if (error) throw error;
  };

  return {
    meals,
    loading,
    todaysMeals,
    createMeal,
    deleteMeal,
    getMealWithItems,
    addMealItem,
    removeMealItem,
    refresh: fetchMeals,
  };
}
