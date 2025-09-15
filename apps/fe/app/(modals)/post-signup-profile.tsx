import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useAuth } from "@/lib/auth/context/AuthContext";
import { showToast } from "@/components/CustomToast";
import {
  quickUpdateAgeAndGender,
  type GenderInput,
  type GenderCode,
  sanitizeAge,
  normalizeGender,
} from "@/lib/supabase/quick-update";

/**
 * 회원가입 직후 경량 프로필 설정 모달
 * - 목적: 나이/성별을 빠르게 저장하고 My 팀 설정으로 유도
 * - 구현: Supabase PostgREST 기반의 경량 업데이트(quick-update) 사용
 * - 비고: GraphQL 경로를 우회하여 빠른 UX 제공
 */
export default function PostSignupProfileScreen(): JSX.Element {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // --- UI 상태 ---
  const [ageText, setAgeText] = useState<string>("");
  const [gender, setGender] = useState<GenderCode | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // --- 안내 문구 계산 ---
  const subtitle = useMemo<string>(() => {
    return "맞춤 추천과 커뮤니티 경험을 위해 나이와 성별을 설정해주세요.";
  }, []);

  // --- 초기값 세팅: 기존 사용자 나이가 있으면 표시 (성별은 없는 스키마일 수 있으므로 스킵) ---
  useEffect(() => {
    if (!user) return;
    if (typeof (user as any).age === "number") {
      setAgeText(String((user as any).age));
    }
    // (선택) 성별을 저장/동기화 중이라면 초기값 세팅 가능
    if ((user as any).gender) {
      setGender(((user as any).gender as string).toUpperCase() as GenderCode);
    }
  }, [user]);

  /**
   * 나이 입력 처리 (숫자만 허용, 1~120 범위로 클램프)
   * @param text 사용자 입력 텍스트
   */
  const handleAgeChange = (text: string): void => {
    const digits = text.replace(/[^0-9]/g, "");
    setAgeText(digits);
  };

  /**
   * 성별 선택 처리
   * @param value GenderCode 값
   */
  const handleGenderSelect = (value: GenderCode): void => {
    setGender(value);
  };

  /**
   * 저장 및 팀 선택 화면으로 이동
   * - 나이/성별을 빠르게 업데이트 → 성공 시 team-selection 으로 이동
   */
  const handleSaveAndGoTeamSelection = async (): Promise<void> => {
    if (saving) return;
    if (!isAuthenticated) {
      showToast({
        type: "error",
        title: "인증 필요",
        message: "로그인 상태를 확인해주세요.",
        duration: 2500,
      });
      return;
    }

    const ageNumber = ageText ? sanitizeAge(ageText) : null;
    if (ageText && ageNumber === null) {
      showToast({
        type: "error",
        title: "입력 오류",
        message: "나이는 1~120 사이의 숫자만 입력 가능합니다.",
        duration: 2500,
      });
      return;
    }

    setSaving(true);
    try {
      const payload: { age?: number; gender?: GenderInput } = {};
      if (ageNumber !== null) payload.age = ageNumber;
      if (gender) payload.gender = gender;

      // 아무 것도 입력하지 않은 경우 바로 팀 선택으로 이동 (선택적 UX)
      if (!("age" in payload) && !("gender" in payload)) {
        router.replace("/(modals)/team-selection");
        return;
      }

      const result = await quickUpdateAgeAndGender(payload, {
        updateLocal: true,
      });

      if (!result.success) {
        showToast({
          type: "error",
          title: "저장 실패",
          message: result.error || "정보 저장에 실패했습니다.",
          duration: 2500,
        });
        return;
      }

      showToast({
        type: "success",
        title: "저장 완료",
        message: "기본 프로필 정보가 저장되었습니다.",
        duration: 2000,
      });

      // 다음 단계: My 팀 설정
      router.replace("/(modals)/team-selection");
    } catch (e: any) {
      showToast({
        type: "error",
        title: "오류",
        message: e?.message || "정보 저장 중 오류가 발생했습니다.",
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * 팀 선택 화면으로 바로 이동 (건너뛰기)
   */
  const handleSkip = (): void => {
    router.replace("/(modals)/team-selection");
  };

  // 성별 버튼 공통 뷰
  const renderGenderButton = (
    code: GenderCode,
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
  ): JSX.Element => {
    const active = gender === code;
    return (
      <TouchableOpacity
        style={[
          themed($genderButton),
          {
            borderColor: active ? theme.colors.tint : theme.colors.border,
            backgroundColor: active ? theme.colors.tint + "15" : theme.colors.card,
          },
        ]}
        onPress={() => handleGenderSelect(code)}
        activeOpacity={0.85}
      >
        <Ionicons
          name={icon}
          size={16}
          color={active ? theme.colors.tint : theme.colors.text}
        />
        <Text
          style={[
            themed($genderButtonText),
            { color: active ? theme.colors.tint : theme.colors.text },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>기본 프로필 설정</Text>
        <TouchableOpacity
          onPress={handleSkip}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text
            style={[
              themed($skipText),
              saving ? { color: theme.colors.textDim } : undefined,
            ]}
          >
            건너뛰기
          </Text>
        </TouchableOpacity>
      </View>

      {/* 본문 */}
      <View style={themed($content)}>
        <Text style={themed($subtitle)}>{subtitle}</Text>

        {/* 나이 입력 */}
        <View style={themed($section)}>
          <Text style={themed($label)}>나이</Text>
          <View style={themed($inputContainer)}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textDim} />
            <TextInput
              style={themed($textInput)}
              value={ageText}
              onChangeText={handleAgeChange}
              keyboardType="numeric"
              placeholder="나이를 입력하세요 (1~120)"
              placeholderTextColor={theme.colors.textDim}
              maxLength={3}
            />
          </View>
          <Text style={themed($helper)}>숫자만 입력됩니다. (예: 25)</Text>
        </View>

        {/* 성별 선택 */}
        <View style={themed($section)}>
          <Text style={themed($label)}>성별</Text>
          <View style={themed($genderRow)}>
            {renderGenderButton("M", "남성", "male")}
            {renderGenderButton("F", "여성", "female")}
            {renderGenderButton("O", "기타", "people")}
          </View>
          <Text style={themed($helper)}>
            선택은 선택사항이며, 언제든지 변경할 수 있습니다.
          </Text>
        </View>

        {/* 안내 및 액션 */}
        <View style={themed($footer)}>
          <TouchableOpacity
            onPress={handleSaveAndGoTeamSelection}
            disabled={saving}
            style={[
              themed($primaryButton),
              saving ? { opacity: 0.6 } : undefined,
            ]}
            accessibilityRole="button"
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={themed($primaryButtonText)}>저장 중...</Text>
              </>
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={themed($primaryButtonText)}>저장하고 팀 선택하기</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            disabled={saving}
            style={themed($ghostButton)}
            accessibilityRole="button"
          >
            <Text style={themed($ghostButtonText)}>나중에 할게요</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* -------------------- Styles -------------------- */

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
});

const $skipText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.tint,
  fontWeight: "600",
});

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.lg,
});

const $subtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  fontSize: 14,
  lineHeight: 20,
  marginBottom: spacing.lg,
});

