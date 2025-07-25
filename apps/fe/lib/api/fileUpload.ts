/**
 * 통합 파일 업로드 유틸리티
 *
 * 이 모듈은 REST API를 통해 파일을 업로드하는 기능을 제공합니다.
 * 웹과 React Native 환경 모두에서 작동하며 진행률 추적 기능을 포함합니다.
 * upload.ts와 restUpload.ts의 모든 기능을 통합했습니다.
 */

import { Platform } from "react-native";
import { getSession } from "@/lib/auth";
import { isWeb, isReactNative } from "@/lib/platform";
import { ReactNativeFile } from "apollo-upload-client";

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
  thumbnailUrl?: string;
}

// 이전 UploadedFile 인터페이스와의 호환성 유지
export type UploadedFile = UploadedMedia;

/**
 * REST API 응답 형식
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * 여러 파일 업로드 응답 데이터 형식
 */
export interface UploadResponseData {
  files: UploadedMedia[];
  totalCount: number;
}

/**
 * 단일 파일 업로드 응답 형식
 */
export interface SingleUploadResponse {
  success: boolean;
  message: string;
  data: UploadedMedia;
  timestamp: string;
}

/**
 * 다중 파일 업로드 응답 형식
 */
export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    files: UploadedMedia[];
    totalCount: number;
  };
  timestamp: string;
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

// --------------------------
// 설정 및 상수
// --------------------------

/**
 * API 기본 URL 설정
 * 개발 환경에서는 로컬 서버, 프로덕션 환경에서는 실제 API 서버 URL 사용
 */
const API_BASE_URL = __DEV__
  ? Platform.OS === "android"
    ? "http://10.0.2.2:3000" // Android 에뮬레이터용
    : "http://localhost:3000" // iOS 에뮬레이터와 웹용
  : "https://api.sportcomm.com"; // 프로덕션 URL

/**
 * 업로드 엔드포인트
 */
const UPLOAD_ENDPOINT = `${API_BASE_URL}/api/upload`;
const UPLOAD_SINGLE_ENDPOINT = `${API_BASE_URL}/api/upload/single`;

// --------------------------
// 유틸리티 함수
// --------------------------

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

  return new ReactNativeFile({
    uri: image.uri,
    name: fileName,
    type: fileType,
  });
}

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
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    default:
      return "application/octet-stream";
  }
}

/**
 * FormData가 올바르게 구성되었는지 디버깅 정보를 출력
 * @param formData 검사할 FormData 객체
 */
export function debugFormData(formData: FormData): void {
  console.log("===== FormData 디버깅 =====");

  // FormData 항목 순회 (지원되는 브라우저에서만)
  if (typeof formData.entries === "function") {
    try {
      for (const pair of formData.entries()) {
        const key = pair[0];
        const value = pair[1];

        if (value instanceof File) {
          console.log(
            `${key}: File(이름: ${value.name}, 타입: ${value.type}, 크기: ${value.size} bytes)`,
          );
        } else if (typeof value === "object" && value !== null) {
          console.log(`${key}: 객체`, value);
        } else {
          console.log(`${key}:`, value);
        }
      }
    } catch (error) {
      console.error("FormData 항목 로깅 중 오류 발생:", error);
    }
  } else {
    console.log(
      "FormData 항목을 나열할 수 없습니다 (entries 메서드 지원 안 함)",
    );
  }

  console.log("===========================");
}

// --------------------------
// 업로드 함수
// --------------------------

/**
 * REST API를 통한 파일 업로드 (진행률 추적 지원)
 *
 * @param files 업로드할 파일 배열 (File, Blob 또는 ReactNativeFile)
 * @param onProgress 진행률 콜백 함수 (선택적)
 * @returns 업로드된 미디어 파일 정보 배열
 * @throws UploadError 업로드 실패 시
 */
export async function uploadFilesWithProgress(
  files: Array<File | Blob | ReactNativeFile>,
  onProgress?: ProgressCallback,
): Promise<UploadedMedia[]> {
  try {
    // 파일이 없으면 빈 배열 반환
    if (!files || files.length === 0) {
      return [];
    }

    // 최대 파일 개수 검증
    if (files.length > 4) {
      throw new UploadError("최대 4개의 파일만 업로드할 수 있습니다.", 400);
    }

    console.log(`REST API로 ${files.length}개 파일 업로드 시작`);

    // 인증 토큰 가져오기
    const { token } = await getSession();
    if (!token) {
      throw new UploadError("인증 토큰이 없습니다. 로그인이 필요합니다.", 401);
    }

    // FormData 생성
    const formData = new FormData();

    // 플랫폼에 맞게 파일 추가
    files.forEach((file, index) => {
      console.log(
        `파일 ${index} 추가 중:`,
        isWeb() && file instanceof File
          ? `${file.name} (${file.size} bytes)`
          : "ReactNativeFile",
      );

      if (isWeb() && (file instanceof File || file instanceof Blob)) {
        // 웹 환경: File/Blob 객체
        const fileName =
          file instanceof File ? file.name : `file_${index}_${Date.now()}`;
        formData.append("files", file, fileName);
      } else if (
        isReactNative() &&
        "uri" in file &&
        "name" in file &&
        "type" in file
      ) {
        // React Native 환경: uri, name, type 객체
        // @ts-ignore: React Native의 FormData는 객체를 직접 지원
        formData.append("files", {
          uri: file.uri,
          name: file.name || `file_${index}_${Date.now()}`,
          type: file.type || "image/jpeg",
        });
      } else {
        throw new Error(`지원하지 않는 파일 형식: ${typeof file}`);
      }
    });

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
            const response = JSON.parse(xhr.responseText) as UploadResponse;
            if (response.success) {
              console.log(
                "파일 업로드 성공:",
                response.data.totalCount,
                "개 파일",
              );
              resolve(response.data.files);
            } else {
              reject(
                new UploadError(
                  response.message || "업로드 실패",
                  xhr.status,
                  response,
                ),
              );
            }
          } catch (parseError) {
            reject(
              new UploadError(
                `응답 파싱 오류: ${parseError.message || "알 수 없는 오류"}`,
                xhr.status,
              ),
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
      xhr.open("POST", UPLOAD_ENDPOINT, true);

      // 헤더 설정
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      // FormData는 자동으로 multipart/form-data 콘텐츠 타입 설정
      xhr.send(formData);
    });
  } catch (error) {
    console.error("파일 업로드 오류:", error);
    throw error instanceof UploadError
      ? error
      : new UploadError(error.message || "알 수 없는 업로드 오류");
  }
}

