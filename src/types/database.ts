// TypeScript types matching the Supabase database schema

export type UserRole = "user" | "coach";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: "sedentary" | "active" | "very_active" | null;
  profession_type: "desk" | "physical" | null;
  days_per_week: number | null;
  session_duration: number | null;
  available_days: string[] | null;
  calorie_goal: number | null;
  role: UserRole;
  whatsapp: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

// Public subset of a coach's profile that clients are allowed to read.
export type Coach = Pick<Profile, "id" | "display_name" | "avatar_url" | "whatsapp">;

export type Routine = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  day_of_week: string | null;
  // null = self-made; a coach's profile id = assigned by the coach (read-only).
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RoutineExercise = {
  id: string;
  routine_id: string;
  user_id: string;
  name: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  rest_seconds: number;
  sort_order: number;
  notes: string | null;
  created_at: string;
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type Meal = {
  id: string;
  user_id: string;
  name: string;
  meal_type: MealType;
  date: string;
  // null = self-made; a coach's profile id = assigned by the coach (read-only).
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MealItem = {
  id: string;
  meal_id: string;
  user_id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  portion: string | null;
  photo_path: string | null;
  created_at: string;
};

export type WorkoutLog = {
  id: string;
  user_id: string;
  routine_id: string | null;
  routine_name: string;
  date: string;
  duration_minutes: number | null;
  notes: string | null;
  completed_exercises: string[] | null;
  created_at: string;
};

// Composite types for queries with joins
export type RoutineWithExercises = Routine & {
  routine_exercises: RoutineExercise[];
};

export type MealWithItems = Meal & {
  meal_items: MealItem[];
};

// Insert types (omit auto-generated fields)
export type RoutineInsert = Pick<Routine, "name"> &
  Partial<Pick<Routine, "description" | "day_of_week">>;

export type RoutineExerciseInsert = Pick<
  RoutineExercise,
  "routine_id" | "name"
> &
  Partial<
    Pick<
      RoutineExercise,
      "sets" | "reps" | "weight_kg" | "rest_seconds" | "sort_order" | "notes"
    >
  >;

export type MealInsert = Pick<Meal, "name" | "meal_type"> &
  Partial<Pick<Meal, "date">>;

export type MealItemInsert = Pick<MealItem, "meal_id" | "name"> &
  Partial<
    Pick<
      MealItem,
      "calories" | "protein_g" | "carbs_g" | "fat_g" | "portion" | "photo_path"
    >
  >;

export type WorkoutLogInsert = Pick<WorkoutLog, "routine_name"> &
  Partial<
    Pick<WorkoutLog, "routine_id" | "date" | "duration_minutes" | "notes" | "completed_exercises">
  >;

export type MembershipStatus = "active" | "expired" | "paused" | "cancelled";

// Coach-managed membership. Editable only by the coach (web); clients read own.
export type Membership = {
  id: string;
  client_id: string;
  coach_id: string | null;
  plan_name: string | null;
  status: MembershipStatus;
  price: number | null;
  currency: string | null;
  started_at: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
