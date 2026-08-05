import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, FlatList, Platform } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { DisplayText } from "@/src/components/ui/typography";
import { useColors } from "@/src/theme/colors";
import { WEB_MAX_WIDTH } from "@/src/theme/layout";
import { useThemeScheme } from "@/src/theme/theme-store";
import { Pressable, Text, View } from "@/src/tw";
import { Routine } from "@/src/types/database";
import { getRoutineImage } from "@/src/utils/routine-image";
import { Icon } from "@/src/components/ui/icon";

// Habbito hero carousel: full-width image pages (h216, radius 26, bottom
// fade, cyan pill badge, Schibsted title, 44px play button) with capsule
// page dots (active 18×4 cyan capsule, inactive 4×4 dots).
const { width: WINDOW_WIDTH } = Dimensions.get("window");
// On web the app renders in a centered column (see app/_layout.tsx) — size
// pages from the column, not the browser window, or cards overflow it.
const SCREEN_WIDTH =
  Platform.OS === "web" ? Math.min(WINDOW_WIDTH, WEB_MAX_WIDTH) : WINDOW_WIDTH;
const H_PADDING = 20;
const ITEM_GAP = 12;
const ITEM_WIDTH = SCREEN_WIDTH - H_PADDING * 2;
const SNAP = ITEM_WIDTH + ITEM_GAP;

type Props = {
  routines: Routine[];
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export function WorkoutCarousel({ routines }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const renderItem = ({ item, index }: { item: Routine; index: number }) => {
    return <CarouselItem item={item} index={index} scrollX={scrollX} />;
  };

  if (routines.length === 0) {
    return (
      <View
        className="items-center justify-center bg-surface rounded-3xl border border-dashed border-border-strong px-4 py-7"
        style={{ marginHorizontal: H_PADDING }}
      >
        <Text className="text-content-tertiary font-medium">
          {t("routines.noRoutinesFound")}
        </Text>
        <Pressable onPress={() => router.push("/(tabs)/routines")} className="mt-2">
          <Text className="text-sm font-bold text-brand-primary-dark">
            {t("routines.createFirstRoutineLink")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <AnimatedFlatList
        data={routines}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem as any}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: H_PADDING }}
        onScroll={onScroll}
        onMomentumScrollEnd={(e) =>
          setPage(
            Math.min(
              routines.length - 1,
              Math.max(0, Math.round(e.nativeEvent.contentOffset.x / SNAP)),
            ),
          )
        }
        scrollEventThrottle={16}
      />
      {routines.length > 1 && (
        <View className="flex-row items-center justify-center gap-1.5 mt-2.5">
          {routines.map((r, i) => (
            <View
              key={r.id}
              className="rounded-full"
              style={
                i === page
                  ? { width: 18, height: 4, backgroundColor: colors.brandPrimary }
                  : { width: 4, height: 4, backgroundColor: colors.borderStrong }
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CarouselItem({
  item,
  index,
  scrollX,
}: {
  item: Routine;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const { t } = useTranslation();
  const scheme = useThemeScheme();
  const colors = useColors();
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SNAP, index * SNAP, (index + 1) * SNAP];
    const scale = interpolate(scrollX.value, inputRange, [0.9, 1, 0.9], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });

  return (
    <Animated.View style={[{ width: ITEM_WIDTH, marginRight: ITEM_GAP }, animatedStyle]}>
      <Pressable
        onPress={() => {
          // Seed the Routines tab's own stack with its index first, then
          // push the detail screen on the next tick — pushing both in the
          // same tick gets coalesced into a single history entry (no parent
          // screen, no back button); yielding first makes them two.
          router.push("/(tabs)/routines");
          setTimeout(() => router.push(`/(tabs)/routines/${item.id}`), 0);
        }}
        className="rounded-3xl overflow-hidden bg-surface"
        style={{ height: 216 }}
      >
        <Image
          source={getRoutineImage(item.name)}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          contentFit="cover"
          transition={500}
        />
        {/* Bottom fade so the title always reads (ink 0% → 92%) */}
        <Svg
          width="100%"
          height="100%"
          style={{ position: "absolute" }}
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id="wc-fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.2" stopColor="#0b0e12" stopOpacity="0" />
              <Stop offset="1" stopColor="#0b0e12" stopOpacity="0.92" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#wc-fade)" />
        </Svg>

        <View className="flex-1 p-[18px] justify-end items-start">
          <View className="rounded-full bg-brand-primary mb-2.5 px-3 py-1">
            <Text className="text-xs font-bold text-on-accent">
              {t("routines.readyToStart")}
            </Text>
          </View>
          <DisplayText size={25} className="text-on-hero" numberOfLines={2}>
            {item.name}
          </DisplayText>
          {item.description && (
            <Text className="text-[13px] mt-1.5 text-on-hero-dim" numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>

        {/* Play affordance — cyan on dark, ink on the light scrim */}
        <View
          className="absolute items-center justify-center rounded-full"
          style={{
            top: 14,
            right: 14,
            width: 44,
            height: 44,
            backgroundColor:
              scheme === "dark" ? "rgba(16, 19, 23, 0.55)" : "rgba(255, 255, 255, 0.92)",
            borderWidth: 1,
            borderColor:
              scheme === "dark" ? "rgba(242, 244, 247, 0.22)" : "rgba(18, 21, 26, 0.08)",
          }}
        >
          <Icon
            name="play"
            size={18}
            color={scheme === "dark" ? colors.brandPrimary : colors.contentPrimary}
            fill={scheme === "dark" ? colors.brandPrimary : colors.contentPrimary}
            style={{ marginLeft: 2 }}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
