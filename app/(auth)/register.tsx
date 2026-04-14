import { useAuth } from "@/src/hooks/use-auth";
import { Pressable, ScrollView, Text, TextInput, View } from "@/src/tw";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView } from "react-native";

export default function Register() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    try {
      setLoading(true);
      await signUp(email.trim(), password, name.trim());
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message ?? "An error occurred");
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
          <Text className="text-gray-400 mt-2 text-base">Create your account</Text>
        </View>

        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-sm font-medium text-gray-300">Name</Text>
            <TextInput
              className="bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white"
              placeholder="Your name"
              placeholderTextColor="#64748B"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          </View>

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
              placeholder="Min. 8 characters"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            className="bg-brand-primary rounded-xl py-4 items-center mt-2"
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Create Account</Text>
            )}
          </Pressable>
        </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-400">Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text className="text-brand-primary font-semibold">Sign In</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
