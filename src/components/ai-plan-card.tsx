import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Button, CapsLabel, Card, Chip, DisplayText, useToast } from "@/src/components/ui";
import { Icon } from "@/src/components/ui/icon";
import { useAuth } from "@/src/hooks/use-auth";
import { useExercises } from "@/src/hooks/use-exercises";
import { useProfile } from "@/src/hooks/use-profile";
import { useRoutines } from "@/src/hooks/use-routines";
import { useIsOnline } from "@/src/lib/online";
import {
  generateRoutines,
  ROUTINE_FOCUS,
  type RoutineFocusKey,
} from "@/src/services/ai-routine";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import type { Profile } from "@/src/types/database";
import { cn } from "@/src/utils/cn";

const FOCUS_OPTIONS: { key: RoutineFocusKey; labelKey: string }[] = [
  { key: "mix", labelKey: "profile.aiFocusMix" },
  { key: "chest", labelKey: "profile.aiFocusChest" },
  { key: "back", labelKey: "profile.aiFocusBack" },
  { key: "shoulders", labelKey: "profile.aiFocusShoulders" },
  { key: "arms", labelKey: "profile.aiFocusArms" },
  { key: "legs", labelKey: "profile.aiFocusLegs" },
  { key: "core", labelKey: "profile.aiFocusCore" },
  { key: "cardio", labelKey: "profile.aiFocusCardio" },
];

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
  const [focus, setFocus] = useState<RoutineFocusKey>("mix");

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
    setFocus("mix");
    setConfirmVisible(true);
  };

  const handleGenerate = async () => {
    setConfirmVisible(false);
    if (!isProfileComplete(profile)) return;

    // Narrow the catalog to the picked body-part bucket BEFORE it ever
    // reaches the model — the prompt also says "stay in this focus", but the
    // filter is the actual guarantee; the instruction alone is not.
    const bucket = focus === "mix" ? null : ROUTINE_FOCUS[focus];
    const matching = bucket
      ? exercises.filter((e) => bucket.bodyParts.includes(e.body_part?.name ?? ""))
      : exercises;
    if (matching.length === 0) {
      toast.show({ type: "info", message: t("profile.aiFocusEmpty") });
      return;
    }

    try {
      setGenerating(true);
      const catalogNames = matching.map((e) => e.name);
      const aiRoutines = await generateRoutines(profile, i18n.language, catalogNames, focus);

      let created = 0;
      for (const r of aiRoutines) {
        // The model is instructed to only use catalog names, but this is
        // untrusted output — resolve matches BEFORE creating the routine
        // (the catalog is coach-managed; the app can't create new entries),
        // so a routine whose exercises all fail to match is never persisted
        // as an empty shell. Matched against `matching`, not the full
        // catalog, so a name outside the chosen focus is rejected even if
        // it exists elsewhere in the catalog.
        const matchedExercises = r.exercises.flatMap((ex) => {
          const matched = matching.find(
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
      {/* AI card — the only violet family in the app (spec: AI features only) */}
      <Card
        className={cn(
          "gap-3 p-4 border-brand-accent-border overflow-hidden",
          className,
        )}
      >
        {/* Soft violet wash off the top-right corner */}
        <View
          pointerEvents="none"
          className="absolute rounded-full"
          style={{
            top: -30,
            right: -30,
            width: 120,
            height: 120,
            backgroundColor: colors.brandAccentSoft,
          }}
        />
        <View className="flex-row items-center gap-3">
          <View
            className="h-10 w-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: colors.brandAccentSoft }}
          >
            <Icon name="sparkles" size={19} color={colors.brandAccent} />
          </View>
          <View className="flex-1">
            <DisplayText size={16}>{t("profile.aiTitle")}</DisplayText>
            <Text
              className={cn(
                "text-xs mt-0.5",
                online ? "text-content-tertiary" : "text-content-muted",
              )}
            >
              {online ? t("profile.aiSubtitle") : t("common.requiresInternet")}
            </Text>
          </View>
          {compact && (
            <Button
              size="sm"
              variant="secondary"
              onPress={handlePress}
              loading={generating}
              disabled={!online}
            >
              {t("profile.aiGenerateShort")}
            </Button>
          )}
        </View>
        {!compact && (
          <Button
            icon="sparkles"
            size="lg"
            onPress={handlePress}
            loading={generating}
            disabled={!online}
          >
            {t("profile.aiGenerate")}
          </Button>
        )}
      </Card>

      <AlertDialog isOpen={confirmVisible} onClose={() => setConfirmVisible(false)} size="md">
        <AlertDialogBackdrop />
        <AlertDialogContent className="bg-surface border-border rounded-3xl gap-4 p-6">
          <AlertDialogHeader>
            <DisplayText size={19}>{t("profile.aiConfirmTitle")}</DisplayText>
          </AlertDialogHeader>
          <AlertDialogBody className="gap-4">
            <Text className="text-sm text-content-secondary">
              {t("profile.aiConfirmMessage")}
            </Text>
            <View className="gap-2">
              <CapsLabel size={10}>{t("profile.aiFocusLabel")}</CapsLabel>
              <View className="flex-row flex-wrap gap-2">
                {FOCUS_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={t(opt.labelKey)}
                    selected={focus === opt.key}
                    onPress={() => setFocus(opt.key)}
                  />
                ))}
              </View>
            </View>
          </AlertDialogBody>
          <AlertDialogFooter className="flex-row gap-2">
            <View className="flex-1">
              <Button variant="secondary" onPress={() => setConfirmVisible(false)}>
                {t("common.cancel")}
              </Button>
            </View>
            <View className="flex-1">
              <Button onPress={handleGenerate} loading={generating}>
                {t("profile.aiGenerate")}
              </Button>
            </View>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
