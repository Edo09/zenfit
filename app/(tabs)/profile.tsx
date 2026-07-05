import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ScrollView as RNScrollView } from "react-native";

import {
  Button,
  Chip,
  Input,
  LoadingBlock,
  Screen,
  SelectField,
  useToast,
} from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import { useProfile } from "@/src/hooks/use-profile";
import { Pressable, Text, View } from "@/src/tw";
import type { Profile } from "@/src/types/database";
import { recommendedCalorieGoal } from "@/src/utils/calories";
import { cn } from "@/src/utils/cn";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_VALUES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function OptionButton({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        "flex-1 py-3 px-3 rounded-xl items-center border",
        selected ? "bg-brand-primary border-brand-primary" : "bg-surface border-border"
      )}
      onPress={handlePress}
    >
      <Text
        className={cn(
          "font-semibold text-sm",
          selected ? "text-white" : "text-content-secondary"
        )}
      >
        {label}
      </Text>
      {description != null && (
        <Text
          className={cn(
            "text-xs text-center mt-0.5",
            selected ? "text-white/80" : "text-content-muted"
          )}
        >
          {description}
        </Text>
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useProfile(user?.id);
  // Deep-link from the dashboard's goal KPI: scroll to and flash the
  // calorie-goal field. `ts` changes per tap so repeat taps re-trigger.
  const { highlight, ts } = useLocalSearchParams<{ highlight?: string; ts?: string }>();
  const scrollRef = useRef<RNScrollView>(null);
  const nutritionY = useRef(0);
  const [highlightGoal, setHighlightGoal] = useState(false);

  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Profile["sex"]>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<Profile["activity_level"]>(null);
  const [professionType, setProfessionType] = useState<Profile["profession_type"]>(null);
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [sessionDuration, setSessionDuration] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [calorieGoal, setCalorieGoal] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile == null) return;
    setAge(profile.age != null ? String(profile.age) : "");
    setSex(profile.sex);
    setHeightCm(profile.height_cm != null ? String(profile.height_cm) : "");
    setWeightKg(profile.weight_kg != null ? String(profile.weight_kg) : "");
    setActivityLevel(profile.activity_level);
    setProfessionType(profile.profession_type);
    setDaysPerWeek(profile.days_per_week != null ? String(profile.days_per_week) : "");
    setSessionDuration(
      profile.session_duration != null ? String(profile.session_duration) : ""
    );
    setAvailableDays(profile.available_days ?? []);
    setCalorieGoal(profile.calorie_goal != null ? String(profile.calorie_goal) : "");
  }, [profile]);

  useEffect(() => {
    if (highlight !== "calorie-goal" || loading) return;
    setHighlightGoal(true);
    // Small delay so the section's onLayout has reported its position
    const scrollTimer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, nutritionY.current - 12),
        animated: true,
      });
    }, 300);
    const clearTimer = setTimeout(() => setHighlightGoal(false), 2500);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlight, ts, loading]);

  // Live recommendation from the form's current values, so it updates as the
  // user edits age/sex/height/weight/activity before saving.
  const recommendedGoal = recommendedCalorieGoal({
    age: parseInt(age, 10) || null,
    sex,
    height_cm: parseFloat(heightCm) || null,
    weight_kg: parseFloat(weightKg) || null,
    activity_level: activityLevel,
  });

  const clearError = () => {
    if (formError != null) setFormError(null);
  };

  const toggleDay = (day: string) => {
    clearError();
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const validate = (): string | null => {
    const ageN = parseInt(age, 10);
    if (isNaN(ageN) || ageN < 13 || ageN > 120) return t("onboarding.ageBetween");
    if (!sex) return t("onboarding.fillAgeSex");
    const h = parseFloat(heightCm);
    if (isNaN(h) || h < 50 || h > 300) return t("onboarding.heightBetween");
    const w = parseFloat(weightKg);
    if (isNaN(w) || w < 20 || w > 500) return t("onboarding.weightBetween");
    if (!activityLevel || !professionType)
      return t("onboarding.selectActivityProfession");
    const dpw = parseInt(daysPerWeek, 10);
    if (isNaN(dpw) || dpw < 1 || dpw > 7) return t("onboarding.daysBetween");
    const sd = parseInt(sessionDuration, 10);
    if (isNaN(sd) || sd < 15 || sd > 300) return t("onboarding.durationBetween");
    if (availableDays.length === 0) return t("onboarding.selectAtLeastOneDay");
    if (calorieGoal.trim() !== "") {
      const cg = parseInt(calorieGoal, 10);
      if (isNaN(cg) || cg < 800 || cg > 10000) return t("profile.calorieGoalBetween");
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error != null) {
      setFormError(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    try {
      setSaving(true);
      await updateProfile({
        age: parseInt(age, 10),
        sex,
        height_cm: parseFloat(heightCm),
        weight_kg: parseFloat(weightKg),
        activity_level: activityLevel,
        profession_type: professionType,
        days_per_week: parseInt(daysPerWeek, 10),
        session_duration: parseInt(sessionDuration, 10),
        available_days: availableDays,
        calorie_goal: calorieGoal.trim() !== "" ? parseInt(calorieGoal, 10) : null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.show({ type: "success", message: t("profile.profileUpdated") });
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-dark">
        <LoadingBlock />
      </View>
    );
  }

  return (
    <Screen keyboard scrollRef={scrollRef} contentContainerClassName="pb-12">
      {/* Profile data */}
      <View className="gap-1">
        <Text className="text-lg font-semibold text-content-primary">
          {t("profile.yourData")}
        </Text>
        <Text className="text-sm text-content-tertiary">
          {t("profile.yourDataSubtitle")}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Input
          label={t("onboarding.age")}
          placeholder={t("onboarding.agePlaceholder")}
          keyboardType="number-pad"
          value={age}
          onChangeText={(v) => {
            setAge(v);
            clearError();
          }}
          containerClassName="flex-1"
        />
        <View className="flex-[1.6] gap-1.5">
          <Text className="text-sm font-medium text-content-secondary">
            {t("onboarding.sex")}
          </Text>
          <View className="flex-row gap-2 flex-1">
            <OptionButton
              label={t("onboarding.male")}
              selected={sex === "male"}
              onPress={() => {
                setSex("male");
                clearError();
              }}
            />
            <OptionButton
              label={t("onboarding.female")}
              selected={sex === "female"}
              onPress={() => {
                setSex("female");
                clearError();
              }}
            />
          </View>
        </View>
      </View>

      <View className="flex-row gap-3">
        <Input
          label={t("onboarding.height")}
          placeholder={t("onboarding.heightPlaceholder")}
          keyboardType="decimal-pad"
          value={heightCm}
          onChangeText={(v) => {
            setHeightCm(v);
            clearError();
          }}
          containerClassName="flex-1"
        />
        <Input
          label={t("onboarding.currentWeight")}
          placeholder={t("onboarding.weightPlaceholder")}
          keyboardType="decimal-pad"
          value={weightKg}
          onChangeText={(v) => {
            setWeightKg(v);
            clearError();
          }}
          containerClassName="flex-1"
        />
      </View>

      <SelectField
        label={t("onboarding.activityLevel")}
        placeholder={t("onboarding.activityLevel")}
        value={activityLevel}
        options={[
          { label: t("onboarding.sedentary"), value: "sedentary" },
          { label: t("onboarding.active"), value: "active" },
          { label: t("onboarding.veryActive"), value: "very_active" },
        ]}
        onChange={(v) => {
          setActivityLevel(v as Profile["activity_level"]);
          clearError();
        }}
        helper={
          activityLevel === "sedentary"
            ? t("onboarding.sedentaryDesc")
            : activityLevel === "active"
              ? t("onboarding.activeDesc")
              : activityLevel === "very_active"
                ? t("onboarding.veryActiveDesc")
                : undefined
        }
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-content-secondary">
          {t("onboarding.professionType")}
        </Text>
        <View className="flex-row gap-2">
          <OptionButton
            label={t("onboarding.deskJob")}
            selected={professionType === "desk"}
            onPress={() => {
              setProfessionType("desk");
              clearError();
            }}
          />
          <OptionButton
            label={t("onboarding.physicalJob")}
            selected={professionType === "physical"}
            onPress={() => {
              setProfessionType("physical");
              clearError();
            }}
          />
        </View>
      </View>

      {/* Nutrition goal */}
      <View
        className="gap-1 mt-2"
        onLayout={(e) => {
          nutritionY.current = e.nativeEvent.layout.y;
        }}
      >
        <Text className="text-lg font-semibold text-content-primary">
          {t("profile.nutritionGoal")}
        </Text>
        <Text className="text-sm text-content-tertiary">
          {t("profile.nutritionGoalSubtitle")}
        </Text>
      </View>

      <View
        className={cn(
          "gap-2 rounded-2xl border-2 p-2 -mx-2",
          highlightGoal ? "border-brand-primary bg-info-soft" : "border-transparent"
        )}
      >
        <Input
          label={t("profile.calorieGoal")}
          placeholder={t("profile.calorieGoalPlaceholder")}
          keyboardType="number-pad"
          value={calorieGoal}
          onChangeText={(v) => {
            setCalorieGoal(v);
            clearError();
          }}
        />
        {recommendedGoal != null && (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setCalorieGoal(String(recommendedGoal));
              clearError();
            }}
            accessibilityRole="button"
            className="bg-info-soft rounded-xl px-4 py-3 flex-row items-center gap-2"
          >
            <Text className="text-brand-primary text-sm font-medium flex-1">
              {t("profile.recommendedGoal", { kcal: recommendedGoal })}
            </Text>
            <Text className="text-brand-primary text-sm font-semibold">
              {t("profile.useRecommended")}
            </Text>
          </Pressable>
        )}
      </View>

      <View className="gap-1 mt-2">
        <Text className="text-lg font-semibold text-content-primary">
          {t("onboarding.trainingPlan")}
        </Text>
        <Text className="text-sm text-content-tertiary">
          {t("onboarding.trainingSubtitle")}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Input
          label={t("onboarding.daysPerWeek")}
          placeholder={t("onboarding.daysPlaceholder")}
          keyboardType="number-pad"
          value={daysPerWeek}
          onChangeText={(v) => {
            setDaysPerWeek(v);
            clearError();
          }}
          containerClassName="flex-1"
        />
        <Input
          label={t("onboarding.sessionDuration")}
          placeholder={t("onboarding.durationPlaceholder")}
          keyboardType="number-pad"
          value={sessionDuration}
          onChangeText={(v) => {
            setSessionDuration(v);
            clearError();
          }}
          containerClassName="flex-1"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-content-secondary">
          {t("onboarding.availableDays")}
        </Text>
        <View className="flex-row gap-2 flex-wrap">
          {DAY_KEYS.map((key, i) => (
            <Chip
              key={key}
              label={t(`days.${key}`)}
              selected={availableDays.includes(DAY_VALUES[i])}
              onPress={() => toggleDay(DAY_VALUES[i])}
            />
          ))}
        </View>
      </View>

      {formError != null && (
        <View className="bg-error-soft rounded-xl p-3">
          <Text className="text-error text-sm">{formError}</Text>
        </View>
      )}

      <Button size="lg" onPress={handleSave} loading={saving}>
        {t("profile.saveChanges")}
      </Button>
    </Screen>
  );
}
