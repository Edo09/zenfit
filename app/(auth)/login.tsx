import { useAuth } from "@/src/hooks/use-auth";
import { Pressable, ScrollView, Text, TextInput, View } from "@/src/tw";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView } from "react-native";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Login Failed", e.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-brand-dark"
        contentContainerClassName="flex-1 justify-center px-6 py-12"
      >
        <View className="items-center mb-12">
          {/* Logo placeholder — replace with <Image source={require('@/assets/images/logo.png')} /> */}
          <View className="w-20 h-20 bg-brand-primary rounded-2xl items-center justify-center mb-4">
            <Text className="text-3xl font-bold text-white">H</Text>
          </View>
          <Text className="text-5xl font-bold text-brand-primary">Habbito</Text>
          <Text className="text-gray-400 mt-2 text-base">Your fitness companion</Text>
        </View>

        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-sm font-medium text-gray-300">Email</Text>
            <TextInput
              className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
              placeholder="you@example.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="gap-1">
            <Text className="text-sm font-medium text-gray-300">Password</Text>
            <TextInput
              className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            className="bg-brand-primary rounded-xl py-4 items-center mt-2"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign In</Text>
            )}
          </Pressable>
        </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-400">Don&apos;t have an account? </Text>
          <Link href="/(auth)/register">
            <Text className="text-brand-primary font-semibold">Sign Up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
