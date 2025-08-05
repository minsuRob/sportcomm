import React, { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useMutation } from "@apollo/client";
import { Button } from "./ui/button";
import { Ionicons } from "@expo/vector-icons";
import { saveSession, getSession, User } from "../lib/auth";
import { LOGIN_MUTATION, REGISTER_MUTATION } from "../lib/graphql";

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

export default function AuthForm({
  onLoginSuccess,
}: {
  onLoginSuccess: (user: User) => void;
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // 에러 상태 관리
  const [emailError, setEmailError] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const nicknameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const [login, { loading: loginLoading, error: loginError }] =
    useMutation(LOGIN_MUTATION);
  const [register, { loading: registerLoading, error: registerError }] =
    useMutation(REGISTER_MUTATION);

  // 에러 상태 초기화
  const clearErrors = () => {
    setEmailError("");
    setNicknameError("");
    setPasswordError("");
    setGeneralError("");
  };

  const processAuthAction = async (action: "login" | "register") => {
    clearErrors(); // 기존 에러 초기화

    const isLoginAction = action === "login";
    const mutation = isLoginAction ? login : register;
    const variables = isLoginAction
      ? { input: { email, password } }
      : { input: { email, nickname, password } };

    try {
      const { data } = await mutation({ variables });
      const result = data?.[action];

      if (result) {
        const { token, user } = result;
        console.log("로그인/회원가입 성공:", {
          토큰있음: !!token,
          사용자: user,
          역할: user.role,
        });

        // 역할 정보가 제대로 설정되어 있는지 확인
        if (!user.role) {
          console.warn("사용자 역할 정보가 없습니다:", user);
        } else {
          console.log("사용자 역할:", user.role);
        }

        await saveSession(token, user);

        // 토큰 및 사용자 정보 저장 확인을 위한 로그
        const { token: savedToken, user: savedUser } = await getSession();
        console.log("저장된 세션 확인:", {
          토큰저장됨: !!savedToken,
          사용자정보: savedUser,
          역할: savedUser?.role,
        });

        onLoginSuccess(user);
      }
    } catch (error: any) {
      const graphQLErrors = error?.graphQLErrors;
      const originalError = graphQLErrors?.[0]?.extensions?.originalError as {
        message?: string[] | string;
      };
      const messages = originalError?.message;
      const errorMessage = Array.isArray(messages)
        ? messages.join(", ")
        : error?.message || "오류가 발생했습니다";

      // 에러 메시지에 따라 적절한 필드에 에러 설정
      if (
        errorMessage.toLowerCase().includes("email") ||
        errorMessage.toLowerCase().includes("이메일")
      ) {
        setEmailError(errorMessage);
      } else if (
        errorMessage.toLowerCase().includes("password") ||
        errorMessage.toLowerCase().includes("비밀번호")
      ) {
        setPasswordError(errorMessage);
      } else if (
        errorMessage.toLowerCase().includes("nickname") ||
        errorMessage.toLowerCase().includes("닉네임")
      ) {
        setNicknameError(errorMessage);
      } else {
        // 일반적인 에러 (잘못된 이메일 또는 비밀번호 등)
        if (isLoginAction) {
          setPasswordError("잘못된 이메일 주소 또는 비밀번호");
        } else {
          setGeneralError(errorMessage);
        }
      }
    }
  };

  const handleLogin = () => processAuthAction("login");
  const handleRegister = () => processAuthAction("register");

  const handleContinue = () => {
    clearErrors(); // 기존 에러 초기화

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("올바른 이메일 주소를 입력하세요.");
      return;
    }

    if (!password.trim()) {
      setPasswordError("비밀번호를 입력해주세요.");
      return;
    }

    if (!isLogin && !nickname.trim()) {
      setNicknameError("닉네임을 입력해주세요.");
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
      <Text className="text-3xl font-bold text-center text-foreground mb-8">
        {isLogin ? "다시 오신 걸 환영합니다" : "계정 만들기"}
      </Text>

      {/* 이메일 입력 필드 */}
      <View className="mb-4">
        <TextInput
          className={`h-12 px-4 bg-input border rounded-md text-foreground text-base ${
            emailError ? "border-red-500" : "border-border"
          }`}
          placeholder="이메일 주소"
          placeholderTextColor="hsl(var(--muted-foreground))"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError) setEmailError(""); // 입력 시 에러 초기화
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          onSubmitEditing={() => {
            if (isLogin) {
              passwordInputRef.current?.focus();
            } else {
              nicknameInputRef.current?.focus();
            }
          }}
        />
        {emailError ? (
          <View className="flex-row items-center mt-2">
            <Ionicons name="alert-circle" color="#ef4444" size={16} />
            <Text className="text-red-500 text-sm ml-2">{emailError}</Text>
          </View>
        ) : null}
      </View>

      {/* 닉네임 입력 필드 (회원가입 시에만) */}
      {!isLogin && (
        <View className="mb-4">
          <TextInput
            ref={nicknameInputRef}
            className={`h-12 px-4 bg-input border rounded-md text-foreground text-base ${
              nicknameError ? "border-red-500" : "border-border"
            }`}
            placeholder="닉네임"
            placeholderTextColor="hsl(var(--muted-foreground))"
            value={nickname}
            onChangeText={(text) => {
              setNickname(text);
              if (nicknameError) setNicknameError(""); // 입력 시 에러 초기화
            }}
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />
          {nicknameError ? (
            <View className="flex-row items-center mt-2">
              <Ionicons name="alert-circle" color="#ef4444" size={16} />
              <Text className="text-red-500 text-sm ml-2">{nicknameError}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* 비밀번호 입력 필드 */}
      <View className="mb-4">
        <View className="relative">
          <TextInput
            ref={passwordInputRef}
            className={`h-12 px-4 pr-12 bg-input border rounded-md text-foreground text-base ${
              passwordError ? "border-red-500" : "border-border"
            }`}
            placeholder="비밀번호"
            placeholderTextColor="hsl(var(--muted-foreground))"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError(""); // 입력 시 에러 초기화
            }}
            secureTextEntry={!isPasswordVisible}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute right-4 top-3.5"
          >
            {isPasswordVisible ? (
              <Ionicons
                name="eye-off"
                color="hsl(var(--muted-foreground))"
                size={20}
              />
            ) : (
              <Ionicons
                name="eye"
                color="hsl(var(--muted-foreground))"
                size={20}
              />
            )}
          </TouchableOpacity>
        </View>
        {passwordError ? (
          <View className="flex-row items-center mt-2">
            <Ionicons name="alert-circle" color="#ef4444" size={16} />
            <Text className="text-red-500 text-sm ml-2">{passwordError}</Text>
          </View>
        ) : null}
      </View>

      {/* 일반 에러 메시지 */}
      {generalError ? (
        <View className="flex-row items-center mb-4">
          <Ionicons name="alert-circle" color="#ef4444" size={16} />
          <Text className="text-red-500 text-sm ml-2">{generalError}</Text>
        </View>
      ) : null}

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
        disabled={loginLoading || registerLoading}
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
