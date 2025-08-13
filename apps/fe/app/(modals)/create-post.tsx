import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
  Alert,
  Image,
  Dimensions,
  ImageStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { isWeb } from "@/lib/platform";
import { showToast } from "@/components/CustomToast";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
// 게시물은 이제 타입 없이 teamId로만 분류됩니다
import { User, getSession } from "@/lib/auth";
import {
  createTextOnlyPost,
  createPostWithFiles,
  PostCreationError,
} from "@/lib/api/postCreation";
import { useQuery } from "@apollo/client";
import {
  GET_MY_TEAMS,
  type UserTeam,
  type GetMyTeamsResult,
} from "@/lib/graphql/teams";
import { compressImageWeb } from "@/lib/api/webUpload";
import { compressImageMobile } from "@/lib/api/mobileUpload";
import {
  compressVideoMobile,
  compressVideoWeb,
  isValidVideoFile,
  getVideoMetadata,
  SelectedVideo,
} from "@/lib/api/videoUpload";
import { UploadProgress } from "@/lib/api/common";

// --- 타입 정의 ---
interface TeamOption {
  teamId: string;
  label: string;
  color: string;
  icon: string;
  sportName: string;
}

interface SelectedImage {
  uri: string;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  name?: string;
}

interface SelectedMedia {
  uri: string;
  width?: number;
  height?: number;
  duration?: number; // 동영상인 경우에만
  fileSize?: number;
  mimeType?: string;
  name?: string;
  type: "image" | "video";
}

/**
 * 게시물 작성 페이지 (텍스트 전용)
 *
 * 이미지 업로드는 게시물 생성 성공 후 별도 처리됩니다.
 */
