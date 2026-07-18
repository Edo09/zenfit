import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Card, ConfirmDialog, PosterText, SkewButton, useToast } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import { useExercises } from "@/src/hooks/use-exercises";
import { useProfile } from "@/src/hooks/use-profile";
import { useRoutines } from "@/src/hooks/use-routines";
import { useIsOnline } from "@/src/lib/online";
import { generateRoutines } from "@/src/services/ai-routine";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type { Profile } from "@/src/types/database";
import { cn } from "@/src/utils/cn";

// Generate action temporarily hidden (2026-07-17) — flip back on when the
// AI feature is ready to expose (LLM-key Edge Function proxy still pending).
const SHOW_GENERATE = false;

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
    profile.goal != null &&
    (profile.available_days?.length ?? 0) > 0
  );
}

export function AIPlanCard({
  className,
  compact = false,
}: {
  className?: string;
  /** Routines list variant: trailing "Generate" button instead of full-width CTA. */
  compact?: boolean;
}) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const pathname = usePathname();
  const online = useIsOnline();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { createRoutine, addExercise } = useRoutines();
  const { exercises } = useExercises();
  const [generating, setGenerating] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handlePress = () => {
    if (!isProfileComplete(profile)) {
      toast.show({ type: "info", message: t("profile.completeProfileFirst") });
      router.push("/(tabs)/profile");
      return;
    }
    if (exercises.length === 0) {
      toast.show({ type: "info", message: t("routines.noExercisesInCatalog") });
      return;
    }
    setConfirmVisible(true);
  };

  const handleGenerate = async () => {
    setConfirmVisible(false);
    if (!isProfileComplete(profile)) return;
    try {
      setGenerating(true);
      const catalogNames = exercises.map((e) => e.name);
      const aiRoutines = await generateRoutines(profile, i18n.language, catalogNames);

      let created = 0;
      for (const r of aiRoutines) {
        // The model is instructed to only use catalog names, but this is
        // untrusted output — resolve matches BEFORE creating the routine
        // (the catalog is coach-managed; the app can't create new entries),
        // so a routine whose exercises all fail to match is never persisted
        // as an empty shell.
        const matchedExercises = r.exercises.flatMap((ex) => {
          const matched = exercises.find(
            (e) => e.name.toLowerCase() === ex.name.toLowerCase(),
          );
          return matched ? [{ ex, matched }] : [];
        });
        if (matchedExercises.length === 0) continue;

        const routine = await createRoutine({
          name: r.name,
          description: r.description ?? undefined,
          day_of_week: r.day_of_week ?? undefined,
          source: "ai",
        });
        for (const { ex, matched } of matchedExercises) {
          await addExercise({
            routine_id: routine.id,
            exercise_id: matched.id,
            exercise: matched,
            sets: ex.sets,
            reps: ex.reps,
            weight_kg: ex.weight_kg ?? undefined,
          });
        }
        created++;
      }
      if (created === 0) throw new Error("no routine matched the catalog");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.show({
        type: "success",
        message: t("profile.aiSuccess", { count: created }),
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
      {/* AI card — the only gold family in the app (README: AI features only) */}
      <Card
        className={cn("gap-2.5 p-3 rounded-2xl border-brand-accent-border overflow-hidden", className)}
      >
        {/* Decorative gold-tinted circle off the top-right corner */}
        <View
          pointerEvents="none"
          className="absolute rounded-full"
          style={{
            top: -18,
            right: -18,
            width: 70,
            height: 70,
            backgroundColor: colors.brandAccentSoft,
            opacity: 0.5,
          }}
        />
        <View className="flex-row items-center gap-2.5">
          <View
            className="h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: colors.brandAccentSoft }}
          >
            <Ionicons name="sparkles" size={17} color={colors.brandAccent} />
          </View>
          <View className="flex-1">
            <PosterText size={15}>{t("profile.aiTitle")}</PosterText>
            <Text
              className={cn("text-[11px] mt-0.5", online ? "text-content-tertiary" : "text-content-muted")}
            >
              {online ? t("profile.aiSubtitle") : t("common.requiresInternet")}
            </Text>
          </View>
          {SHOW_GENERATE && compact && (
            <SkewButton
              size="compact"
              onPress={handlePress}
              loading={generating}
              disabled={!online}
            >
              {t("profile.aiGenerateShort")}
            </SkewButton>
          )}
        </View>
        {SHOW_GENERATE && !compact && (
          <SkewButton
            icon="sparkles"
            onPress={handlePress}
            loading={generating}
            disabled={!online}
            className="mx-1"
          >
            {t("profile.aiGenerate")}
          </SkewButton>
        )}
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
