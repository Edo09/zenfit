import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { LineChart } from "@/src/components/progress/line-chart";
import { Button, Card, Input, useToast } from "@/src/components/ui";
import { kgToUnit1, unitToKg, useWeightUnit } from "@/src/lib/weight-unit";
import { useColors } from "@/src/theme/colors";
import type { Profile } from "@/src/types/database";
import { Pressable, Text, View } from "@/src/tw";
import { addDays, dateKeyToDate, toDateKey } from "@/src/utils/dates";
import type { WeightStats } from "@/src/utils/progress";

const TABULAR = { fontVariant: ["tabular-nums" as const] };

type WeightCardProps = {
  weight: WeightStats;
  profile: Profile | null;
  onLogWeight: (kg: number) => Promise<void>;
};

// Outcome metric for the profile goal. Without the body_measurements table
// (P1 migration) this stays in its empty state; the quick log still works —
// it writes profiles.weight_kg, which the migration's trigger will mirror
// into history once applied.
export function WeightCard({ weight, profile, onLogWeight }: WeightCardProps) {
  const colors = useColors();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "es" ? "es-ES" : "en-US";
  const unit = useWeightUnit();
  const [logging, setLogging] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const kg1 = (n: number) =>
    n.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // Stored kg → the display unit, 1 decimal, locale-formatted.
  const w1 = (kg: number) => kg1(kgToUnit1(kg, unit));

  const goalKey =
    profile?.goal === "lose_weight"
      ? "profile.goalLoseWeight"
      : profile?.goal === "gain_muscle"
        ? "profile.goalGainMuscle"
        : profile?.goal === "maintain"
          ? "profile.goalMaintain"
          : null;

  const delta = weight.delta30;
  const deltaGood =
    delta == null || profile?.goal == null || profile.goal === "maintain"
      ? null
      : profile.goal === "lose_weight"
        ? delta < 0
        : delta > 0;

  const handleSave = async () => {
    // Input is typed in the display unit; storage is always kg.
    const entered = parseFloat(value.replace(",", "."));
    const kg = unitToKg(entered, unit);
    if (Number.isNaN(kg) || kg < 30 || kg > 300) return;
    try {
      setSaving(true);
      await onLogWeight(Math.round(kg * 10) / 10);
      setLogging(false);
      setValue("");
      toast.show({ type: "success", message: t("progress.pesoGuardado") });
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    } finally {
      setSaving(false);
    }
  };

  const chartStart = dateKeyToDate(addDays(toDateKey(), -49)).toLocaleDateString(
    locale,
    { day: "numeric", month: "short" },
  );

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-content-primary">
          {t("progress.pesoCorporal")}
        </Text>
        {delta != null && (
          <View
            className={
              deltaGood === true
                ? "flex-row items-center gap-1 rounded-full bg-success-soft px-2 py-0.5"
                : "flex-row items-center gap-1 rounded-full bg-brand-dark px-2 py-0.5"
            }
          >
            <Ionicons
              name={delta <= 0 ? "trending-down" : "trending-up"}
              size={12}
              color={deltaGood === true ? colors.success : colors.contentTertiary}
            />
            <Text
              className={
                deltaGood === true
                  ? "text-xs font-semibold text-success"
                  : "text-xs font-semibold text-content-tertiary"
              }
              style={TABULAR}
            >
              {`${delta > 0 ? "+" : "−"}${w1(Math.abs(delta))} ${unit} / 30 ${t("progress.dias")}`}
            </Text>
          </View>
        )}
      </View>

      {weight.hasData && weight.current != null ? (
        <>
          <View className="flex-row items-end justify-between">
            <View className="flex-row items-baseline gap-1">
              <Text
                className="text-[28px] font-extrabold text-content-primary"
                style={TABULAR}
              >
                {w1(weight.current)}
              </Text>
              <Text className="text-sm text-content-tertiary">{unit}</Text>
            </View>
            {weight.bmi != null && goalKey != null && (
              <Text className="text-xs text-content-muted" style={TABULAR}>
                {t("progress.imcMeta", {
                  imc: kg1(weight.bmi),
                  meta: t(goalKey).toLowerCase(),
                })}
              </Text>
            )}
          </View>

          {weight.series.length >= 2 && (
            <>
              <LineChart
                points={weight.series.map((s) => ({ x: s.week, kg: s.kg }))}
                steps={8}
                lineColor={colors.brandSecondary}
                areaColor={colors.infoSoft}
                gridColor={colors.border}
                dotStrokeColor={colors.surface}
              />
              <View className="flex-row justify-between">
                <Text className="text-[10px] text-content-muted">{chartStart}</Text>
                <Text className="text-[10px] text-content-muted">
                  {t("progress.ochoSemanas")}
                </Text>
                <Text className="text-[10px] font-medium text-content-tertiary">
                  {t("progress.hoy")}
                </Text>
              </View>
            </>
          )}
        </>
      ) : (
        <View className="items-center gap-2 py-3">
          <View className="h-12 w-12 items-center justify-center rounded-full border border-border bg-brand-dark">
            <Ionicons name="scale-outline" size={22} color={colors.contentMuted} />
          </View>
          <Text className="text-center text-[13px] text-content-tertiary px-4">
            {t("progress.emptyPeso")}
          </Text>
        </View>
      )}

      <View className="border-t border-border pt-3">
        {logging ? (
          <View className="flex-row items-end gap-2">
            <Input
              label={t("progress.pesoKg", { unit })}
              keyboardType="decimal-pad"
              placeholder={
                weight.current != null ? w1(weight.current) : unit === "lb" ? "155,0" : "70,0"
              }
              value={value}
              onChangeText={setValue}
              containerClassName="flex-1"
              className="bg-brand-dark"
            />
            <Button onPress={handleSave} loading={saving}>
              {t("common.save")}
            </Button>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setValue(weight.current != null ? String(kgToUnit1(weight.current, unit)) : "");
              setLogging(true);
            }}
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-1"
          >
            <Ionicons name="add" size={15} color={colors.brandPrimary} />
            <Text className="text-[13px] font-semibold text-brand-primary">
              {t("progress.registrarPeso")}
            </Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}
