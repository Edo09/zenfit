import React from "react";
import { useTranslation } from "react-i18next";

import { CapsLabel, Card, DisplayText, SegmentedControl } from "@/src/components/ui";
import { Icon, type IconName } from "@/src/components/ui/icon";
import { PressableScale } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type {
  NutritionPlanMeal,
  NutritionPlanOption,
  NutritionPlanWithDetails,
  PlanMealType,
} from "@/src/types/database";
import {
  appliesOn,
  formatRange,
  targetFor,
  visibleItems,
  visibleMeals,
  type ResolvedDay,
} from "@/src/utils/nutrition-plan";

type Props = {
  plan: NutritionPlanWithDetails;
  day: ResolvedDay;
  autoDay: ResolvedDay;
  overridden: boolean;
  onSelectDay: (day: ResolvedDay | null) => void;
  onRegister: (meal: NutritionPlanMeal, option: NutritionPlanOption) => void;
};

// Read-only render of the coach's protocol. Two filters run at once: applies_to
// hides whole slots, and each food's own day_type hides individual lines — which
// together are what "carb cycling" means in the client's hands.
export function NutritionPlanView({
  plan,
  day,
  autoDay,
  overridden,
  onSelectDay,
  onRegister,
}: Props) {
  const { t } = useTranslation();
  const colors = useColors();

  const target = targetFor(plan, day);
  const meals = visibleMeals(plan, day);

  const kcal = target ? formatRange(target.kcal_min, target.kcal_max) : null;
  const protein = target
    ? formatRange(target.protein_min_g, target.protein_max_g)
    : null;
  const carbs = target ? formatRange(target.carbs_min_g, target.carbs_max_g) : null;
  const fat = target ? formatRange(target.fat_min_g, target.fat_max_g) : null;
  const hasTarget = kcal != null || protein != null || carbs != null || fat != null;

  return (
    <View className="gap-3">
      {/* Plan header */}
      <Card className="gap-2">
        <View className="flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-2xl bg-brand-primary-soft">
            <Icon name="apple" size={17} color={colors.brandPrimaryDark} />
          </View>
          <DisplayText size={17} className="flex-1" numberOfLines={2}>
            {plan.name}
          </DisplayText>
          <View className="flex-row items-center gap-1.5 rounded-full bg-brand-primary px-2.5 py-1">
            <Icon name="award" size={12} color={colors.onAccent} />
            <Text className="text-xs font-semibold text-on-accent">
              {t("coach.badge")}
            </Text>
          </View>
        </View>
        {plan.focus != null && (
          <Text className="text-sm text-content-secondary">{plan.focus}</Text>
        )}
      </Card>

      {/* Day-type control. Only shown when the plan actually cycles — otherwise
          there is only one kind of day and the toggle would be a lie. */}
      {plan.day_cycling && (
        <View className="gap-1.5">
          <SegmentedControl
            segments={[
              { key: "training", label: t("nutritionPlan.trainingDay") },
              { key: "rest", label: t("nutritionPlan.restDay") },
            ]}
            value={day}
            // Picking the day the training calendar already implies clears the
            // override, so the screen goes back to following the plan.
            onChange={(k) => onSelectDay(k === autoDay ? null : (k as ResolvedDay))}
          />
          <Text className="text-xs text-content-tertiary">
            {overridden
              ? t("nutritionPlan.overridden")
              : t("nutritionPlan.autoFromRoutines")}
          </Text>
        </View>
      )}

      {/* Today's macro target — the only numbers the coach wrote. */}
      {hasTarget && (
        <Card className="gap-1.5">
          <CapsLabel size={9.5} className="text-content-muted">
            {t("nutritionPlan.targetTitle")}
          </CapsLabel>
          {kcal != null && (
            <View className="flex-row items-baseline gap-1.5">
              <DisplayText size={26} weight="extrabold" tabular>
                {kcal}
              </DisplayText>
              <Text className="text-sm text-content-tertiary">
                {t("nutritionPlan.kcal")}
              </Text>
            </View>
          )}
          <View className="flex-row flex-wrap gap-x-4 gap-y-1">
            {protein != null && (
              <MacroBit
                label={t("nutritionPlan.protein")}
                value={protein}
                color={colors.macroProtein}
              />
            )}
            {carbs != null && (
              <MacroBit
                label={t("nutritionPlan.carbs")}
                value={carbs}
                color={colors.macroCarbs}
              />
            )}
            {fat != null && (
              <MacroBit
                label={t("nutritionPlan.fat")}
                value={fat}
                color={colors.macroFat}
              />
            )}
          </View>
        </Card>
      )}

      {meals.map((meal) => (
        <MealCard
          key={meal.id}
          meal={meal}
          day={day}
          cycling={plan.day_cycling}
          onRegister={(option) => onRegister(meal, option)}
        />
      ))}

      {plan.notes != null && (
        <Card className="gap-1.5">
          <CapsLabel size={9.5} className="text-content-muted">
            {t("nutritionPlan.coachNotes")}
          </CapsLabel>
          <Text className="text-sm text-content-secondary">{plan.notes}</Text>
        </Card>
      )}
    </View>
  );
}

