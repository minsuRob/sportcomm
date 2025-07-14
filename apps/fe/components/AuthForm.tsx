import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useMutation } from "urql";
import { Button } from "./ui/button";
import { Eye, EyeOff } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { LOGIN_MUTATION, REGISTER_MUTATION } from "../lib/graphql";
import { router } from "expo-router";

const SocialLogins = () => (
  <>
    <View className="flex-row items-center my-4">
      <View className="flex-1 h-px bg-border" />
      <Text className="mx-4 text-muted-foreground">또는</Text>
      <View className="flex-1 h-px bg-border" />
    </View>
    <View className="space-y-3">
      {/* TODO: Add icons */}
      <Button variant="outline" size="lg">
        <Text className="text-foreground">Google로 계속하기</Text>
      </Button>
      <Button variant="outline" size="lg">
        <Text className="text-foreground">Microsoft 계정으로 계속하기</Text>
      </Button>
      <Button variant="outline" size="lg">
        <Text className="text-foreground">Apple로 계속하기</Text>
      </Button>
      <Button variant="outline" size="lg">
        <Text className="text-foreground">폰으로 계속하기</Text>
      </Button>
    </View>
  </>
);

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [loginResult, login] = useMutation(LOGIN_MUTATION);
  const [registerResult, register] = useMutation(REGISTER_MUTATION);

  const handleLogin = async () => {
    const result = await login({ input: { email, password } });
    if (result.data?.login) {
      // TODO: Store the token securely
      Alert.alert(
        "로그인 성공",
        `환영합니다, ${result.data.login.user.nickname}님!`
      );
      router.replace("/feed");
    } else if (result.error) {
      const originalError = result.error.graphQLErrors[0]?.extensions
        ?.originalError as { message?: string[] | string };
      const messages = originalError?.message;
      const errorMessage = Array.isArray(messages)
        ? messages.join("\n")
        : result.error.message;
      Toast.show({
        type: "error",
        text1: "로그인 실패",
        text2: errorMessage,
      });
    }
  };

  const handleRegister = async () => {
    const result = await register({ input: { email, nickname, password } });
    if (result.data?.register) {
      // TODO: Store the token securely
      Alert.alert(
        "회원가입 성공",
        `환영합니다, ${result.data.register.user.nickname}님!`
      );
      router.replace("/feed");
    } else if (result.error) {
      const originalError = result.error.graphQLErrors[0]?.extensions
        ?.originalError as { message?: string[] | string };
      const messages = originalError?.message;
      const errorMessage = Array.isArray(messages)
        ? messages.join("\n")
        : result.error.message;
      Toast.show({
        type: "error",
        text1: "회원가입 실패",
        text2: errorMessage,
      });
    }
  };

  const handleContinue = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("유효하지 않은 이메일", "올바른 이메일 주소를 입력하세요.");
      return;
    }
    if (isLogin) {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  return (
    <View className="flex-1 justify-center p-8 bg-background">
      <Toast />
      <Text className="text-3xl font-bold text-center text-foreground mb-8">
        {isLogin ? "다시 오신 걸 환영합니다" : "계정 만들기"}
      </Text>

      <TextInput
        className="h-12 px-4 bg-input border border-border rounded-md text-foreground text-base mb-4"
        placeholder="이메일 주소"
        placeholderTextColor="hsl(var(--muted-foreground))"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {!isLogin && (
        <TextInput
          className="h-12 px-4 bg-input border border-border rounded-md text-foreground text-base mb-4"
          placeholder="닉네임"
          placeholderTextColor="hsl(var(--muted-foreground))"
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="none"
        />
      )}

      <View className="relative mb-4">
        <TextInput
          className="h-12 px-4 pr-12 bg-input border border-primary rounded-md text-foreground text-base"
          placeholder="비밀번호"
          placeholderTextColor="hsl(var(--muted-foreground))"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!isPasswordVisible}
        />
        <TouchableOpacity
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          className="absolute right-4 top-3.5"
        >
          {isPasswordVisible ? (
            <EyeOff color="hsl(var(--muted-foreground))" size={20} />
          ) : (
            <Eye color="hsl(var(--muted-foreground))" size={20} />
          )}
        </TouchableOpacity>
      </View>

      {isLogin && (
        <TouchableOpacity className="mb-6 self-start">
          <Text className="text-primary font-semibold">
            비밀번호를 잊으셨나요?
          </Text>
        </TouchableOpacity>
      )}

      <Button
        size="lg"
        className="bg-foreground"
        onPress={handleContinue}
        disabled={loginResult.fetching || registerResult.fetching}
      >
        <Text className="text-background">계속</Text>
      </Button>

      <View className="flex-row justify-center items-center my-6">
        <Text className="text-muted-foreground">
          {isLogin ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
        </Text>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text className="text-primary font-semibold">
            {isLogin ? "회원 가입" : "로그인"}
          </Text>
        </TouchableOpacity>
      </View>

      <SocialLogins />
    </View>
  );
}
