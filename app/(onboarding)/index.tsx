import { useAuth } from "@/src/hooks/use-auth";
import { Pressable, ScrollView, Text, TextInput, View } from "@/src/tw";
import { supabase } from "@/src/utils/supabase";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from "react-native";

const TOTAL_STEPS = 4;

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_VALUES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type FormData = {
  age: string;
  sex: "male" | "female" | "other" | null;
  height_cm: string;
  weight_kg: string;
  activity_level: "sedentary" | "active" | "very_active" | null;
  profession_type: "desk" | "physical" | null;
  days_per_week: string;
  session_duration: string;
  available_days: string[];
};

function OptionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`flex-1 py-3 rounded-xl items-center border ${
        selected
          ? "bg-brand-primary border-brand-primary"
          : "bg-surface border-surface-elevated"
      }`}
      onPress={onPress}
    >
      <Text
        className={`font-semibold text-sm ${
          selected ? "text-white" : "text-gray-300"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DayChip({
  day,
  selected,
  onPress,
}: {
  day: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`w-11 h-11 rounded-full items-center justify-center border ${
        selected
          ? "bg-brand-primary border-brand-primary"
          : "bg-surface border-surface-elevated"
      }`}
      onPress={onPress}
    >
      <Text
        className={`font-semibold text-xs ${
          selected ? "text-white" : "text-gray-300"
        }`}
      >
        {day}
      </Text>
    </Pressable>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View className="flex-row gap-2 px-6 mt-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          className={`flex-1 h-1 rounded-full ${
            i <= step ? "bg-brand-primary" : "bg-surface-elevated"
          }`}
        />
      ))}
    </View>
  );
}

export default function Onboarding() {
  const { t } = useTranslation();
  const { user, setOnboardingCompleted } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>({
    age: "",
    sex: null,
    height_cm: "",
    weight_kg: "",
    activity_level: null,
    profession_type: null,
    days_per_week: "4",
    session_duration: "60",
    available_days: [],
  });

  const updateForm = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter((d) => d !== day)
        : [...prev.available_days, day],
    }));
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 0:
        if (!form.age || !form.sex) {
          Alert.alert(t("onboarding.requiredFields"), t("onboarding.fillAgeSex"));
          return false;
        }
        const age = parseInt(form.age);
        if (isNaN(age) || age < 13 || age > 120) {
          Alert.alert(t("onboarding.invalidAge"), t("onboarding.ageBetween"));
          return false;
        }
        return true;
      case 1:
        if (!form.height_cm || !form.weight_kg) {
          Alert.alert(t("onboarding.requiredFields"), t("onboarding.fillHeightWeight"));
          return false;
        }
        const h = parseFloat(form.height_cm);
        const w = parseFloat(form.weight_kg);
        if (isNaN(h) || h < 50 || h > 300) {
          Alert.alert(t("onboarding.invalidHeight"), t("onboarding.heightBetween"));
          return false;
        }
        if (isNaN(w) || w < 20 || w > 500) {
          Alert.alert(t("onboarding.invalidWeight"), t("onboarding.weightBetween"));
          return false;
        }
        return true;
      case 2:
        if (!form.activity_level || !form.profession_type) {
          Alert.alert(t("onboarding.requiredFields"), t("onboarding.selectActivityProfession"));
          return false;
        }
        return true;
      case 3:
        const dpw = parseInt(form.days_per_week);
        const sd = parseInt(form.session_duration);
        if (isNaN(dpw) || dpw < 1 || dpw > 7) {
          Alert.alert(t("onboarding.invalidDays"), t("onboarding.daysBetween"));
          return false;
        }
        if (isNaN(sd) || sd < 15 || sd > 300) {
          Alert.alert(t("onboarding.invalidDuration"), t("onboarding.durationBetween"));
          return false;
        }
        if (form.available_days.length === 0) {
          Alert.alert(t("onboarding.daysRequired"), t("onboarding.selectAtLeastOneDay"));
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          age: parseInt(form.age),
          sex: form.sex,
          height_cm: parseFloat(form.height_cm),
          weight_kg: parseFloat(form.weight_kg),
          activity_level: form.activity_level,
          profession_type: form.profession_type,
          days_per_week: parseInt(form.days_per_week),
          session_duration: parseInt(form.session_duration),
          available_days: form.available_days,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      setOnboardingCompleted(true);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message ?? t("onboarding.couldNotSave"));
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View className="gap-6">
            <View className="gap-1">
              <Text className="text-2xl font-bold text-white">
                {t("onboarding.personalData")}
              </Text>
              <Text className="text-gray-400 text-base">
                {t("onboarding.tellUsAboutYou")}
              </Text>
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-300">{t("onboarding.age")}</Text>
              <TextInput
                className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder={t("onboarding.agePlaceholder")}
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={form.age}
                onChangeText={(v) => updateForm("age", v)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-300">{t("onboarding.sex")}</Text>
              <View className="flex-row gap-2">
                <OptionButton
                  label={t("onboarding.male")}
                  selected={form.sex === "male"}
                  onPress={() => updateForm("sex", "male")}
                />
                <OptionButton
                  label={t("onboarding.female")}
                  selected={form.sex === "female"}
                  onPress={() => updateForm("sex", "female")}
                />
                <OptionButton
                  label={t("onboarding.other")}
                  selected={form.sex === "other"}
                  onPress={() => updateForm("sex", "other")}
                />
              </View>
            </View>
          </View>
        );

      case 1:
        return (
          <View className="gap-6">
            <View className="gap-1">
              <Text className="text-2xl font-bold text-white">
                {t("onboarding.bodyMeasurements")}
              </Text>
              <Text className="text-gray-400 text-base">
                {t("onboarding.measurementsSubtitle")}
              </Text>
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-300">
                {t("onboarding.height")}
              </Text>
              <TextInput
                className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder={t("onboarding.heightPlaceholder")}
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
                value={form.height_cm}
                onChangeText={(v) => updateForm("height_cm", v)}
              />
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-300">
                {t("onboarding.currentWeight")}
              </Text>
              <TextInput
                className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder={t("onboarding.weightPlaceholder")}
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
                value={form.weight_kg}
                onChangeText={(v) => updateForm("weight_kg", v)}
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View className="gap-6">
            <View className="gap-1">
              <Text className="text-2xl font-bold text-white">
                {t("onboarding.lifestyle")}
              </Text>
              <Text className="text-gray-400 text-base">
                {t("onboarding.lifestyleSubtitle")}
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-300">
                {t("onboarding.activityLevel")}
              </Text>
              <View className="gap-2">
                <OptionButton
                  label={t("onboarding.sedentary")}
                  selected={form.activity_level === "sedentary"}
                  onPress={() => updateForm("activity_level", "sedentary")}
                />
                <OptionButton
                  label={t("onboarding.active")}
                  selected={form.activity_level === "active"}
                  onPress={() => updateForm("activity_level", "active")}
                />
                <OptionButton
                  label={t("onboarding.veryActive")}
                  selected={form.activity_level === "very_active"}
                  onPress={() => updateForm("activity_level", "very_active")}
                />
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-300">
                {t("onboarding.professionType")}
              </Text>
              <View className="flex-row gap-2">
                <OptionButton
                  label={t("onboarding.deskJob")}
                  selected={form.profession_type === "desk"}
                  onPress={() => updateForm("profession_type", "desk")}
                />
                <OptionButton
                  label={t("onboarding.physicalJob")}
                  selected={form.profession_type === "physical"}
                  onPress={() => updateForm("profession_type", "physical")}
                />
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View className="gap-6">
            <View className="gap-1">
              <Text className="text-2xl font-bold text-white">
                {t("onboarding.trainingPlan")}
              </Text>
              <Text className="text-gray-400 text-base">
                {t("onboarding.trainingSubtitle")}
              </Text>
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-300">
                {t("onboarding.daysPerWeek")}
              </Text>
              <TextInput
                className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder={t("onboarding.daysPlaceholder")}
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={form.days_per_week}
                onChangeText={(v) => updateForm("days_per_week", v)}
              />
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-300">
                {t("onboarding.sessionDuration")}
              </Text>
              <TextInput
                className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder={t("onboarding.durationPlaceholder")}
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={form.session_duration}
                onChangeText={(v) => updateForm("session_duration", v)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-300">
                {t("onboarding.availableDays")}
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                {DAY_KEYS.map((key, i) => (
                  <DayChip
                    key={key}
                    day={t(`days.${key}`)}
                    selected={form.available_days.includes(DAY_VALUES[i])}
                    onPress={() => toggleDay(DAY_VALUES[i])}
                  />
                ))}
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-brand-dark"
        contentContainerClassName="flex-grow"
      >
        <View className="px-6 pt-16 pb-4 flex-row items-center gap-3">
          {/* Logo placeholder — replace with <Image source={require('@/assets/images/logo.png')} /> */}
          <View className="w-12 h-12 bg-brand-primary rounded-xl items-center justify-center">
            <Text className="text-xl font-bold text-white">H</Text>
          </View>
          <Text className="text-4xl font-bold text-brand-primary">Habbito</Text>
        </View>

        <ProgressBar step={step} />

        <View className="flex-1 px-6 pt-8 pb-6">{renderStep()}</View>

        <View className="px-6 pb-12 gap-3">
          <Pressable
            className="bg-brand-primary rounded-xl py-4 items-center"
            onPress={handleNext}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {step === TOTAL_STEPS - 1 ? t("common.start") : t("common.next")}
              </Text>
            )}
          </Pressable>

          {step > 0 && (
            <Pressable
              className="rounded-xl py-3 items-center"
              onPress={handleBack}
            >
              <Text className="text-gray-500 font-medium text-base">{t("common.back")}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
