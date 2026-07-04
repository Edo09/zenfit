import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Input, Screen } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import { setLanguage } from "@/src/i18n";
import { useIsOnline } from "@/src/lib/online";
import { colors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";

export default function Login() {
  const { t, i18n } = useTranslation();
  const online = useIsOnline();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const missingEmail = !email.trim();
    const missingPassword = !password;
    if (missingEmail || missingPassword) {
      setEmailError(missingEmail ? t("common.fieldRequired") : undefined);
      setPasswordError(missingPassword ? t("common.fieldRequired") : undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    try {
      setLoading(true);
      setFormError(null);
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      const isAuthError = typeof e?.message === "string" && /credential|invalid/i.test(e.message);
      setFormError(isAuthError ? t("auth.invalidCredentials") : t("common.somethingWentWrong"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard contentContainerClassName="flex-1 justify-center px-6 py-12 gap-0">
      <Pressable
        onPress={() => setLanguage(i18n.language === "en" ? "es" : "en")}
        accessibilityRole="button"
        accessibilityLabel={t("common.language")}
        className="absolute top-12 right-6 bg-surface rounded-full px-3 py-1.5 border border-border z-10"
      >
        <Text className="text-sm font-semibold text-content-secondary">
          {i18n.language === "en" ? "ES" : "EN"}
        </Text>
      </Pressable>

      <View className="items-center mb-12">
        <View className="w-20 h-20 bg-brand-primary rounded-2xl items-center justify-center mb-4">
          <Ionicons name="barbell" size={40} color={colors.white} />
        </View>
        <Text className="text-3xl font-extrabold text-brand-primary">Habbito</Text>
        <Text className="text-content-tertiary mt-2 text-base">
          {t("auth.fitnessCompanion")}
        </Text>
      </View>

      <View className="gap-4">
        {!online && (
          <View className="bg-warning-soft rounded-xl p-3">
            <Text className="text-warning text-sm text-center">
              {t("auth.offlineLogin")}
            </Text>
          </View>
        )}

        <Input
          label={t("auth.email")}
          placeholder={t("auth.emailPlaceholder")}
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
        />

        <Input
          label={t("auth.password")}
          placeholder={t("auth.passwordPlaceholder")}
          secureTextEntry
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError != null) setPasswordError(undefined);
            if (formError != null) setFormError(null);
          }}
          error={passwordError}
        />

        {formError != null && (
          <View className="bg-error-soft rounded-xl p-3">
            <Text className="text-error text-sm">{formError}</Text>
          </View>
        )}

        <Button size="lg" onPress={handleLogin} loading={loading} className="mt-2">
          {t("auth.signIn")}
        </Button>
      </View>

      <View className="flex-row justify-center mt-8">
        <Text className="text-content-tertiary">{t("auth.noAccount")}</Text>
        <Link href="/(auth)/register">
          <Text className="text-brand-primary font-semibold">{t("auth.signUp")}</Text>
        </Link>
      </View>
    </Screen>
  );
}