export default function CreatePostScreen() {
  const router = useRouter();
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  // 상태 관리
  const [layoutVariant, setLayoutVariant] = useState<
    "modern" | "split" | "dock"
  >("modern");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<SelectedVideo[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadPercentage, setUploadPercentage] = useState<number>(0);

  // 사용자가 선택한 팀 목록 조회
  const {
    data: myTeamsData,
    loading: teamsLoading,
    error: teamsError,
  } = useQuery<GetMyTeamsResult>(GET_MY_TEAMS, {
    skip: !currentUser, // 사용자가 로그인하지 않은 경우 쿼리 스킵
    fetchPolicy: "cache-first",
    onError: (error) => {
      console.error("사용자 팀 목록 조회 오류:", error);
    },
  });

  // 사용자 세션 확인
  React.useEffect(() => {
    const checkSession = async () => {
      const { user, token } = await getSession();
      console.log("세션 확인:", {
        사용자: user ? "있음" : "없음",
        토큰: token ? "있음" : "없음",
      });
      if (user && token) {
        setCurrentUser(user);
      } else {
        // 로그인되지 않은 경우 피드로 리다이렉트
        Alert.alert("로그인 필요", "게시물을 작성하려면 로그인이 필요합니다.", [
          { text: "확인", onPress: () => router.back() },
        ]);
      }
    };
    checkSession();
  }, [router]);

  // 사용자가 선택한 팀들을 옵션으로 변환
  const teamOptions: TeamOption[] = React.useMemo(() => {
    if (!myTeamsData?.myTeams) return [];

    return myTeamsData.myTeams.map((userTeam: UserTeam) => ({
      teamId: userTeam.team.id,
      label: userTeam.team.name,
      color: userTeam.team.color,
      icon: userTeam.team.sport.icon,
      sportName: userTeam.team.sport.name,
    }));
  }, [myTeamsData]);

  /**
   * 뒤로 가기 핸들러
   */
  const handleGoBack = () => {
    if (
      title.trim() ||
      content.trim() ||
      selectedTeamId ||
      selectedImages.length > 0 ||
      selectedVideos.length > 0
    ) {
      Alert.alert(
        "작성 취소",
        "작성 중인 내용이 있습니다. 정말 취소하시겠습니까?",
        [
          { text: "계속 작성", style: "cancel" },
          {
            text: "취소",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // 선택된 모든 미디어 배열 (썸네일/히어로 공용)
  const allSelectedMedia = useMemo(
    () => [
      ...selectedImages.map((img) => ({ type: "image" as const, ...img })),
      ...selectedVideos.map((vid) => ({ type: "video" as const, ...vid })),
    ],
    [selectedImages, selectedVideos]
  );

  /**
   * 팀 선택 핸들러
   */
  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(selectedTeamId === teamId ? null : teamId);
  };

  /**
   * 팀 선택 화면으로 이동
   */
  const handleGoToTeamSelection = () => {
    router.push("/(modals)/team-selection");
  };

  /**
   * 미디어 선택 핸들러 (이미지 + 동영상)
   */
  const handleMediaPicker = async () => {
    try {
      // 권한 요청
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "권한 필요",
          "미디어를 선택하려면 갤러리 접근 권한이 필요합니다.",
          [{ text: "확인" }]
        );
        return;
      }

      // 현재 선택된 미디어 개수 확인
      const totalSelected = selectedImages.length + selectedVideos.length;
      if (totalSelected >= 4) {
        showToast({
          type: "error",
          title: "선택 제한",
          message: "최대 4개의 미디어만 선택할 수 있습니다.",
          duration: 3000,
        });
        return;
      }

      // 미디어 선택 (이미지 + 동영상)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // 이미지와 동영상 모두
        allowsMultipleSelection: true,
        selectionLimit: 4 - totalSelected, // 남은 선택 가능 개수
        quality: 1,
        allowsEditing: false,
        videoMaxDuration: 60, // 최대 60초 동영상
      });

      if (!result.canceled && result.assets) {
        console.log(`📱 미디어 선택 완료: ${result.assets.length}개`);

        const newImages: SelectedImage[] = [];
        const newVideos: SelectedVideo[] = [];

        for (const [index, asset] of result.assets.entries()) {
          console.log(`📱 Asset ${index}:`, {
            uri: asset.uri?.substring(0, 50) + "...",
            width: asset.width,
            height: asset.height,
            type: asset.type,
            fileSize: asset.fileSize,
            duration: asset.duration,
          });

          try {
            if (asset.type === "video") {
              // 동영상 처리
              let processedVideo: SelectedVideo;

              if (isWeb()) {
                // 웹 환경에서는 원본 사용 (압축 제한적)
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                const file = new File(
                  [blob],
                  `video_${index}_${Date.now()}.mp4`,
                  {
                    type: "video/mp4",
                  }
                );

                // 메타데이터 추출
                let metadata;
                try {
                  metadata = await getVideoMetadata(file);
                } catch (error) {
                  console.warn("동영상 메타데이터 추출 실패:", error);
                  metadata = {
                    width: 0,
                    height: 0,
                    duration: 0,
                    fileSize: file.size || 0,
                  };
                }

                processedVideo = {
                  uri: asset.uri,
                  width: metadata.width || asset.width,
                  height: metadata.height || asset.height,
                  duration: metadata.duration || asset.duration,
                  fileSize: metadata.fileSize || asset.fileSize,
                  mimeType: "video/mp4",
                  name: file.name,
                };
              } else {
                // 모바일 환경에서 동영상 압축
                try {
                  processedVideo = await compressVideoMobile(asset.uri, {
                    quality: "medium",
                    maxWidth: 1280,
                    maxHeight: 720,
                  });
                } catch (compressionError) {
                  console.warn(
                    "동영상 압축 실패, 원본 사용:",
                    compressionError
                  );
                  // 압축 실패 시 원본 정보 사용
                  processedVideo = {
                    uri: asset.uri,
                    width: asset.width,
                    height: asset.height,
                    duration: asset.duration,
                    fileSize: asset.fileSize,
                    mimeType: "video/mp4",
                    name: `video_${index}_${Date.now()}.mp4`,
                  };
                }
              }

              newVideos.push(processedVideo);
            } else {
              // 이미지 처리 (기존 로직)
              let compressedImage: SelectedImage;

              if (isWeb()) {
                // 웹 환경에서 이미지 압축
                const file = await compressImageWeb(asset.uri, {
                  maxWidth: 1920,
                  maxHeight: 1080,
                  quality: 0.8,
                  fileName: `image_${index}_${Date.now()}.jpg`,
                });

                // File 객체를 data URL로 변환
                const reader = new FileReader();
                const dataUrl = await new Promise<string>((resolve, reject) => {
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });

                compressedImage = {
                  uri: dataUrl,
                  width: asset.width,
                  height: asset.height,
                  fileSize: file.size,
                  mimeType: file.type,
                  name: file.name,
                };
              } else {
                // 모바일 환경에서 이미지 압축
                compressedImage = await compressImageMobile(asset.uri, {
                  maxWidth: 1920,
                  maxHeight: 1080,
                  quality: 0.8,
                });
              }

              newImages.push(compressedImage);
            }
          } catch (error) {
            console.error("미디어 처리 실패:", error);
            showToast({
              type: "error",
              title: "미디어 처리 실패",
              message: "일부 미디어를 처리할 수 없습니다.",
              duration: 3000,
            });
          }
        }

        // 상태 업데이트
        if (newImages.length > 0) {
          setSelectedImages((prev) => [...prev, ...newImages]);
        }
        if (newVideos.length > 0) {
          setSelectedVideos((prev) => [...prev, ...newVideos]);
        }

        // 성공 메시지
        const totalAdded = newImages.length + newVideos.length;
        if (totalAdded > 0) {
          showToast({
            type: "success",
            title: "미디어 추가 완료",
            message: `${totalAdded}개의 미디어가 추가되었습니다. (이미지: ${newImages.length}, 동영상: ${newVideos.length})`,
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error("미디어 선택 실패:", error);
      showToast({
        type: "error",
        title: "미디어 선택 실패",
        message: "미디어를 선택할 수 없습니다.",
        duration: 3000,
      });
    }
  };

  /**
   * 이미지 제거 핸들러
   */
  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * 동영상 제거 핸들러
   */
  const handleRemoveVideo = (index: number) => {
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * 게시물 작성 핸들러 (이미지 포함)
   */
  const handleSubmit = async () => {
    if (!currentUser) {
      showToast({
        type: "error",
        title: "로그인 필요",
        message: "로그인이 필요합니다.",
        duration: 3000,
      });
      return;
    }

    if (!title.trim()) {
      showToast({
        type: "error",
        title: "제목 필요",
        message: "제목을 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    if (!content.trim()) {
      showToast({
        type: "error",
        title: "내용 필요",
        message: t(TRANSLATION_KEYS.CREATE_POST_PLACEHOLDER),
        duration: 3000,
      });
      return;
    }

    if (!selectedTeamId) {
      showToast({
        type: "error",
        title: "팀 선택 필요",
        message: "응원할 팀을 선택해주세요.",
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress("");
    setUploadPercentage(0);

    try {
      // 게시물 생성 입력 데이터 준비
      const postInput = {
        title: title.trim(),
        content: content.trim(),
        teamId: selectedTeamId, // 선택된 팀 ID로 게시물 분류
        isPublic: true,
      };

      console.log("게시물 생성 시작:", {
        title: postInput.title,
        teamId: postInput.teamId,
        hasImages: selectedImages.length > 0,
        imageCount: selectedImages.length,
      });

      let createdPost;

      // 미디어가 있는 경우 파일과 함께 게시물 생성
      const totalMedia = selectedImages.length + selectedVideos.length;
      if (totalMedia > 0) {
        setUploadProgress("미디어 업로드 중...");

        // 모든 미디어를 업로드 가능한 형식으로 변환
        const allFiles: (File | any)[] = [];

        // 이미지 처리
        for (const [index, image] of selectedImages.entries()) {
          if (isWeb()) {
            // 웹 환경: data URL을 File 객체로 변환
            const response = await fetch(image.uri);
            const blob = await response.blob();
            const fileExtension = (image.name || "")
              .split(".")
              .pop()
              ?.toLowerCase();
            const mimeType =
              image.mimeType ||
              (fileExtension === "gif" ? "image/gif" : "image/jpeg");
            const fileName =
              image.name ||
              `image_${index}.${fileExtension === "gif" ? "gif" : "jpg"}`;

            allFiles.push(new File([blob], fileName, { type: mimeType }));
          } else {
            // 모바일 환경: ReactNativeFile 형식으로 변환
            const fileExtension = (image.name || "")
              .split(".")
              .pop()
              ?.toLowerCase();
            const mimeType =
              image.mimeType ||
              (fileExtension === "gif" ? "image/gif" : "image/jpeg");
            const fileName =
              image.name ||
              `image_${index}.${fileExtension === "gif" ? "gif" : "jpg"}`;

            allFiles.push({
              uri: image.uri,
              name: fileName,
              type: mimeType,
            });
          }
        }

        // 동영상 처리
        for (const [index, video] of selectedVideos.entries()) {
          if (isWeb()) {
            // 웹 환경: data URL을 File 객체로 변환
            const response = await fetch(video.uri);
            const blob = await response.blob();
            const fileName = video.name || `video_${index}.mp4`;

            allFiles.push(new File([blob], fileName, { type: "video/mp4" }));
          } else {
            // 모바일 환경: ReactNativeFile 형식으로 변환
            const fileName = video.name || `video_${index}.mp4`;
            const mimeType = video.mimeType || "video/mp4";

            allFiles.push({
              uri: video.uri,
              name: fileName,
              type: mimeType,
            });
          }
        }

        createdPost = await createPostWithFiles({
          ...postInput,
          files: allFiles,
          onProgress: (progress: UploadProgress) => {
            setUploadPercentage(progress.percentage);
            setUploadProgress(`미디어 업로드 중... ${progress.percentage}%`);
          },
        });
      } else {
        // 텍스트 전용 게시물 생성
        setUploadProgress("게시물 생성 중...");
        createdPost = await createTextOnlyPost(postInput);
      }

      console.log("게시물 생성 완료:", createdPost);

      // 성공 메시지
      const totalMediaCount = selectedImages.length + selectedVideos.length;
      let mediaMessage = "";
      if (totalMediaCount > 0) {
        const parts = [];
        if (selectedImages.length > 0)
          parts.push(`이미지 ${selectedImages.length}개`);
        if (selectedVideos.length > 0)
          parts.push(`동영상 ${selectedVideos.length}개`);
        mediaMessage = ` (${parts.join(", ")} 포함)`;
      }

      showToast({
        type: "success",
        title: "게시물 작성 완료",
        message: `게시물이 성공적으로 작성되었습니다!${mediaMessage}`,
        duration: 3000,
      });

      // 피드로 돌아가기
      router.back();
    } catch (error) {
      console.error("게시물 작성 오류:", error);

      let errorTitle = "게시물 작성 실패";
      let errorMessage = "알 수 없는 오류가 발생했습니다.";

      if (error instanceof PostCreationError) {
        errorMessage = error.message;
        if (error.phase === "upload") {
          errorTitle = "이미지 업로드 실패";
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      showToast({
        type: "error",
        title: errorTitle,
        message: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
      setUploadPercentage(0);
    }
  };

  if (!currentUser) {
    return null; // 로딩 중이거나 리다이렉트 중
  }

  return (
    <KeyboardAvoidingView
      style={themed($container)}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={handleGoBack} style={themed($backButton)}>
          <Ionicons name="arrow-back" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>
          {t(TRANSLATION_KEYS.CREATE_POST_TITLE)}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={
            !title.trim() || !content.trim() || !selectedTeamId || isSubmitting
          }
          style={[
            themed($publishButton),
            {
              opacity:
                !title.trim() ||
                !content.trim() ||
                !selectedTeamId ||
                isSubmitting
                  ? 0.5
                  : 1,
            },
          ]}
        >
          <Ionicons name="paper-plane" color="white" size={20} />
          <Text style={themed($publishButtonText)}>
            {isSubmitting
              ? uploadProgress || "게시 중..."
              : t(TRANSLATION_KEYS.CREATE_POST_PUBLISH)}
          </Text>
          {isSubmitting && uploadPercentage > 0 && uploadPercentage < 100 && (
            <Text style={themed($progressText)}>{uploadPercentage}%</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 레이아웃 선택 탭 (간단 토글) */}
      <View style={themed($variantTabs)}>
        {(["modern", "split", "dock"] as const).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => setLayoutVariant(v)}
            style={[
              themed($variantTab),
              layoutVariant === v ? themed($variantTabActive) : null,
            ]}
          >
            <Text style={themed($variantTabText)}>
              {v === "modern" ? "모던" : v === "split" ? "분할" : "도크"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 모던: 상단 고정 썸네일 바 */}
      {layoutVariant === "modern" && allSelectedMedia.length > 0 && (
        <View style={themed($mediaToolbar)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={themed($mediaToolbarContent)}
          >
            {allSelectedMedia.map((m, idx) => (
              <View key={`m-${idx}`} style={themed($mediaToolbarItem)}>
                {m.type === "image" ? (
                  <Image
                    source={{ uri: m.uri }}
                    style={themed($mediaToolbarThumb)}
                  />
                ) : (
                  <View
                    style={[themed($mediaToolbarThumb), themed($videoBadgeBg)]}
                  >
                    <Ionicons name="videocam" color="white" size={16} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 분할형: 히어로 미리보기 */}
      {layoutVariant === "split" && (
        <View>
          <View style={themed($heroContainer)}>
            {allSelectedMedia[0] ? (
              allSelectedMedia[0].type === "image" ? (
                <Image
                  source={{ uri: allSelectedMedia[0].uri }}
                  style={themed($heroImage)}
                  resizeMode="cover"
                />
              ) : (
                <View style={themed($heroVideoPlaceholder)}>
                  <Ionicons name="play" color="white" size={36} />
                </View>
              )
            ) : (
              <View style={themed($heroEmpty)}>
                <Ionicons
                  name="image-outline"
                  color={theme.colors.textDim}
                  size={28}
                />
                <Text style={themed($heroEmptyText)}>
                  미디어를 추가해 보세요
                </Text>
              </View>
            )}
          </View>
          {allSelectedMedia.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={themed($heroThumbRow)}
            >
              {allSelectedMedia.map((m, idx) => (
                <View key={`h-${idx}`} style={themed($heroThumb)}>
                  {m.type === "image" ? (
                    <Image
                      source={{ uri: m.uri }}
                      style={themed($heroThumbImg)}
                    />
                  ) : (
                    <View
                      style={[themed($heroThumbImg), themed($videoBadgeBg)]}
                    >
                      <Ionicons name="videocam" color="white" size={14} />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <ScrollView
        style={themed($scrollContainer)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          layoutVariant === "dock" ? { paddingBottom: 120 } : undefined
        }
      >
        {/* 사용자 정보 */}
        <View style={themed($userSection)}>
          <Text style={themed($username)}>{currentUser.nickname}</Text>
          <Text style={themed($userHandle)}>
            @{currentUser.nickname.toLowerCase()}
          </Text>
        </View>

        {/* 응원할 팀 선택 */}
        <View style={themed($typeSection)}>
          <View style={themed($sectionHeader)}>
            <Text style={themed($sectionTitle)}>응원할 팀 선택</Text>
            {teamOptions.length === 0 && !teamsLoading && (
              <TouchableOpacity
                style={themed($addTeamButton)}
                onPress={handleGoToTeamSelection}
              >
                <Ionicons name="add" color={theme.colors.tint} size={16} />
                <Text style={themed($addTeamText)}>팀 추가</Text>
              </TouchableOpacity>
            )}
          </View>

          {teamsLoading ? (
            <View style={themed($loadingContainer)}>
              <Text style={themed($loadingText)}>팀 목록을 불러오는 중...</Text>
            </View>
          ) : teamOptions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={themed($typeScrollView)}
            >
              <View style={themed($typeOptions)}>
                {teamOptions.map((option) => (
                  <TouchableOpacity
                    key={option.teamId}
                    style={[
                      themed($typeOption),
                      {
                        borderColor:
                          selectedTeamId === option.teamId
                            ? option.color
                            : theme.colors.border,
                        backgroundColor:
                          selectedTeamId === option.teamId
                            ? option.color + "20"
                            : "transparent",
                      },
                    ]}
                    onPress={() => handleTeamSelect(option.teamId)}
                  >
                    <Text style={themed($typeIcon)}>{option.icon}</Text>
                    <Text
                      style={[
                        themed($typeLabel),
                        {
                          color:
                            selectedTeamId === option.teamId
                              ? option.color
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={themed($sportLabel)}>{option.sportName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={themed($emptyTeamsContainer)}>
              <Text style={themed($emptyTeamsText)}>
                응원할 팀을 먼저 선택해주세요
              </Text>
              <TouchableOpacity
                style={themed($selectTeamButton)}
                onPress={handleGoToTeamSelection}
              >
                <Ionicons name="heart" color="white" size={16} />
                <Text style={themed($selectTeamButtonText)}>팀 선택하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 제목 입력 영역 */}
        <View style={themed($titleSection)}>
          <Text style={themed($sectionTitle)}>제목</Text>
          <TextInput
            style={themed($titleInput)}
            placeholder="게시물 제목을 입력하세요"
            placeholderTextColor={theme.colors.textDim}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            editable={!isSubmitting}
          />
          <View style={themed($characterCount)}>
            <Text style={themed($characterCountText)}>{title.length}/200</Text>
          </View>
        </View>

        {/* 내용 입력 영역 */}
        <View style={themed($contentSection)}>
          <Text style={themed($sectionTitle)}>내용</Text>
          <TextInput
            style={themed($textInput)}
            placeholder={t(TRANSLATION_KEYS.CREATE_POST_PLACEHOLDER)}
            placeholderTextColor={theme.colors.textDim}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={10000}
            editable={!isSubmitting}
          />
          <View style={themed($characterCount)}>
            <Text style={themed($characterCountText)}>
              {content.length}/10000
            </Text>
          </View>

          {/* 미디어 업로드 버튼 */}
          <TouchableOpacity
            style={themed($imageUploadButton)}
            onPress={handleMediaPicker}
            disabled={
              isSubmitting || selectedImages.length + selectedVideos.length >= 4
            }
          >
            <Ionicons name="image" color={theme.colors.tint} size={20} />
            <Text style={themed($imageUploadText)}>
              미디어 추가 ({selectedImages.length + selectedVideos.length}/4)
            </Text>
          </TouchableOpacity>
          {/* 선택된 미디어 미리보기 (modern/split은 상단에서 처리, dock에서는 여기서도 노출 생략) */}
          {layoutVariant === "modern" && allSelectedMedia.length === 0 && (
            <View style={themed($emptyHint)}>
              <Text style={themed($emptyHintText)}>
                미디어를 추가하면 상단에 표시됩니다
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 도크형: 하단 고정 썸네일 바 + 플로팅 업로드 버튼 */}
      {layoutVariant === "dock" && (
        <>
          <View style={themed($dockBar)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {allSelectedMedia.length === 0 ? (
                <View style={themed($dockEmpty)}>
                  <Ionicons
                    name="images-outline"
                    color={theme.colors.textDim}
                    size={16}
                  />
                  <Text style={themed($dockEmptyText)}>미디어 없음</Text>
                </View>
              ) : (
                allSelectedMedia.map((m, idx) => (
                  <View key={`d-${idx}`} style={themed($dockItem)}>
                    {m.type === "image" ? (
                      <Image
                        source={{ uri: m.uri }}
                        style={themed($dockThumb)}
                      />
                    ) : (
                      <View style={[themed($dockThumb), themed($videoBadgeBg)]}>
                        <Ionicons name="videocam" color="white" size={14} />
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
          <TouchableOpacity
            onPress={handleMediaPicker}
            style={themed($fab)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" color="white" size={22} />
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $publishButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  gap: spacing.xs,
});

const $publishButtonText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
  marginLeft: spacing.xs,
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

// 레이아웃 변형 탭
const $variantTabs: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.xs,
  paddingBottom: spacing.sm,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $variantTab: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 999,
  backgroundColor: colors.backgroundAlt,
});

const $variantTabActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "15",
  borderColor: colors.tint,
});

const $variantTabText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 12,
  fontWeight: "600",
});

const $userSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: "#f0f0f0",
});

const $username: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $userHandle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: spacing.xxxs,
});

const $typeSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $sectionHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const $addTeamButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderWidth: 1,
  borderColor: colors.tint,
  borderRadius: 16,
  backgroundColor: colors.tint + "10",
});

const $addTeamText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.tint,
  marginLeft: spacing.xs,
});

const $loadingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.lg,
  alignItems: "center",
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $emptyTeamsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $emptyTeamsText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  marginBottom: spacing.md,
});

const $selectTeamButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 20,
});

const $selectTeamButtonText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
  marginLeft: spacing.xs,
});

const $sportLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 10,
  color: colors.textDim,
  textAlign: "center",
  marginTop: spacing.xxxs,
});

const $typeScrollView: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
});

const $typeOptions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  paddingHorizontal: spacing.sm,
});

const $typeOption: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minWidth: 80,
  flexDirection: "column",
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  borderWidth: 2,
  borderRadius: 12,
  marginRight: spacing.xs,
});

const $typeIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 24,
  marginBottom: spacing.xxxs,
});

const $typeLabel: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "600",
  textAlign: "center",
});

const $titleSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
});

const $titleInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.text,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
});

const $contentSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
});

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.text,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  minHeight: 200,
  textAlignVertical: "top",
  backgroundColor: colors.background,
});

const $characterCount: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "flex-end",
  marginTop: spacing.sm,
});

const $characterCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $progressText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 12,
  marginLeft: 8,
});

// --- 이미지 관련 스타일 ---
const $imageUploadButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 2,
  borderColor: colors.tint,
  borderStyle: "dashed",
  borderRadius: 8,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  marginTop: spacing.md,
  backgroundColor: colors.tint + "10",
});

const $imageUploadText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.tint,
  marginLeft: spacing.sm,
});

