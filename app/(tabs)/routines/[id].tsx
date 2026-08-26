import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { AddExerciseForm } from "@/src/components/add-exercise-form";
import { ExerciseVideoModal } from "@/src/components/exercise-video-modal";
import { DOCK_CLEARANCE } from "@/src/components/floating-tab-bar";
import {
  Button,
  Card,
  CapsLabel,
  ConfirmDialog,
  DisplayText,
  HeroGradient,
  Input,
  LoadingBlock,
  ProgressBar,
  Screen,
  useToast,
} from "@/src/components/ui";
import { Icon } from "@/src/components/ui/icon";
import { useAuth } from "@/src/hooks/use-auth";
import { useProfile } from "@/src/hooks/use-profile";
import { useProgress } from "@/src/hooks/use-progress";
import { useRoutineDetail, useRoutines } from "@/src/hooks/use-routines";
import { enter, enterFade, exit, pop, staggered } from "@/src/lib/motion";
import { useIsOnline } from "@/src/lib/online";
import { kgToUnit1, useWeightUnit } from "@/src/lib/weight-unit";
import { useRestTimer } from "@/src/providers/rest-timer-provider";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";
import type { RoutineExercise, RoutineWithExercises } from "@/src/types/database";
import { dayLabel } from "@/src/utils/day-label";
import { getRoutineImage } from "@/src/utils/routine-image";

// GIF/WebP demos auto-loop inline as the row thumbnail (expo-image animates
// them); real videos keep the play button — same rule as the program rows.
const IS_IMG = /\.(gif|apng|webp|png|jpe?g)$/i;
const isInlineGif = (url: string | null | undefined): boolean =>
  url != null && url !== "" && IS_IMG.test(url.split("?")[0]);

/** Seconds → mm:ss. */
function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** "4 × 8 · 60 kg" — the exercise target line, shared by both modes. */
function useTargetLine() {
  const weightUnit = useWeightUnit();
  return (ex: RoutineExercise) =>
    `${ex.sets} × ${ex.reps}${
      ex.weight_kg != null ? ` · ${kgToUnit1(ex.weight_kg, weightUnit)} ${weightUnit}` : ""
    }`;
}

