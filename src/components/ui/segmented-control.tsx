import * as Haptics from "expo-haptics";
import React from "react";

import { useColors } from "@/src/theme/colors";
import { Pressable, Text, View } from "@/src/tw";
import { cn } from "@/src/utils/cn";

export type Segment = {
  key: string;
  label: string;
  /** Optional count badge shown after the label (hidden when 0). */
  count?: number;
};

type Props = {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
};

// Dojo Poster segmented control: bordered track (radius 10–12), active
// segment = red skew block with counter-skewed caps label; count badges are
// sharp rectangles.
export function SegmentedControl({ segments, value, onChange, className }: Props) {
  const colors = useColors();
  return (
    <View
      className={cn("flex-row rounded-xl bg-brand-dark border border-border p-1", className)}
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
            className={cn("flex-1 py-2.5", active && "bg-brand-primary")}
            style={active ? { transform: [{ skewX: "-10deg" }] } : undefined}
          >
            <View
              className="flex-row items-center justify-center gap-1.5"
              style={active ? { transform: [{ skewX: "10deg" }] } : undefined}
            >
              <Text
                className={cn(
                  "font-extrabold uppercase",
                  active ? "text-white" : "text-content-muted",
                )}
                style={{ fontSize: 10.5, letterSpacing: 1 }}
                numberOfLines={1}
              >
                {seg.label}
              </Text>
              {seg.count != null && seg.count > 0 && (
                <View
                  className="min-w-5 items-center px-1.5 py-0.5"
                  style={{
                    backgroundColor: active ? "rgba(0, 0, 0, 0.25)" : colors.surface,
                  }}
                >
                  <Text
                    className={cn(
                      "text-xs font-bold",
                      active ? "text-white" : "text-content-tertiary",
                    )}
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {seg.count}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
