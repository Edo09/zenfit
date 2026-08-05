import React from "react";
import { useTranslation } from "react-i18next";

import { Ring } from "@/src/components/progress/ring";
import { CapsLabel, DisplayText, FeatureCard } from "@/src/components/ui";
import { Icon, type IconName } from "@/src/components/ui/icon";
import { kgToUnit, useWeightUnit } from "@/src/lib/weight-unit";
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

// "Am I on plan this week?" — the screen's one dark surface: compliance ring
// against the declared plan, day markers (week) or week pills (month), plus
// the trained / burned / volume trio.
export function HeroCard({ periodo, hero, firstRun, onLogFirst }: HeroCardProps) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "es" ? "es-ES" : "en-US";
  const unit = useWeightUnit();

  const frac = hero.plan > 0 ? hero.done / hero.plan : 0;

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
    <FeatureCard className="gap-5">
      <View className="flex-row items-center gap-4">
        <Ring frac={frac} color={colors.brandPrimary} trackColor={colors.heroTrack}>
          <DisplayText size={20} weight="extrabold" tabular className="text-on-hero">
            {`${hero.done}/${hero.plan}`}
          </DisplayText>
          <CapsLabel size={9} className="text-on-hero-dim">
            {t("progress.sesiones")}
          </CapsLabel>
        </Ring>

        <View className="flex-1 gap-1.5">
          <DisplayText size={17} className="text-on-hero">
            {title}
          </DisplayText>
          <Text className="text-[13px] leading-5 text-on-hero-dim">{subtitle}</Text>
          {hero.streak > 0 && !firstRun && (
            <View className="flex-row">
              <View
                className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
                style={{ backgroundColor: colors.brandPrimary }}
              >
                <Icon name="flame" size={13} color={colors.onAccent} />
                <Text className="text-xs font-bold text-on-accent" style={TABULAR}>
                  {t("progress.racha", { count: hero.streak })}
                </Text>
              </View>
            </View>
          )}
          {firstRun && (
            <Pressable onPress={onLogFirst} accessibilityRole="button" hitSlop={8}>
              <Text
                className="text-[13px] font-bold"
                style={{ color: colors.brandPrimary }}
              >
                {t("progress.primerEntreno")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Mon–Sun markers: done = cyan check, today = cyan ring, planned =
          dashed, rest = flat track. */}
      {!firstRun && periodo === "week" && (
        <View className="flex-row justify-between">
          {hero.dots.map((dot, i) => (
            <View key={i} className="items-center gap-1.5">
              <Text
                className="text-[10px] font-bold"
                style={{ color: dot.mode === "today" ? colors.onHero : colors.onHeroDim }}
              >
                {dayLetters[i] ?? ""}
              </Text>
              {dot.mode === "done" ? (
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.brandPrimary }}
                >
                  <Icon name="check" size={15} color={colors.onAccent} strokeWidth={2.5} />
                </View>
              ) : dot.mode === "today" ? (
                <View
                  className="h-8 w-8 rounded-full"
                  style={{ borderWidth: 2, borderColor: colors.brandPrimary }}
                />
              ) : dot.mode === "plan" ? (
                <View
                  className="h-8 w-8 rounded-full"
                  style={{
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: colors.onHeroDim,
                  }}
                />
              ) : (
                <View
                  className="h-8 w-8 rounded-full"
                  style={{ backgroundColor: colors.heroTrack }}
                />
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
              className="flex-1 items-center gap-0.5 rounded-2xl py-2"
              style={{
                backgroundColor: colors.heroTrack,
                borderWidth: 1,
                borderColor: pill.current ? colors.brandPrimary : "transparent",
              }}
            >
              <Text className="font-semibold text-on-hero-dim" style={{ fontSize: 10 }}>
                {t("progress.semPill", { n: pill.n })}
              </Text>
              <DisplayText
                size={13}
                tabular
                className={pill.done >= pill.plan ? undefined : "text-on-hero"}
                style={pill.done >= pill.plan ? { color: colors.brandPrimary } : undefined}
              >
                {`${pill.done}/${pill.plan}`}
              </DisplayText>
            </View>
          ))}
        </View>
      )}

      {!firstRun && (
        <View
          className="flex-row pt-4"
          style={{ borderTopWidth: 1, borderTopColor: colors.heroTrack }}
        >
          <TrioStat
            icon="clock"
            value={formatMinutes(hero.minutes)}
            label={t("progress.entrenados")}
          />
          <View style={{ width: 1, backgroundColor: colors.heroTrack }} />
          <TrioStat
            icon="flame"
            value={Math.round(hero.kcal).toLocaleString(locale)}
            label={t("progress.kcalQuemadas")}
          />
          <View style={{ width: 1, backgroundColor: colors.heroTrack }} />
          <TrioStat
            icon="dumbbell"
            value={Math.round(kgToUnit(hero.volumeKg, unit)).toLocaleString(locale)}
            label={t("progress.kgVolumen", { unit })}
          />
        </View>
      )}
    </FeatureCard>
  );
}

function TrioStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  const colors = useColors();
  return (
    <View className="flex-1 items-center gap-0.5">
      <Icon name={icon} size={14} color={colors.brandPrimary} />
      <DisplayText size={17} tabular className="text-on-hero">
        {value}
      </DisplayText>
      <Text className="text-[11px] text-on-hero-dim" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
