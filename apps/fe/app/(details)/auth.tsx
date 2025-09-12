import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Button } from "@/components/ui/button";
import { Ionicons } from "@expo/vector-icons";
import { saveSession, getSession, User } from "@/lib/auth";
import { signIn, signUp } from "@/lib/supabase/auth";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAppTheme } from "@/lib/theme/context";
import { typography } from "@/lib/theme/typography";
import type { ThemedStyle } from "@/lib/theme/types";
import AppDialog from "@/components/ui/AppDialog";

/**
 * 소셜 로그인 컴포넌트
 * Google, Apple, 전화번호 로그인 옵션을 제공합니다
 */
const SocialLogins = ({
  onSocialLogin,
}: {
  onSocialLogin: (provider: string) => void;
}) => {
  // 소셜 로그인 다이얼로그 표시 상태
  const [isDialogVisible, setDialogVisible] = useState(false);
  // theme 객체까지 함께 사용 (아이콘 색상 등)
  const { themed, theme } = useAppTheme();

  return (
    <>
      <View style={themed($dividerContainer)}>
        <View style={themed($dividerLine)} />
        <Text style={themed($dividerText)}>또는</Text>
        <View style={themed($dividerLine)} />
      </View>

      <View style={themed($socialButtonsContainer)}>
        {/* Google 로그인 */}
        <Button
          variant="outline"
          size="lg"
          style={themed($socialButton)}
          onPress={() => onSocialLogin("google")}
        >
          <View style={themed($socialButtonContent)}>
            <Ionicons
              name="logo-google"
              size={18}
              color={theme.colors.text}
              style={{ marginRight: 8 }}
            />
            <Text style={themed($socialButtonText)}>Google로 계속하기</Text>
          </View>
        </Button>

        {/* Apple 로그인 */}
        <Button
          variant="outline"
          size="lg"
          style={themed($socialButton)}
          onPress={() => onSocialLogin("apple")}
        >
          <View style={themed($socialButtonContent)}>
            <Ionicons
              name="logo-apple"
              size={20}
              color={theme.colors.text}
              style={{ marginRight: 8 }}
            />
            <Text style={themed($socialButtonText)}>Apple로 계속하기</Text>
          </View>
        </Button>

        {/* 전화번호 로그인 (준비중) */}
        <Button
          variant="outline"
          size="lg"
          style={themed($socialButton)}
          onPress={() => setDialogVisible(true)}
        >
          <View style={themed($socialButtonContent)}>
            <Ionicons
              name="call-outline"
              size={18}
              color={theme.colors.text}
              style={{ marginRight: 8 }}
            />
            <Text style={themed($socialButtonText)}>폰으로 계속하기</Text>
          </View>
        </Button>
      </View>

      <AppDialog
        visible={isDialogVisible}
        onClose={() => setDialogVisible(false)}
        title="알림"
        description="곧 지원 예정입니다."
        confirmText="확인"
        onConfirm={() => setDialogVisible(false)}
      />
    </>
  );
};

/**
 * 인증 화면 컴포넌트
 * 로그인 및 회원가입 기능을 제공하는 독립적인 screen입니다
 */
