import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { useRouter } from "expo-router";
import AppDialog from "@/components/ui/AppDialog";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { User } from "@/lib/auth";
import { useAuth } from "@/lib/auth/context/AuthContext";
import { useMutation, useLazyQuery } from "@apollo/client";
import { UPDATE_PROFILE, CHECK_NICKNAME_AVAILABILITY } from "@/lib/graphql";
import { GET_REFERRAL_STATS, VALIDATE_REFERRAL_CODE, APPLY_REFERRAL_CODE } from "@/lib/graphql/admin";
import { showToast } from "@/components/CustomToast";
import { uploadFilesWeb } from "@/lib/api/webUpload";
import { uploadFilesMobile } from "@/lib/api/mobileUpload";
import { generateAvatarFileName } from "@/lib/utils/file-utils";
import { isWeb } from "@/lib/platform";
import { UploadedMedia, ProgressCallback } from "@/lib/api/common";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as Clipboard from 'expo-clipboard';

/**
 * 프로필 편집 모달 화면
 * 사용자의 프로필 정보를 편집할 수 있는 화면입니다
 */
export default function EditProfileScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();

  // 상태 관리
  // 전역 AuthContext에서 사용자 정보 사용 (로컬 currentUser 상태 제거)
  const { user: currentUser, updateUser, reloadUser, accessToken } = useAuth();
  const [profileImage, setProfileImage] = useState<string>("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState<number | undefined>(undefined);
  const [team, setTeam] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [nicknameCheckResult, setNicknameCheckResult] = useState<{
    available: boolean | null;
    message: string;
  }>({ available: null, message: "" });
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);

  // --- 추천인 코드 상태 ---
  const [referralStats, setReferralStats] = useState<{
    referralCode: string;
    totalReferrals: number;
    availableSlots: number;
    referredUsers: Array<{
      id: string;
      nickname: string;
      createdAt: Date;
    }>;
  } | null>(null);
  const [isLoadingReferralStats, setIsLoadingReferralStats] = useState(true);
  const [userPoints, setUserPoints] = useState<number>(0);

  // --- 추천인 코드 입력 상태 ---
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralCodeValidation, setReferralCodeValidation] = useState<{
    isValid: boolean | null;
    message: string;
  }>({ isValid: null, message: "" });
  const [isApplyingReferral, setIsApplyingReferral] = useState<boolean>(false);

  // GraphQL 뮤테이션 및 쿼리
  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const [checkNicknameAvailability] = useLazyQuery(CHECK_NICKNAME_AVAILABILITY);
  const [getReferralStats] = useLazyQuery(GET_REFERRAL_STATS);
  const [validateReferralCode, { data: validationData, loading: validationLoading, error: validationError }] = useLazyQuery(VALIDATE_REFERRAL_CODE);
  const [applyReferralCode] = useMutation(APPLY_REFERRAL_CODE);

  // 사용자 정보 로드
  // 기존 getSession 기반 초기 로드 → 전역 AuthProvider 부트스트랩으로 대체
  // currentUser 변경 시만 필드 동기화
  useEffect(() => {
    if (!currentUser) return;
    setProfileImage(currentUser.profileImageUrl || "");
    setName(currentUser.nickname || "");
    setBio(currentUser.bio || "");
    setTeam(currentUser.team || "");
    setIsPrivate(currentUser.isPrivate || false);
    setAge((currentUser as any).age);
    setUserPoints((currentUser as any).points || 0);
    // 닉네임이 변경되면 중복 확인 결과 초기화
    setNicknameCheckResult({ available: null, message: "" });
  }, [currentUser]);

  // 추천인 통계 자동 로드
  useEffect(() => {
    if (currentUser) {
      loadReferralStats();
    }
  }, [currentUser]);

  /**
   * 프로필 이미지 업로드 처리
   * 세분화된 에러 처리와 함께 구현
   */
  const uploadProfileImage = async (
    file: File | { uri: string; name: string; type: string },
  ): Promise<string | null> => {
    try {
      setIsImageUploading(true);
      setUploadProgress(0);

      // console.log("프로필 이미지 업로드 시작:", {
      //   isWeb: isWeb(),
      //   fileInfo: isWeb() ? (file as File).name : (file as any).name,
      // });

      // 진행률 콜백 함수
      const progressCallback: ProgressCallback = (progress) => {
        setUploadProgress(progress.percentage);
        //console.log(`업로드 진행률: ${progress.percentage}%`);
      };

      let uploadedFiles: UploadedMedia[];

      // 플랫폼별 업로드
      if (isWeb()) {
        uploadedFiles = await uploadFilesWeb([file as File], progressCallback, {
          category: "avatar",
        });
      } else {
        uploadedFiles = await uploadFilesMobile(
          [file as { uri: string; name: string; type: string }],
          progressCallback,
          { category: "avatar" },
        );
      }

      // 업로드 결과 검증
      if (!uploadedFiles || uploadedFiles.length === 0) {
        throw new Error(
          "업로드 응답이 비어있습니다. 서버 연결을 확인해주세요.",
        );
      }

      const uploadedMedia = uploadedFiles[0];
      //console.log("프로필 이미지 업로드 응답:", uploadedMedia);

      // 업로드 상태별 처리
      if (uploadedMedia.status === "FAILED") {
        const errorMessage =
          uploadedMedia.failureReason || "업로드에 실패했습니다.";
        throw new Error(`업로드 실패: ${errorMessage}`);
      }

      // URL 유효성 검증
      if (!uploadedMedia.url || uploadedMedia.url.trim() === "") {
        throw new Error(
          "업로드는 완료되었지만 이미지 URL을 받지 못했습니다. 잠시 후 다시 시도해주세요.",
        );
      }

      // URL 접근 가능성 검증 (선택적)
      try {
        const response = await fetch(uploadedMedia.url, { method: "HEAD" });
        if (!response.ok) {
          throw new Error("업로드된 이미지에 접근할 수 없습니다.");
        }
      } catch (fetchError) {
        console.warn("이미지 URL 검증 실패:", fetchError);
        // URL 검증 실패해도 계속 진행 (네트워크 문제일 수 있음)
      }

      //console.log("프로필 이미지 업로드 성공:", {
      //   id: uploadedMedia.id,
      //   url: uploadedMedia.url,
      //   status: uploadedMedia.status,
      // });

      return uploadedMedia.url;
    } catch (error) {
      console.error("프로필 이미지 업로드 실패:", error);

      // 에러 타입별 사용자 친화적 메시지 생성
      let userMessage = "프로필 이미지 업로드에 실패했습니다.";

      if (error.message?.includes("네트워크")) {
        userMessage = "네트워크 연결을 확인하고 다시 시도해주세요.";
      } else if (error.message?.includes("크기")) {
        userMessage =
          "이미지 파일 크기가 너무 큽니다. 더 작은 이미지를 선택해주세요.";
      } else if (
        error.message?.includes("형식") ||
        error.message?.includes("format")
      ) {
        userMessage =
          "지원되지 않는 이미지 형식입니다. JPG, PNG, GIF 파일을 사용해주세요.";
      } else if (
        error.message?.includes("권한") ||
        error.message?.includes("인증")
      ) {
        userMessage = "업로드 권한이 없습니다. 로그인 상태를 확인해주세요.";
      } else if (error.message?.includes("서버")) {
        userMessage = "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      } else if (error.message?.includes("URL")) {
        userMessage = error.message; // URL 관련 에러는 그대로 표시
      }

      // 사용자 친화적 에러로 다시 던지기
      throw new Error(userMessage);
    } finally {
      setIsImageUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * 프로필 이미지 선택 및 업로드
   */
  const handleSelectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedAsset = result.assets[0];

        // 파일 타입 검증
        if (!selectedAsset.mimeType?.startsWith("image/")) {
          showToast({
            type: "error",
            title: "파일 형식 오류",
            message: "프로필 사진은 이미지 파일만 업로드 가능합니다.",
            duration: 3000,
          });
          return;
        }

        // 파일 크기 검증 (5MB 제한)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (selectedAsset.fileSize && selectedAsset.fileSize > maxSize) {
          showToast({
            type: "error",
            title: "파일 크기 초과",
            message: "프로필 사진은 5MB 이하의 이미지만 업로드 가능합니다.",
            duration: 3000,
          });
          return;
        }

        try {
          let uploadFile: File | { uri: string; name: string; type: string };

          if (isWeb()) {
            // 웹 환경에서는 blob을 File로 변환
            const response = await fetch(selectedAsset.uri);
            const blob = await response.blob();
            // 한글 파일명 문제 해결: 안전한 파일명 생성
            const safeFileName = generateAvatarFileName(
              selectedAsset.fileName || "avatar.jpg",
              currentUser?.id || "user",
            );

            uploadFile = new File([blob], safeFileName, {
              type: selectedAsset.mimeType || "image/jpeg",
            });
          } else {
            // 모바일 환경 - 한글 파일명 문제 해결
            const safeFileName = generateAvatarFileName(
              selectedAsset.fileName || "avatar.jpg",
              currentUser?.id || "user",
            );

            uploadFile = {
              uri: selectedAsset.uri,
              name: safeFileName,
              type: selectedAsset.mimeType || "image/jpeg",
            };
          }

          // REST API를 통한 이미지 업로드
          const uploadedImageUrl = await uploadProfileImage(uploadFile);

          if (uploadedImageUrl) {
            setProfileImage(uploadedImageUrl);
            showToast({
              type: "success",
              title: "완료",
              message: "프로필 이미지가 업로드되었습니다.",
              duration: 3000,
            });
          }
        } catch (uploadError) {
          console.error("이미지 업로드 오류:", uploadError);

          // 한글 파일명 관련 에러 특별 처리
          let errorMessage =
            uploadError.message || "이미지 업로드에 실패했습니다.";
          if (
            errorMessage.includes("Invalid key") ||
            errorMessage.includes("파일명")
          ) {
            errorMessage =
              "파일명에 특수문자가 포함되어 업로드에 실패했습니다. 다른 이미지를 선택해주세요.";
          }

          showToast({
            type: "error",
            title: "업로드 실패",
            message: errorMessage,
            duration: 4000,
          });
        }
      }
    } catch (error) {
      console.error("이미지 선택 오류:", error);

      let errorMessage = "이미지를 선택할 수 없습니다.";
      if (error.message?.includes("permission")) {
        errorMessage =
          "갤러리 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요.";
      } else if (error.message?.includes("cancelled")) {
        return; // 사용자가 취소한 경우 토스트 표시하지 않음
      }

      showToast({
        type: "error",
        title: "이미지 선택 실패",
        message: errorMessage,
        duration: 3000,
      });
    }
  };

  /**
   * 프로필 이미지 삭제
   */
  const handleDeleteImage = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteImage = () => {
    setProfileImage("");
    setShowDeleteDialog(false);
  };

  /**
   * 변경사항 저장
   */
  const handleSave = async () => {
    if (!currentUser) return;

    if (!name.trim()) {
      showToast({
        type: "error",
        title: "오류",
        message: "이름을 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    // 닉네임이 변경되었는데 중복 확인을 하지 않은 경우
    if (
      name.trim() !== currentUser.nickname &&
      nicknameCheckResult.available === null
    ) {
      showToast({
        type: "error",
        title: "중복 확인 필요",
        message: "닉네임 변경 시 중복 확인을 먼저 해주세요.",
        duration: 3000,
      });
      return;
    }

    // 닉네임이 사용 불가능한 경우
    if (
      name.trim() !== currentUser.nickname &&
      nicknameCheckResult.available === false
    ) {
      showToast({
        type: "error",
        title: "닉네임 사용 불가",
        message: "다른 닉네임을 선택해주세요.",
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      // GraphQL로 프로필 정보 업데이트 (이미지 URL 및 나이 포함)
      const result = await updateProfile({
        variables: {
          input: {
            nickname: name.trim(),
            bio: bio.trim(),
            profileImageUrl: profileImage,
            age: age,
          },
        },
        fetchPolicy: "no-cache",
      });

      if (result.data?.updateProfile) {
        // 서버에서 반환한 최신 사용자 정보로 로컬 세션 동기화
        const updated = result.data.updateProfile as Partial<User>;
        await updateUser({
          nickname: updated.nickname ?? name.trim(),
          bio: updated.bio ?? bio.trim(),
          profileImageUrl: updated.profileImageUrl ?? profileImage,
          age: typeof updated.age === "number" ? updated.age : age,
        });

        showToast({
          type: "success",
          title: "완료",
          message: "프로필이 성공적으로 업데이트되었습니다.",
          duration: 3000,
        });

        // 프로필 편집 완료 후 프로필 화면으로 이동
        router.replace("/(app)/profile");
      }
    } catch (error) {
      console.error("프로필 업데이트 오류:", error);
      showToast({
        type: "error",
        title: "오류",
        message: "프로필 업데이트에 실패했습니다.",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 나이 입력을 숫자만 허용하고 1~120 범위로 제한
   */
  const handleAgeChange = (text: string) => {
    const onlyDigits = text.replace(/[^0-9]/g, "");
    if (onlyDigits === "") {
      setAge(undefined);
      return;
    }
    const num = Math.max(1, Math.min(120, parseInt(onlyDigits, 10)));
    setAge(num);
  };

  /**
   * 닉네임 중복 확인
   */
  const handleCheckNickname = async () => {
    if (!name.trim()) {
      showToast({
        type: "error",
        title: "입력 오류",
        message: "닉네임을 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    setIsCheckingNickname(true);
    try {
      const { data } = await checkNicknameAvailability({
        variables: {
          nickname: name.trim(),
          excludeUserId: currentUser?.id,
        },
      });

      if (data?.checkNicknameAvailability) {
        const result = data.checkNicknameAvailability;
        setNicknameCheckResult({
          available: result.available,
          message: result.message,
        });

        showToast({
          type: result.available ? "success" : "error",
          title: result.available ? "사용 가능" : "사용 불가",
          message: result.message,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("닉네임 중복 확인 오류:", error);
      setNicknameCheckResult({
        available: false,
        message: "닉네임 확인 중 오류가 발생했습니다.",
      });
      showToast({
        type: "error",
        title: "오류",
        message: "닉네임 확인 중 오류가 발생했습니다.",
        duration: 3000,
      });
    } finally {
      setIsCheckingNickname(false);
    }
  };

  /**
   * 닉네임 입력 시 중복 확인 결과 초기화
   */
  const handleNameChange = (text: string) => {
    setName(text);
    // 닉네임이 변경되면 중복 확인 결과 초기화
    if (text !== currentUser?.nickname) {
      setNicknameCheckResult({ available: null, message: "" });
    }
  };

  /**
   * 취소 처리
   */
  const handleCancel = () => {
    router.back();
  };

  /**
   * 추천인 통계 조회
   */
  const loadReferralStats = async () => {
    if (!currentUser) return;

    setIsLoadingReferralStats(true);
    try {
      const { data } = await getReferralStats();
      if (data?.getReferralStats) {
        setReferralStats(data.getReferralStats);
      }
    } catch (error) {
      console.error("추천인 통계 조회 오류:", error);
      showToast({
        type: "error",
        title: "오류",
        message: "추천인 통계를 불러올 수 없습니다.",
        duration: 3000,
      });
    } finally {
      setIsLoadingReferralStats(false);
    }
  };

  /**
   * 추천인 코드 입력 처리
   */
  const handleReferralCodeChange = (text: string): void => {
    // 대문자로 변환하고 특수문자 제거
    const cleanCode = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
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

          // 추천인 코드 입력 초기화 및 통계 새로고침
          setReferralCode("");
          setReferralCodeValidation({ isValid: null, message: "" });
          // 포인트 업데이트 (50포인트 추가)
          setUserPoints(prev => prev + (result.pointsAwarded || 50));
          // 추천인 통계 새로고침
          loadReferralStats();
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
   * 추천인 코드 클립보드 복사
   */
  const copyReferralCode = async () => {
    if (!referralStats?.referralCode) return;

    try {
      await Clipboard.setStringAsync(referralStats.referralCode);
      showToast({
        type: "success",
        title: "복사 완료",
        message: "추천인 코드가 클립보드에 복사되었습니다.",
        duration: 2000,
      });
    } catch (error) {
      console.error("클립보드 복사 오류:", error);
      showToast({
        type: "error",
        title: "복사 실패",
        message: "클립보드를 사용할 수 없습니다.",
        duration: 3000,
      });
    }
  };

const avatarUrl =
  (profileImage && profileImage.trim() !== "" && profileImage) ||
  (() => {
    // 프로필 이미지가 없으면 첫 번째 팀의 로고를 fallback으로 사용
    const myTeams = currentUser?.myTeams;
    if (Array.isArray(myTeams) && myTeams.length > 0) {
      // priority가 0인 주 팀을 찾거나, 없으면 첫 번째 팀 사용
      const primaryTeam = myTeams.find(team => team.priority === 0) || myTeams[0];
      if (primaryTeam?.team?.logoUrl) {
        return primaryTeam.team.logoUrl;
      }
    }
    // 팀 로고도 없으면 기본 placeholder 사용
    return `https://i.pravatar.cc/150?u=${currentUser?.id}`;
  })();

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={handleCancel} style={themed($headerButton)}>
          <Text style={themed($cancelText)}>취소</Text>
        </TouchableOpacity>

        <Text style={themed($headerTitle)}>프로필 편집</Text>

        <TouchableOpacity
          onPress={handleSave}
          style={themed($headerButton)}
          disabled={isLoading || isImageUploading}
        >
          <Text
            style={[
              themed($saveText),
              (isLoading || isImageUploading) && themed($disabledText),
            ]}
          >
            {isLoading ? "저장 중..." : "완료"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={themed($scrollContainer)}
        showsVerticalScrollIndicator={false}
        extraScrollHeight={100}
        enableOnAndroid={true}
      >
        {/* 프로필 이미지 섹션 */}
        <View style={themed($imageSection)}>
          <View style={themed($imageContainer)}>
            <View style={themed($profileImageWrapper)}>
              <Image
                source={{ uri: avatarUrl }}
                style={themed($profileImage)}
              />

              {/* 업로드 진행률 표시 */}
              {isImageUploading && (
                <View style={themed($uploadOverlay)}>
                  <Text style={themed($uploadProgressText)}>
                    {uploadProgress}%
                  </Text>
                </View>
              )}
            </View>

            <View style={themed($imageButtons)}>
              <TouchableOpacity
                style={themed($imageButton)}
                onPress={handleSelectImage}
                disabled={isImageUploading}
              >
                <Ionicons
                  name={isImageUploading ? "hourglass" : "camera"}
                  size={16}
                  color={
                    isImageUploading ? theme.colors.textDim : theme.colors.tint
                  }
                />
                <Text
                  style={[
                    themed($imageButtonText),
                    isImageUploading && { color: theme.colors.textDim },
                  ]}
                >
                  {isImageUploading ? "업로드 중..." : "사진 수정"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={themed($imageButton)}
                onPress={handleDeleteImage}
                disabled={isImageUploading}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={
                    isImageUploading ? theme.colors.textDim : theme.colors.error
                  }
                />
                <Text
                  style={[
                    themed($imageButtonText),
                    {
                      color: isImageUploading
                        ? theme.colors.textDim
                        : theme.colors.error,
                    },
                  ]}
                >
                  사진 삭제
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 이름 섹션 */}
        <View style={themed($section)}>
          <Text style={themed($sectionTitle)}>이름</Text>
          <View style={themed($nameInputContainer)}>
            <View style={themed($inputContainer)}>
              <Ionicons
                name="lock-closed"
                size={16}
                color={theme.colors.textDim}
              />
              <TextInput
                style={themed($textInput)}
                value={name}
                onChangeText={handleNameChange}
                placeholder="이름을 입력하세요"
                placeholderTextColor={theme.colors.textDim}
                maxLength={30}
              />
            </View>
            <TouchableOpacity
              style={themed($checkButton)}
              onPress={handleCheckNickname}
              disabled={isCheckingNickname || !name.trim()}
            >
              <Text
                style={[
                  themed($checkButtonText),
                  (isCheckingNickname || !name.trim()) &&
                    themed($disabledCheckText),
                ]}
              >
                {isCheckingNickname ? "확인 중..." : "중복 확인"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 닉네임 중복 확인 결과 표시 */}
          {nicknameCheckResult.message && (
            <View style={themed($nicknameCheckResult)}>
              <Ionicons
                name={
                  nicknameCheckResult.available
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={16}
                color={
                  nicknameCheckResult.available
                    ? theme.colors.tint
                    : theme.colors.error
                }
              />
              <Text
                style={[
                  themed($nicknameCheckText),
                  nicknameCheckResult.available
                    ? themed($availableText)
                    : themed($unavailableText),
                ]}
              >
                {nicknameCheckResult.message}
              </Text>
            </View>
          )}

          <Text style={themed($inputHelper)}>
            이름은 14일에 두 번만 변경할 수 있습니다.
          </Text>
        </View>

        {/* 나이 섹션 */}
        <View style={themed($section)}>
          <Text style={themed($sectionTitle)}>나이</Text>
          <View style={themed($inputContainer)}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={theme.colors.textDim}
            />
            <TextInput
              style={themed($textInput)}
              value={age?.toString() ?? ""}
              onChangeText={handleAgeChange}
              placeholder="나이를 입력하세요 (숫자)"
              placeholderTextColor={theme.colors.textDim}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
          <Text style={themed($inputHelper)}>
            나이는 1세부터 120세까지 입력 가능합니다.
          </Text>
        </View>

        {/* 소개 섹션 */}
        <View style={themed($section)}>
          <Text style={themed($sectionTitle)}>소개</Text>
          <TouchableOpacity style={themed($bioContainer)}>
            <TextInput
              style={themed($bioInput)}
              value={bio}
              onChangeText={setBio}
              placeholder="+ 소개 작성"
              placeholderTextColor={theme.colors.textDim}
              multiline
              maxLength={150}
            />
          </TouchableOpacity>
        </View>

        {/* 나의 팀 섹션 */}
        <TouchableOpacity
          style={themed($section)}
          onPress={() => router.push("/(modals)/team-selection")}
        >
          <View style={themed($teamRow)}>
            <Text style={themed($sectionTitle)}>나의 팀</Text>
            <View style={themed($teamValue)}>
              <Text style={themed($teamText)}>{team || "팀을 선택하세요"}</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textDim}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* 비공개 프로필 섹션 */}
        <View style={themed($section)}>
          <View style={themed($privateRow)}>
            <View style={themed($privateInfo)}>
              <Text style={themed($sectionTitle)}>비공개 프로필</Text>
              <Text style={themed($privateDescription)}>
                비공개 프로필로 전환하면 상대방이 회원님을 팔로우하지 않는 한
                다른 사람에게 답글을 남길 수 없게 됩니다.
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.tint + "80",
              }}
              thumbColor={
                isPrivate ? theme.colors.tint : theme.colors.background
              }
            />
          </View>
        </View>

        {/* 추천인 코드 섹션 */}
        <View style={themed($section)}>
          <View style={themed($referralHeader)}>
            <Text style={themed($sectionTitle)}>나의 추천인 코드</Text>
            <View style={themed($pointsDisplay)}>
              <Ionicons name="diamond" size={16} color={theme.colors.tint} />
              <Text style={themed($pointsText)}>{userPoints.toLocaleString()}P</Text>
            </View>
          </View>

          {/* 로딩 중 표시 */}
          {isLoadingReferralStats ? (
            <View style={themed($loadingContainer)}>
              <ActivityIndicator size="small" color={theme.colors.tint} />
              <Text style={themed($loadingText)}>추천인 정보를 불러오는 중...</Text>
            </View>
          ) : (
            <>
              {/* 내 추천인 코드 표시 */}
              {referralStats && (
                <View style={themed($referralCodeContainer)}>
                  <View style={themed($referralCodeBox)}>
                    <Text style={themed($referralCodeText)}>
                      {referralStats.referralCode}
                    </Text>
                  </View>

                  {/* 추천 슬롯 시각화 */}
                  <View style={themed($slotsContainer)}>
                    <Text style={themed($slotsTitle)}>추천 슬롯</Text>
                    <View style={themed($slotsRow)}>
                      {[1, 2, 3].map((slot) => {
                        const isUsed = slot <= referralStats.totalReferrals;
                        return (
                          <View
                            key={slot}
                            style={[
                              themed($slot),
                              isUsed ? themed($slotUsed) : themed($slotAvailable),
                            ]}
                          >
                            {isUsed && (
                              <Ionicons
                                name="checkmark-circle"
                                size={14}
                                color="#fff"
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>
                    <Text style={themed($slotsText)}>
                      {referralStats.availableSlots}개 남음
                    </Text>
                  </View>
                </View>
              )}

              <View style={themed($referralRow)}>
                <View style={themed($referralInfo)}>
                  <Text style={themed($referralDescription)}>
                    친구들에게 공유하여 함께 혜택을 누려보세요.
                  </Text>
                </View>
                {referralStats && (
                  <TouchableOpacity
                    style={themed($referralButton)}
                    onPress={copyReferralCode}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color={theme.colors.tint}
                    />
                    <Text style={themed($referralButtonText)}>코드 복사</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          <Text style={themed($inputHelper)}>
            추천인 코드를 공유하면 친구가 가입할 때 서로 50 포인트씩 받을 수 있습니다.
          </Text>
        </View>

        {/* 추천인 코드 입력 섹션 */}
        <View style={themed($section)}>
          <Text style={themed($sectionTitle)}>추천인 코드 입력</Text>
          <View style={themed($referralContainer)}>
            <View style={themed($inputContainer)}>
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
                (validationLoading || !referralCode.trim() || referralCode.length !== 8) && themed($disabledValidateButton),
              ]}
              onPress={handleValidateReferralCode}
              disabled={validationLoading || !referralCode.trim() || referralCode.length !== 8}
            >
              <Text
                style={[
                  themed($validateButtonText),
                  (validationLoading || !referralCode.trim() || referralCode.length !== 8) && themed($disabledValidateText),
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

          {/* 추천인 코드 적용 버튼 */}
          {referralCodeValidation.isValid && (
            <TouchableOpacity
              style={[
                themed($applyReferralButton),
                isApplyingReferral && { opacity: 0.6 },
              ]}
              onPress={applyReferralIfValid}
              disabled={isApplyingReferral}
            >
              {isApplyingReferral ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={themed($applyReferralButtonText)}>적용 중...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={themed($applyReferralButtonText)}>추천인 코드 적용</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={themed($inputHelper)}>
            추천인 코드를 입력하면 서로에게 50 포인트가 지급됩니다.
          </Text>
        </View>
      </KeyboardAwareScrollView>
      <AppDialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="프로필 사진 삭제"
        description="현재 프로필 사진을 삭제하시겠습니까?"
        confirmText="삭제"
        onConfirm={confirmDeleteImage}
        cancelText="취소"
      />
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
});

const $cancelText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});

const $saveText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.tint,
});

const $disabledText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $imageSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xl,
  alignItems: "center",
});

const $imageContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $profileImageWrapper: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
});

const $profileImage: ThemedStyle<ImageStyle> = ({ colors }) => ({
  width: 80,
  height: 80,
  borderRadius: 40,
  borderWidth: 2,
  borderColor: colors.border,
});

const $uploadOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 40,
  backgroundColor: colors.text + "80",
  justifyContent: "center",
  alignItems: "center",
});

const $uploadProgressText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 12,
  fontWeight: "600",
});

const $imageButtons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginLeft: spacing.lg,
});

const $imageButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.sm,
});

const $imageButtonText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  fontSize: 14,
  color: colors.tint,
});

const $section: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
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
  fontSize: 16,
  color: colors.text,
});

const $inputHelper: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: spacing.xs,
});

const $bioContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  padding: spacing.md,
  backgroundColor: colors.card,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  minHeight: 80,
});

const $bioInput: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.text,
  textAlignVertical: "top",
});

