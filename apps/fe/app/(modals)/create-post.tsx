import React, { useState } from "react";
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
import { ArrowLeft, Send, ImageIcon, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { isWeb, platformSelect } from "@/lib/platform";
import { showToast } from "@/components/CustomToast";
import Toast from "react-native-toast-message";
/**
 * 통합된 fileUpload.ts 유틸리티에서 필요한 기능 가져오기
 * - createReactNativeFile: 선택된 이미지를 업로드 가능한 형식으로 변환
 * - UploadProgress: 파일 업로드 진행 상태 추적을 위한 타입
 * - UploadError: 업로드 중 발생 가능한 오류 타입
 */
import {
  createReactNativeFile,
  UploadProgress,
  UploadError,
} from "@/lib/api/fileUpload";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";
import { PostType } from "@/components/PostCard";
import { User, getSession } from "@/lib/auth";
import {
  createPostWithFiles,
  createTextOnlyPost,
  PostCreationError,
  CreatePostWithFilesInput,
} from "@/lib/api/fileUpload";

// --- 타입 정의 ---
interface PostTypeOption {
  type: PostType;
  label: string;
  color: string;
  icon: string;
}

interface SelectedImage {
  uri: string;
  width?: number;
  height?: number;
  fileSize?: number;
  path?: string;
  mimeType?: string;
  source?: string;
  name?: string;
  originalSize?: number; // 원본 파일 크기 저장
}

/**
 * 게시물 작성 페이지
 */
export default function CreatePostScreen() {
  const router = useRouter();
  const { themed, theme } = useAppTheme();
  const { t } = useTranslation();

  // 상태 관리
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadPercentage, setUploadPercentage] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  // 게시물 타입 옵션
  const postTypeOptions: PostTypeOption[] = [
    {
      type: PostType.ANALYSIS,
      label: t(TRANSLATION_KEYS.POST_TYPE_ANALYSIS),
      color: "#6366f1",
      icon: "📊",
    },
    {
      type: PostType.HIGHLIGHT,
      label: t(TRANSLATION_KEYS.POST_TYPE_HIGHLIGHT),
      color: "#f59e0b",
      icon: "⭐",
    },
    {
      type: PostType.CHEERING,
      label: t(TRANSLATION_KEYS.POST_TYPE_CHEERING),
      color: "#10b981",
      icon: "📣",
    },
  ];

  /**
   * 뒤로 가기 핸들러
   */
  const handleGoBack = () => {
    if (title.trim() || content.trim() || selectedType) {
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
        ],
      );
    } else {
      router.back();
    }
  };

  /**
   * 게시물 타입 선택 핸들러
   */
  const handleTypeSelect = (type: PostType) => {
    setSelectedType(selectedType === type ? null : type);
  };

  /**
   * 이미지 압축 함수
   */
  const compressImage = async (uri: string): Promise<SelectedImage> => {
    try {
      const { width: screenWidth } = Dimensions.get("window");
      const maxWidth = Math.min(1920, screenWidth * 2);
      const maxHeight = 1080;

      // 파일 크기 확인 (웹/네이티브 환경에 따라 처리)
      let originalFileSize = 0;

      if (isWeb()) {
        // 웹 환경에서는 간단히 로그만 출력
        console.log("웹 환경: 파일 크기 확인 생략");
      } else {
        // 네이티브 환경에서는 파일 정보 확인
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          originalFileSize = fileInfo.exists ? fileInfo.size || 0 : 0;
          console.log(
            `원본 이미지 크기: ${originalFileSize} bytes (${(originalFileSize / (1024 * 1024)).toFixed(2)}MB)`,
          );

          // 파일이 너무 작으면 오류 발생
          if (originalFileSize < 1000) {
            console.error(
              `이미지 파일이 너무 작습니다: ${originalFileSize} bytes`,
            );
            throw new Error("이미지 파일이 손상되었거나 너무 작습니다");
          }
        } catch (fileError) {
          console.warn("파일 크기 확인 중 오류:", fileError);
          // 오류 발생해도 계속 진행
        }
      }

      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: maxWidth,
              height: maxHeight,
            },
          },
        ],
        {
          compress: 0.8, // 80% 품질
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      // 압축 후 파일 크기 검증
      let compressedSize = 0;

      if (isWeb()) {
        // 웹 환경에서는 크기 추정
        console.log("웹 환경: 압축된 파일 크기 확인 생략");
        // 웹에서는 이미지 크기를 추정할 수 없으므로 기본값 사용
        compressedSize = manipulatedImage.width * manipulatedImage.height * 4; // RGBA 4바이트 기준 추정
      } else {
        // 네이티브 환경에서는 실제 파일 크기 확인
        try {
          const compressedFileInfo = await FileSystem.getInfoAsync(
            manipulatedImage.uri,
          );
          const size = compressedFileInfo.exists
            ? compressedFileInfo.size || 0
            : 0;
          console.log(
            `압축된 이미지 크기: ${size} bytes (${(size / (1024 * 1024)).toFixed(2)}MB)`,
          );

          // 압축된 파일이 너무 작으면 오류 발생
          if (size < 1000) {
            console.error(
              `압축된 이미지가 너무 작습니다: ${size} bytes. 원본 사용 시도`,
            );
            // 원본이 작지 않다면 원본 사용
            if (originalFileSize > 1000) {
              compressedSize = -1; // 특별 플래그: 원본 사용 신호
            } else {
              throw new Error("압축된 이미지 파일이 손상되었습니다");
            }
          } else {
            compressedSize = size;
          }
        } catch (fileError) {
          console.warn("압축 파일 크기 확인 중 오류:", fileError);
          compressedSize = 0; // 오류 발생 시 기본값
        }
      }

      // 네이티브 환경에서 원본 이미지를 사용해야 하는 경우
      if (compressedSize === -1) {
        return {
          uri: uri,
          width: manipulatedImage.width,
          height: manipulatedImage.height,
          fileSize: originalFileSize,
          mimeType: "image/jpeg",
          name: `image_${Date.now()}.jpg`,
        };
      }

      return {
        uri: manipulatedImage.uri,
        width: manipulatedImage.width,
        height: manipulatedImage.height,
        fileSize: compressedSize,
        mimeType: "image/jpeg",
        name: `image_${Date.now()}.jpg`,
      };
    } catch (error) {
      console.error("이미지 압축 실패:", error);
      throw error;
    }
  };

  /**
   * 이미지 선택 핸들러
   */
  const handleImagePicker = async () => {
    try {
      // 권한 요청
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "권한 필요",
          "이미지를 선택하려면 갤러리 접근 권한이 필요합니다.",
          [{ text: "확인" }],
        );
        return;
      }

      // 이미지 선택
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 4 - selectedImages.length, // 최대 4개까지
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newImages: SelectedImage[] = [];

        for (const asset of result.assets) {
          try {
            const compressedImage = await compressImage(asset.uri);
            newImages.push(compressedImage);
          } catch (error) {
            console.error("이미지 처리 실패:", error);
            showToast({
              type: "error",
              title: "이미지 처리 실패",
              message: "일부 이미지를 처리할 수 없습니다.",
              duration: 3000,
            });
          }
        }

        setSelectedImages((prev) => [...prev, ...newImages]);

        if (newImages.length > 0) {
          showToast({
            type: "success",
            title: "이미지 추가 완료",
            message: `${newImages.length}개의 이미지가 추가되었습니다.`,
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error("이미지 선택 실패:", error);
      showToast({
        type: "error",
        title: "이미지 선택 실패",
        message: "이미지를 선택할 수 없습니다.",
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
   * 선택된 이미지를 업로드 가능한 형식으로 준비하는 함수
   *
   * fileUpload.ts의 createReactNativeFile 유틸리티 함수를 활용해
   * expo-image-picker에서 선택한 이미지를 업로드에 적합한 형식으로 변환합니다.
   *
   * @param image 선택된 이미지 정보
   * @param index 배열 내 이미지 인덱스 (파일명 생성 시 사용)
   * @returns 업로드 가능한 형식의 파일 객체
   */
  const prepareImageForUpload = async (image: SelectedImage, index: number) => {
    // 정확한 파일 정보 로깅
    console.log(`이미지 ${index} 준비 중:`, {
      uri: image.uri,
      name: image.name || `image_${index}.jpg`,
      type: image.mimeType,
      size: image.fileSize,
      width: image.width,
      height: image.height,
    });

    // 파일 크기 검증 및 확인
    if (isWeb()) {
      // 웹 환경
      console.log("웹 환경: 파일 크기 검증 생략");
    } else {
      // 네이티브 환경
      try {
        // 파일 정보 다시 확인
        const fileInfo = await FileSystem.getInfoAsync(image.uri);
        const actualFileSize = fileInfo.exists ? fileInfo.size || 0 : 0;

        console.log(
          `실제 파일 크기 확인: ${actualFileSize} bytes (${(actualFileSize / 1024).toFixed(2)}KB)`,
        );

        // 파일 크기 불일치 확인
        if (
          image.fileSize &&
          Math.abs(image.fileSize - actualFileSize) > 1000
        ) {
          console.warn(
            `경고: 파일 크기 불일치! 메타데이터: ${image.fileSize} bytes, 실제: ${actualFileSize} bytes`,
          );
          // 실제 크기로 업데이트
          image.fileSize = actualFileSize;
        }

        // 파일이 너무 작은 경우
        if (actualFileSize < 1000) {
          throw new Error(
            `이미지 ${index}의 크기가 너무 작습니다: ${actualFileSize} bytes`,
          );
        }
      } catch (error) {
        console.error(`파일 크기 확인 오류:`, error);
      }
    }

    // 파일 확장자 확인
    const fileExt = image.uri?.split(".").pop()?.toLowerCase();
    const mimeType =
      image.mimeType ||
      (fileExt
        ? `image/${fileExt === "jpg" ? "jpeg" : fileExt}`
        : "image/jpeg");

    return createReactNativeFile(
      {
        uri: image.uri,
        mimeType: mimeType,
        name: image.name || `image_${index}_${Date.now()}.${fileExt || "jpg"}`,
        width: image.width,
        height: image.height,
        fileSize: image.fileSize, // 파일 크기 정보 추가
      },
      index,
    );
  };

  /**
   * 게시물 작성 핸들러 (새로운 하이브리드 방식)
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

    if (!selectedType) {
      showToast({
        type: "error",
        title: "타입 선택 필요",
        message: t(TRANSLATION_KEYS.CREATE_POST_SELECT_TYPE),
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress("");
    setUploadPercentage(0);
    setUploadError(null);

    try {
      // 게시물 생성 입력 데이터 준비
      const postInput = {
        title: title.trim(),
        content: content.trim(),
        type: selectedType as "ANALYSIS" | "CHEERING" | "HIGHLIGHT",
        isPublic: true,
      };

      console.log("게시물 생성 시작:", {
        title: postInput.title,
        type: postInput.type,
        hasFiles: selectedImages.length > 0,
        fileCount: selectedImages.length,
      });

      let createdPost;

      // 파일이 있는 경우 REST API로 업로드 후 GraphQL로 게시물 생성
      if (selectedImages.length > 0) {
        setUploadProgress("이미지 업로드 중...");

        try {
          console.log(`이미지 업로드 시작: ${selectedImages.length}개 파일`);

          // 이미지 데이터 변환 및 유효성 검증
          const files = await Promise.all(
            selectedImages.map(async (image, index) => {
              if (!image || !image.uri) {
                console.error(
                  `유효하지 않은 이미지 데이터 (인덱스: ${index})`,
                  image,
                );
                throw new Error(
                  `이미지 ${index}의 데이터가 유효하지 않습니다.`,
                );
              }

              // 파일 크기가 너무 작은지 확인 (67바이트 등의 문제 방지)
              // 네이티브 환경에서만 검사
              if (!isWeb() && image.fileSize && image.fileSize < 1000) {
                console.warn(
                  `경고: 이미지 ${index}는 ${image.fileSize}바이트로 너무 작습니다. 업로드 시 문제가 발생할 수 있습니다.`,
                );
                throw new Error(
                  `이미지 ${index}의 크기(${image.fileSize}바이트)가 너무 작습니다. 다른 이미지를 선택해주세요.`,
                );
              }

              return await prepareImageForUpload(image, index);
            }),
          );

          console.log(`변환된 파일 데이터: ${files.length}개`);

          // fileUpload.ts를 사용한 REST API + GraphQL 하이브리드 방식 게시물 생성
          createdPost = await createPostWithFiles({
            ...postInput,
            // 각 이미지를 업로드 가능한 형식으로 변환
            files,
            // 업로드 진행률 추적 콜백
            onProgress: (progress: UploadProgress) => {
              setUploadPercentage(progress.percentage);
              setUploadProgress(`이미지 업로드 중... ${progress.percentage}%`);
            },
          });

          console.log("파일과 함께 게시물 생성 완료");
        } catch (error) {
          console.error("파일 업로드 및 게시물 생성 실패:", error);

          if (error instanceof PostCreationError) {
            if (error.phase === "upload") {
              setUploadError(`이미지 업로드 실패: ${error.message}`);
            } else {
              setUploadError(`게시물 생성 실패: ${error.message}`);
            }
            throw error;
          }

          throw new Error(`게시물 생성 중 오류: ${error.message}`);
        }
      } else {
        // 텍스트만 있는 게시물 (REST API를 거치지 않고 바로 GraphQL 사용)
        setUploadProgress("게시물 생성 중...");
        setUploadPercentage(50); // 진행 상태 표시
        createdPost = await createTextOnlyPost(postInput);
        setUploadPercentage(100);
      }

      console.log("게시물 생성 완료:", createdPost);

      // 성공 메시지
      showToast({
        type: "success",
        title: "게시물 작성 완료",
        message: `게시물이 성공적으로 작성되었습니다! ${selectedImages.length > 0 ? "이미지 업로드 완료." : ""}`,
        duration: 3000,
      });

      // 피드로 돌아가기
      router.back();
    } catch (error) {
      console.error("게시물 작성 오류:", error);
      console.error("오류 세부 정보:", {
        errorType: error.constructor.name,
        message: error.message,
        stack: error.stack,
      });

      let errorTitle = "게시물 작성 실패";
      setUploadPercentage(0);
      let errorMessage = "알 수 없는 오류가 발생했습니다.";

      if (error instanceof PostCreationError) {
        errorMessage = error.message;
        if (error.phase === "upload") {
          errorTitle = "이미지 업로드 실패";
          setUploadError(errorMessage);
          // 업로드 실패 시 디버깅을 위한 추가 로그
          console.log("업로드 단계에서 실패:", {
            imageCount: selectedImages.length,
            imageDetails: selectedImages.map((img) => ({
              uri: img.uri?.substring(0, 30) + "...",
              type: img.mimeType,
              size: img.fileSize,
            })),
          });
        }
      } else if (error instanceof UploadError) {
        errorTitle = "파일 업로드 실패";
        errorMessage = error.message;
        setUploadError(error.message);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setUploadError(errorMessage);

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
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>
          {t(TRANSLATION_KEYS.CREATE_POST_TITLE)}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={
            !title.trim() || !content.trim() || !selectedType || isSubmitting
          }
          style={[
            themed($publishButton),
            {
              opacity:
                !title.trim() ||
                !content.trim() ||
                !selectedType ||
                isSubmitting
                  ? 0.5
                  : 1,
            },
          ]}
        >
          <Send color="white" size={20} />
          <Text style={themed($publishButtonText)}>
            {isSubmitting
              ? uploadProgress || t(TRANSLATION_KEYS.CREATE_POST_PUBLISHING)
              : t(TRANSLATION_KEYS.CREATE_POST_PUBLISH)}
          </Text>
          {isSubmitting && uploadPercentage > 0 && uploadPercentage < 100 && (
            <Text style={themed($progressText)}>{uploadPercentage}%</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={themed($scrollContainer)}
        showsVerticalScrollIndicator={false}
      >
        {/* 사용자 정보 */}
        <View style={themed($userSection)}>
          <Text style={themed($username)}>{currentUser.nickname}</Text>
          <Text style={themed($userHandle)}>
            @{currentUser.nickname.toLowerCase()}
          </Text>
        </View>

        {/* 게시물 타입 선택 */}
        <View style={themed($typeSection)}>
          <Text style={themed($sectionTitle)}>
            {t(TRANSLATION_KEYS.CREATE_POST_SELECT_TYPE)}
          </Text>
          <View style={themed($typeOptions)}>
            {postTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  themed($typeOption),
                  {
                    borderColor:
                      selectedType === option.type
                        ? option.color
                        : theme.colors.border,
                    backgroundColor:
                      selectedType === option.type
                        ? option.color + "20"
                        : "transparent",
                  },
                ]}
                onPress={() => handleTypeSelect(option.type)}
              >
                <Text style={themed($typeIcon)}>{option.icon}</Text>
                <Text
                  style={[
                    themed($typeLabel),
                    {
                      color:
                        selectedType === option.type
                          ? option.color
                          : theme.colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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

          {/* 이미지 업로드 버튼 */}
          <TouchableOpacity
            style={themed($imageUploadButton)}
            onPress={handleImagePicker}
            disabled={isSubmitting || selectedImages.length >= 4}
          >
            <ImageIcon color={theme.colors.tint} size={20} />
            <Text style={themed($imageUploadText)}>
              이미지 추가 ({selectedImages.length}/4)
            </Text>
          </TouchableOpacity>

          {/* 업로드 에러 표시 */}
          {uploadError && (
            <Text
              style={{ color: "red", marginVertical: 8, paddingHorizontal: 16 }}
            >
              오류: {uploadError}
            </Text>
          )}

          {/* 선택된 이미지 미리보기 */}
          {selectedImages.length > 0 && (
            <View style={themed($imagePreviewContainer)}>
              <Text style={themed($sectionTitle)}>첨부된 이미지</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={themed($imagePreviewScroll)}
              >
                {selectedImages.map((image, index) => (
                  <View key={index} style={themed($imagePreviewItem)}>
                    <Image
                      source={{ uri: image.uri }}
                      style={themed($imagePreview)}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={themed($imageRemoveButton)}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <X color="white" size={16} />
                    </TouchableOpacity>
                    {image.fileSize && (
                      <Text style={themed($imageSizeText)}>
                        {(image.fileSize / 1024 / 1024).toFixed(1)}MB
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
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

const $progressText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: "white",
  fontSize: 12,
  marginLeft: 8,
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

const $typeOptions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
});

const $typeOption: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  borderWidth: 2,
  borderRadius: 12,
});

const $typeIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 20,
  marginRight: spacing.xs,
});

const $typeLabel: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
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

const $imageSizeText: ThemedStyle<TextStyle> = ({ colors }) => ({
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
