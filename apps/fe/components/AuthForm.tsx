import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { Button } from "./ui/button";
import { Eye, EyeOff } from "lucide-react-native";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEmailSubmitted, setIsEmailSubmitted] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleContinue = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("유효하지 않은 이메일", "올바른 이메일 주소를 입력하세요.");
      return;
    }
    setIsEmailSubmitted(true);
  };

  return (
    <View className="flex-1 justify-center p-8 bg-background">
      <Text className="text-3xl font-bold text-center text-foreground mb-8">
        {isEmailSubmitted ? "비밀번호를 입력하세요" : "다시 오신 걸 환영합니다"}
      </Text>

      {!isEmailSubmitted ? (
        <>
          <TextInput
            className="h-12 px-4 bg-input border border-border rounded-md text-foreground text-base mb-4"
            placeholder="이메일 주소"
            placeholderTextColor="hsl(var(--muted-foreground))"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button size="lg" className="bg-foreground" onPress={handleContinue}>
            <Text className="text-background">계속</Text>
          </Button>
        </>
      ) : (
        <>
          <View className="flex-row items-center justify-between h-12 px-4 bg-input border border-border rounded-md mb-4">
            <Text className="text-muted-foreground">{email}</Text>
            <TouchableOpacity onPress={() => setIsEmailSubmitted(false)}>
              <Text className="text-primary font-semibold">편집</Text>
            </TouchableOpacity>
          </View>

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

          <TouchableOpacity className="mb-6 self-start">
            <Text className="text-primary font-semibold">
              비밀번호를 잊으셨나요?
            </Text>
          </TouchableOpacity>

          <Button size="lg" className="bg-foreground">
            <Text className="text-background">계속</Text>
          </Button>
        </>
      )}

      <View className="flex-row justify-center items-center my-6">
        <Text className="text-muted-foreground">계정이 없으신가요? </Text>
        <TouchableOpacity>
          <Text className="text-primary font-semibold">회원 가입</Text>
        </TouchableOpacity>
      </View>

      <SocialLogins />
    </View>
  );
}
