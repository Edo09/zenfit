import React from "react";
import { useTranslation } from "react-i18next";

import { SegmentedControl } from "@/src/components/ui/segmented-control";
import type { Periodo } from "@/src/utils/progress";

type PeriodToggleProps = {
  value: Periodo;
  onChange: (value: Periodo) => void;
};

// Thin wrapper over the shared SegmentedControl so the whole app's toggles
// look the same (active = brand fill). Semana | Mes.
export function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  const { t } = useTranslation();
  return (
    <SegmentedControl
      value={value}
      onChange={(key) => onChange(key as Periodo)}
      segments={[
        { key: "week", label: t("progress.semana") },
        { key: "month", label: t("progress.mes") },
      ]}
    />
  );
}
