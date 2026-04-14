import { ActivityIndicator, View } from "react-native";

// This route shows a loader while AuthGate in _layout.tsx handles the redirect.
export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" }}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}
