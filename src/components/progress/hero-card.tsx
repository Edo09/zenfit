import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";

import { Ring } from "@/src/components/progress/ring";
import { Card } from "@/src/components/ui";
import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import {
  DAY_LONG_KEYS,
  formatMinutes,
  type DayDot,
  type Periodo,
  type WeekPill,
} from "@/src/utils/progress";

const TABULAR = { fontVariant: ["tabular-nums" as const] };

type HeroData = {
  done: number;
  plan: number;
  streak: number;
  dots: DayDot[];
  pills: WeekPill[];
  best: { year: number; month: number; done: number } | null;
  minutes: number;
  kcal: number;
  volumeKg: number;
};

type HeroCardProps = {
  periodo: Periodo;
  hero: HeroData;
  firstRun: boolean;
  onLogFirst: () => void;
};

// "¿Voy bien esta semana?" — compliance ring against the declared plan,
// day dots (week) or week pills (month), plus the period stat trio.
export function HeroCard({ periodo, hero, firstRun, onLogFirst }: HeroCardProps) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "es" ? "es-ES" : "en-US";

  const frac = hero.plan > 0 ? hero.done / hero.plan : 0;
  const ringColor = hero.done >= hero.plan ? colors.success : colors.brandPrimary;

  const monthName = new Date().toLocaleDateString(locale, { month: "long" });
  const title = firstRun
    ? t("progress.empiezaPlan")
    : periodo === "week"
      ? t("progress.estaSemana")
      : t("progress.esteMes", { mes: monthName });

  const nextPlanIdx = hero.dots.findIndex((d) => d.mode === "plan");
  const remaining = Math.max(0, hero.plan - hero.done);
  let subtitle: string;
  if (firstRun) {
    subtitle = t("progress.emptyHero", { count: hero.plan });
  } else if (periodo === "month") {
    subtitle = t("progress.planMensual", { done: hero.done, plan: hero.plan });
    if (hero.best != null) {
      const bestName = new Date(hero.best.year, hero.best.month, 1).toLocaleDateString(
        locale,
        { month: "long" },
      );
      subtitle += ` ${t("progress.mejorMes", { mes: bestName, count: hero.best.done })}`;
    }
  } else if (remaining === 0) {
    subtitle = t("progress.planCumplido", { done: hero.done, plan: hero.plan });
  } else if (remaining === 1 && nextPlanIdx >= 0) {
    subtitle = t("progress.faltaSesion", {
      dia: t(`daysLong.${DAY_LONG_KEYS[nextPlanIdx]}`).toLowerCase(),
    });
  } else if (remaining === 1) {
    subtitle = t("progress.faltaSesionSinDia");
  } else {
    subtitle = t("progress.faltanSesiones", { count: remaining });
  }

  const dayLetters = t("progress.dayLetters").split(",");

  return (
    <Card className="gap-4">
      <View className="flex-row items-center gap-4">
        <Ring frac={frac} color={ringColor} trackColor={colors.border}>
          <Text className="text-xl font-extrabold text-content-primary" style={TABULAR}>
            {hero.done}/{hero.plan}
          </Text>
          <Text
            className="font-medium text-content-tertiary uppercase"
            style={{ fontSize: 9, letterSpacing: 0.4 }}
          >
            {t("progress.sesiones")}
          </Text>
        </Ring>

        <View className="flex-1 gap-1.5">
          <Text className="text-[15px] font-bold text-content-primary">{title}</Text>
          <Text className="text-[13px] leading-5 text-content-tertiary">{subtitle}</Text>
          {hero.streak > 0 && !firstRun && (
            <View className="flex-row">
              <View className="flex-row items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1">
                <Ionicons name="flame" size={13} color={colors.warning} />
                <Text className="text-xs font-semibold text-warning" style={TABULAR}>
                  {t("progress.racha", { count: hero.streak })}
                </Text>
              </View>
            </View>
          )}
          {firstRun && (
            <Pressable onPress={onLogFirst} accessibilityRole="button" hitSlop={8}>
              <Text className="text-[13px] font-semibold text-brand-primary">
                {t("progress.primerEntreno")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {!firstRun && periodo === "week" && (
        <View className="flex-row justify-between">
          {hero.dots.map((dot, i) => (
            <View key={i} className="items-center gap-1.5">
              <Text
                className={
                  dot.mode === "today"
                    ? "text-[10px] font-semibold text-content-primary"
                    : "text-[10px] font-semibold text-content-muted"
                }
              >
                {dayLetters[i] ?? ""}
              </Text>
              {dot.mode === "done" ? (
                <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-primary">
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                </View>
              ) : dot.mode === "today" ? (
                <View className="h-8 w-8 rounded-full border-2 border-brand-primary" />
              ) : dot.mode === "plan" ? (
                <View className="h-8 w-8 rounded-full border border-dashed border-content-muted" />
              ) : (
                <View className="h-8 w-8 rounded-full border border-border" />
              )}
            </View>
          ))}
        </View>
      )}

      {!firstRun && periodo === "month" && (
        <View className="flex-row gap-2">
          {hero.pills.map((pill) => (
            <View
              key={pill.n}
              className={
                pill.current
                  ? "flex-1 items-center gap-0.5 rounded-xl border border-brand-primary bg-brand-dark py-2"
                  : "flex-1 items-center gap-0.5 rounded-xl border border-border bg-brand-dark py-2"
              }
            >
              <Text className="font-medium text-content-muted" style={{ fontSize: 10 }}>
                {t("progress.semPill", { n: pill.n })}
              </Text>
              <Text
                className={
                  pill.done >= pill.plan
                    ? "text-[13px] font-bold text-success"
                    : "text-[13px] font-bold text-content-primary"
                }
                style={TABULAR}
              >
                {pill.done}/{pill.plan}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!firstRun && (
        <View className="flex-row border-t border-border pt-3">
          <TrioStat
            icon="time-outline"
            value={formatMinutes(hero.minutes)}
            label={t("progress.entrenados")}
          />
          <View className="w-px bg-border" />
          <TrioStat
            icon="flame-outline"
            value={Math.round(hero.kcal).toLocaleString(locale)}
            label={t("progress.kcalQuemadas")}
          />
          <View className="w-px bg-border" />
          <TrioStat
            icon="barbell-outline"
            value={hero.volumeKg.toLocaleString(locale)}
            label={t("progress.kgVolumen")}
          />
        </View>
      )}
    </Card>
  );
}

function TrioStat({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  label: string;
}) {
  const colors = useColors();
  return (
    <View className="flex-1 items-center gap-0.5">
      <Ionicons name={icon} size={13} color={colors.brandSecondary} />
      <Text className="text-base font-bold text-content-primary" style={TABULAR}>
        {value}
      </Text>
      <Text className="text-[11px] text-content-muted">{label}</Text>
    </View>
  );
}
