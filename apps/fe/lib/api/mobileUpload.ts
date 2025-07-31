/**
 * 모바일 환경 전용 파일 업로드 유틸리티
 *
 * React Native 환경에서의 파일 업로드 기능을 제공합니다.
 */

import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { getSession } from "@/lib/auth";
import { isReactNative } from "@/lib/platform";
import {
  UploadProgress,
  ProgressCallback,
  UploadedMedia,
  UploadError,
  createReactNativeFile,
  getUploadEndpoints,
} from "./common";

// --------------------------
// 모바일 전용 타입 정의
// --------------------------

export interface MobileUploadResponse {
  success: boolean;
  message: string;
  data: {
    files: UploadedMedia[];
    totalCount: number;
  };
  timestamp: string;
}

export interface MobileSingleUploadResponse {
  success: boolean;
  message: string;
  data: UploadedMedia;
  timestamp: string;
}

export interface SelectedImage {
  uri: string;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  name?: string;
}

// --------------------------
// 모바일 전용 업로드 함수
// --------------------------

/**
 * 모바일 환경에서 다중 파일 업로드 (진행률 추적 지원)
 *
 * @param files 업로드할 파일 배열 (ReactNativeFile 형식)
 * @param onProgress 진행률 콜백 함수 (선택적)
 * @returns 업로드된 미디어 파일 정보 배열
 * @throws UploadError 업로드 실패 시
 */
export async function uploadFilesMobile(
  files: Array<{ uri: string; name: string; type: string }>,
  onProgress?: ProgressCallback
): Promise<UploadedMedia[]> {
  if (!isReactNative()) {
    throw new UploadError(
      "이 함수는 모바일 환경에서만 사용할 수 있습니다.",
      400
    );
  }

  try {
    // 파일 유효성 검증
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.warn("uploadFilesMobile: 업로드할 파일이 없습니다.");
      return [];
    }

    const validFiles = files.filter(
      (file) => file && file.uri && file.name && file.type
    );

    if (validFiles.length === 0) {
      throw new UploadError(
        "업로드할 유효한 파일이 없습니다. 모든 파일이 비어있거나 손상되었습니다.",
        400
      );
    }

    // 최대 파일 개수 검증
    if (validFiles.length > 4) {
      throw new UploadError("최대 4개의 파일만 업로드할 수 있습니다.", 400);
    }

    console.log(`모바일 환경에서 ${validFiles.length}개 파일 업로드 시작`);

    // 인증 토큰 가져오기
    const { token } = await getSession();
    if (!token) {
      throw new UploadError("인증 토큰이 없습니다. 로그인이 필요합니다.", 401);
    }

    // FormData 생성
    const formData = new FormData();

    // 파일 추가
    validFiles.forEach((file, index) => {
      // iOS에서는 file://로 시작하는 로컬 파일 경로만 사용 가능
      const uri = file.uri.startsWith("file://")
        ? file.uri
        : `file://${file.uri.replace(/^\//, "")}`;

      // 파일 이름 강제 지정 (확장자 포함)
      const mimeToExt = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "video/mp4": "mp4",
        "video/quicktime": "mov",
      };
      const fileExt = mimeToExt[file.type] || "jpg";
      const fileName = `image_${index}_${Date.now()}.${fileExt}`;

      // 실제 파일 데이터를 포함하는 객체 생성
      const fileObj = {
        uri: uri,
        name: fileName,
        type: file.type || "image/jpeg",
      };

      console.log(`모바일 환경 - 파일 추가: ${JSON.stringify(fileObj)}`);

      // @ts-ignore: React Native의 FormData는 객체 형식 지원
      formData.append("files", fileObj);
      console.log(
        `React Native (${Platform.OS}) - 파일 추가: ${fileName}, URI: ${uri.substring(0, 30)}...`
      );
    });

    const endpoints = getUploadEndpoints();

    // XMLHttpRequest 사용 (진행률 추적을 위함)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 진행률 이벤트 핸들러
      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            onProgress(progress);
          }
        });
      }

      // 요청 완료 핸들러
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(
              xhr.responseText
            ) as MobileUploadResponse;
            if (response.success) {
              console.log(
                "모바일 파일 업로드 성공:",
                response.data.totalCount,
                "개 파일"
              );
              resolve(response.data.files);
            } else {
              reject(
                new UploadError(
                  response.message || "업로드 실패",
                  xhr.status,
                  response
                )
              );
            }
          } catch (parseError) {
            reject(
              new UploadError(
                `응답 파싱 오류: ${parseError.message || "알 수 없는 오류"}`,
                xhr.status
              )
            );
          }
        } else {
          let errorMessage = "파일 업로드 실패";
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.message || errorMessage;
          } catch (e) {
            // 파싱 실패 시 기본 메시지 사용
          }
          reject(new UploadError(errorMessage, xhr.status, xhr.responseText));
        }
      });

      // 오류 이벤트 핸들러
      xhr.addEventListener("error", () => {
        reject(new UploadError("네트워크 오류가 발생했습니다."));
      });

      // 요청 취소 이벤트 핸들러
      xhr.addEventListener("abort", () => {
        reject(new UploadError("업로드가 취소되었습니다."));
      });

      // 요청 초기화 및 전송
      xhr.open("POST", endpoints.upload, true);

      // 인증 헤더 설정
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      // React Native에서 필요한 추가 헤더 설정
      xhr.setRequestHeader("Accept", "application/json");

      // FormData는 자동으로 multipart/form-data 콘텐츠 타입 설정
      xhr.send(formData);
    });
  } catch (error) {
    console.error("모바일 파일 업로드 오류:", error);
    throw error instanceof UploadError
      ? error
      : new UploadError(error.message || "알 수 없는 업로드 오류");
  }
}

