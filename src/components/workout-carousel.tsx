import { Pressable, Text, View } from "@/src/tw";
import { Routine } from "@/src/types/database";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, FlatList } from "react-native";
import Animated, {
    Extrapolation,
    interpolate,
    SharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = SCREEN_WIDTH * 0.75;
const ITEM_SPACING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

type Props = {
  routines: Routine[];
  theme: "light" | "dark";
};

const CATEGORY_IMAGES: Record<string, any> = {
  yoga: require("@/assets/images/yoga_card.png"),
  strength: require("@/assets/images/strength_card.png"),
  cardio: require("@/assets/images/cardio_card.png"),
};

function getRoutineImage(routineName: string) {
  const name = routineName.toLowerCase();
  if (name.includes("yoga") || name.includes("stretch")) return CATEGORY_IMAGES.yoga;
  if (name.includes("strength") || name.includes("power") || name.includes("lift")) return CATEGORY_IMAGES.strength;
  return CATEGORY_IMAGES.cardio;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export function WorkoutCarousel({ routines, theme }: Props) {
  const { t } = useTranslation();
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const isDark = theme === "dark";

  const renderItem = ({ item, index }: { item: Routine; index: number }) => {
    return (
      <CarouselItem 
        item={item} 
        index={index} 
        scrollX={scrollX} 
        isDark={isDark} 
      />
    );
  };

  if (routines.length === 0) {
    return (
      <View className="px-4 py-8 items-center justify-center bg-surface rounded-3xl border border-dashed border-surface-elevated">
        <Text className="text-gray-400 font-medium">{t("routines.noRoutinesFound")}</Text>
        <Pressable 
          onPress={() => router.push("/(tabs)/routines")}
          className="mt-2"
        >
          <Text className="text-brand-primary font-bold">{t("routines.createFirstRoutineLink")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="py-4">
      <AnimatedFlatList
        data={routines}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem as any}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: ITEM_SPACING,
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
    </View>
  );
}

function CarouselItem({ 
  item, 
  index, 
  scrollX, 
  isDark 
}: { 
  item: Routine; 
  index: number; 
  scrollX: SharedValue<number>;
  isDark: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * ITEM_WIDTH,
      index * ITEM_WIDTH,
      (index + 1) * ITEM_WIDTH,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[{ width: ITEM_WIDTH }, animatedStyle]}>
      <Pressable
        onPress={() => router.push(`/(tabs)/routines/${item.id}`)}
        className={`mx-2 rounded-3xl overflow-hidden shadow-xl ${isDark ? "bg-zinc-900" : "bg-white"}`}
        style={{ height: 200, elevation: 10 }}
      >
        <Image
          source={getRoutineImage(item.name)}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          contentFit="cover"
          transition={500}
        />
        <View className="absolute inset-0 bg-black/30" />
        
        <View className="flex-1 p-5 justify-end">
          <View className="bg-white/20 self-start px-2 py-1 rounded-full border border-white/30 backdrop-blur-md mb-2">
            <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
              {t("routines.readyToStart")}
            </Text>
          </View>
          <Text className="text-white text-2xl font-extrabold tracking-tight">
            {item.name}
          </Text>
          {item.description && (
            <Text className="text-white/80 text-sm mt-1" numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
