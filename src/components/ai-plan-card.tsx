import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, ConfirmDialog, useToast } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import { useProfile } from "@/src/hooks/use-profile";
import { useRoutines } from "@/src/hooks/use-routines";
import { useIsOnline } from "@/src/lib/online";
import { generateRoutines } from "@/src/services/ai-routine";
import { colors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type { Profile } from "@/src/types/database";
import { cn } from "@/src/utils/cn";

function isProfileComplete(profile: Profile | null): profile is Profile {
  return (
    profile != null &&
    profile.age != null &&
    profile.sex != null &&
    profile.height_cm != null &&
    profile.weight_kg != null &&
    profile.activity_level != null &&
    profile.profession_type != null &&
    profile.days_per_week != null &&
    profile.session_duration != null &&
    (profile.available_days?.length ?? 0) > 0
  );
}

export function AIPlanCard({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const pathname = usePathname();
  const online = useIsOnline();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { createRoutine, addExercise } = useRoutines();
  const [generating, setGenerating] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handlePress = () => {
    if (!isProfileComplete(profile)) {
      toast.show({ type: "info", message: t("profile.completeProfileFirst") });
      router.push("/(tabs)/profile");
      return;
    }
    setConfirmVisible(true);
  };

  const handleGenerate = async () => {
    setConfirmVisible(false);
    if (!isProfileComplete(profile)) return;
    try {
      setGenerating(true);
      const aiRoutines = await generateRoutines(profile, i18n.language);

      for (const r of aiRoutines) {
        const routine = await createRoutine({
          name: r.name,
          description: r.description ?? undefined,
          day_of_week: r.day_of_week ?? undefined,
        });
        for (const ex of r.exercises) {
          await addExercise({
            routine_id: routine.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight_kg: ex.weight_kg ?? undefined,
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.show({
        type: "success",
        message: t("profile.aiSuccess", { count: aiRoutines.length }),
      });
      if (!pathname.includes("/routines")) {
        router.push("/(tabs)/routines");
      }
    } catch {
      toast.show({ type: "error", message: t("profile.aiFailed") });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Card className={cn("gap-3", className)}>
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-info-soft">
            <Ionicons name="sparkles" size={20} color={colors.brandPrimary} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-content-primary">
              {t("profile.aiTitle")}
            </Text>
            <Text className={online ? "text-sm text-content-tertiary" : "text-sm text-content-muted"}>
              {online ? t("profile.aiSubtitle") : t("common.requiresInternet")}
            </Text>
          </View>
        </View>
        <Button
          icon="sparkles"
          onPress={handlePress}
          loading={generating}
          disabled={!online}
          className="w-full"
        >
          {t("profile.aiGenerate")}
        </Button>
      </Card>

      <ConfirmDialog
        visible={confirmVisible}
        title={t("profile.aiConfirmTitle")}
        message={t("profile.aiConfirmMessage")}
        confirmLabel={t("profile.aiGenerate")}
        onConfirm={handleGenerate}
        onClose={() => setConfirmVisible(false)}
      />
    </>
  );
}
