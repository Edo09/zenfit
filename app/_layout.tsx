import "@/src/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { ToastProvider } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import i18n from "@/src/i18n";
import { AuthProvider } from "@/src/providers/auth-provider";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppState } from "react-native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";
import { I18nextProvider } from "react-i18next";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// react-query has no "window focus" in RN — drive it from AppState so
// returning to the app refetches stale queries.
AppState.addEventListener("change", (status) => {
  focusManager.setFocused(status === "active");
});

function AuthGate() {
  const { session, loading, onboardingCompleted } = useAuth();
  const segments = useSegments();
  const router = useRouter();


  useEffect(() => {
    if (loading) return;
    // Wait until onboarding status is fetched for logged-in users
    if (session && onboardingCompleted === null) return;

    const inAuthGroup = (segments[0]) === "(auth)";
    const inOnboarding = (segments[0]) === "(onboarding)";
    const inTabs = (segments[0]) === "(tabs)";


    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && !onboardingCompleted && !inOnboarding) {
      router.replace("/(onboarding)");
    } else if (session && onboardingCompleted && !inTabs) {
      router.replace("/(tabs)");
    }
  }, [session, loading, onboardingCompleted, segments, router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
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
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <GluestackUIProvider mode="dark">
          <AuthProvider>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
            <AuthGate />
            </ToastProvider>
          </AuthProvider>
        </GluestackUIProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
