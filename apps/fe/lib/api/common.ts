/**
 * 파일 업로드 공통 유틸리티
 *
 * 웹과 모바일 환경에서 공통으로 사용되는 유틸리티 함수들을 제공합니다.
 */

import { Platform } from "react-native";
import { ReactNativeFile } from "apollo-upload-client";
// NOTE: 환경 변수 타입 선언이 누락된 경우 빌드 에러 방지를 위한 임시 처리
// 존재하지 않으면 런타임 fallback 사용
// @ts-ignore - @env 모듈 타입 정의가 없을 수 있음
import { SERVER_URL as RAW_SERVER_URL } from "@env";
// Fallback 우선순위: @env -> Expo Public 환경변수 -> 로컬 기본값
const SERVER_URL =
  (RAW_SERVER_URL as string) ||
  (process.env as any)?.EXPO_PUBLIC_SERVER_URL ||
  "http://localhost:3000";

// --------------------------
// 타입 정의
// --------------------------

/**
 * 업로드 진행 상태 인터페이스
 */
export interface UploadProgress {
  loaded: number; // 업로드된 바이트
  total: number; // 전체 바이트
  percentage: number; // 완료율 (0-100)
}

/**
 * 진행률 콜백 타입 정의
 */
export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * 업로드된 미디어 파일 정보를 위한 인터페이스
 */
export interface UploadedMedia {
  id: string;
  originalName: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  status: "UPLOADING" | "COMPLETED" | "FAILED";

  failureReason?: string; // 실패 원인 추가
}

/**
 * 업로드 오류 클래스
 */
export class UploadError extends Error {
  status?: number;
  details?: any;

  constructor(message: string, status?: number, details?: any) {
    super(message);
    this.name = "UploadError";
    this.status = status;
    this.details = details;
  }
}

/**
 * 게시물 생성 오류 클래스
 */
export class PostCreationError extends Error {
  constructor(
    message: string,
    public phase: "upload" | "post_creation",
    public originalError?: any,
  ) {
    super(message);
    this.name = "PostCreationError";
  }
}

// --------------------------
// 공통 유틸리티 함수
// --------------------------

/**
 * URI에서 MIME 타입을 추측합니다.
 *
 * @param uri 파일 URI
 * @returns 추측된 MIME 타입
 */
export function getMimeTypeFromUri(uri: string): string {
  const extension = uri.split(".").pop()?.toLowerCase() || "";

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "avi":
      return "video/x-msvideo";
    case "webm":
      return "video/webm";
    case "mkv":
      return "video/x-matroska";
    case "3gp":
      return "video/3gpp";
    default:
      //console.log(`알 수 없는 파일 확장자 '${extension}' - 기본값 사용`);
      // 확장자로 동영상인지 이미지인지 추측
      const videoExtensions = [
        "mp4",
        "mov",
        "avi",
        "webm",
        "mkv",
        "3gp",
        "m4v",
      ];
      if (videoExtensions.includes(extension)) {
        return "video/mp4"; // 기본 동영상 타입
      }
      return "image/jpeg"; // 기본 이미지 타입
  }
}

/**
 * React Native 파일 객체 생성 헬퍼 함수
 * 이미지 선택기에서 가져온 이미지 정보를 업로드 가능한 형태로 변환
 *
 * @param image 이미지 정보 (URI, 크기, 타입 등)
 * @param index 이미지 인덱스 (파일명 생성 시 사용)
 * @returns React Native 파일 객체
 */
export function createReactNativeFile(
  image: {
    uri: string;
    width?: number;
    height?: number;
    mimeType?: string;
    name?: string;
    fileSize?: number;
  },
  index: number = 0,
): ReactNativeFile {
  // 파일 이름 추출 또는 생성
  const uriParts = image.uri.split("/");
  const fileName =
    image.name ||
    uriParts[uriParts.length - 1] ||
    `image_${index}_${Date.now()}.jpg`;

  // MIME 타입 결정
  const fileType = image.mimeType || getMimeTypeFromUri(image.uri);

  // URI 형식 확인 및 수정 (React Native 플랫폼에 따라)
  let normalizedUri = image.uri;
  if (Platform.OS === "ios" && !normalizedUri.startsWith("file://")) {
    normalizedUri = `file://${normalizedUri}`;
  } else if (Platform.OS === "android" && normalizedUri.startsWith("file://")) {
    // Android에서는 필요에 따라 조정
    normalizedUri = normalizedUri.substring(7);
  }

  return new ReactNativeFile({
    uri: normalizedUri,
    name: fileName,
    type: fileType,
  });
}

/**
 * API 기본 URL 설정
 */
export const getApiBaseUrl = () => {
  return "http://localhost:3000"; // 프로덕션 URL
};

/**
 * 업로드 엔드포인트 URL들
 */
export const getUploadEndpoints = () => {
  const baseUrl = SERVER_URL;
  return {
    upload: `${baseUrl}/api/upload`,
    uploadSingle: `${baseUrl}/api/upload/single`,
    avatar: `${baseUrl}/api/upload/avatar`,
    graphql: `${baseUrl}/graphql`,
  };
};

/**
 * FormData가 올바르게 구성되었는지 디버깅 정보를 출력
 * @param formData 검사할 FormData 객체
 */
export function debugFormData(formData: FormData): void {
  //console.log("===== FormData 디버깅 =====");

  // FormData 항목 순회 (지원되는 브라우저에서만)
  const hasEntries =
    "entries" in formData && typeof (formData as any).entries === "function";
  if (hasEntries) {
    try {
      const entries = Array.from((formData as any).entries());
      for (const pair of entries) {
        const key = pair[0];
        const value = pair[1];

        if (value instanceof File) {
          //console.log(
          //   `${key}: File(이름: ${value.name}, 타입: ${value.type}, 크기: ${value.size} bytes)`,
          // );
        } else if (typeof value === "object" && value !== null) {
          //console.log(`${key}: 객체`, value);
        } else {
          //console.log(`${key}:`, value);
        }
      }
    } catch (error) {
      console.error("FormData 항목 로깅 중 오류 발생:", error);
    }
  } else {
    console.warn(
      "FormData 항목을 나열할 수 없습니다 (entries 메서드 지원 안 함)",
    );
  }

  //console.log("===========================");
}
