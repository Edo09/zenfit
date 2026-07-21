import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Full-screen in-app player for an exercise's demo media.
 *
 * The catalog's `video_url` may point at an animated GIF/WebP (the current
 * demos) or a real video (later). GIFs are ANIMATED IMAGES, not video —
 * expo-video can't play them — so branch on the URL: image types render with
 * expo-image (loops natively), everything else with expo-video. Keyed by uri
 * so switching exercises re-creates the source.
 */
const isImageDemo = (uri: string): boolean =>
  /\.(gif|apng|webp|png|jpe?g)$/i.test(uri.split("?")[0]);

function CloseButton({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel={t("common.close")}
      hitSlop={12}
      style={{
        position: "absolute",
        top: insets.top + 8,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="close" size={24} color="#fff" />
    </Pressable>
  );
}

function VideoDemo({ uri, onClose }: { uri: string; onClose: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <VideoView style={{ flex: 1 }} player={player} contentFit="contain" nativeControls />
      <CloseButton onClose={onClose} />
    </View>
  );
}

function ImageDemo({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        // GIF/WebP animate on their own; expo-image loops them.
        cachePolicy="memory-disk"
        transition={150}
      />
      <CloseButton onClose={onClose} />
    </View>
  );
}

export function ExerciseVideoModal({
  uri,
  onClose,
}: {
  uri: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={uri != null}
      animationType="slide"
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape"]}
    >
      {uri != null ? (
        isImageDemo(uri) ? (
          <ImageDemo key={uri} uri={uri} onClose={onClose} />
        ) : (
          <VideoDemo key={uri} uri={uri} onClose={onClose} />
        )
      ) : null}
    </Modal>
  );
}