/**
 * 모바일 환경에서 단일 파일 업로드
 *
 * @param file 업로드할 파일
 * @param onProgress 진행률 콜백 함수 (선택적)
 * @returns 업로드된 미디어 파일 정보
 */
export async function uploadFileMobile(
  file: { uri: string; name: string; type: string },
  onProgress?: ProgressCallback
): Promise<UploadedMedia> {
  if (!isReactNative()) {
    throw new UploadError(
      "이 함수는 모바일 환경에서만 사용할 수 있습니다.",
      400
    );
  }

  try {
    // 인증 토큰 가져오기
    const { token } = await getSession();
    if (!token) {
      throw new UploadError("인증 토큰이 없습니다. 로그인이 필요합니다.", 401);
    }

    if (!file || !file.uri) {
      throw new UploadError("업로드할 파일이 없습니다.", 400);
    }

    // FormData 생성
    const formData = new FormData();

    // @ts-ignore: React Native의 FormData는 객체 형식 지원
    formData.append("files", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    });

    const endpoints = getUploadEndpoints();

    // XMLHttpRequest 사용 (진행률 추적을 위함)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 진행률 이벤트 핸들러
      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            onProgress(progress);
          }
        });
      }

      // 요청 완료 핸들러
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(
              xhr.responseText
            ) as MobileSingleUploadResponse;
            if (response.success) {
              console.log("모바일 단일 파일 업로드 성공:", response.data.id);
              resolve(response.data);
            } else {
              reject(
                new UploadError(
                  response.message || "업로드 실패",
                  xhr.status,
                  response
                )
              );
            }
          } catch (parseError) {
            reject(
              new UploadError(
                `응답 파싱 오류: ${parseError.message || "알 수 없는 오류"}`,
                xhr.status
              )
            );
          }
        } else {
          let errorMessage = "파일 업로드 실패";
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.message || errorMessage;
          } catch (e) {
            // 파싱 실패 시 기본 메시지 사용
          }
          reject(new UploadError(errorMessage, xhr.status, xhr.responseText));
        }
      });

      // 오류 이벤트 핸들러
      xhr.addEventListener("error", () => {
        reject(new UploadError("네트워크 오류가 발생했습니다."));
      });

      // 요청 취소 이벤트 핸들러
      xhr.addEventListener("abort", () => {
        reject(new UploadError("업로드가 취소되었습니다."));
      });

      // 요청 초기화 및 전송
      xhr.open("POST", endpoints.uploadSingle, true);

      // 헤더 설정
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  } catch (error) {
    console.error("모바일 단일 파일 업로드 오류:", error);
    throw error instanceof UploadError
      ? error
      : new UploadError(error.message || "알 수 없는 업로드 오류");
  }
}

/**
 * 모바일 환경에서 이미지 압축
 * @param uri 이미지 URI
 * @param options 압축 옵션
 * @returns 압축된 이미지 정보 (GIF는 원본 유지)
 */
