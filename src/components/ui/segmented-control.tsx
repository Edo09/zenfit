import * as Haptics from "expo-haptics";
import React from "react";

import { Pressable, Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

export type Segment = {
  key: string;
  label: string;
  /** Optional count pill shown after the label (hidden when 0). */
  count?: number;
};

type Props = {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
};

// Pill-style segmented control: a track holding N equal segments, the active
// one filled with the brand color. Used to switch the routines screen between
// coach-assigned and self-made plans.
export function SegmentedControl({ segments, value, onChange, className }: Props) {
  return (
    <View
      className={cn(
        "flex-row rounded-2xl bg-surface border border-border p-1",
        className,
      )}
    >
      {segments.map((seg) => {
        const active = seg.key === value;
        return (
          <Pressable
            key={seg.key}
            onPress={() => {
              if (!active) {
                Haptics.selectionAsync().catch(() => {});
                onChange(seg.key);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5",
              active ? "bg-brand-primary" : "bg-transparent",
            )}
          >
            <Text
              className={cn(
                "text-sm font-semibold",
                active ? "text-white" : "text-content-tertiary",
              )}
              numberOfLines={1}
            >
              {seg.label}
            </Text>
            {seg.count != null && seg.count > 0 && (
              <View
                className={cn(
                  "min-w-5 items-center rounded-full px-1.5 py-0.5",
                  active ? "" : "bg-surface-elevated",
                )}
                // Inline rgba: bg-white/25 (opacity modifier) doesn't compile
                // under react-native-css
                style={
                  active
                    ? { backgroundColor: "rgba(255, 255, 255, 0.25)" }
                    : undefined
                }
              >
                <Text
                  className={cn(
                    "text-xs font-semibold",
                    active ? "text-white" : "text-content-tertiary",
                  )}
                >
                  {seg.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