export default function AuthScreen() {
  const router = useRouter();
  const { themed, theme } = useAppTheme();

  const [isLogin, setIsLogin] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    description: string;
  }>({ visible: false, title: "", description: "" });

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

  // 통합 인증 훅 사용
  const { syncAfterSignUp, checkAndSyncAfterSignIn } = useAuth({
    onSyncSuccess: (user) => {
      console.log("✅ AuthScreen: 사용자 동기화 성공:", user.nickname);
    },
    onError: (error) => {
      console.warn("⚠️ AuthScreen: 동기화 에러:", error.message);
    },
  });

  // 에러 상태 초기화
  const clearErrors = () => {
    setEmailError("");
    setNicknameError("");
    setPasswordError("");
    setGeneralError("");
  };

  /**
   * 인증 성공 시 처리 함수
   * 로그인/회원가입 성공 후 메인 화면으로 이동합니다
   */
  const handleLoginSuccess = (user: User) => {
    console.log(
      "✅ AuthScreen: 로그인 성공, 메인 화면으로 이동:",
      user.nickname,
    );
    // 메인 앱으로 이동 (스택을 초기화하여 뒤로가기 방지)
    router.replace("/(app)/feed");
  };

  /**
   * 인증 액션 처리 함수
   * 로그인 또는 회원가입을 수행합니다
   */
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
      let result: any;

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
          errorMessage,
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

        // 백엔드와 사용자 정보 동기화
        try {
          if (isLoginAction) {
            // 로그인 시: 사용자 정보 확인 및 동기화
            console.log("🔄 로그인 후 사용자 정보 동기화 확인...");
            const syncResult = await checkAndSyncAfterSignIn();

            if (syncResult.success && syncResult.user) {
              console.log("✅ 사용자 정보 동기화 확인 완료:", syncResult.user);
            } else {
              console.log(
                "⚠️ 백엔드에 사용자 정보가 없습니다:",
                syncResult.error,
              );
            }
          } else {
            // 회원가입 시: 사용자 정보 자동 동기화
            console.log("🔄 회원가입 후 사용자 정보 동기화...");
            const syncResult = await syncAfterSignUp(result.user);

            if (syncResult.success && syncResult.user) {
              console.log(
                "✅ 회원가입 후 사용자 정보 동기화 완료:",
                syncResult.user,
              );
            } else {
              console.warn("⚠️ 회원가입 후 동기화 실패:", syncResult.error);
            }
          }
        } catch (syncError: any) {
          console.warn(
            "⚠️ 사용자 정보 동기화 실패 (로그인은 계속 진행):",
            syncError.message,
          );
          // 동기화 실패해도 로그인은 계속 진행
          // 필요시 나중에 수동으로 동기화할 수 있음
        }

        // 회원가입 성공 시 이메일 확인 안내
        if (!isLoginAction) {
          setGeneralError(""); // 에러 초기화
          // 이메일 확인이 필요한 경우 안내 메시지 표시
          if (!result.session.user?.email_confirmed_at) {
            setDialog({
              visible: true,
              title: "회원가입 완료",
              description:
                "회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요.",
            });
          }
        }

        handleLoginSuccess(user);
      }
    } catch (error: any) {
      console.error(
        `${isLoginAction ? "로그인" : "회원가입"} 중 예외 발생:`,
        error,
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

  /**
   * 소셜 로그인 핸들러
   * 각 소셜 플랫폼별 로그인을 처리합니다
   */
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

      setDialog({
        visible: true,
        title: "알림",
        description: `${provider} 로그인은 곧 지원 예정입니다.`,
      });
    } catch (error) {
      console.error(`${provider} 로그인 실패:`, error);
      setGeneralError(`${provider} 로그인 중 오류가 발생했습니다.`);
    }
  };

  /**
   * 비밀번호 재설정 핸들러
   * 이메일을 통한 비밀번호 재설정을 처리합니다
   */
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

      setDialog({
        visible: true,
        title: "비밀번호 재설정",
        description: "비밀번호 재설정 링크가 이메일로 전송되었습니다.",
      });
    } catch (error: any) {
      console.error("비밀번호 재설정 실패:", error);
      setGeneralError("비밀번호 재설정 중 오류가 발생했습니다.");
    }
  };

  /**
   * 계속하기 버튼 핸들러
   * 입력 검증 후 로그인/회원가입을 진행합니다
   */
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

  if (!showEmailForm) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "로그인",
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTintColor: theme.colors.text,
            headerBackTitle: "뒤로",
          }}
        />
        <ScrollView
          style={themed($container)}
          contentContainerStyle={themed($contentContainer)}
          keyboardShouldPersistTaps="handled"
        >
          <View style={themed($mainContent)}>
            <Text style={themed($titleText)}>Log into your account</Text>

            <Button
              variant="outline"
              size="lg"
              style={themed($socialButton)}
              onPress={() => {
                setIsLogin(true);
                setShowEmailForm(true);
              }}
            >
              <View style={themed($socialButtonContent)}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={theme.colors.text}
                  style={{ marginRight: 8 }}
                />
                <Text style={themed($socialButtonText)}>Login with email</Text>
              </View>
            </Button>

            <View style={themed($socialButtonsContainer)}>
              <Button
                variant="outline"
                size="lg"
                style={themed($socialButton)}
                onPress={() => handleSocialLogin("google")}
              >
                <View style={themed($socialButtonContent)}>
                  <Ionicons
                    name="logo-google"
                    size={18}
                    color={theme.colors.text}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={themed($socialButtonText)}>
                    Login with Google
                  </Text>
                </View>
              </Button>

              <Button
                variant="outline"
                size="lg"
                style={themed($socialButton)}
                onPress={() => handleSocialLogin("apple")}
              >
                <View style={themed($socialButtonContent)}>
                  <Ionicons
                    name="logo-apple"
                    size={20}
                    color={theme.colors.text}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={themed($socialButtonText)}>
                    Login with Apple
                  </Text>
                </View>
              </Button>
            </View>

            <View style={themed($toggleContainer)}>
              <Text style={themed($toggleText)}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsLogin(false);
                  setShowEmailForm(true);
                }}
              >
                <Text style={themed($toggleLinkText)}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isLogin ? "로그인" : "회원가입",
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerBackTitle: "뒤로",
        }}
      />

      <ScrollView
        style={themed($container)}
        contentContainerStyle={themed($contentContainer)}
        keyboardShouldPersistTaps="handled"
      >
        <View style={themed($mainContent)}>
          <Text style={themed($titleText)}>
            {isLogin ? "Sportalk 환영합니다" : "계정 만들기"}
          </Text>

          {/* 이메일 입력 필드 */}
          <View style={themed($inputContainer)}>
            <TextInput
              style={[
                themed($inputField),
                emailError && themed($inputFieldError),
              ]}
              placeholder="이메일 주소"
              placeholderTextColor={theme.colors.textDim}
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
              <View style={themed($errorContainer)}>
                <Ionicons name="alert-circle" color="#ef4444" size={16} />
                <Text style={themed($errorText)}>{emailError}</Text>
              </View>
            ) : null}
          </View>

          {/* 닉네임 입력 필드 (회원가입 시에만) */}
          {!isLogin && (
            <View style={themed($inputContainer)}>
              <TextInput
                ref={nicknameInputRef}
                style={[
                  themed($inputField),
                  nicknameError && themed($inputFieldError),
                ]}
                placeholder="닉네임"
                placeholderTextColor={theme.colors.textDim}
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
                <View style={themed($errorContainer)}>
                  <Ionicons name="alert-circle" color="#ef4444" size={16} />
                  <Text style={themed($errorText)}>{nicknameError}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* 비밀번호 입력 필드 */}
          <View style={themed($inputContainer)}>
            <View style={themed($passwordContainer)}>
              <TextInput
                ref={passwordInputRef}
                style={[
                  themed($inputField),
                  themed($passwordInput),
                  passwordError && themed($inputFieldError),
                ]}
                placeholder="비밀번호"
                placeholderTextColor={theme.colors.textDim}
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
                style={themed($eyeButton)}
              >
                {isPasswordVisible ? (
                  <Ionicons
                    name="eye-off"
                    color={theme.colors.textDim}
                    size={20}
                  />
                ) : (
                  <Ionicons name="eye" color={theme.colors.textDim} size={20} />
                )}
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <View style={themed($errorContainer)}>
                <Ionicons name="alert-circle" color="#ef4444" size={16} />
                <Text style={themed($errorText)}>{passwordError}</Text>
              </View>
            ) : null}
          </View>

          {/* 일반 에러 메시지 */}
          {generalError ? (
            <View style={themed($errorContainer)}>
              <Ionicons name="alert-circle" color="#ef4444" size={16} />
              <Text style={themed($errorText)}>{generalError}</Text>
            </View>
          ) : null}

          {isLogin && (
            <TouchableOpacity
              style={themed($forgotPasswordButton)}
              onPress={handleForgotPassword}
            >
              <Text style={themed($forgotPasswordText)}>
                비밀번호를 잊으셨나요?
              </Text>
            </TouchableOpacity>
          )}

          <Button
            size="lg"
            style={themed($continueButton)}
            onPress={handleContinue}
            disabled={loginLoading || registerLoading}
          >
            <Text style={themed($continueButtonText)}>계속</Text>
          </Button>

          <View style={themed($toggleContainer)}>
            <Text style={themed($toggleText)}>
              {isLogin ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={themed($toggleLinkText)}>
                {isLogin ? "회원 가입" : "로그인"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <AppDialog
        visible={dialog.visible}
        onClose={() => setDialog({ ...dialog, visible: false })}
        title={dialog.title}
        description={dialog.description}
        confirmText="확인"
        onConfirm={() => setDialog({ ...dialog, visible: false })}
      />
    </>
  );
}

