import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Text, View } from "@/src/tw";

import { Button } from "./button";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (visible && destructive) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, [visible, destructive]);

  return (
    <AlertDialog isOpen={visible} onClose={onClose} size="md">
      <AlertDialogBackdrop />
      <AlertDialogContent className="bg-surface border-border rounded-3xl gap-2">
        <AlertDialogHeader>
          <Text className="text-lg font-semibold text-content-primary">{title}</Text>
        </AlertDialogHeader>
        {message != null && (
          <AlertDialogBody>
            <Text className="text-base text-content-secondary">{message}</Text>
          </AlertDialogBody>
        )}
        <AlertDialogFooter className="mt-4">
          <View className="flex-1">
            <Button variant="secondary" onPress={onClose} className="w-full">
              {cancelLabel ?? t("common.cancel")}
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant={destructive ? "destructive" : "primary"}
              onPress={onConfirm}
              className="w-full"
            >
              {confirmLabel}
            </Button>
          </View>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
