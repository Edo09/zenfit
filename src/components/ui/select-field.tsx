import { Ionicons } from "@expo/vector-icons";
import React from "react";

import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from "@/components/ui/select";
import { useColors } from "@/src/theme/colors";
import { Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

export type SelectFieldOption = { label: string; value: string };

type SelectFieldProps = {
  label?: string;
  placeholder?: string;
  value: string | null;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  helper?: string;
  containerClassName?: string;
};

export function SelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
  helper,
  containerClassName,
}: SelectFieldProps) {
  const colors = useColors();
  const selected = options.find((o) => o.value === value);

  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label != null && (
        <Text className="text-sm font-medium text-content-secondary">{label}</Text>
      )}
      <Select
        selectedValue={value ?? undefined}
        initialLabel={selected?.label}
        onValueChange={onChange}
      >
        <SelectTrigger
          className="bg-surface border-border rounded-xl flex-row items-center justify-between min-h-0 h-auto py-3"
          style={{ paddingHorizontal: 24 }}
        >
          <SelectInput
            placeholder={placeholder}
            className="flex-1 p-0 text-base text-content-primary"
            placeholderTextColor={colors.contentMuted}
          />
          <Ionicons name="chevron-down" size={18} color={colors.contentMuted} />
        </SelectTrigger>
        <SelectPortal>
          <SelectBackdrop />
          <SelectContent className="bg-surface border-border rounded-t-3xl pb-8">
            <SelectDragIndicatorWrapper>
              <SelectDragIndicator className="bg-surface-elevated" />
            </SelectDragIndicatorWrapper>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                label={option.label}
                value={option.value}
                className="rounded-xl"
              />
            ))}
          </SelectContent>
        </SelectPortal>
      </Select>
      {helper != null && <Text className="text-xs text-content-tertiary">{helper}</Text>}
    </View>
  );
}
