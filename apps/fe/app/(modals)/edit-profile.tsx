import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
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
import { useMutation } from "@apollo/client";
import { UPDATE_PROFILE } from "@/lib/graphql";
import { showToast } from "@/components/CustomToast";
import { uploadFilesWeb } from "@/lib/api/webUpload";
import { uploadFilesMobile } from "@/lib/api/mobileUpload";
import { generateAvatarFileName } from "@/lib/utils/file-utils";
import { isWeb } from "@/lib/platform";
import { UploadedMedia, ProgressCallback } from "@/lib/api/common";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

/**
 * 프로필 편집 모달 화면
 * 사용자의 프로필 정보를 편집할 수 있는 화면입니다
 */
export default function EditProfileScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();

  // 상태 관리
  // 전역 AuthContext에서 사용자 정보 사용 (로컬 currentUser 상태 제거)
  const { user: currentUser, updateUser } = useAuth();
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

  // GraphQL 뮤테이션 (프로필 정보 업데이트용)
  const [updateProfile] = useMutation(UPDATE_PROFILE);

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
  }, [currentUser]);

  /**
   * 프로필 이미지 업로드 처리
   * 세분화된 에러 처리와 함께 구현
   */
  const uploadProfileImage = async (
    file: File | { uri: string; name: string; type: string }
  ): Promise<string | null> => {
    try {
      setIsImageUploading(true);
      setUploadProgress(0);

      console.log("프로필 이미지 업로드 시작:", {
        isWeb: isWeb(),
        fileInfo: isWeb() ? (file as File).name : (file as any).name,
      });

      // 진행률 콜백 함수
      const progressCallback: ProgressCallback = (progress) => {
        setUploadProgress(progress.percentage);
        console.log(`업로드 진행률: ${progress.percentage}%`);
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
          { category: "avatar" }
        );
      }

      // 업로드 결과 검증
      if (!uploadedFiles || uploadedFiles.length === 0) {
        throw new Error(
          "업로드 응답이 비어있습니다. 서버 연결을 확인해주세요."
        );
      }

      const uploadedMedia = uploadedFiles[0];
      console.log("프로필 이미지 업로드 응답:", uploadedMedia);

      // 업로드 상태별 처리
      if (uploadedMedia.status === "FAILED") {
        const errorMessage =
          uploadedMedia.failureReason || "업로드에 실패했습니다.";
        throw new Error(`업로드 실패: ${errorMessage}`);
      }

      // URL 유효성 검증
      if (!uploadedMedia.url || uploadedMedia.url.trim() === "") {
        throw new Error(
          "업로드는 완료되었지만 이미지 URL을 받지 못했습니다. 잠시 후 다시 시도해주세요."
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

      console.log("프로필 이미지 업로드 성공:", {
        id: uploadedMedia.id,
        url: uploadedMedia.url,
        status: uploadedMedia.status,
      });

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
              currentUser?.id || "user"
            );

            uploadFile = new File([blob], safeFileName, {
              type: selectedAsset.mimeType || "image/jpeg",
            });
          } else {
            // 모바일 환경 - 한글 파일명 문제 해결
            const safeFileName = generateAvatarFileName(
              selectedAsset.fileName || "avatar.jpg",
              currentUser?.id || "user"
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

    setIsLoading(true);

    try {
      // GraphQL로 프로필 정보 업데이트 (이미지 URL 및 나이 포함)
      const result = await updateProfile({
        variables: {
          input: {
            nickname: name.trim(),
            bio: bio.trim(),
            profileImageUrl: profileImage,
            age: age, // 나이 필드 추가
          },
        },
      });

      if (result.data?.updateProfile) {
        // AuthContext를 통한 사용자 정보 업데이트 (권장)
        console.log("프로필 업데이트 - 기존 값:", {
          nickname: currentUser?.nickname,
          bio: currentUser?.bio,
          profileImageUrl: currentUser?.profileImageUrl,
          age: (currentUser as any)?.age,
        });

        console.log("프로필 업데이트 - 새 값:", {
          nickname: name.trim(),
          bio: bio.trim(),
          profileImageUrl: profileImage,
          age,
        });

        await updateUser({
          nickname: name.trim(),
          bio: bio.trim(),
          profileImageUrl: profileImage,
          age, // 나이 필드도 업데이트
        });

        console.log("프로필 업데이트 완료");

        showToast({
          type: "success",
          title: "완료",
          message: "프로필이 성공적으로 업데이트되었습니다.",
          duration: 3000,
        });

        router.back();
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
   * 취소 처리
   */
  const handleCancel = () => {
    router.back();
  };

  const avatarUrl =
    profileImage || `https://i.pravatar.cc/150?u=${currentUser?.id}`;

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
          <View style={themed($inputContainer)}>
            <Ionicons
              name="lock-closed"
              size={16}
              color={theme.colors.textDim}
            />
            <TextInput
              style={themed($textInput)}
              value={name}
              onChangeText={setName}
              placeholder="이름을 입력하세요"
              placeholderTextColor={theme.colors.textDim}
              maxLength={30}
            />
          </View>
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
        <TouchableOpacity style={themed($section)}>
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