const $teamRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const $teamValue: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
});

const $teamText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.textDim,
  marginRight: spacing.sm,
});

const $privateRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
});

const $privateInfo: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  marginRight: 16,
});

const $privateDescription: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: spacing.xs,
  lineHeight: 20,
});

// --- 닉네임 중복 확인 관련 스타일 ---
const $nameInputContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $checkButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.tint,
  borderRadius: 6,
  minWidth: 80,
  alignItems: "center",
});

const $checkButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.background,
});

const $disabledCheckText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});

const $nicknameCheckResult: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.xs,
  gap: spacing.xs,
});

const $nicknameCheckText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  flex: 1,
});

const $availableText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
});

const $unavailableText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
});

// === 추천인 코드 관련 스타일 ===

const $referralHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
});

const $pointsDisplay: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.card,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.tint + "30",
});

const $pointsText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
  fontWeight: "600",
  marginLeft: 4,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.lg,
  gap: 8,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
});

const $slotsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  alignItems: "center",
});

const $slotsTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginBottom: spacing.xs,
  fontWeight: "600",
});

const $slotsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginBottom: spacing.xs,
});

const $slot: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  borderWidth: 2,
  justifyContent: "center",
  alignItems: "center",
});

const $slotUsed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderColor: colors.tint,
});

const $slotAvailable: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderColor: colors.border,
});

const $slotsText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  fontWeight: "500",
});

const $referralRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
});

const $referralInfo: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  marginRight: 16,
});

const $referralDescription: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: spacing.xs,
  lineHeight: 20,
});

const $referralButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.card,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $referralButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.tint,
  marginLeft: 4,
});

const $referralCodeContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
});

const $referralCodeBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.tint + "40",
  padding: spacing.md,
  alignItems: "center",
});

const $referralCodeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.tint,
  letterSpacing: 2,
});

const $referralStats: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: spacing.sm,
});

const $referralStatsText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $referralContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
});

const $validateButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.tint,
  borderRadius: 6,
  minWidth: 80,
  alignItems: "center",
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

const $applyReferralButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  backgroundColor: colors.tint,
  paddingVertical: spacing.md,
  borderRadius: 10,
  marginTop: spacing.sm,
});

const $applyReferralButtonText: ThemedStyle<TextStyle> = () => ({
  color: "#fff",
  fontSize: 16,
  fontWeight: "700",
});