const $section: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $label: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  fontWeight: "700",
  fontSize: 16,
});

const $inputContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.md,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  backgroundColor: colors.card,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  marginLeft: spacing.sm,
  color: colors.text,
  fontSize: 16,
});

const $helper: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  fontSize: 12,
  marginTop: spacing.xs,
});

const $genderRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  marginTop: spacing.md,
});

const $genderButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  borderWidth: 1,
});

const $genderButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
});

const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xl,
  gap: spacing.sm,
});

const $primaryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  backgroundColor: colors.tint,
  paddingVertical: spacing.md,
  borderRadius: 10,
});

const $primaryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#fff",
  fontSize: 16,
  fontWeight: "700",
});

const $ghostButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.md,
  alignItems: "center",
  justifyContent: "center",
});

const $ghostButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  fontWeight: "600",
});

/**
 * 설명:
 * - 본 컴포넌트는 회원가입 직후 기본 프로필 설정을 최소 입력으로 빠르게 진행할 수 있도록 합니다.
 * - quickUpdateAgeAndGender를 통해 GraphQL 경유 없이 빠르게 postgrest 업데이트를 수행합니다.
 * - 저장 성공 시 My 팀 선택 모달로 이동하여 온보딩 흐름을 완성합니다.
 *
 * 타입 힌트:
 * - 핸들러와 유틸 함수는 명시적으로 반환 타입(JSX.Element | void | Promise<void>)을 지정했습니다.
 *
 * 오류 처리:
 * - 입력값 검증(나이 범위), 인증 상태 체크, 서버 오류 메시지 표시를 포함합니다.
 *
 * 성능:
 * - 간단한 상태만 관리하며, 불필요한 렌더를 줄이기 위해 useMemo를 활용했습니다.
 */
