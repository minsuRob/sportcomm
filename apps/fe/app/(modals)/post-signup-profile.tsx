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
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import TeamLogo from "@/components/TeamLogo";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useAuth } from "@/lib/auth/context/AuthContext";
import { deriveTeamSlug } from "@/lib/team-data/players";
import { showToast } from "@/components/CustomToast";
import {
  quickUpdateAgeAndGender,
  type GenderInput,
  type GenderCode,
  sanitizeAge,
  normalizeGender,
} from "@/lib/supabase/quick-update";
import {
  markPostSignupStepDone,
  PostSignupStep,
  shouldRunPostSignup,
} from "@/lib/auth/post-signup";
import { useMutation, useLazyQuery } from "@apollo/client";
import {
  VALIDATE_REFERRAL_CODE,
  APPLY_REFERRAL_CODE,
} from "@/lib/graphql/admin";
import { useTeams } from "@/hooks/useTeams";
import TeamList from "@/components/team/TeamList";

/**
 * 회원가입 직후 경량 프로필 설정 모달
 * - 목적: 나이/성별을 빠르게 저장하고 My 팀 설정으로 유도
 * - 구현: Supabase PostgREST 기반의 경량 업데이트(quick-update) 사용
 * - 비고: GraphQL 경로를 우회하여 빠른 UX 제공
 */