export default function RoutineDetailScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const online = useIsOnline();
  const insets = useSafeAreaInsets();
  const targetLine = useTargetLine();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addExercise, removeExercise } = useRoutines();
  const { createLog, todaysLogs } = useProgress();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  // Derived from the persisted routines cache — renders offline, and
  // mutations flow back in without manual refreshes.
  const { data: routine = null, isPending: loading, isError } = useRoutineDetail(id);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const scrollViewRef = useRef<RNScrollView>(null);

  function openAddExerciseForm() {
    setShowAddExercise(true);
    // Wait for form to mount/animate in before scrolling to it.
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
  }
  const [loggingWorkout, setLoggingWorkout] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<RoutineExercise | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [workoutNotes, setWorkoutNotes] = useState("");
  // Local check overrides (keyed by exercise row id). The effective checked
  // state layers these on top of what's already logged today — see
  // isExerciseCompleted below.
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  // The countdown itself lives app-wide (one rest at a time, survives leaving
  // this screen); all this screen tracks is WHICH row started it, so the right
  // row shows the live clock. Never cleared on its own — every read pairs it
  // with `restTimer.running`, so a stale id from a finished rest is inert.
  const restTimer = useRestTimer();
  const [restExId, setRestExId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  // How-to steps expanded, per exercise row (collapsed by default).
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  // Immersive in-set mode (spec: "Active workout"). null = browsing.
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);

  // The exercise's step-by-step in the app language, falling back to the other.
  const stepsFor = (ex: RoutineExercise): string[] | null => {
    const c = ex.exercise;
    return (
      (i18n.language === "es" ? c?.instructions_es : c?.instructions_en) ??
      c?.instructions_en ??
      c?.instructions_es ??
      null
    );
  };

  useEffect(() => {
    if (isError) {
      toast.show({ type: "error", message: t("routines.couldNotLoad") });
      router.back();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const toggleRest = (ex: RoutineExercise) => {
    if (restExId === ex.id && restTimer.running) {
      restTimer.stop();
      setRestExId(null);
      return;
    }
    setRestExId(ex.id);
    // Naming the exercise is what makes the bar readable from another screen.
    restTimer.start(ex.rest_seconds || 60, ex.exercise?.name);
  };

  const handleConfirmRemove = async () => {
    const target = pendingRemove;
    setPendingRemove(null);
    if (target == null) return;
    try {
      await removeExercise(target.id);
      toast.show({ type: "success", message: t("routines.exerciseRemoved") });
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    }
  };

  const openDemo = (ex: RoutineExercise) => {
    if (!ex.exercise?.video_url) {
      toast.show({ type: "info", message: t("routines.noVideoYet") });
      return;
    }
    if (!online) {
      toast.show({ type: "info", message: t("common.requiresInternet") });
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setVideoUri(ex.exercise.video_url);
  };

  // Exercises already saved in one of today's logs for this routine start
  // checked, so the checkmarks survive saving, navigation, and restarts
  // (logs are persisted + offline-overlaid). Logs store exercise NAMES.
  const loggedTodayNames = useMemo(() => {
    const names = new Set<string>();
    for (const log of todaysLogs) {
      if (log.routine_id !== id) continue;
      for (const n of log.completed_exercises ?? []) names.add(n);
    }
    return names;
  }, [todaysLogs, id]);

  const isExerciseCompleted = (ex: RoutineExercise): boolean =>
    completedExercises[ex.id] ??
    (ex.exercise != null && loggedTodayNames.has(ex.exercise.name));

  const setExerciseCompleted = (ex: RoutineExercise, done: boolean) => {
    if (done) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setCompletedExercises((prev) => ({ ...prev, [ex.id]: done }));
  };

  const toggleExercise = (ex: RoutineExercise) =>
    setExerciseCompleted(ex, !isExerciseCompleted(ex));

  const openLogDialog = () => {
    setWorkoutDuration(
      activeStartedAt != null
        ? String(Math.max(1, Math.round((Date.now() - activeStartedAt) / 60000)))
        : profile?.session_duration
          ? String(profile.session_duration)
          : "",
    );
    setWorkoutNotes("");
    setShowLogDialog(true);
  };

  const handleLogWorkout = async (durationVal: string, notesVal: string) => {
    if (!routine) return;
    setLoggingWorkout(true);

    const completedNames = routine.routine_exercises
      .filter((ex) => isExerciseCompleted(ex))
      .map((ex) => ex.exercise?.name)
      .filter((name): name is string => !!name);

    try {
      await createLog({
        routine_id: routine.id,
        routine_name: routine.name,
        duration_minutes: durationVal ? parseInt(durationVal, 10) : undefined,
        notes: notesVal.trim() || undefined,
        completed_exercises: completedNames.length > 0 ? completedNames : null,
      });
      toast.show({ type: "success", message: t("routines.workoutLogged") });
      setShowLogDialog(false);
      setWorkoutDuration("");
      setWorkoutNotes("");
      setCompletedExercises({});
      setActiveStartedAt(null);
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    } finally {
      setLoggingWorkout(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-dark">
        <LoadingBlock />
      </View>
    );
  }

  if (!routine) return null;

  // Coach-assigned routines are read-only for the client (no add/remove exercises).
  const isAssigned = routine.assigned_by != null;
  const day = dayLabel(routine.day_of_week, t);

  const logDialog = (
    <AlertDialog isOpen={showLogDialog} onClose={() => setShowLogDialog(false)} size="md">
      <AlertDialogBackdrop />
      <AlertDialogContent className="bg-surface border-border rounded-3xl gap-4 p-6">
        <AlertDialogHeader>
          <DisplayText size={19}>{t("progress.logAWorkout")}</DisplayText>
        </AlertDialogHeader>
        <AlertDialogBody className="gap-4">
          <Text className="text-sm text-content-secondary mb-1">
            {t("routines.greatJob")}
          </Text>
          <Input
            label={t("progress.duration")}
            keyboardType="number-pad"
            placeholder="45"
            value={workoutDuration}
            onChangeText={setWorkoutDuration}
          />
          <Input
            label={t("progress.notes")}
            placeholder={t("progress.notesPlaceholder")}
            value={workoutNotes}
            onChangeText={setWorkoutNotes}
            containerClassName="mt-2"
          />
        </AlertDialogBody>
        <AlertDialogFooter className="mt-4 flex-row gap-2">
          <View className="flex-1">
            <Button variant="secondary" onPress={() => setShowLogDialog(false)} className="w-full">
              {t("common.cancel")}
            </Button>
          </View>
          <View className="flex-1">
            <Button
              onPress={() => handleLogWorkout(workoutDuration, workoutNotes)}
              loading={loggingWorkout}
              className="w-full"
            >
              {t("common.save")}
            </Button>
          </View>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ---- Immersive in-set mode -------------------------------------------
  if (activeStartedAt != null) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ActiveWorkout
          routine={routine}
          startedAt={activeStartedAt}
          isCompleted={isExerciseCompleted}
          onCompleteExercise={(ex) => setExerciseCompleted(ex, true)}
          onClose={() => setActiveStartedAt(null)}
          onFinish={openLogDialog}
          onOpenDemo={openDemo}
        />
        {logDialog}
        <ExerciseVideoModal uri={videoUri} onClose={() => setVideoUri(null)} />
      </>
    );
  }

  // ---- Browsing mode ---------------------------------------------------
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen
        keyboard
        scrollRef={scrollViewRef}
        contentContainerClassName="px-0 py-0 pb-8 gap-0"
        footer={
          <View
            className="px-5 pt-3 bg-brand-dark border-t border-border"
            style={{ paddingBottom: DOCK_CLEARANCE + insets.bottom }}
          >
            <Button
              size="md"
              icon="play"
              className="w-full py-3"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setActiveStartedAt(Date.now());
              }}
            >
              {t("routines.startWorkout")}
            </Button>
            {/* Manual-checklist path: ticking exercises here is local state
                until a log is saved — without this, browsing-mode checks had
                no way to persist unless the user also went through the full
                Start-workout immersive flow. */}
            {routine.routine_exercises.some((ex) => isExerciseCompleted(ex)) && (
              <Button
                variant="secondary"
                size="md"
                icon="check"
                haptic={false}
                onPress={openLogDialog}
                className="w-full py-3 mt-2"
              >
                {t("routines.finishWorkout")}
              </Button>
            )}
          </View>
        }
      >
        {/* Image hero — back / info, day badge, title, meta */}
        <View style={{ height: 260 }}>
          <Image
            source={getRoutineImage(routine.name)}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            contentFit="cover"
            transition={300}
          />
          <Svg
            width="100%"
            height="100%"
            style={{ position: "absolute" }}
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id="rd-fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#0b0e12" stopOpacity="0.45" />
                <Stop offset="0.45" stopColor="#0b0e12" stopOpacity="0.2" />
                <Stop offset="1" stopColor="#0b0e12" stopOpacity="0.94" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#rd-fade)" />
          </Svg>

          <View
            className="flex-row items-center justify-between px-5"
            style={{ paddingTop: insets.top + 8 }}
          >
            <HeroIconButton
              icon="arrow-left"
              label={t("common.back")}
              onPress={() => router.back()}
            />
            <HeroIconButton
              icon="info"
              label={t("common.info")}
              onPress={() => setShowInfo(true)}
            />
          </View>

          <View className="flex-1 justify-end px-5 pb-5 gap-2 items-start">
            {isAssigned && (
              <View className="flex-row items-center gap-1.5 rounded-full bg-brand-primary px-3 py-1">
                <Icon name="award" size={13} color={colors.onAccent} />
                <Text className="text-xs font-bold text-on-accent">
                  {t("coach.assignedBadge")}
                </Text>
              </View>
            )}
            {day != null && (
              <View className="rounded-full bg-brand-primary px-3 py-1">
                <CapsLabel size={10} className="text-on-accent">
                  {t("routines.every", { day })}
                </CapsLabel>
              </View>
            )}
            <DisplayText size={29} className="text-on-hero" numberOfLines={2}>
              {routine.name}
            </DisplayText>
            <Text className="text-sm text-on-hero-dim" numberOfLines={2}>
              {routine.description != null && routine.description.length > 0
                ? routine.description
                : t("routines.exercises", { count: routine.routine_exercises.length })}
            </Text>
          </View>
        </View>

        <View className="px-5 pt-5 gap-3">
          <DisplayText size={19}>{t("routines.exerciseList")}</DisplayText>

          {routine.routine_exercises.map((ex, index) => {
            const isCompleted = isExerciseCompleted(ex);
            const isResting = restExId === ex.id && restTimer.running;
            const restLabel = formatClock(
              isResting ? restTimer.remaining : ex.rest_seconds || 60,
            );
            const steps = stepsFor(ex);
            const stepsOpen = !!openSteps[ex.id];
            return (
              <AnimatedView key={ex.id} entering={staggered(index)} exiting={exit()}>
                <Card className={`p-3.5 gap-3 ${isCompleted ? "opacity-60" : ""}`}>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => toggleExercise(ex)}
                      hitSlop={8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isCompleted }}
                    >
                      {/* Keyed by state so the icon pops on every toggle */}
                      <AnimatedView key={isCompleted ? "done" : "todo"} entering={pop()}>
                        <Icon
                          name={isCompleted ? "check-circle" : "circle"}
                          size={24}
                          color={isCompleted ? colors.brandPrimaryDark : colors.contentMuted}
                        />
                      </AnimatedView>
                    </Pressable>

                    {/* Numbered demo tile — opens the demo. Sized big enough
                        that the looping form GIF is actually readable. */}
                    <Pressable
                      onPress={() => openDemo(ex)}
                      className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-elevated items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel={t("routines.watchDemo")}
                    >
                      {isInlineGif(ex.exercise?.video_url) ? (
                        <Image
                          source={{ uri: ex.exercise!.video_url! }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={150}
                        />
                      ) : (
                        <DisplayText size={22} tabular className="text-content-tertiary">
                          {String(index + 1).padStart(2, "0")}
                        </DisplayText>
                      )}
                      {ex.exercise?.video_url != null && !isInlineGif(ex.exercise.video_url) && (
                        <View className="absolute bottom-1 right-1">
                          <Icon name="play" size={14} color={colors.brandPrimaryDark} />
                        </View>
                      )}
                    </Pressable>

                    {/* Name + target — opens the demo. The name wraps: exercise
                        names run long and truncating them loses the movement. */}
                    <Pressable onPress={() => openDemo(ex)} className="flex-1">
                      <DisplayText
                        size={16}
                        className={isCompleted ? "text-content-secondary" : undefined}
                      >
                        {ex.exercise?.name}
                      </DisplayText>
                      <Text className="text-content-tertiary text-sm mt-0.5">
                        {targetLine(ex)}
                      </Text>
                    </Pressable>

                    {!isAssigned && (
                      <Pressable
                        onPress={() => setPendingRemove(ex)}
                        hitSlop={8}
                        className="p-1"
                        accessibilityRole="button"
                        accessibilityLabel={t("routines.removeExercise")}
                      >
                        <Icon name="trash" size={17} color={colors.contentMuted} />
                      </Pressable>
                    )}
                  </View>

                  {/* Rest timer row */}
                  <Pressable
                    onPress={() => toggleRest(ex)}
                    className="flex-row items-center gap-2 rounded-2xl bg-surface-elevated px-3.5 py-2.5"
                    accessibilityRole="button"
                    accessibilityLabel={t("routines.restBetweenSets")}
                  >
                    <Icon
                      name={isResting ? "pause" : "timer"}
                      size={16}
                      color={isResting ? colors.brandPrimaryDark : colors.contentTertiary}
                    />
                    <Text
                      className="text-content-primary font-bold text-sm"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {restLabel}
                    </Text>
                    <Text className="text-content-tertiary text-sm flex-1">
                      {t("routines.restBetweenSets")}
                    </Text>
                  </Pressable>

                  {/* How to do it — collapsed by default */}
                  {steps != null && steps.length > 0 && (
                    <View>
                      <Pressable
                        onPress={() =>
                          setOpenSteps((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))
                        }
                        className="flex-row items-center justify-between py-1"
                        accessibilityRole="button"
                        accessibilityState={{ expanded: stepsOpen }}
                        accessibilityLabel={t("routines.howTo")}
                      >
                        <CapsLabel size={10}>{t("routines.howTo")}</CapsLabel>
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            className="text-content-muted text-xs"
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {steps.length}
                          </Text>
                          <Icon
                            name={stepsOpen ? "chevron-up" : "chevron-down"}
                            size={16}
                            color={colors.contentMuted}
                          />
                        </View>
                      </Pressable>
                      {stepsOpen && (
                        <View className="pt-2 gap-2">
                          {steps.map((step, i) => (
                            <View key={i} className="flex-row gap-2.5">
                              <View className="w-5 h-5 rounded-full bg-brand-primary-soft items-center justify-center mt-0.5">
                                <Text
                                  className="text-brand-primary-dark text-[11px] font-bold"
                                  style={{ fontVariant: ["tabular-nums"] }}
                                >
                                  {i + 1}
                                </Text>
                              </View>
                              <Text className="flex-1 text-content-secondary text-[13px] leading-[19px]">
                                {step}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              </AnimatedView>
            );
          })}

          {/* Add exercise form — hidden for coach-assigned routines */}
          {isAssigned ? null : showAddExercise ? (
            <AnimatedView entering={enter()} exiting={exit()}>
              <AddExerciseForm
                onAdd={async (entry) => {
                  await addExercise({
                    routine_id: routine.id,
                    exercise_id: entry.exercise.id,
                    exercise: entry.exercise,
                    sets: entry.sets,
                    reps: entry.reps,
                    weight_kg: entry.weight_kg,
                  });
                  setShowAddExercise(false);
                }}
                onCancel={() => setShowAddExercise(false)}
              />
            </AnimatedView>
          ) : (
            <Pressable
              onPress={openAddExerciseForm}
              accessibilityRole="button"
              className="border border-dashed border-border-strong rounded-2xl py-4 items-center"
            >
              <Text className="text-content-tertiary font-semibold">
                {t("routines.addExerciseButton")}
              </Text>
            </Pressable>
          )}
        </View>
      </Screen>

      <ConfirmDialog
        visible={pendingRemove != null}
        destructive
        title={t("routines.removeExercise")}
        message={
          pendingRemove != null
            ? t("routines.removeConfirm", { name: pendingRemove.exercise?.name })
            : undefined
        }
        confirmLabel={t("common.remove")}
        onConfirm={handleConfirmRemove}
        onClose={() => setPendingRemove(null)}
      />

      <AlertDialog isOpen={showInfo} onClose={() => setShowInfo(false)} size="md">
        <AlertDialogBackdrop />
        <AlertDialogContent className="bg-surface border-border rounded-3xl gap-3 p-6">
          <AlertDialogHeader>
            <DisplayText size={19}>{routine.name}</DisplayText>
          </AlertDialogHeader>
          <AlertDialogBody className="gap-2">
            {routine.description ? (
              <Text className="text-content-secondary text-sm">{routine.description}</Text>
            ) : null}
            {day != null ? (
              <Text className="text-content-tertiary text-sm">
                {t("routines.every", { day })}
              </Text>
            ) : null}
            <Text className="text-content-tertiary text-sm">
              {t("routines.exercises", { count: routine.routine_exercises.length })}
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button variant="secondary" onPress={() => setShowInfo(false)} className="w-full">
              {t("common.close")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {logDialog}

      <ExerciseVideoModal uri={videoUri} onClose={() => setVideoUri(null)} />
    </>
  );
}

/** Translucent round control sitting on the image hero. */
function HeroIconButton({
  icon,
  label,
  onPress,
}: {
  icon: "arrow-left" | "info" | "x";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-11 w-11 items-center justify-center rounded-full"
      style={{
        backgroundColor: "rgba(11, 14, 18, 0.55)",
        borderWidth: 1,
        borderColor: "rgba(242, 244, 247, 0.22)",
      }}
    >
      <Icon name={icon} size={20} color="#f2f4f7" />
    </Pressable>
  );
}

/**
 * The signature immersive screen: one exercise at a time on the hero
 * gradient, set pips for the target sets, and a cyan "Complete set" that
 * advances through the routine.
 */
function ActiveWorkout({
  routine,
  startedAt,
  isCompleted,
  onCompleteExercise,
  onClose,
  onFinish,
  onOpenDemo,
}: {
  routine: RoutineWithExercises;
  startedAt: number;
  isCompleted: (ex: RoutineExercise) => boolean;
  onCompleteExercise: (ex: RoutineExercise) => void;
  onClose: () => void;
  onFinish: () => void;
  onOpenDemo: (ex: RoutineExercise) => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const targetLine = useTargetLine();
  const exercises = routine.routine_exercises;

  const [index, setIndex] = useState(() => {
    const firstTodo = exercises.findIndex((ex) => !isCompleted(ex));
    return firstTodo === -1 ? 0 : firstTodo;
  });
  const [setsDone, setSetsDone] = useState<Record<string, number>>({});
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAt) / 1000));

  useEffect(() => {
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [startedAt]);

  const current = exercises[index];
  const doneCount = exercises.filter((ex) => isCompleted(ex)).length;

  if (current == null) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-dark px-8 gap-4">
        <Text className="text-center text-content-tertiary">
          {t("routines.noRoutinesFound")}
        </Text>
        <Button variant="secondary" onPress={onClose}>
          {t("common.close")}
        </Button>
      </View>
    );
  }

  const targetSets = Math.max(1, current.sets);
  const done = Math.min(targetSets, setsDone[current.id] ?? (isCompleted(current) ? targetSets : 0));

  const completeSet = () => {
    const next = done + 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSetsDone((prev) => ({ ...prev, [current.id]: next }));
    if (next >= targetSets) {
      onCompleteExercise(current);
      // Give the pip fill a beat before moving on
      setTimeout(() => setIndex((i) => Math.min(exercises.length - 1, i + 1)), 350);
    }
  };

  return (
    <View className="flex-1">
      <HeroGradient />
      <AnimatedView
        entering={enterFade()}
        className="flex-1"
        style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + DOCK_CLEARANCE }}
      >
        {/* Close · name · timer */}
        <View className="flex-row items-center gap-3 px-5">
          <HeroIconButton icon="x" label={t("common.close")} onPress={onClose} />
          <View className="flex-1">
            <DisplayText size={17} className="text-on-hero" numberOfLines={1}>
              {routine.name}
            </DisplayText>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Icon name="timer" size={15} color={colors.onHeroDim} />
            <DisplayText size={16} tabular className="text-on-hero">
              {formatClock(elapsed)}
            </DisplayText>
          </View>
        </View>

        {/* Routine progress */}
        <View className="flex-row items-center gap-3 px-5 mt-5">
          <View className="flex-1">
            <ProgressBar
              value={doneCount / exercises.length}
              height={8}
              color={colors.brandPrimary}
              trackColor={colors.heroTrack}
            />
          </View>
          <DisplayText size={15} tabular className="text-on-hero-dim">
            {t("routines.exerciseProgress", {
              current: doneCount,
              total: exercises.length,
            })}
          </DisplayText>
        </View>

        {/* Current exercise */}
        <View className="flex-1 justify-center px-5 gap-5">
          <Pressable
            onPress={() => onOpenDemo(current)}
            accessibilityRole="button"
            accessibilityLabel={t("routines.watchDemo")}
            className="self-center h-40 w-40 rounded-3xl overflow-hidden items-center justify-center"
            style={{ backgroundColor: colors.heroTrack }}
          >
            {isInlineGif(current.exercise?.video_url) ? (
              <Image
                source={{ uri: current.exercise!.video_url! }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <View
                className="h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.brandPrimary }}
              >
                <Icon
                  name="play"
                  size={22}
                  color={colors.onAccent}
                  fill={colors.onAccent}
                  style={{ marginLeft: 2 }}
                />
              </View>
            )}
          </Pressable>

          <View className="items-center gap-1.5">
            <DisplayText
              size={33}
              weight="extrabold"
              className="text-on-hero text-center"
              numberOfLines={2}
            >
              {current.exercise?.name}
            </DisplayText>
            <Text className="text-base text-on-hero-dim">{targetLine(current)}</Text>
          </View>

          {/* Set pips */}
          <View className="items-center gap-2.5">
            <View className="flex-row gap-2">
              {Array.from({ length: targetSets }).map((_, i) => (
                <View
                  key={i}
                  className="rounded-full"
                  style={{
                    width: i === done ? 26 : 10,
                    height: 10,
                    backgroundColor:
                      i < done
                        ? colors.brandPrimary
                        : i === done
                          ? colors.onHero
                          : colors.heroTrack,
                  }}
                />
              ))}
            </View>
            <Text className="text-sm text-on-hero-dim">
              {t("routines.setOf", { current: Math.min(done + 1, targetSets), total: targetSets })}
            </Text>
          </View>
        </View>

        {/* prev · Complete set · next */}
        <View className="flex-row items-center gap-3 px-5">
          <Pressable
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            accessibilityRole="button"
            accessibilityLabel={t("routines.previousExercise")}
            className={`h-14 w-14 items-center justify-center rounded-full ${index === 0 ? "opacity-40" : ""}`}
            style={{ backgroundColor: colors.heroTrack }}
          >
            <Icon name="chevron-left" size={22} color={colors.onHero} />
          </Pressable>

          <Button
            size="lg"
            containerClassName="flex-1"
            icon="check"
            onPress={completeSet}
            disabled={done >= targetSets}
          >
            {t("routines.completeSet")}
          </Button>

          <Pressable
            onPress={() => setIndex((i) => Math.min(exercises.length - 1, i + 1))}
            disabled={index === exercises.length - 1}
            accessibilityRole="button"
            accessibilityLabel={t("routines.nextExercise")}
            className={`h-14 w-14 items-center justify-center rounded-full ${index === exercises.length - 1 ? "opacity-40" : ""}`}
            style={{ backgroundColor: colors.heroTrack }}
          >
            <Icon name="chevron-right" size={22} color={colors.onHero} />
          </Pressable>
        </View>

        <Pressable
          onPress={onFinish}
          accessibilityRole="button"
          className="items-center py-4 mt-1"
        >
          <Text className="text-sm font-bold text-on-hero-dim">
            {t("routines.finishWorkout")}
          </Text>
        </Pressable>
      </AnimatedView>
    </View>
  );
}
