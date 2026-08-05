import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { CoachSection } from "@/src/components/coach-section";
import { Button, CapsLabel, Card, Input, Screen, useToast } from "@/src/components/ui";
import { Icon, type IconName } from "@/src/components/ui/icon";
import { useAuth } from "@/src/hooks/use-auth";
import { setLanguage } from "@/src/i18n";
import { useIsOnline } from "@/src/lib/online";
import { setWeightUnit, useWeightUnit } from "@/src/lib/weight-unit";
import { useColors } from "@/src/theme/colors";
import { setThemeMode } from "@/src/theme/theme-mode";
import { useThemeScheme } from "@/src/theme/theme-store";
import { Pressable, Text, View } from "@/src/tw";
import { supabase } from "@/src/utils/supabase";

type RowProps = {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  /** Destructive rows (log out) get the error ink and no chevron. */
  danger?: boolean;
};

// Preference row: icon tile, label left, current value + chevron right.
// Tapping cycles the setting (all three prefs are binary toggles today).
function SettingsRow({ icon, label, value, onPress, last = false, danger = false }: RowProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={onPress == null}
      accessibilityRole={onPress != null ? "button" : undefined}
      accessibilityLabel={value != null ? `${label}: ${value}` : label}
      className={`flex-row items-center gap-3 py-3.5 ${last ? "" : "border-b border-border"}`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-2xl bg-surface-elevated">
        <Icon
          name={icon}
          size={17}
          color={danger ? colors.error : colors.contentSecondary}
        />
      </View>
      <Text
        className={`flex-1 text-[15px] font-semibold ${danger ? "text-error" : "text-content-primary"}`}
      >
        {label}
      </Text>
      {value != null && value !== "" && (
        <Text className="text-sm text-content-tertiary" numberOfLines={1}>
          {value}
        </Text>
      )}
      {onPress != null && !danger && (
        <Icon name="chevron-right" size={16} color={colors.contentMuted} />
      )}
    </Pressable>
  );
}

// Lets a client rotate the temporary password the coach created their
// account with (panel "Añadir cliente" flow) — or change it any time.
function ChangePasswordRows({ last }: { last: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const online = useIsOnline();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password.length < 8) {
      setError(t("auth.passwordLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("settings.passwordsDontMatch"));
      return;
    }
    if (!online) {
      toast.show({ type: "info", message: t("common.requiresInternet") });
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast.show({ type: "success", message: t("settings.passwordChanged") });
      setPassword("");
      setConfirm("");
      setOpen(false);
    } catch {
      toast.show({ type: "error", message: t("common.somethingWentWrong") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingsRow
        icon="key"
        label={t("settings.changePassword")}
        onPress={() => setOpen((v) => !v)}
        last={last && !open}
      />
      {open && (
        <View className="gap-3 py-4">
          <Input
            label={t("settings.newPassword")}
            leftIcon="lock"
            placeholder={t("auth.passwordPlaceholder")}
            helper={error == null ? t("auth.passwordMin") : undefined}
            error={error}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error != null) setError(undefined);
            }}
          />
          <Input
            label={t("settings.confirmPassword")}
            leftIcon="lock"
            placeholder={t("auth.passwordPlaceholder")}
            secureTextEntry
            autoCapitalize="none"
            value={confirm}
            onChangeText={(text) => {
              setConfirm(text);
              if (error != null) setError(undefined);
            }}
          />
          <Button onPress={submit} loading={saving} className="w-full">
            {t("settings.changePassword")}
          </Button>
        </View>
      )}
    </>
  );
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const scheme = useThemeScheme();
  const isDark = scheme === "dark";
  const weightUnit = useWeightUnit();
  const { user, signOut } = useAuth();

  return (
    <Screen keyboard contentContainerClassName="gap-5 pb-28">
      <View className="gap-2">
        <CapsLabel size={10}>{t("settings.preferences")}</CapsLabel>
        <Card className="py-0">
          <SettingsRow
            icon={isDark ? "moon" : "sun"}
            label={t("settings.theme")}
            value={t(isDark ? "home.dark" : "home.light")}
            onPress={() => void setThemeMode(isDark ? "light" : "dark")}
          />
          <SettingsRow
            icon="languages"
            label={t("settings.language")}
            value={i18n.language === "es" ? t("common.spanish") : t("common.english")}
            onPress={() => setLanguage(i18n.language === "en" ? "es" : "en")}
          />
          <SettingsRow
            icon="scale"
            label={t("settings.weightUnit")}
            value={t(weightUnit === "kg" ? "settings.unitKgLabel" : "settings.unitLbLabel")}
            onPress={() => void setWeightUnit(weightUnit === "kg" ? "lb" : "kg")}
            last
          />
        </Card>
      </View>

      {/* Coach + membership (read-only, coach manages on web) */}
      <CoachSection />

      <View className="gap-2">
        <CapsLabel size={10}>{t("settings.account")}</CapsLabel>
        <Card className="py-0">
          <SettingsRow icon="mail" label={t("settings.email")} value={user?.email ?? "—"} />
          <ChangePasswordRows last={false} />
          <SettingsRow icon="log-out" label={t("auth.signOut")} onPress={signOut} danger last />
        </Card>
      </View>
    </Screen>
  );
}