// === 스타일 정의 ===

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $contentContainer: ThemedStyle<ViewStyle> = () => ({
  flexGrow: 1,
});

const $mainContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  padding: spacing.xl,
});

const $titleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 30, // typography.fontSize["3xl"] 대신 직접 값 사용
  fontWeight: "bold",
  textAlign: "center",
  color: colors.text,
  marginBottom: 32,
});

const $inputContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
});

const $inputField: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  // 디자인: 둥근 필(pill) 형태 입력창
  height: 52,
  paddingHorizontal: spacing.lg,
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 28,
  color: colors.text,
  fontSize: 16,
  fontWeight: "500",
  // 살짝 들어올려 보이는 효과 (iOS)
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  // Android elevation 대응
  elevation: 1,
});

const $inputFieldError: ThemedStyle<TextStyle> = ({ colors }) => ({
  borderColor: "#ef4444",
});

const $passwordContainer: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
});

const $passwordInput: ThemedStyle<TextStyle> = ({ spacing }) => ({
  paddingRight: 48,
});

const $eyeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  right: spacing.md,
  // 높이 증가(52)에 맞춰 중앙 정렬
  top: 16,
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.xs,
});

const $errorText: ThemedStyle<TextStyle> = () => ({
  color: "#ef4444",
  fontSize: 14,
  marginLeft: 8,
});