export default function PostSignupProfileScreen(): React.ReactElement {
  const { themed, theme, setTeamColorOverride } = useAppTheme();
  const router = useRouter();
  const { user, isAuthenticated, reloadUser } = useAuth();

  // --- UI 상태 ---
  const [ageText, setAgeText] = useState<string>("");
  const [gender, setGender] = useState<GenderCode | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // --- 추천인 코드 상태 ---
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralCodeValidation, setReferralCodeValidation] = useState<{
    isValid: boolean | null;
    message: string;
  }>({ isValid: null, message: "" });
  const [isApplyingReferral, setIsApplyingReferral] = useState<boolean>(false);

  // --- GraphQL 쿼리 및 뮤테이션 ---
  const [
    validateReferralCode,
    {
      data: validationData,
      loading: validationLoading,
      error: validationError,
    },
  ] = useLazyQuery(VALIDATE_REFERRAL_CODE);
  const [applyReferralCode] = useMutation(APPLY_REFERRAL_CODE);

  // --- 팀 정보 ---
  const { teams, getTeamById } = useTeams();

  // --- 선택된 팀 정보 계산 ---
  const selectedTeams = useMemo(() => {
    if (!user?.myTeams?.length || !getTeamById) return [];
    return user.myTeams
      .map((userTeam: any) => getTeamById(userTeam.teamId || userTeam))
      .filter((team) => team !== undefined);
  }, [user?.myTeams, getTeamById]);

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

  // --- 접근 가드: 최초 회원가입(이메일/소셜) 직후 플로우에서만 노출, 일반 로그인 시 피드로 이동 ---
  // useEffect(() => {
  //   const run = async (): Promise<void> => {
  //     // 비인증 상태이거나, post-signup이 필요하지 않으면 접근 불가 → 피드로
  //     console.log("isAuthenticated", isAuthenticated);

  //     if (!isAuthenticated) {
  //       router.replace("/(app)/feed");
  //       return;
  //     }
  //     try {
  //       // const need = await shouldRunPostSignup(user as any);
  //       // if (!need) {
  //       //   router.replace("/(app)/feed");
  //       //   return;
  //       // }
  //       // 프로필 단계 여부와 무관하게, post-signup 진행 중이면 접근 허용
  //     } catch {
  //       // 판단 중 오류가 발생해도 보수적으로 피드로 이동
  //       router.replace("/(app)/feed");
  //     }
  //   };
  //   run();
  // }, [isAuthenticated, user]);

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
   * 추천인 코드 입력 처리
   * @param text 입력된 추천인 코드
   */
  const handleReferralCodeChange = (text: string): void => {
    // 대문자로 변환하고 특수문자 제거
    const cleanCode = text.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    setReferralCode(cleanCode);

    // 입력이 변경되면 검증 상태 초기화
    if (cleanCode !== text) {
      setReferralCodeValidation({ isValid: null, message: "" });
    }
  };

  /**
   * 추천인 코드 검증 처리
   */
  const handleValidateReferralCode = (): void => {
    if (!referralCode.trim()) {
      showToast({
        type: "error",
        title: "입력 오류",
        message: "추천인 코드를 입력해주세요.",
        duration: 2500,
      });
      return;
    }

    if (referralCode.length !== 8) {
      showToast({
        type: "error",
        title: "형식 오류",
        message: "추천인 코드는 8글자여야 합니다.",
        duration: 2500,
      });
      return;
    }

    validateReferralCode({
      variables: { referralCode },
    });
  };

  // 추천인 코드 검증 결과 처리
  useEffect(() => {
    if (validationData?.validateReferralCode && !validationLoading) {
      const result = validationData.validateReferralCode;
      setReferralCodeValidation({
        isValid: result.isValid,
        message: result.message,
      });

      showToast({
        type: result.isValid ? "success" : "error",
        title: result.isValid ? "사용 가능" : "사용 불가",
        message: result.message,
        duration: 3000,
      });
    }

    if (validationError && !validationLoading) {
      console.error("추천인 코드 검증 오류:", validationError);
      setReferralCodeValidation({
        isValid: false,
        message: "추천인 코드 검증 중 오류가 발생했습니다.",
      });
      showToast({
        type: "error",
        title: "오류",
        message: "추천인 코드 검증 중 오류가 발생했습니다.",
        duration: 3000,
      });
    }
  }, [validationData, validationError, validationLoading]);

  /**
   * 추천인 코드 적용 처리
   */
  const applyReferralIfValid = async (): Promise<boolean> => {
    // 추천인 코드가 입력되지 않은 경우
    if (!referralCode.trim()) {
      return true; // 건너뛰기
    }

    // 추천인 코드가 8글자가 아닌 경우
    if (referralCode.length !== 8) {
      showToast({
        type: "error",
        title: "추천인 코드 오류",
        message: "추천인 코드는 8글자여야 합니다.",
        duration: 2500,
      });
      return false;
    }

    // 추천인 코드가 검증되지 않은 경우
    if (referralCodeValidation.isValid === null) {
      showToast({
        type: "error",
        title: "검증 필요",
        message: "추천인 코드를 먼저 검증해주세요.",
        duration: 2500,
      });
      return false;
    }

    // 추천인 코드가 유효하지 않은 경우
    if (!referralCodeValidation.isValid) {
      showToast({
        type: "error",
        title: "유효하지 않은 코드",
        message: "유효하지 않은 추천인 코드입니다.",
        duration: 2500,
      });
      return false;
    }

    setIsApplyingReferral(true);
    try {
      const { data } = await applyReferralCode({
        variables: { referralCode },
      });

      if (data?.applyReferralCode) {
        const result = data.applyReferralCode;
        if (result.success) {
          showToast({
            type: "success",
            title: "추천인 적용 완료",
            message: `${result.pointsAwarded || 50} 포인트가 지급되었습니다!`,
            duration: 3000,
          });

          // 포인트 지급을 위해 사용자 정보 새로고침
          try {
            await reloadUser({ force: true });
          } catch (reloadError) {
            console.warn("사용자 정보 새로고침 실패:", reloadError);
            // 새로고침 실패해도 추천인 적용은 성공했으므로 계속 진행
          }

          return true;
        } else {
          showToast({
            type: "error",
            title: "추천인 적용 실패",
            message: result.message,
            duration: 3000,
          });
          return false;
        }
      }
      return false;
    } catch (error: any) {
      console.error("추천인 코드 적용 오류:", error);
      showToast({
        type: "error",
        title: "오류",
        message: "추천인 코드 적용 중 오류가 발생했습니다.",
        duration: 3000,
      });
      return false;
    } finally {
      setIsApplyingReferral(false);
    }
  };

  /**
   * 저장 및 팀 선택 화면으로 이동
   * - 나이/성별을 빠르게 업데이트 → 추천인 코드 적용 → 성공 시 team-selection 으로 이동
   */
  /**
   * 저장만 수행 (팀 선택 이동은 별도 섹션에서 처리)
   * - 나이/성별을 빠르게 업데이트 → 추천인 코드 적용 → 성공 시 완료 토스트
   * - 내비게이션은 수행하지 않음
   */
  const handleSave = async (): Promise<void> => {
    if (saving || isApplyingReferral) return;

    // 팀 선택 모달에서 팀을 선택한 후 user 정보가 업데이트되었는지 확인하기 위해 새로고침
    try {
      await reloadUser({ force: true });
    } catch (error) {
      console.warn("사용자 정보 새로고침 실패:", error);
    }

    // 팀 선택 필수 검증 (새로고침된 user.myTeams를 기반으로 다시 계산)
    let currentSelectedTeams: any[] = [];
    if (user?.myTeams?.length && getTeamById) {
      currentSelectedTeams = user.myTeams
        .map((userTeam: any) => getTeamById(userTeam.teamId || userTeam))
        .filter((team) => team !== undefined);
    }

    if (currentSelectedTeams.length === 0) {
      showToast({
        type: "error",
        title: "팀 선택 필요",
        message: "(필수) 최소 1개 이상의 팀을 선택해 주세요.",
        duration: 2500,
      });
      // handleGoTeamSelection();
      return;
    }

    if (!isAuthenticated) {
      showToast({
        type: "error",
        title: "인증 필요",
        message: "로그인 상태를 확인해주세요.",
        duration: 2500,
      });
      return;
    }

    const ageNumber = sanitizeAge(ageText);
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

      // 나이/성별은 선택사항이므로 존재할 때만 저장
      if ("age" in payload || "gender" in payload) {
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
      }

      // 추천인 코드 적용 (입력된 경우에만)
      if (referralCode.trim()) {
        const referralSuccess = await applyReferralIfValid();
        if (!referralSuccess) {
          // 추천인 코드 적용 실패 시에도 계속 진행
          console.warn("추천인 코드 적용 실패했지만 프로필 저장은 계속 진행");
        }
      }

      // 첫 번째 팀의 색상을 자동으로 앱 테마에 적용
      if (currentSelectedTeams.length > 0) {
        const firstTeam = currentSelectedTeams[0];
        if (firstTeam) {
          try {
            // team.code를 우선적으로 사용, 없으면 deriveTeamSlug 사용
            const teamKey = firstTeam.code || deriveTeamSlug(firstTeam.name);

            // teamKey가 유효한 값일 때만 색상 설정
            if (teamKey && teamKey !== null) {
              await setTeamColorOverride(firstTeam.id, teamKey);
              // console.log(`첫 번째 팀(${firstTeam.name}) 색상을 앱 테마에 적용했습니다. teamKey: ${teamKey}`);
            } else {
              console.warn(`팀 색상 설정 실패: 유효하지 않은 teamKey. teamName: ${firstTeam.name}, teamCode: ${firstTeam.code}, teamKey: ${teamKey}`);
            }
          } catch (colorError) {
            console.warn("팀 색상 설정 실패:", colorError);
            // 색상 설정 실패해도 저장 성공으로 처리
          }
        } else {
          console.warn("팀 색상 설정 실패: firstTeam이 undefined입니다.");
        }
      } else {
        console.warn("팀 색상 설정 실패: currentSelectedTeams가 비어있습니다.");
      }

      // post-signup: 프로필 단계 완료 플래그 저장
      await markPostSignupStepDone(PostSignupStep.Profile);

      showToast({
        type: "success",
        title: "완료",
        message: "설정이 완료되었습니다. 팀 상세 설정으로 이동합니다.",
        duration: 1200,
      });

      // 완료 시 팀 설정으로 이동
      router.replace("/(details)/my-teams-settings");
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
   * 팀 선택 섹션 버튼 핸들러
   * - 별도 섹션에서 팀 선택 모달로 이동
   */
  const handleGoTeamSelection = (): void => {
    router.push("/(modals)/team-selection?origin=profile");
  };

  // 성별 버튼 공통 뷰
  const renderGenderButton = (
    code: GenderCode,
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
  ): React.ReactElement => {
    const active = gender === code;
    return (
      <TouchableOpacity
        style={[
          themed($genderButton),
          {
            borderColor: active ? theme.colors.tint : theme.colors.border,
            backgroundColor: active
              ? theme.colors.tint + "15"
              : theme.colors.card,
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
        {/* <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity> */}
        <Text style={themed($headerTitle)}>내 프로필 설정</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text
            style={[
              themed($saveText),
              saving ? { color: theme.colors.textDim } : undefined,
            ]}
          >
            확인
          </Text>
        </TouchableOpacity>
      </View>

      {/* 본문 */}
      <KeyboardAwareScrollView
        style={themed($content)}
        contentContainerStyle={themed($scrollContent)}
        showsVerticalScrollIndicator={false}
        bounces={false}
        enableOnAndroid={true}
        extraHeight={100}
        keyboardShouldPersistTaps="handled"
      >
        {/*<Text style={themed($subtitle)}>{subtitle}</Text>*/}

        {/* 팀 선택 */}
        <View style={themed($section)}>
          <Text style={themed($label)}>
            응원 팀 선택 <Text style={themed($requiredText)}>(필수)</Text>
          </Text>
          <Text style={themed($helper)}>
            응원 팀을 1개 이상 선택해야 하며, 맞춤 피드가 구성 됩니다.
          </Text>

          {/* 선택된 팀 정보 표시 */}
          {selectedTeams.length > 0 && (
            <View style={themed($selectedTeamsContainer)}>
              <Text style={themed($selectedTeamsLabel)}>
                선택된 팀 ({selectedTeams.length})
              </Text>
              <TeamList
                teams={selectedTeams.map((team) => ({
                  id: team.id,
                  team: {
                    id: team.id,
                    name: team.name,
                    logoUrl: team.logoUrl,
                    icon: team.icon,
                  },
                  // user.myTeams에서 해당 팀의 teamRegistrationOrder 가져오기
                  teamRegistrationOrder: (() => {
                    const foundUserTeam = user?.myTeams?.find(
                      (userTeam) => userTeam.teamId === team.id || userTeam.team?.id === team.id
                    );
                    console.log('🔍 TeamList teamRegistrationOrder debug:', {
                      teamId: team.id,
                      teamName: team.name,
                      foundUserTeam: foundUserTeam ? {
                        id: foundUserTeam.id,
                        teamId: foundUserTeam.teamId,
                        teamRegistrationOrder: foundUserTeam.teamRegistrationOrder,
                        hasTeam: !!foundUserTeam.team
                      } : null,
                      allMyTeams: user?.myTeams?.map(mt => ({
                        teamId: mt.teamId,
                        teamRegistrationOrder: mt.teamRegistrationOrder,
                        teamName: mt.team?.name
                      }))
                    });
                    return foundUserTeam?.teamRegistrationOrder;
                  })(),
                }))}
                size={24}
                horizontal={true}
                maxItems={5}
              />
            </View>
          )}

          <TouchableOpacity
            onPress={handleGoTeamSelection}
            style={themed($teamSelectButton)}
            accessibilityRole="button"
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={theme.colors.text}
            />
            <Text style={themed($teamSelectButtonText)}>
              {selectedTeams.length > 0 ? "팀 변경하기" : "팀 선택하기"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 나이 입력 */}
        <View style={themed($section)}>
          <Text style={themed($label)}>나이</Text>
          <View style={themed($inputContainer)}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={theme.colors.textDim}
            />
            <TextInput
              style={themed($textInput)}
              value={ageText}
              onChangeText={handleAgeChange}
              keyboardType="numeric"
              placeholder="나이를 입력하세요"
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
            {/* {renderGenderButton("O", "기타", "people")} */}
          </View>
          {/* <Text style={themed($helper)}>
            선택은 선택사항이며, 언제든지 변경할 수 있습니다.
          </Text> */}
        </View>

        {/* 추천인 코드 입력 */}
        <View style={themed($section)}>
          <Text style={themed($label)}>추천인 코드</Text>
          <View style={themed($referralContainer)}>
            <View style={[themed($inputContainer), { flex: 2 }]}>
              <Ionicons
                name="gift-outline"
                size={16}
                color={theme.colors.textDim}
              />
              <TextInput
                style={themed($textInput)}
                value={referralCode}
                onChangeText={handleReferralCodeChange}
                placeholder="친구의 추천인 코드를 입력하세요"
                placeholderTextColor={theme.colors.textDim}
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={[
                themed($validateButton),
                (validationLoading ||
                  !referralCode.trim() ||
                  referralCode.length !== 8) &&
                  themed($disabledValidateButton),
              ]}
              onPress={handleValidateReferralCode}
              disabled={
                validationLoading ||
                !referralCode.trim() ||
                referralCode.length !== 8
              }
            >
              <Text
                style={[
                  themed($validateButtonText),
                  (validationLoading ||
                    !referralCode.trim() ||
                    referralCode.length !== 8) &&
                    themed($disabledValidateText),
                ]}
              >
                {validationLoading ? "확인 중..." : "코드 확인"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 추천인 코드 검증 결과 표시 */}
          {referralCodeValidation.message && (
            <View style={themed($validationResult)}>
              <Ionicons
                name={
                  referralCodeValidation.isValid
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={16}
                color={
                  referralCodeValidation.isValid
                    ? theme.colors.tint
                    : theme.colors.error
                }
              />
              <Text
                style={[
                  themed($validationText),
                  referralCodeValidation.isValid
                    ? themed($validText)
                    : themed($invalidText),
                ]}
              >
                {referralCodeValidation.message}
              </Text>
            </View>
          )}

          <Text style={themed($helper)}>
            {"추천인 코드를 입력하면 서로에게 50 포인트가 지급됩니다."}
            {"\n추후에 내 프로필에서 등록 가능합니다."}
          </Text>
        </View>

        {/* 저장하기 버튼 - 맨 밑에 별도 배치 */}
        <View style={themed($saveButtonContainer)}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[
              themed($primaryButton),
              saving ? { opacity: 0.6 } : undefined,
            ]}
            accessibilityRole="button"
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color={theme.colors.text} />
                <Text style={themed($primaryButtonText)}>완료 중...</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="checkmark-done-outline"
                  size={16}
                  color={theme.colors.tint}
                />
                <Text style={themed($primaryButtonText)}>확인</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
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
  color: colors.tint,
});

const $saveText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.tint,
  fontWeight: "600",
});

const $content: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.lg,
  paddingBottom: spacing.xl,
});