const $imagePreviewContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
});

const $imagePreviewScroll: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
});

const $imagePreviewItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
  position: "relative",
});

const $imagePreview: ThemedStyle<ImageStyle> = () => ({
  width: 100,
  height: 100,
  borderRadius: 8,
});

const $imageRemoveButton: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 4,
  right: 4,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  borderRadius: 12,
  width: 24,
  height: 24,
  justifyContent: "center",
  alignItems: "center",
});

const $imageSizeText: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  bottom: 2,
  left: 2,
  fontSize: 10,
  color: "white",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  paddingHorizontal: 4,
  paddingVertical: 2,
  borderRadius: 4,
});

// --- 동영상 관련 스타일 ---
const $videoPreviewContainer: ThemedStyle<ViewStyle> = () => ({
  width: 100,
  height: 100,
  borderRadius: 8,
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
});

const $videoPlaceholder: ThemedStyle<ViewStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(255, 255, 255, 0.3)",
  justifyContent: "center",
  alignItems: "center",
});

const $videoDurationText: ThemedStyle<TextStyle> = () => ({
  position: "absolute",
  bottom: 4,
  right: 4,
  fontSize: 10,
  color: "white",
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  paddingHorizontal: 4,
  paddingVertical: 2,
  borderRadius: 4,
});

