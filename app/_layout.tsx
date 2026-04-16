import "@/src/global.css";
import { useAuth } from "@/src/hooks/use-auth";
import "@/src/i18n";
import { AuthProvider } from "@/src/providers/auth-provider";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";

SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { session, loading, onboardingCompleted } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // Wait until onboarding status is fetched for logged-in users
    if (session && onboardingCompleted === null) return;

    const inAuthGroup = (segments[0] as string) === "(auth)";
    const inOnboarding = (segments[0] as string) === "(onboarding)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login" as any);
    } else if (session && !onboardingCompleted && !inOnboarding) {
      router.replace("/(onboarding)" as any);
    } else if (session && onboardingCompleted && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)" as any);
    }
  }, [session, loading, onboardingCompleted, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <AuthGate />
    </AuthProvider>
  );
}
