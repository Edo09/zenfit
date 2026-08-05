import * as Haptics from "expo-haptics";
import React from "react";

import { Pressable, Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

export type Segment = {
  key: string;
  label: string;
  /** Optional count badge shown after the label (hidden when 0). */
  count?: number;
};

/**
 * Habbito segmented control: a pill row on a sunken track. Active = ink fill
 * with canvas-colored label; inactive = transparent + secondary ink.
 */
export function SegmentedControl({
  segments,
  value,
  onChange,
  className,
}: {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "flex-row rounded-full bg-surface-elevated border border-border p-1",
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
              "flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2.5",
              active && "bg-brand-light",
            )}
          >
            <Text
              className={cn(
                "text-sm font-display-semibold",
                active ? "text-brand-dark" : "text-content-secondary",
              )}
              numberOfLines={1}
            >
              {seg.label}
            </Text>
            {seg.count != null && seg.count > 0 && (
              <View
                className={cn(
                  "min-w-5 items-center rounded-full px-1.5",
                  active ? "bg-hero-track" : "bg-surface",
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-bold",
                    active ? "text-brand-dark" : "text-content-tertiary",
                  )}
                  style={{ fontVariant: ["tabular-nums"] }}
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
