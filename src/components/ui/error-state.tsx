import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";

import { enter } from "@/src/lib/motion";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { AnimatedView } from "@/src/tw/animated";

import { Button } from "./button";

type ErrorStateProps = {
  message?: string;
  onRetry: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <AnimatedView entering={enter()} className="items-center justify-center gap-3 py-20">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-error-soft">
        <Ionicons name="cloud-offline-outline" size={30} color={colors.error} />
      </View>
      <Text className="text-lg font-semibold text-content-primary text-center">
        {t("common.somethingWentWrong")}
      </Text>
      <Text className="text-sm text-content-tertiary text-center px-6">
        {message ?? t("common.couldNotLoadData")}
      </Text>
      <Button variant="secondary" onPress={onRetry} className="mt-2">
        {t("common.retry")}
      </Button>
    </AnimatedView>
  );
}
