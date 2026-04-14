import { useAuth } from "@/src/hooks/use-auth";
import { Pressable, ScrollView, Text, TextInput, View } from "@/src/tw";
import { supabase } from "@/src/utils/supabase";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
} from "react-native";

const TOTAL_STEPS = 4;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

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
          Alert.alert("Campos requeridos", "Por favor completa tu edad y sexo");
          return false;
        }
        const age = parseInt(form.age);
        if (isNaN(age) || age < 13 || age > 120) {
          Alert.alert("Edad inválida", "Ingresa una edad entre 13 y 120");
          return false;
        }
        return true;
      case 1:
        if (!form.height_cm || !form.weight_kg) {
          Alert.alert("Campos requeridos", "Por favor completa altura y peso");
          return false;
        }
        const h = parseFloat(form.height_cm);
        const w = parseFloat(form.weight_kg);
        if (isNaN(h) || h < 50 || h > 300) {
          Alert.alert("Altura inválida", "Ingresa una altura entre 50 y 300 cm");
          return false;
        }
        if (isNaN(w) || w < 20 || w > 500) {
          Alert.alert("Peso inválido", "Ingresa un peso entre 20 y 500 kg");
          return false;
        }
        return true;
      case 2:
        if (!form.activity_level || !form.profession_type) {
          Alert.alert("Campos requeridos", "Selecciona tu nivel de actividad y tipo de profesión");
          return false;
        }
        return true;
      case 3:
        const dpw = parseInt(form.days_per_week);
        const sd = parseInt(form.session_duration);
        if (isNaN(dpw) || dpw < 1 || dpw > 7) {
          Alert.alert("Días inválidos", "Ingresa entre 1 y 7 días por semana");
          return false;
        }
        if (isNaN(sd) || sd < 15 || sd > 300) {
          Alert.alert("Duración inválida", "Ingresa entre 15 y 300 minutos");
          return false;
        }
        if (form.available_days.length === 0) {
          Alert.alert("Días requeridos", "Selecciona al menos un día disponible");
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
        .update({
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
        })
        .eq("id", user.id);
      if (error) throw error;
      setOnboardingCompleted(true);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo guardar la información");
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
                Datos personales
              </Text>
              <Text className="text-gray-400 text-base">
                Cuéntanos un poco sobre ti
              </Text>
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-300">Edad</Text>
              <TextInput
                className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder="Ej: 25"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={form.age}
                onChangeText={(v) => updateForm("age", v)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-300">Sexo</Text>
              <View className="flex-row gap-2">
                <OptionButton
                  label="Masculino"
                  selected={form.sex === "male"}
                  onPress={() => updateForm("sex", "male")}
                />
                <OptionButton
                  label="Femenino"
                  selected={form.sex === "female"}
                  onPress={() => updateForm("sex", "female")}
                />
                <OptionButton
                  label="Otro"
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
                Medidas corporales
              </Text>
              <Text className="text-gray-400 text-base">
                Necesitamos tus medidas para personalizar tu plan
              </Text>
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-300">
                Altura (cm)
              </Text>
              <TextInput
                className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder="Ej: 175"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
                value={form.height_cm}
                onChangeText={(v) => updateForm("height_cm", v)}
              />
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-300">
                Peso actual (kg)
              </Text>
              <TextInput
                className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder="Ej: 72"
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
                Tu estilo de vida
              </Text>
              <Text className="text-gray-400 text-base">
                Esto nos ayuda a ajustar tus recomendaciones
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-300">
                Nivel de actividad diaria
              </Text>
              <View className="gap-2">
                <OptionButton
                  label="Sedentario"
                  selected={form.activity_level === "sedentary"}
                  onPress={() => updateForm("activity_level", "sedentary")}
                />
                <OptionButton
                  label="Activo"
                  selected={form.activity_level === "active"}
                  onPress={() => updateForm("activity_level", "active")}
                />
                <OptionButton
                  label="Muy activo"
                  selected={form.activity_level === "very_active"}
                  onPress={() => updateForm("activity_level", "very_active")}
                />
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-300">
                Tipo de profesión
              </Text>
              <View className="flex-row gap-2">
                <OptionButton
                  label="Trabajo de escritorio"
                  selected={form.profession_type === "desk"}
                  onPress={() => updateForm("profession_type", "desk")}
                />
                <OptionButton
                  label="Trabajo físico"
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
                Plan de entrenamiento
              </Text>
              <Text className="text-gray-400 text-base">
                ¿Cuánto tiempo puedes dedicar al gym?
              </Text>
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-300">
                Días por semana
              </Text>
              <TextInput
                className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder="Ej: 4"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={form.days_per_week}
                onChangeText={(v) => updateForm("days_per_week", v)}
              />
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-gray-300">
                Duración por sesión (minutos)
              </Text>
              <TextInput
                className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
                placeholder="Ej: 60"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={form.session_duration}
                onChangeText={(v) => updateForm("session_duration", v)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-300">
                Días disponibles
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                {DAYS.map((day) => (
                  <DayChip
                    key={day}
                    day={day}
                    selected={form.available_days.includes(day)}
                    onPress={() => toggleDay(day)}
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
                {step === TOTAL_STEPS - 1 ? "Comenzar" : "Siguiente"}
              </Text>
            )}
          </Pressable>

          {step > 0 && (
            <Pressable
              className="rounded-xl py-3 items-center"
              onPress={handleBack}
            >
              <Text className="text-gray-500 font-medium text-base">Atrás</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
