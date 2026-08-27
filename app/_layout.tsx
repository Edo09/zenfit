import "@/src/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { OfflineBanner } from "@/src/components/offline-banner";
import { ToastProvider } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/use-auth";
import i18n from "@/src/i18n";
import { setupOnlineManager } from "@/src/lib/online";
import { flushOutbox } from "@/src/lib/outbox";
import { persister, PERSIST_MAX_AGE, queryClient } from "@/src/lib/query-client";
import { setupRestAlerts } from "@/src/lib/rest-alert";
import { AuthProvider } from "@/src/providers/auth-provider";
import { RestTimerProvider } from "@/src/providers/rest-timer-provider";
import { useColors } from "@/src/theme/colors";
import { WEB_MAX_WIDTH } from "@/src/theme/layout";
import { applyThemeMode, getStoredThemeMode } from "@/src/theme/theme-mode";
import { useThemeMode } from "@/src/theme/theme-store";
import { supabase } from "@/src/utils/supabase";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
  HankenGrotesk_900Black,
} from "@expo-google-fonts/hanken-grotesk";
import { Orbitron_500Medium } from "@expo-google-fonts/orbitron";
import {
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
} from "@expo-google-fonts/schibsted-grotesk";
import { focusManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AppState, Platform, View } from "react-native";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { I18nextProvider } from "react-i18next";

SplashScreen.preventAutoHideAsync();

// react-query has no "window focus" in RN — drive it from AppState so
// returning to the app refetches stale queries. Foregrounding also restarts
// the auth token refresh timer and retries any queued offline writes.
setupOnlineManager();
// Audio session, Android channel and notification handler for the rest timer.
// Idempotent, and cheap enough to do before anything asks for a countdown.
setupRestAlerts();
AppState.addEventListener("change", (status) => {
  focusManager.setFocused(status === "active");
  if (status === "active") {
    supabase.auth.startAutoRefresh();
    void flushOutbox();
  } else {
    supabase.auth.stopAutoRefresh();
  }
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
  const colors = useColors();
  const [fontsLoaded] = useFonts({
    // Body/labels/buttons — the `.font-*` weight utilities in global.css
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    HankenGrotesk_900Black,
    // Display — screen/card titles and ALL numerals (`.font-display*`)
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
    SchibstedGrotesk_800ExtraBold,
    // Brand voice — taglines only (`.font-brand`)
    Orbitron_500Medium,
  });

  // Restore the saved theme before first paint (joins the splash gate with
  // font loading) so a dark-mode user never sees a light flash on cold start.
  // Store-backed (not local state) so later toggles re-render the provider —
  // on web its mode prop controls the OS media listener.
  const themeMode = useThemeMode();
  useEffect(() => {
    getStoredThemeMode()
      .then(applyThemeMode)
      // A theme failure must never gate `ready` — fall back and render.
      .catch(() => applyThemeMode("system"));
  }, []);

  const ready = fontsLoaded && themeMode !== null;

  // Production web only. The worker is network-first with a cache fallback,
  // which in dev can hand back a stale Metro bundle after a reload — you'd be
  // testing yesterday's JS with nothing to show for it. Registering it also
  // fails noisily in embedded browsers that disallow service workers, which
  // buries real errors in the console during testing.
  useEffect(() => {
    if (__DEV__) return;
    if (Platform.OS === "web" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!ready) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        // Cache-bust when the app version changes
        buster: Constants.expoConfig?.version ?? "0",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === "success",
          // Writes are persisted by the outbox, not react-query
          shouldDehydrateMutation: () => false,
        },
      }}
      onSuccess={() => {
        // Cache restored — safe to drain writes queued before the restart
        void flushOutbox();
      }}
    >
      <I18nextProvider i18n={i18n}>
        <GluestackUIProvider mode={themeMode ?? "system"}>
          <AuthProvider>
          <ToastProvider>
          {/* Above the router: one rest countdown app-wide, so it survives
              navigating between screens and tabs mid-set. */}
          <RestTimerProvider>
            {/* "auto" tracks the active scheme: light icons on dark, dark on light */}
            <StatusBar style="auto" />
            <View
              style={{
                flex: 1,
                backgroundColor:
                  Platform.OS === "web" ? colors.webGutter : colors.brandDark,
              }}
            >
            <View
              style={[
                { flex: 1 },
                // Phone-first screens: on web render the whole app (tab bar
                // included) as a centered column instead of full-bleed.
                Platform.OS === "web" && {
                  width: "100%" as const,
                  maxWidth: WEB_MAX_WIDTH,
                  marginHorizontal: "auto" as const,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <OfflineBanner />
              {/* Group switches are router.replace calls — fade reads right */}
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                  animationDuration: 250,
                  // Native screen container — themed so transitions never
                  // flash white in dark mode
                  contentStyle: { backgroundColor: colors.brandDark },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </View>
            </View>
            <AuthGate />
          </RestTimerProvider>
            </ToastProvider>
          </AuthProvider>
        </GluestackUIProvider>
      </I18nextProvider>
    </PersistQueryClientProvider>
  );
}
