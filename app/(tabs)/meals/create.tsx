import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  CapsLabel,
  Chip,
  DisplayText,
  FeatureCard,
  Input,
  Screen,
  useToast,
} from "@/src/components/ui";
import { DOCK_CLEARANCE } from "@/src/components/floating-tab-bar";
import { Icon } from "@/src/components/ui/icon";
import { useAuth } from "@/src/hooks/use-auth";
import { useMeals } from "@/src/hooks/use-meals";
import { enter } from "@/src/lib/motion";
import { useIsOnline } from "@/src/lib/online";
import {
  estimateMealNutrition,
  estimateMealNutritionFromPhoto,
} from "@/src/services/ai-nutrition";
import type { ImageInput } from "@/src/services/llm";
import { uploadMealPhoto } from "@/src/services/meal-photos";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { MealType } from "@/src/types/database";
import { formatDayLabel, isDateKey, toDateKey } from "@/src/utils/dates";
import { MEAL_SLOTS, suggestedSlot } from "@/src/utils/meal-slots";

type PickedPhoto = ImageInput & { uri: string };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.5,
  base64: true,
  allowsEditing: false,
  exif: false,
};

type Estimate = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  portion: string;
};

export default function AddFoodScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const online = useIsOnline();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getOrCreateSlotMeal, addMealItem } = useMeals();
  // prefillName / planOptionId arrive when the client taps "Registrar" on a
  // prescribed option in the coach's nutrition plan. The plan names foods but
  // carries no numbers, so the photo + AI estimator still does the measuring;
  // planOptionId is the adherence link the coach reads back in the panel.
  const params = useLocalSearchParams<{
    mealType?: string;
    date?: string;
    prefillName?: string;
    planOptionId?: string;
  }>();

  const todayKey = toDateKey();
  // Bad/missing slot → time-of-day suggestion; bad/future date → today
  const [mealType, setMealType] = useState<MealType>(() =>
    MEAL_SLOTS.includes(params.mealType as MealType)
      ? (params.mealType as MealType)
      : suggestedSlot(),
  );
  const date = isDateKey(params.date) && params.date <= todayKey ? params.date : todayKey;

  const [name, setName] = useState(params.prefillName ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const planOptionId = params.planOptionId ?? null;
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [aiEstimate, setAiEstimate] = useState(true);
  const [loading, setLoading] = useState(false);

  // Manual nutrition (shown when the AI path is unavailable or disabled)
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualPortion, setManualPortion] = useState("");
  const manualVisible = photo == null && (!aiEstimate || !online);

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

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed && photo == null) {
      setNameError(t("meals.nameOrPhotoRequired"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    try {
      setLoading(true);

      // Resolve nutrition BEFORE touching data, so a failed photo analysis
      // never creates an orphan slot container.
      let estimate: Estimate | null = null;
      let aiFailed = false;

      if (photo != null) {
        try {
          if (!online) throw new Error("offline");
          estimate = await estimateMealNutritionFromPhoto(
            photo,
            i18n.language,
            trimmed || undefined,
          );
        } catch {
          if (!trimmed) {
            // Nothing to name the food with — surface and stop.
            setNameError(t("meals.noFoodDetected"));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            return;
          }
          // Photo analysis failed but the user named the food — estimate
          // from the name instead of dropping the AI estimate entirely.
          try {
            estimate = online
              ? await estimateMealNutrition(trimmed, mealType, i18n.language)
              : null;
          } catch {
            estimate = null;
          }
          aiFailed = estimate == null;
        }
      } else if (aiEstimate && online) {
        try {
          estimate = await estimateMealNutrition(trimmed, mealType, i18n.language);
        } catch {
          aiFailed = true;
        }
      }

      // Persist the photo (best-effort) so it can thumbnail in the diary
      let photoPath: string | undefined;
      if (photo != null && online) {
        photoPath = (await uploadMealPhoto(user!.id, photo)) ?? undefined;
      }

      // The AI's refined name wins over the raw typed one (it keeps the
      // user's intent — fixes typos/casing); typed name is the fallback.
      const itemName = estimate?.name || trimmed;
      const meal = await getOrCreateSlotMeal(date, mealType);
      await addMealItem({
        meal_id: meal.id,
        name: itemName,
        calories: estimate?.calories ?? (parseInt(manualCalories, 10) || 0),
        protein_g: estimate?.protein_g ?? (parseFloat(manualProtein) || 0),
        carbs_g: estimate?.carbs_g ?? (parseFloat(manualCarbs) || 0),
        fat_g: estimate?.fat_g ?? (parseFloat(manualFat) || 0),
        portion: estimate?.portion ?? (manualPortion.trim() || undefined),
        photo_path: photoPath,
        plan_option_id: planOptionId ?? undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (aiFailed) {
        // Item landed, but with zero macros — tell the user why
        toast.show({ type: "info", message: t("meals.aiEstimateFailed") });
      } else {
        toast.show({
          type: "success",
          message: t("meals.foodAdded", { slot: t(`meals.${mealType}`) }),
        });
      }
      router.back(); // diary already shows the item optimistically
    } catch {
      toast.show({ type: "error", message: t("meals.couldNotAdd") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      keyboard
      contentContainerClassName="pb-8"
      footer={
        <View
          className="px-5 pt-3 bg-brand-dark border-t border-border"
          style={{ paddingBottom: DOCK_CLEARANCE + insets.bottom }}
        >
          <Button size="lg" icon="plus" onPress={handleAdd} loading={loading}>
            {t("meals.addToDiary")}
          </Button>
        </View>
      }
    >
      <View className="gap-1">
        <DisplayText size={26}>
          {t("meals.addToSlot", { slot: t(`meals.${mealType}`) })}
        </DisplayText>
        <Text className="text-sm text-content-tertiary capitalize">
          {formatDayLabel(date, i18n.language, t)}
        </Text>
      </View>

      {/* Signature photo logging — the dark card is the primary path */}
      {photo == null ? (
        <FeatureCard className="gap-3">
          <View className="flex-row items-center gap-3">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: colors.brandPrimary }}
            >
              <Icon name="camera" size={22} color={colors.onAccent} />
            </View>
            <View className="flex-1">
              <DisplayText size={18} className="text-on-hero">
                {t("meals.scanYourMeal")}
              </DisplayText>
              <Text className="text-xs text-on-hero-dim mt-0.5">
                {online ? t("meals.scanNote") : t("meals.photoRequiresInternet")}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2.5">
            <Button
              icon="camera"
              onPress={pickFromCamera}
              containerClassName="flex-1"
              className="w-full"
              disabled={loading || !online}
            >
              {t("meals.takePhoto")}
            </Button>
            <Pressable
              onPress={pickFromGallery}
              disabled={loading || !online}
              accessibilityRole="button"
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3.5 ${loading || !online ? "opacity-45" : ""}`}
              style={{ backgroundColor: colors.heroTrack }}
            >
              <Icon name="image" size={18} color={colors.onHero} />
              <Text className="font-display text-base text-on-hero">
                {t("meals.fromGallery")}
              </Text>
            </Pressable>
          </View>
        </FeatureCard>
      ) : (
        <View className="rounded-3xl overflow-hidden border border-border">
          <Image
            source={{ uri: photo.uri }}
            style={{ width: "100%", height: 190 }}
            contentFit="cover"
          />
          {/* Inline rgba: bg-black/60 (opacity modifier) doesn't compile
              under react-native-css */}
          <Pressable
            onPress={() => setPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel={t("meals.removePhoto")}
            className="absolute top-2.5 right-2.5 h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(11, 14, 18, 0.6)" }}
          >
            <Icon name="x" size={18} color={colors.onHero} />
          </Pressable>
          <View
            className="absolute bottom-2.5 left-2.5 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: "rgba(11, 14, 18, 0.6)" }}
          >
            <Icon name="sparkles" size={12} color={colors.brandAccent} />
            <Text className="text-xs font-semibold text-on-hero">{t("meals.aiEstimate")}</Text>
          </View>
        </View>
      )}

      <Input
        label={t("meals.foodName")}
        leftIcon="search"
        placeholder={t("meals.foodNamePlaceholder")}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (nameError != null) setNameError(undefined);
        }}
        error={nameError}
      />

      {/* Slot selector (pre-selected from the diary, still changeable) */}
      <View className="gap-2">
        <CapsLabel size={10}>{t("meals.diary")}</CapsLabel>
        <View className="flex-row gap-2 flex-wrap">
          {MEAL_SLOTS.map((type) => (
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
          className={`flex-row items-center gap-3 rounded-3xl border p-4 ${
            aiEstimate && online
              ? "bg-brand-accent-soft border-brand-accent-border"
              : "bg-surface border-border"
          } ${online ? "" : "opacity-50"}`}
        >
          <Icon
            name={aiEstimate && online ? "square-check" : "square"}
            size={22}
            color={aiEstimate && online ? colors.brandAccent : colors.contentMuted}
          />
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Icon name="sparkles" size={14} color={colors.brandAccent} />
              <Text className="text-sm font-bold text-content-primary">
                {t("meals.aiEstimate")}
              </Text>
            </View>
            <Text className="text-xs text-content-muted mt-0.5">
              {online ? t("meals.aiEstimateNote") : t("common.requiresInternet")}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Manual nutrition when the AI path is off or unavailable */}
      {manualVisible && (
        <AnimatedView entering={enter()} className="gap-3">
          <CapsLabel size={10}>{t("meals.manualNutrition")}</CapsLabel>
          <View className="flex-row gap-2">
            <Input
              label={t("meals.calories")}
              keyboardType="number-pad"
              value={manualCalories}
              onChangeText={setManualCalories}
              containerClassName="flex-1"
              textAlign="center"
            />
            <Input
              label={t("meals.protein")}
              keyboardType="decimal-pad"
              value={manualProtein}
              onChangeText={setManualProtein}
              containerClassName="flex-1"
              textAlign="center"
            />
          </View>
          <View className="flex-row gap-2">
            <Input
              label={t("meals.carbs")}
              keyboardType="decimal-pad"
              value={manualCarbs}
              onChangeText={setManualCarbs}
              containerClassName="flex-1"
              textAlign="center"
            />
            <Input
              label={t("meals.fat")}
              keyboardType="decimal-pad"
              value={manualFat}
              onChangeText={setManualFat}
              containerClassName="flex-1"
              textAlign="center"
            />
            <Input
              label={t("meals.portion")}
              placeholder={t("meals.portionPlaceholder")}
              value={manualPortion}
              onChangeText={setManualPortion}
              containerClassName="flex-1"
              textAlign="center"
            />
          </View>
        </AnimatedView>
      )}
    </Screen>
  );
}
