import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Full-screen in-app player for an exercise's demo video.
 *
 * Plays a coach/user-provided `video_url` directly with expo-video — no
 * browser, no external redirect. Keyed by uri so switching exercises
 * re-creates the player with the new source.
 */
function Player({ uri, onClose }: { uri: string; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <VideoView
        style={{ flex: 1 }}
        player={player}
        contentFit="contain"
        nativeControls
      />
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
      {uri != null ? <Player key={uri} uri={uri} onClose={onClose} /> : null}
    </Modal>
  );
}