const $forgotPasswordButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: 24,
  alignSelf: "flex-start",
});

const $forgotPasswordText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint, // colors.primary 대신 colors.tint 사용
  fontWeight: "600",
});

// 추가: 소셜 버튼 전용 스타일 (필 형태 + 아이콘 정렬)
const $socialButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderRadius: 28,
  height: 52,
  justifyContent: "center",
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
});

const $socialButtonContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
});

const $continueButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  // 메인 액션: 검은색(또는 텍스트 컬러) 배경의 두꺼운 필 버튼
  backgroundColor: colors.text,
  borderRadius: 30,
  height: 56,
  justifyContent: "center",
  marginTop: spacing.sm,
});

const $continueButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 17,
  fontWeight: "600",
});

const $toggleContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginVertical: 24,
});

const $toggleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim, // colors.textSecondary 대신 colors.textDim 사용
});

const $toggleLinkText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint, // colors.primary 대신 colors.tint 사용
  fontWeight: "600",
});

const $dividerContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginVertical: spacing.lg,
});

const $dividerLine: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  height: 1,
  backgroundColor: colors.border,
});

const $dividerText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginHorizontal: spacing.md,
  color: colors.textDim, // colors.muted 대신 colors.textDim 사용
});

const $socialButtonsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  marginTop: spacing.md,
});

const $socialButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 15,
  fontWeight: "500",
});