function MacroBit({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Text className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>
      <Text className="font-bold" style={{ color }}>
        {label}{" "}
      </Text>
      <Text className="text-content-secondary">{value} g</Text>
    </Text>
  );
}

const MEAL_ICON: Record<PlanMealType, IconName> = {
  breakfast: "sunrise",
  lunch: "utensils",
  dinner: "moon",
  snack: "coffee",
  pre_workout: "zap",
  post_workout: "dumbbell",
};

function MealCard({
  meal,
  day,
  cycling,
  onRegister,
}: {
  meal: NutritionPlanMeal;
  day: ResolvedDay;
  cycling: boolean;
  onRegister: (option: NutritionPlanOption) => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const applies = !cycling || appliesOn(meal.applies_to, day);
  const title = meal.label ?? t(`meals.${meal.meal_type as "breakfast"}`, meal.meal_type);

  return (
    <Card className="gap-2.5">
      <View className="flex-row items-center gap-2.5">
        <Icon name={MEAL_ICON[meal.meal_type]} size={16} color={colors.contentTertiary} />
        <DisplayText size={16} className="flex-1" numberOfLines={1}>
          {title}
        </DisplayText>
        {meal.is_optional && (
          <View className="rounded-full bg-info-soft px-2.5 py-1">
            <Text className="text-xs font-semibold text-info">
              {t("nutritionPlan.optional")}
            </Text>
          </View>
        )}
      </View>

      {meal.time_hint != null && (
        <Text className="text-xs text-content-tertiary">{meal.time_hint}</Text>
      )}

      {!applies ? (
        // The slot is gated off today — but its note is the substitution the
        // client still needs, so it surfaces instead of the slot vanishing.
        <View className="rounded-2xl bg-warning-soft p-3">
          <Text className="text-xs font-semibold text-warning">
            {t("nutritionPlan.slotHiddenToday")}
          </Text>
          {meal.notes != null && (
            <Text className="mt-1 text-sm text-content-secondary">{meal.notes}</Text>
          )}
        </View>
      ) : (
        <>
          {meal.nutrition_plan_options.map((option) => {
            const foods = cycling
              ? visibleItems(option, day)
              : option.nutrition_plan_option_items;
            if (foods.length === 0) return null;
            return (
              <View
                key={option.id}
                className="rounded-2xl bg-surface-sunken p-3 gap-1.5"
              >
                {option.label != null && (
                  <CapsLabel size={9.5} className="text-content-muted">
                    {option.label}
                  </CapsLabel>
                )}
                {foods.map((food) => (
                  <Text key={food.id} className="text-sm text-content-secondary">
                    · {food.name}
                  </Text>
                ))}
                {option.notes != null && (
                  <Text className="text-xs text-content-tertiary">{option.notes}</Text>
                )}
                {/* Straight into the camera estimator: the coach prescribes the
                    food, every number comes from the client's photo. */}
                <PressableScale
                  haptic
                  onPress={() => onRegister(option)}
                  accessibilityRole="button"
                  accessibilityLabel={t("nutritionPlan.register")}
                  className="mt-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-brand-primary-soft py-2.5"
                >
                  <Icon name="camera" size={15} color={colors.brandPrimaryDark} />
                  <Text className="text-xs font-semibold text-brand-primary-dark">
                    {t("nutritionPlan.register")}
                  </Text>
                </PressableScale>
              </View>
            );
          })}
          {meal.notes != null && (
            <Text className="text-xs text-content-tertiary">{meal.notes}</Text>
          )}
        </>
      )}
    </Card>
  );
}
