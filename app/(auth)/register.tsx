import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { BrandMark } from "@/src/components/brand-mark";
import { Button, DisplayText, Input, Screen } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import { Text, View } from "@/src/tw";

export default function Register() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const missingName = !name.trim();
    const missingEmail = !email.trim();
    const missingPassword = !password;
    const shortPassword = !missingPassword && password.length < 8;
    if (missingName || missingEmail || missingPassword || shortPassword) {
      setNameError(missingName ? t("common.fieldRequired") : undefined);
      setEmailError(missingEmail ? t("common.fieldRequired") : undefined);
      setPasswordError(
        missingPassword
          ? t("common.fieldRequired")
          : shortPassword
            ? t("auth.passwordLength")
            : undefined
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    try {
      setLoading(true);
      setFormError(null);
      const { needsEmailConfirmation } = await signUp(email.trim(), password, name.trim());
      if (needsEmailConfirmation) {
        // No session yet — the user must verify their email, then sign in.
        // Navigating to tabs would just bounce back to login with no context.
        setConfirmEmailSent(true);
        return;
      }
      router.replace("/(tabs)");
    } catch {
      setFormError(t("common.somethingWentWrong"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard contentContainerClassName="flex-1 justify-center px-6 py-12 gap-0">
      {/* ZYRON lockup, matching the login screen */}
      <View className="items-center gap-4 mb-10">
        <BrandMark size={132} />
        <DisplayText size={24} className="text-center">
          {t("auth.createAccount")}
        </DisplayText>
      </View>

      {confirmEmailSent ? (
        <View className="gap-4">
          <View className="bg-success-soft rounded-2xl p-4 gap-1">
            <Text className="text-success font-bold">{t("auth.confirmEmailTitle")}</Text>
            <Text className="text-content-secondary text-sm">
              {t("auth.confirmEmailBody", { email: email.trim() })}
            </Text>
          </View>
          <Button size="lg" onPress={() => router.replace("/(auth)/login")}>
            {t("auth.logIn")}
          </Button>
        </View>
      ) : (
      <View className="gap-4">
        <Input
          placeholder={t("auth.namePlaceholder")}
          leftIcon="user"
          autoCapitalize="words"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (nameError != null) setNameError(undefined);
            if (formError != null) setFormError(null);
          }}
          error={nameError}
          size="lg"
        />

        <Input
          placeholder={t("auth.emailPlaceholder")}
          leftIcon="mail"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError != null) setEmailError(undefined);
            if (formError != null) setFormError(null);
          }}
          error={emailError}
          size="lg"
        />

        <Input
          placeholder={t("auth.enterPassword")}
          leftIcon="lock"
          secureTextEntry
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError != null) setPasswordError(undefined);
            if (formError != null) setFormError(null);
          }}
          error={passwordError}
          helper={t("auth.passwordLength")}
          size="lg"
        />

        {formError != null && (
          <View className="bg-error-soft rounded-2xl p-3">
            <Text className="text-error text-sm">{formError}</Text>
          </View>
        )}

        <Button size="lg" onPress={handleRegister} loading={loading} className="mt-2">
          {t("auth.signUp")}
        </Button>

        {/* ── or ── */}
        <View className="flex-row items-center gap-3 my-2">
          <View className="flex-1 h-px bg-border" />
          <Text className="text-content-muted text-sm">{t("common.or")}</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        <Button
          variant="secondary"
          size="lg"
          haptic={false}
          onPress={() => router.push("/(auth)/login")}
        >
          {t("auth.logIn")}
        </Button>
      </View>
      )}
    </Screen>
  );
}
