import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Input, Screen } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import { colors } from "@/src/theme/colors";
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
      await signUp(email.trim(), password, name.trim());
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
      <View className="items-center mb-12">
        <View className="w-20 h-20 bg-brand-primary rounded-2xl items-center justify-center mb-4">
          <Ionicons name="barbell" size={40} color={colors.white} />
        </View>
        <Text className="text-3xl font-extrabold text-brand-primary">Habbito</Text>
        <Text className="text-content-tertiary mt-2 text-base">{t("auth.createAccount")}</Text>
      </View>

      <View className="gap-4">
        <Input
          label={t("auth.name")}
          placeholder={t("auth.namePlaceholder")}
          autoCapitalize="words"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (nameError != null) setNameError(undefined);
            if (formError != null) setFormError(null);
          }}
          error={nameError}
        />

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
          placeholder={t("auth.passwordMin")}
          secureTextEntry
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError != null) setPasswordError(undefined);
            if (formError != null) setFormError(null);
          }}
          error={passwordError}
          helper={t("auth.passwordLength")}
        />

        {formError != null && (
          <View className="bg-error-soft rounded-xl p-3">
            <Text className="text-error text-sm">{formError}</Text>
          </View>
        )}

        <Button size="lg" onPress={handleRegister} loading={loading} className="mt-2">
          {t("auth.signUp")}
        </Button>
      </View>

      <View className="flex-row justify-center mt-8">
        <Text className="text-content-tertiary">{t("auth.hasAccount")}</Text>
        <Link href="/(auth)/login">
          <Text className="text-brand-primary font-semibold">{t("auth.signIn")}</Text>
        </Link>
      </View>
    </Screen>
  );
}
