import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Chip, Input, Screen, useToast } from "@/src/components/ui";
import { useMeals } from "@/src/hooks/use-meals";
import { useIsOnline } from "@/src/lib/online";
import {
  estimateMealNutrition,
  estimateMealNutritionFromPhoto,
} from "@/src/services/ai-nutrition";
import type { ImageInput } from "@/src/services/llm";
import { colors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import type { MealType } from "@/src/types/database";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

type PickedPhoto = ImageInput & { uri: string };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.5,
  base64: true,
  allowsEditing: false,
  exif: false,
};

export default function CreateMealScreen() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const online = useIsOnline();
  const { createMeal, addMealItem } = useMeals();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [aiEstimate, setAiEstimate] = useState(true);
  const [loading, setLoading] = useState(false);

  const toPicked = (asset: ImagePicker.ImagePickerAsset): PickedPhoto | null => {
    if (!asset.base64) return null;
    return {
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType ?? "image/jpeg",
    };
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.show({ type: "info", message: t("meals.cameraPermission") });
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets[0] != null) {
      const picked = toPicked(result.assets[0]);
      if (picked != null) setPhoto(picked);
      if (nameError != null) setNameError(undefined);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets[0] != null) {
      const picked = toPicked(result.assets[0]);
      if (picked != null) setPhoto(picked);
      if (nameError != null) setNameError(undefined);
    }
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed && photo == null) {
      setNameError(t("meals.nameOrPhotoRequired"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    try {
      setLoading(true);

      // Photo path: identify + estimate BEFORE creating so the meal can
      // take the AI-detected dish name when the user left the name empty.
      if (photo != null) {
        let estimate;
        try {
          if (!online) throw new Error("offline");
          estimate = await estimateMealNutritionFromPhoto(
            photo,
            i18n.language,
            trimmed || undefined
          );
        } catch {
          if (!trimmed) {
            // Nothing to name the meal with — surface and stop.
            setNameError(t("meals.noFoodDetected"));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            return;
          }
          estimate = null;
        }

        const mealName = trimmed || estimate?.name || "";
        const meal = await createMeal({ name: mealName, meal_type: mealType });

        if (estimate != null) {
          await addMealItem({
            meal_id: meal.id,
            name: estimate.name,
            calories: estimate.calories,
            protein_g: estimate.protein_g,
            carbs_g: estimate.carbs_g,
            fat_g: estimate.fat_g,
            portion: estimate.portion,
          });
          toast.show({ type: "success", message: t("meals.aiEstimated") });
        } else {
          toast.show({ type: "info", message: t("meals.aiEstimateFailed") });
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace(`/(tabs)/meals/${meal.id}`);
        return;
      }

      // Text-only path
      const meal = await createMeal({ name: trimmed, meal_type: mealType });

      if (aiEstimate && online) {
        try {
          const estimate = await estimateMealNutrition(trimmed, mealType, i18n.language);
          await addMealItem({
            meal_id: meal.id,
            name: trimmed,
            calories: estimate.calories,
            protein_g: estimate.protein_g,
            carbs_g: estimate.carbs_g,
            fat_g: estimate.fat_g,
            portion: estimate.portion,
          });
          toast.show({ type: "success", message: t("meals.aiEstimated") });
        } catch {
          toast.show({ type: "info", message: t("meals.aiEstimateFailed") });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace(`/(tabs)/meals/${meal.id}`);
    } catch {
      toast.show({ type: "error", message: t("meals.couldNotCreate") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard>
      <View className="gap-4">
        {/* Meal photo */}
        <View className="gap-2">
          <Text className="text-sm font-medium text-content-secondary">
            {t("meals.mealPhoto")}
          </Text>
          {photo == null ? (
            <>
              <View className="flex-row gap-2">
                <Button
                  variant="secondary"
                  icon="camera-outline"
                  onPress={pickFromCamera}
                  containerClassName="flex-1"
                  className="w-full"
                  disabled={loading || !online}
                >
                  {t("meals.takePhoto")}
                </Button>
                <Button
                  variant="secondary"
                  icon="images-outline"
                  onPress={pickFromGallery}
                  containerClassName="flex-1"
                  className="w-full"
                  disabled={loading || !online}
                >
                  {t("meals.fromGallery")}
                </Button>
              </View>
              <Text className="text-xs text-content-muted">
                {online ? t("meals.mealPhotoNote") : t("meals.photoRequiresInternet")}
              </Text>
            </>
          ) : (
            <View className="rounded-xl overflow-hidden border border-border">
              <Image
                source={{ uri: photo.uri }}
                style={{ width: "100%", height: 180 }}
                contentFit="cover"
              />
              <Pressable
                onPress={() => setPhoto(null)}
                accessibilityRole="button"
                accessibilityLabel={t("meals.removePhoto")}
                className="absolute top-2 right-2 h-8 w-8 items-center justify-center rounded-full bg-black/60"
              >
                <Ionicons name="close" size={18} color={colors.white} />
              </Pressable>
              <View className="absolute bottom-2 left-2 flex-row items-center gap-1.5 rounded-full bg-black/60 px-3 py-1">
                <Ionicons name="sparkles" size={12} color={colors.brandPrimary} />
                <Text className="text-xs text-white">{t("meals.aiEstimate")}</Text>
              </View>
            </View>
          )}
        </View>

        <Input
          label={t("meals.mealName")}
          placeholder={t("meals.mealNamePlaceholder")}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (nameError != null) setNameError(undefined);
          }}
          error={nameError}
        />

        <View className="gap-2">
          <Text className="text-sm font-medium text-content-secondary">
            {t("meals.mealType")}
          </Text>
          <View className="flex-row gap-2 flex-wrap">
            {MEAL_TYPES.map((type) => (
              <Chip
                key={type}
                label={t(`meals.${type}`, { defaultValue: type })}
                selected={mealType === type}
                onPress={() => setMealType(type)}
              />
            ))}
          </View>
        </View>

        {/* AI nutrition estimate toggle — photo implies AI, so only shown without one */}
        {photo == null && (
          <Pressable
            onPress={() => {
              if (!online) return;
              Haptics.selectionAsync().catch(() => {});
              setAiEstimate((v) => !v);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: aiEstimate && online, disabled: !online }}
            className={`flex-row items-center gap-3 bg-surface border border-border rounded-xl p-4 ${online ? "" : "opacity-50"}`}
          >
            <Ionicons
              name={aiEstimate && online ? "checkbox" : "square-outline"}
              size={22}
              color={aiEstimate && online ? colors.brandPrimary : colors.contentMuted}
            />
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="sparkles" size={14} color={colors.brandPrimary} />
                <Text className="text-sm font-medium text-content-primary">
                  {t("meals.aiEstimate")}
                </Text>
              </View>
              <Text className="text-xs text-content-muted mt-0.5">
                {online ? t("meals.aiEstimateNote") : t("common.requiresInternet")}
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      <Text className="text-content-muted text-sm text-center">{t("meals.addItemsNote")}</Text>

      <Button size="lg" onPress={handleCreate} loading={loading} className="mt-2">
        {t("meals.logMeal")}
      </Button>
    </Screen>
  );
}
