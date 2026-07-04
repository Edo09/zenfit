import { useAuth } from "@/src/hooks/use-auth";
import { enqueue } from "@/src/lib/outbox";
import { overlayMeals } from "@/src/lib/outbox-overlay";
import { newId } from "@/src/lib/ids";
import { qk } from "@/src/lib/query-keys";
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

// Items ride along with the list so the whole meals tab (list + detail) is a
// single persisted query that works offline.
async function fetchMeals(userId: string): Promise<MealWithItems[]> {
  const { data, error } = await supabase
    .from("meals")
    .select("*, meal_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return overlayMeals(userId, data as MealWithItems[]);
}

export function useMeals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const listKey = qk.meals(user?.id);

  const {
    data: meals = [],
    isPending: loading,
    isError: error,
    isRefetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: listKey,
    queryFn: () => fetchMeals(user!.id),
    enabled: !!user,
  });

  const todaysMeals = useMemo(
    () => meals.filter((m) => m.date === todayDateString()),
    [meals],
  );

  // All mutations are local-first: build the full row (client id), apply it
  // to the cache, queue the op. The outbox syncs and then invalidates.
  const createMealMutation = useMutation({
    mutationFn: async (data: MealInsert) => {
      const now = new Date().toISOString();
      const meal: Meal = {
        id: newId(),
        user_id: user!.id,
        name: data.name,
        meal_type: data.meal_type,
        date: data.date ?? todayDateString(),
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<MealWithItems[]>(listKey, (old = []) => [
        { ...meal, meal_items: [] },
        ...old,
      ]);
      await enqueue({
        userId: user!.id,
        table: "meals",
        kind: "insert",
        payload: meal,
      });
      return meal;
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: async (id: string) => {
      queryClient.setQueryData<MealWithItems[]>(listKey, (old = []) =>
        old.filter((m) => m.id !== id),
      );
      await enqueue({
        userId: user!.id,
        table: "meals",
        kind: "delete",
        payload: { id },
      });
    },
  });

  const addMealItemMutation = useMutation({
    mutationFn: async (data: MealItemInsert) => {
      const item: MealItem = {
        id: newId(),
        meal_id: data.meal_id,
        user_id: user!.id,
        name: data.name,
        calories: data.calories ?? 0,
        protein_g: data.protein_g ?? 0,
        carbs_g: data.carbs_g ?? 0,
        fat_g: data.fat_g ?? 0,
        portion: data.portion ?? null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<MealWithItems[]>(listKey, (old = []) =>
        old.map((m) =>
          m.id === item.meal_id
            ? { ...m, meal_items: [...m.meal_items, item] }
            : m,
        ),
      );
      await enqueue({
        userId: user!.id,
        table: "meal_items",
        kind: "insert",
        payload: item,
      });
      return item;
    },
  });

  const removeMealItemMutation = useMutation({
    mutationFn: async (id: string) => {
      queryClient.setQueryData<MealWithItems[]>(listKey, (old = []) =>
        old.map((m) => ({
          ...m,
          meal_items: m.meal_items.filter((i) => i.id !== id),
        })),
      );
      await enqueue({
        userId: user!.id,
        table: "meal_items",
        kind: "delete",
        payload: { id },
      });
    },
  });

  return {
    meals,
    loading,
    error,
    refreshing,
    todaysMeals,
    createMeal: createMealMutation.mutateAsync,
    deleteMeal: deleteMealMutation.mutateAsync,
    addMealItem: addMealItemMutation.mutateAsync,
    removeMealItem: removeMealItemMutation.mutateAsync,
    refresh: refetch,
  };
}

// Detail view derived from the (persisted) list cache — no separate fetch, so
// it renders offline.
export function useMealDetail(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.meals(user?.id),
    queryFn: () => fetchMeals(user!.id),
    enabled: !!user && !!id,
    select: (all: MealWithItems[]) => all.find((m) => m.id === id) ?? null,
  });
}
