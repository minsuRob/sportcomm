import React, { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Button } from "./ui/button";
import { Ionicons } from "@expo/vector-icons";
import { saveSession, getSession, User } from "../lib/auth";
import { signIn, signUp } from "../lib/supabase/auth";
import type { AuthError } from "@supabase/supabase-js";

const SocialLogins = ({
  onSocialLogin,
}: {
  onSocialLogin: (provider: string) => void;
}) => (
  <>
    <View className="flex-row items-center my-4">
      <View className="flex-1 h-px bg-border" />
      <Text className="mx-4 text-muted-foreground">또는</Text>
      <View className="flex-1 h-px bg-border" />
    </View>
    <View className="space-y-3">
      <Button
        variant="outline"
        size="lg"
        onPress={() => onSocialLogin("google")}
      >
        <Text className="text-foreground">Google로 계속하기</Text>
      </Button>
      <Button
        variant="outline"
        size="lg"
        onPress={() => onSocialLogin("apple")}
      >
        <Text className="text-foreground">Apple로 계속하기</Text>
      </Button>
      <Button
        variant="outline"
        size="lg"
        onPress={() => alert("곧 지원 예정입니다.")}
      >
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

  // 로딩 상태 관리
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

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

    // 로딩 상태 설정
    if (isLoginAction) {
      setLoginLoading(true);
    } else {
      setRegisterLoading(true);
    }

    try {
      let result;

      if (isLoginAction) {
        // Supabase 로그인
        console.log("🔄 Supabase 로그인 시작:", { email });
        result = await signIn({ email, password });
      } else {
        // Supabase 회원가입
        console.log("🔄 Supabase 회원가입 시작:", { email, nickname });
        result = await signUp({ email, password, nickname });
      }

      if (result.error) {
        // Supabase 에러 처리
        const errorMessage = result.error.message;
        console.error(
          `${isLoginAction ? "로그인" : "회원가입"} 실패:`,
          errorMessage
        );

        // 에러 메시지에 따라 적절한 필드에 에러 설정
        if (
          errorMessage.toLowerCase().includes("email") ||
          errorMessage.toLowerCase().includes("이메일") ||
          errorMessage.toLowerCase().includes("invalid login credentials") ||
          errorMessage.toLowerCase().includes("user not found")
        ) {
          if (isLoginAction) {
            setPasswordError("잘못된 이메일 주소 또는 비밀번호입니다.");
          } else {
            setEmailError("이미 사용 중인 이메일 주소입니다.");
          }
        } else if (
          errorMessage.toLowerCase().includes("password") ||
          errorMessage.toLowerCase().includes("비밀번호") ||
          errorMessage.toLowerCase().includes("weak password")
        ) {
          setPasswordError("비밀번호는 최소 6자 이상이어야 합니다.");
        } else if (
          errorMessage.toLowerCase().includes("nickname") ||
          errorMessage.toLowerCase().includes("닉네임")
        ) {
          setNicknameError(errorMessage);
        } else {
          // 일반적인 에러
          setGeneralError(errorMessage);
        }
        return;
      }

      if (result.user && result.session) {
        console.log(`✅ ${isLoginAction ? "로그인" : "회원가입"} 성공:`, {
          사용자ID: result.user.id,
          닉네임: result.user.nickname,
          이메일: result.user.email,
          역할: result.user.role,
        });

        // 세션 토큰 저장 (기존 auth.ts와 호환성을 위해)
        const token = result.session.access_token;
        const user: User = {
          id: result.user.id,
          nickname: result.user.nickname,
          email: result.user.email,
          role: result.user.role as any,
          profileImageUrl: result.user.profileImageUrl,
          myTeams: result.user.myTeams || [],
        };

        await saveSession(token, user);

        // 저장된 세션 확인
        const { token: savedToken, user: savedUser } = await getSession();
        console.log("저장된 세션 확인:", {
          토큰저장됨: !!savedToken,
          사용자정보: savedUser,
          역할: savedUser?.role,
        });

        // 회원가입 성공 시 이메일 확인 안내
        if (!isLoginAction) {
          setGeneralError(""); // 에러 초기화
          // 이메일 확인이 필요한 경우 안내 메시지 표시
          if (!result.session.user?.email_confirmed_at) {
            alert(
              "회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요."
            );
          }
        }

        onLoginSuccess(user);
      }
    } catch (error: any) {
      console.error(
        `${isLoginAction ? "로그인" : "회원가입"} 중 예외 발생:`,
        error
      );

      const errorMessage = error?.message || "오류가 발생했습니다";

      // 네트워크 에러 등 예외 상황 처리
      if (
        errorMessage.toLowerCase().includes("network") ||
        errorMessage.toLowerCase().includes("fetch")
      ) {
        setGeneralError("네트워크 연결을 확인해주세요.");
      } else {
        setGeneralError(errorMessage);
      }
    } finally {
      // 로딩 상태 해제
      if (isLoginAction) {
        setLoginLoading(false);
      } else {
        setRegisterLoading(false);
      }
    }
  };

  const handleLogin = () => processAuthAction("login");
  const handleRegister = () => processAuthAction("register");

  // 소셜 로그인 핸들러
  const handleSocialLogin = async (provider: string) => {
    try {
      console.log(`🔄 ${provider} 소셜 로그인 시작`);

      // TODO: Supabase OAuth 구현
      // const { data, error } = await supabase.auth.signInWithOAuth({
      //   provider: provider as any,
      //   options: {
      //     redirectTo: `${window.location.origin}/auth/callback`
      //   }
      // });

      alert(`${provider} 로그인은 곧 지원 예정입니다.`);
    } catch (error) {
      console.error(`${provider} 로그인 실패:`, error);
      setGeneralError(`${provider} 로그인 중 오류가 발생했습니다.`);
    }
  };

  // 비밀번호 재설정 핸들러
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setEmailError("비밀번호 재설정을 위해 이메일을 먼저 입력해주세요.");
      return;
    }

    try {
      console.log("🔄 비밀번호 재설정 이메일 전송:", email);

      // TODO: Supabase 비밀번호 재설정 구현
      // const { error } = await supabase.auth.resetPasswordForEmail(email);
      // if (error) throw error;

      alert("비밀번호 재설정 링크가 이메일로 전송되었습니다.");
    } catch (error: any) {
      console.error("비밀번호 재설정 실패:", error);
      setGeneralError("비밀번호 재설정 중 오류가 발생했습니다.");
    }
  };

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
        <TouchableOpacity
          className="mb-6 self-start"
          onPress={handleForgotPassword}
        >
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

      <SocialLogins onSocialLogin={handleSocialLogin} />
    </View>
  );
}