/**
 * 단순화된 다중 파일 업로드 함수 (진행률 추적 없음)
 *
 * @param files 업로드할 파일 배열
 * @returns 업로드된 미디어 파일 정보 배열
 */
export async function uploadFiles(
  files: Array<File | Blob | ReactNativeFile>,
): Promise<UploadedMedia[]> {
  return uploadFilesWithProgress(files);
}

/**
 * 단일 파일 업로드 함수
 *
 * @param file 업로드할 파일
 * @param onProgress 진행률 콜백 함수 (선택적)
 * @returns 업로드된 미디어 파일 정보
 */
export async function uploadFile(
  file: File | Blob | ReactNativeFile,
  onProgress?: ProgressCallback,
): Promise<UploadedMedia> {
  try {
    // 인증 토큰 가져오기
    const { token } = await getSession();
    if (!token) {
      throw new UploadError("인증 토큰이 없습니다. 로그인이 필요합니다.", 401);
    }

    if (!file) {
      throw new UploadError("업로드할 파일이 없습니다.", 400);
    }

    // FormData 생성
    const formData = new FormData();

    if (isWeb() && (file instanceof File || file instanceof Blob)) {
      // 웹 환경: File/Blob 객체
      const fileName = file instanceof File ? file.name : `file_${Date.now()}`;
      formData.append("file", file, fileName);
    } else if (
      isReactNative() &&
      "uri" in file &&
      "name" in file &&
      "type" in file
    ) {
      // React Native 환경
      // @ts-ignore: React Native의 FormData는 객체를 직접 지원
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      });
    } else {
      throw new UploadError(`지원하지 않는 파일 형식: ${typeof file}`, 400);
    }

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
              xhr.responseText,
            ) as SingleUploadResponse;
            if (response.success) {
              console.log("단일 파일 업로드 성공:", response.data.id);
              resolve(response.data);
            } else {
              reject(
                new UploadError(
                  response.message || "업로드 실패",
                  xhr.status,
                  response,
                ),
              );
            }
          } catch (parseError) {
            reject(
              new UploadError(
                `응답 파싱 오류: ${parseError.message || "알 수 없는 오류"}`,
                xhr.status,
              ),
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
      xhr.open("POST", UPLOAD_SINGLE_ENDPOINT, true);

      // 헤더 설정
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  } catch (error) {
    console.error("단일 파일 업로드 오류:", error);
    throw error instanceof UploadError
      ? error
      : new UploadError(error.message || "알 수 없는 업로드 오류");
  }
}

/**
 * 단일 파일 업로드 (기존 upload.ts와의 호환성 함수)
 *
 * @param file 업로드할 파일
 * @returns 단일 파일 업로드 응답
 */
export async function uploadSingleFile(
  file: File | any,
): Promise<SingleUploadResponse> {
  const uploadedFile = await uploadFile(file);
  return {
    success: true,
    message: "파일 업로드에 성공했습니다.",
    data: uploadedFile,
    timestamp: new Date().toISOString(),
  };
}

// --------------------------
// React Hooks
// --------------------------

/**
 * 파일 업로드 및 진행률 추적을 위한 React 훅
 */
export function useUploadWithProgress() {
  return {
    uploadWithProgress: uploadFilesWithProgress,
    uploadFileWithProgress: uploadFile,
  };
}

/**
 * 파일 업로드를 위한 기본 React 훅
 */
export function useFileUpload() {
  return {
    uploadFiles,
    uploadFile,
    uploadSingleFile,
  };
}

/**
 * 기존 코드와의 호환성을 위한 별칭
 * @deprecated useFileUpload를 사용하세요
 */
export function useUploadFiles() {
  return {
    uploadFiles,
    loading: false,
    error: null,
  };
}

/**
 * 레거시 함수 (호환성 유지)
 * @deprecated uploadFiles 함수를 사용하세요
 */
export async function uploadImages(
  imageUris: string[],
): Promise<UploadedMedia[]> {
  const files = imageUris.map((uri, index) =>
    createReactNativeFile({ uri }, index),
  );
  return uploadFiles(files);
}