const $subtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  fontSize: 14,
  lineHeight: 20,
  marginBottom: spacing.md,
});

const $section: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $label: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  fontWeight: "700",
  fontSize: 16,
  marginBottom: spacing.xs,
});

const $requiredText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  textDecorationLine: "underline",
  fontWeight: "700",
  fontSize: 16,
});

const $inputContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  // marginTop: spacing.md,
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
  // marginTop: spacing.md,
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
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  paddingVertical: spacing.md,
  borderRadius: 10,
});

const $primaryButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 16,
  fontWeight: "700",
});

const $saveButtonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xl,
  marginBottom: spacing.lg,
});

// === 추천인 코드 관련 스타일 ===

const $referralContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  height: 48, // Match height of $inputContainer and $teamSelectButton
});

const $validateButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.tint,
  borderRadius: 8, // Match borderRadius of $inputContainer and $teamSelectButton
  minWidth: 80,
  alignItems: "center",
  height: 48, // Match height of $inputContainer and $teamSelectButton
  justifyContent: "center",
});

const $validateButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.background,
});

const $disabledValidateButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
});

const $disabledValidateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $validationResult: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.xs,
  gap: spacing.xs,
});

const $validationText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  flex: 1,
});

const $validText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
});

const $invalidText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
});

// === 팀 선택 섹션 스타일 ===
const $teamSelectButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  paddingVertical: spacing.sm,
  borderRadius: 8,
});

const $teamSelectButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
  fontWeight: "700",
});

// === 선택된 팀 표시 스타일 ===
const $selectedTeamsContainer: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  marginTop: spacing.md,
  padding: spacing.sm,
  backgroundColor: colors.card,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $selectedTeamsLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
  fontSize: 12,
  fontWeight: "600",
  marginBottom: spacing.xs,
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