const $mediaTypeIndicator: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 4,
  left: 4,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  borderRadius: 8,
  width: 20,
  height: 20,
  justifyContent: "center",
  alignItems: "center",
});

// 모던 상단바
const $mediaToolbar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $mediaToolbarContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  gap: spacing.sm,
});

const $mediaToolbarItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.xs,
});

const $mediaToolbarThumb: ThemedStyle<ImageStyle> = () => ({
  width: 56,
  height: 56,
  borderRadius: 12,
});

const $videoBadgeBg: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "rgba(0,0,0,0.7)",
  justifyContent: "center",
  alignItems: "center",
});

// 분할형 히어로
const $heroContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.backgroundAlt,
  height: 180,
});

const $heroImage: ThemedStyle<ImageStyle> = () => ({
  width: "100%",
  height: "100%",
});

const $heroVideoPlaceholder: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
});

const $heroEmpty: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.backgroundAlt,
});

const $heroEmptyText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginTop: spacing.xs,
});

const $heroThumbRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
});

const $heroThumb: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.xs,
});

const $heroThumbImg: ThemedStyle<ImageStyle> = () => ({
  width: 56,
  height: 56,
  borderRadius: 10,
});

// 도크형
const $dockBar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  backgroundColor: colors.card,
  borderTopWidth: 1,
  borderTopColor: colors.border,
});

const $dockItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
});

const $dockThumb: ThemedStyle<ImageStyle> = () => ({
  width: 48,
  height: 48,
  borderRadius: 10,
});

const $dockEmpty: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  paddingVertical: spacing.xs,
});

const $dockEmptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 12,
});

const $fab: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  right: spacing.lg,
  bottom: spacing.xl + 8,
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: colors.tint,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
});

const $emptyHint: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  marginTop: spacing.md,
});

const $emptyHintText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 12,
});