export async function compressImageMobile(
  uri: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<SelectedImage> {
  if (!isReactNative()) {
    throw new Error("이 함수는 모바일 환경에서만 사용할 수 있습니다.");
  }

  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;

  try {
    console.log(`모바일 이미지 압축 시작: ${uri.substring(0, 50)}...`);

    // 파일 확장자로 GIF 여부 확인
    const fileExtension = uri.split(".").pop()?.toLowerCase();
    const isGif = fileExtension === "gif";

    // 원본 파일 크기 확인
    let originalFileSize = 0;
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      originalFileSize = fileInfo.exists ? fileInfo.size || 0 : 0;
      console.log(
        `원본 이미지 크기: ${originalFileSize} bytes (${(originalFileSize / (1024 * 1024)).toFixed(2)}MB)`
      );

      if (originalFileSize <= 0) {
        throw new Error("이미지 파일이 손상되었습니다");
      }
    } catch (fileError) {
      console.warn("파일 크기 확인 중 오류:", fileError);
    }

    // GIF 파일인 경우 원본 그대로 반환
    if (isGif) {
      console.log("GIF 파일 감지 - 원본 유지");

      // 이미지 크기 정보만 가져오기 (압축하지 않음)
      let imageWidth = 0;
      let imageHeight = 0;

      try {
        // ImageManipulator로 이미지 정보만 가져오기 (변환하지 않음)
        const imageInfo = await ImageManipulator.manipulateAsync(
          uri,
          [], // 변환 작업 없음
          {
            format: ImageManipulator.SaveFormat.PNG, // 임시로 PNG 사용 (실제로는 변환되지 않음)
          }
        );
        imageWidth = imageInfo.width;
        imageHeight = imageInfo.height;
      } catch (error) {
        console.warn("GIF 이미지 정보 가져오기 실패, 기본값 사용:", error);
        imageWidth = 800; // 기본값
        imageHeight = 600; // 기본값
      }

      return {
        uri: uri, // 원본 URI 유지
        width: imageWidth,
        height: imageHeight,
        fileSize: originalFileSize,
        mimeType: "image/gif", // GIF MIME 타입 유지
        name: `gif_${Date.now()}.gif`,
      };
    }

    // GIF가 아닌 경우 기존 압축 로직 수행
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
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log(`이미지 압축 완료:`, {
      uri: manipulatedImage.uri?.substring(0, 50) + "...",
      width: manipulatedImage.width,
      height: manipulatedImage.height,
    });

    // 압축 후 파일 크기 확인
    let compressedSize = 0;
    try {
      const compressedFileInfo = await FileSystem.getInfoAsync(
        manipulatedImage.uri
      );
      compressedSize = compressedFileInfo.exists
        ? compressedFileInfo.size || 0
        : 0;
      console.log(
        `압축된 이미지 크기: ${compressedSize} bytes (${(compressedSize / (1024 * 1024)).toFixed(2)}MB)`
      );

      // 압축된 파일이 0바이트이면 원본 사용
      if (compressedSize <= 0) {
        console.warn("압축된 이미지가 손상되었습니다. 원본 사용");
        return {
          uri: uri,
          width: manipulatedImage.width,
          height: manipulatedImage.height,
          fileSize: originalFileSize,
          mimeType: "image/jpeg",
          name: `image_${Date.now()}.jpg`,
        };
      }
    } catch (fileError) {
      console.warn("압축 파일 크기 확인 중 오류:", fileError);
      compressedSize = 0;
    }

    return {
      uri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
      fileSize: compressedSize,
      mimeType: "image/jpeg",
      name: `compressed_image_${Date.now()}.jpg`,
    };
  } catch (error) {
    console.error("모바일 이미지 압축 실패:", error);
    throw error;
  }
}

/**
 * 선택된 이미지를 업로드 가능한 형식으로 준비 (모바일 전용)
 * @param image 선택된 이미지 정보
 * @param index 배열 내 이미지 인덱스
 * @returns 업로드 가능한 형식의 파일 객체
 */
export async function prepareImageForUploadMobile(
  image: SelectedImage,
  index: number
): Promise<{ uri: string; name: string; type: string }> {
  if (!isReactNative()) {
    throw new Error("이 함수는 모바일 환경에서만 사용할 수 있습니다.");
  }

  console.log(`모바일 이미지 ${index} 준비 중:`, {
    uri: image.uri?.substring(0, 50) + "...",
    name: image.name || `image_${index}.jpg`,
    type: image.mimeType,
    size: image.fileSize,
  });

  // URI 유효성 검사
  if (!image.uri) {
    throw new Error(`이미지 ${index}의 URI가 없습니다.`);
  }

  // 파일 정보 확인
  try {
    const fileInfo = await FileSystem.getInfoAsync(image.uri);
    const actualFileSize = fileInfo.exists ? fileInfo.size || 0 : 0;

    console.log(
      `실제 파일 크기 확인: ${actualFileSize} bytes (${(actualFileSize / 1024).toFixed(2)}KB)`
    );

    if (!fileInfo.exists) {
      throw new Error(`이미지 ${index}를 찾을 수 없습니다: ${image.uri}`);
    }

    if (actualFileSize <= 0) {
      throw new Error(
        `이미지 ${index}가 손상되었습니다: ${actualFileSize} bytes`
      );
    }
  } catch (error) {
    console.error(`파일 크기 확인 오류:`, error);
    throw error;
  }

  // 파일 확장자 확인
  const fileExt = image.uri?.split(".").pop()?.toLowerCase();
  const mimeType =
    image.mimeType ||
    (fileExt ? `image/${fileExt === "jpg" ? "jpeg" : fileExt}` : "image/jpeg");

  const fileData = {
    uri: image.uri,
    mimeType: mimeType,
    name: image.name || `image_${index}_${Date.now()}.${fileExt || "jpg"}`,
    width: image.width,
    height: image.height,
    fileSize: image.fileSize,
  };

  console.log(`createReactNativeFile 호출:`, {
    uri: fileData.uri?.substring(0, 50) + "...",
    name: fileData.name,
    mimeType: fileData.mimeType,
    fileSize: fileData.fileSize,
  });

  const result = createReactNativeFile(fileData, index);

  return {
    uri: result.uri,
    name: result.name,
    type: result.type,
  };
}
