/**
 * 통합 파일 업로드 유틸리티
 *
 * 이 모듈은 REST API를 통해 파일을 업로드하는 기능을 제공합니다.
 * 웹과 React Native 환경 모두에서 작동하며 진행률 추적 기능을 포함합니다.
 * 파일 업로드 후 GraphQL을 통한 메타데이터 처리를 위한 함수들도 포함합니다.
 * upload.ts, restUpload.ts, media.ts, uploadAdapter.ts, hybridUploadLink.ts, reactNativeUploadLink.js, postWithUpload.ts의 모든 기능을 통합했습니다.
 *
 * 이 파일은 SportComm 앱의 모든 파일 업로드 관련 기능을 담당합니다.
 * 다른 파일 업로드 관련 모듈을 사용하지 말고 이 모듈만 사용하세요.
 */

import { Platform } from "react-native";
import { getSession } from "@/lib/auth";
import {
  isWeb,
  isReactNative,
  getPlatformType,
  logPlatformInfo,
} from "@/lib/platform";
import { ReactNativeFile } from "apollo-upload-client";
import { ApolloLink, Observable, gql } from "@apollo/client";
import { print } from "graphql";
import { extractFiles } from "extract-files";
import { client } from "./client";

// --------------------------
// 모듈 설명
// --------------------------
/**
 * 이 모듈은 다음 기능을 제공합니다:
 * 1. 파일 업로드 기본 함수 (uploadFiles, uploadFile)
 * 2. 진행률 추적 지원 함수 (uploadFilesWithProgress)
 * 3. React 훅 인터페이스 (useFileUpload, useUploadWithProgress)
 * 4. 파일 형식 변환 유틸리티 (createReactNativeFile, adaptFile)
 * 5. 게시물 생성 관련 함수 (createPostWithFiles, createPostWithSingleFile, createTextOnlyPost)
 * 6. Apollo 클라이언트용 하이브리드 업로드 링크 (createHybridUploadLink)
 * 7. 웹 환경에서 파일 선택기 유틸리티 (createWebFileSelector)
 */

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

// GraphQL API 엔드포인트
const GRAPHQL_ENDPOINT = __DEV__
  ? Platform.OS === "android"
    ? "http://10.0.2.2:3000/graphql" // Android 에뮬레이터용
    : "http://localhost:3000/graphql" // iOS 에뮬레이터와 웹용
  : "https://api.sportcomm.com/graphql"; // 프로덕션 URL

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
  // 타입 안전하게 entries 메서드 체크
  const hasEntries =
    "entries" in formData && typeof (formData as any).entries === "function";
  if (hasEntries) {
    try {
      // entries 메서드를 사용하여 FormData 내용 순회
      const entries = Array.from((formData as any).entries());
      for (const pair of entries) {
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
        // 중요: 'files'는 서버의 FilesInterceptor('files')와 필드명이 일치해야 함
        formData.append("files", file, fileName);
        console.log(
          `웹 환경 - 파일 추가 완료: ${fileName}, 크기: ${file.size}바이트, 타입: ${file.type || "알 수 없음"}`,
        );
      } else if (
        isReactNative() &&
        "uri" in file &&
        "name" in file &&
        "type" in file
      ) {
        // React Native 환경: uri, name, type 객체
        // iOS에서는 file://로 시작하는 로컬 파일 경로만 사용 가능
        const uri = file.uri.startsWith("file://")
          ? file.uri
          : `file://${file.uri.replace(/^\//, "")}`;

        // 파일 이름 강제 지정 (확장자 포함)
        // 확장자를 파일 타입에서 추출하거나 기본값으로 jpg 사용
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

        const fileObj = {
          uri: uri,
          name: fileName,
          type: file.type || "image/jpeg",
        };

        console.log(
          `React Native 환경 - 파일 추가: ${JSON.stringify(fileObj)}`,
        );

        // 테스트: 각 플랫폼에 맞는 방식으로 파일 추가
        if (Platform.OS === "ios") {
          // iOS에서는 객체 형식으로 추가
          // @ts-ignore: iOS의 FormData는 객체 형식 지원
          formData.append("files", fileObj);
          console.log(
            `iOS - 파일 추가: ${fileName}, URI: ${uri.substring(0, 30)}...`,
          );
        } else if (Platform.OS === "android") {
          // Android에서는 URI로부터 파일 생성 시도
          // @ts-ignore: Android에서는 객체 형식 사용
          formData.append("files", fileObj);
          console.log(
            `Android - 파일 추가: ${fileName}, URI: ${uri.substring(0, 30)}...`,
          );
        } else {
          // 웹 또는 기타 환경에서 테스트할 경우
          console.warn("웹 환경에서 테스트 중 - 더미 이미지로 대체합니다");
          const dummyFile = new File(["dummy image content"], fileName, {
            type: file.type || "image/jpeg",
          });
          formData.append("files", dummyFile);
          console.log(
            `웹(테스트) - 더미 파일 추가: ${fileName}, 타입: ${dummyFile.type}`,
          );
        }
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

      // 인증 헤더 설정
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      // React Native에서 필요한 추가 헤더 설정
      if (isReactNative()) {
        xhr.setRequestHeader("Accept", "application/json");
        // Content-Type은 FormData가 자동으로 설정하므로 수동으로 설정하지 않음
        console.log("React Native 환경 - FormData 전송 준비 완료");

        // 단, React Native의 일부 버전에서는 올바르게 설정되지 않을 수 있음
      }

      // 업로드 디버깅을 위해 요청 헤더 확인
      console.log("업로드 요청 헤더:", {
        contentType: "multipart/form-data (자동 설정)",
        accept: "application/json",
        authorization: token ? "Bearer 토큰 설정됨" : "설정되지 않음",
      });

      // 요청 전 마지막 확인
      console.log("FormData 전송 직전 - Content-Type 헤더:", "자동 설정됨");

      // FormData 디버깅
      console.log(`FormData 전송 직전 내용 확인:`);
      if (isWeb()) {
        try {
          // 웹 환경에서만 작동
          if (typeof formData.getAll === "function") {
            const files = formData.getAll("files");
            console.log(`- files 필드: ${files.length}개 항목`);
            files.forEach((file: any, idx: number) => {
              console.log(
                `- files[${idx}] 타입: ${typeof file}, 이름: ${file.name || "N/A"}`,
              );
            });
          } else {
            console.log("- FormData.getAll 메서드를 사용할 수 없음");
          }
        } catch (e) {
          console.log("FormData 검사 중 오류:", e);
        }
      } else {
        console.log("- React Native 환경: FormData 내용 검사 불가");
        // React Native 환경에서 디버깅
        if (isReactNative()) {
          console.log(
            "React Native FormData 구조:",
            Object.getOwnPropertyNames(formData).filter((p) => p !== "__parts"),
          );
        }
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

// --------------------------
// 유틸리티 함수 (이전 media.ts, uploadAdapter.ts에서 통합)
// --------------------------

/**
 * 이미지 URI를 ReactNativeFile 객체로 변환
 * @param uri 이미지 URI
 * @param index 인덱스 (파일명 생성 시 사용)
 * @returns ReactNativeFile 객체
 * @deprecated createReactNativeFile 사용 권장
 */
export function uriToReactNativeFile(
  uri: string,
  index: number = 0,
): ReactNativeFile {
  return createReactNativeFile({ uri }, index);
}

/**
 * 여러 이미지 URI를 ReactNativeFile 객체 배열로 변환
 * @param uris 이미지 URI 배열
 * @returns ReactNativeFile 객체 배열
 */
export function urisToReactNativeFiles(uris: string[]): ReactNativeFile[] {
  return uris.map((uri, index) => createReactNativeFile({ uri }, index));
}

/**
 * 파일 선택 및 업로드를 위한 훅
 * @deprecated useFileUpload 사용 권장
 */
export function useUploadFile() {
  return {
    uploadFile,
    loading: false,
    error: null,
  };
}

// uploadAdapter.ts에서 가져온 유틸리티 함수들

// --------------------------
// 파일 변환 및 FormData 유틸리티 (이전 uploadAdapter.ts에서 통합)
// --------------------------

/**
 * 파일 타입 정의
 * 웹과 React Native 환경에서 사용되는 파일 타입을 통합적으로 관리
 */
export type UploadableFile =
  | File
  | Blob
  | ReactNativeFile
  | {
      uri: string;
      name: string;
      type: string;
    };

/**
 * 파일 URI/객체를 적절한 업로드 가능한 형식으로 변환
 * @param fileOrUri 파일 객체 또는 URI 문자열
 * @param options 추가 옵션
 * @returns 업로드 가능한 파일 객체
 */
export async function adaptFile(
  fileOrUri: File | Blob | string | { uri: string },
  options?: { fileName?: string; mimeType?: string },
): Promise<UploadableFile> {
  try {
    // 웹 환경 처리
    if (isWeb()) {
      // 이미 File 객체인 경우
      if (fileOrUri instanceof File) {
        return fileOrUri;
      }

      // Blob인 경우 File로 변환
      if (fileOrUri instanceof Blob) {
        const fileName = options?.fileName || `file_${Date.now()}`;
        return new File([fileOrUri], fileName, {
          type:
            options?.mimeType || fileOrUri.type || "application/octet-stream",
        });
      }

      // 문자열 URI인 경우
      if (typeof fileOrUri === "string") {
        // data: URI (base64)인 경우
        if (fileOrUri.startsWith("data:")) {
          const response = await fetch(fileOrUri);
          const blob = await response.blob();
          const mimeMatch = fileOrUri.match(/^data:([^;]+);/);
          const mimeType = mimeMatch
            ? mimeMatch[1]
            : "application/octet-stream";
          const extension = mimeType.split("/")[1] || "bin";
          const fileName =
            options?.fileName || `file_${Date.now()}.${extension}`;

          return new File([blob], fileName, { type: mimeType });
        }

        // http(s): 또는 blob: URI인 경우
        if (fileOrUri.startsWith("http") || fileOrUri.startsWith("blob:")) {
          const response = await fetch(fileOrUri);
          const blob = await response.blob();
          const urlParts = fileOrUri.split("/");
          const fileName =
            options?.fileName ||
            urlParts[urlParts.length - 1] ||
            `file_${Date.now()}`;

          return new File([blob], fileName, {
            type: options?.mimeType || blob.type || "application/octet-stream",
          });
        }
      }

      // URI 객체인 경우
      if (typeof fileOrUri === "object" && "uri" in fileOrUri) {
        const uri = fileOrUri.uri;
        if (typeof uri === "string") {
          return await adaptFile(uri, options);
        }
      }

      throw new Error("지원하지 않는 파일 형식");
    }

    // React Native 환경 처리
    if (isReactNative()) {
      // 이미 ReactNativeFile인 경우
      if (
        typeof fileOrUri === "object" &&
        "uri" in fileOrUri &&
        "name" in fileOrUri &&
        "type" in fileOrUri
      ) {
        return fileOrUri as ReactNativeFile;
      }

      // 문자열 URI인 경우
      if (typeof fileOrUri === "string") {
        const uri = fileOrUri;
        const uriParts = uri.split("/");
        const fileName =
          options?.fileName ||
          uriParts[uriParts.length - 1] ||
          `file_${Date.now()}`;

        // MIME 타입 결정
        let mimeType = options?.mimeType || "application/octet-stream";
        const extension = fileName.split(".").pop()?.toLowerCase();

        if (extension && !options?.mimeType) {
          if (["jpg", "jpeg"].includes(extension)) mimeType = "image/jpeg";
          else if (extension === "png") mimeType = "image/png";
          else if (extension === "gif") mimeType = "image/gif";
          else if (extension === "webp") mimeType = "image/webp";
          else if (extension === "pdf") mimeType = "application/pdf";
        }

        return new ReactNativeFile({
          uri,
          name: fileName,
          type: mimeType,
        });
      }

      // URI 객체인 경우
      if (typeof fileOrUri === "object" && "uri" in fileOrUri) {
        const uri = fileOrUri.uri;
        if (typeof uri === "string") {
          return await adaptFile(uri, options);
        }
      }

      throw new Error("지원하지 않는 파일 형식");
    }

    // 지원하지 않는 환경
    throw new Error("지원하지 않는 환경");
  } catch (error) {
    console.error("파일 형식 변환 실패:", error);
    throw error;
  }
}

/**
 * 여러 파일을 업로드 가능한 형식으로 변환
 * @param filesOrUris 파일 객체 또는 URI 문자열 배열
 * @returns 업로드 가능한 파일 객체 배열
 */
export async function adaptFiles(
  filesOrUris: Array<File | Blob | string | { uri: string }>,
  options?: { fileNames?: string[]; mimeTypes?: string[] },
): Promise<UploadableFile[]> {
  const adaptedFiles = await Promise.all(
    filesOrUris.map((fileOrUri, index) =>
      adaptFile(fileOrUri, {
        fileName: options?.fileNames?.[index],
        mimeType: options?.mimeTypes?.[index],
      }),
    ),
  );

  return adaptedFiles;
}

/**
 * GraphQL 변수에서 파일을 추출하여 FormData로 변환
 * (Apollo Upload 스펙에 맞게 구성)
 * @param operations GraphQL 작업 (쿼리, 변수 등)
 * @param files 파일 객체 목록
 * @returns FormData 객체
 */
export function createUploadFormData(
  operations: {
    query: string;
    variables: any;
    operationName?: string;
    extensions?: any;
  },
  filesMap: { [path: string]: UploadableFile },
): FormData {
  // FormData 생성
  const formData = new FormData();

  // operations 추가 (GraphQL 작업 정보)
  formData.append("operations", JSON.stringify(operations));

  // map 객체 생성 (파일 경로 매핑)
  const map: { [key: string]: string[] } = {};
  let i = 0;

  // 파일 경로 매핑
  for (const [path, file] of Object.entries(filesMap)) {
    map[i.toString()] = [path];
    i++;
  }

  // map 추가
  formData.append("map", JSON.stringify(map));

  // 파일 추가
  i = 0;
  for (const file of Object.values(filesMap)) {
    formData.append(i.toString(), file);
    i++;
  }

  return formData;
}

/**
 * 웹 환경에서 input 요소로부터 파일 선택 처리
 * @returns 선택된 파일 목록을 처리하는 함수
 */
export function createWebFileSelector(): () => Promise<File[]> {
  return () => {
    return new Promise((resolve, reject) => {
      // 웹 환경인지 확인
      if (!isWeb()) {
        reject(new Error("웹 환경에서만 사용 가능합니다"));
        return;
      }

      // --------------------------
      // 끝
      // --------------------------

      // 파일 선택 input 생성
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = "image/*";

      // 파일 선택 이벤트 처리
      input.onchange = (event) => {
        const files = Array.from(
          (event.target as HTMLInputElement).files || [],
        );
        resolve(files);
      };

      // 취소 처리
      input.oncancel = () => {
        resolve([]);
      };

      // 에러 처리
      input.onerror = (error) => {
        reject(error);
      };

      // 클릭하여 파일 선택 다이얼로그 표시
      input.click();
    });
  };
}

// --------------------------
// 게시물 생성 관련 기능
// --------------------------

/**
 * 게시물 생성 GraphQL 뮤테이션
 */
const CREATE_POST_MUTATION = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
      type
      isPublic
      author {
        id
        nickname
        profileImageUrl
      }
      media {
        id
        url
        originalName
        type
        thumbnailUrl
      }
      likeCount
      commentCount
      shareCount
      viewCount
      createdAt
      updatedAt
    }
  }
`;

/**
 * 게시물 생성 입력 타입
 */
export interface CreatePostInput {
  title: string;
  content: string;
  type: "ANALYSIS" | "CHEERING" | "HIGHLIGHT";
  isPublic?: boolean;
  mediaIds?: string[];
}

/**
 * 파일과 함께 게시물 생성 입력 타입
 */
export interface CreatePostWithFilesInput {
  title: string;
  content: string;
  type: "ANALYSIS" | "CHEERING" | "HIGHLIGHT";
  isPublic?: boolean;
  files?: File[] | any[]; // 웹 File 객체 또는 React Native 파일 객체
  onProgress?: (progress: UploadProgress) => void; // 업로드 진행률 콜백
}

/**
 * 게시물 생성 응답 타입
 */
export interface CreatePostResponse {
  id: string;
  title: string;
  content: string;
  type: string;
  isPublic: boolean;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  media: Array<{
    id: string;
    url: string;
    originalName: string;
    type: string;
    thumbnailUrl?: string;
  }>;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 통합 에러 타입
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

/**
 * 파일 업로드와 게시물 생성을 통합한 함수
 *
 * 1. 파일이 있으면 먼저 REST API로 업로드
 * 2. 업로드된 파일 ID들을 사용하여 GraphQL로 게시물 생성
 *
 * @param input 게시물 생성 입력 데이터
 * @returns 생성된 게시물 정보
 */
export async function createPostWithFiles(
  input: CreatePostWithFilesInput,
): Promise<CreatePostResponse> {
  try {
    let mediaIds: string[] = [];

    // 1단계: 파일 업로드 (파일이 있는 경우)
    if (input.files && input.files.length > 0) {
      console.log(`${input.files.length}개의 파일 업로드 시작...`);

      // 진행 상황 콜백 함수가 input에 있는 경우 사용
      const progressCallback = (input as any).onProgress as
        | ((progress: UploadProgress) => void)
        | undefined;

      try {
        const uploadedFiles = await uploadFilesWithProgress(
          input.files,
          progressCallback,
        );
        mediaIds = uploadedFiles.map((file) => file.id);

        console.log("파일 업로드 완료:", {
          uploadedCount: uploadedFiles.length,
          mediaIds,
        });
      } catch (uploadError) {
        console.error("파일 업로드 실패:", uploadError);

        if (uploadError instanceof UploadError) {
          throw new PostCreationError(
            `파일 업로드 실패: ${uploadError.message}`,
            "upload",
            uploadError,
          );
        }

        throw new PostCreationError(
          "파일 업로드 중 알 수 없는 오류가 발생했습니다.",
          "upload",
          uploadError,
        );
      }
    }

    // 2단계: GraphQL로 게시물 생성
    console.log("게시물 생성 시작...", {
      title: input.title,
      type: input.type,
      mediaIds,
    });

    try {
      const postInput: CreatePostInput = {
        title: input.title,
        content: input.content,
        type: input.type,
        isPublic: input.isPublic ?? true,
        mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      };

      const result = await client.mutate({
        mutation: CREATE_POST_MUTATION,
        variables: { input: postInput },
        // 캐시 업데이트를 위해 관련 쿼리들을 다시 가져오기
        refetchQueries: ["GetPosts", "GetMyPosts"],
        awaitRefetchQueries: true,
      });

      if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(", "));
      }

      const createdPost = result.data?.createPost;
      if (!createdPost) {
        throw new Error("게시물 생성 응답이 비어있습니다.");
      }

      console.log("게시물 생성 완료:", {
        postId: createdPost.id,
        title: createdPost.title,
        mediaCount: createdPost.media?.length || 0,
      });

      return createdPost;
    } catch (postError) {
      console.error("게시물 생성 실패:", postError);

      throw new PostCreationError(
        `게시물 생성 실패: ${postError.message}`,
        "post_creation",
        postError,
      );
    }
  } catch (error) {
    console.error("게시물 생성 프로세스 전체 실패:", error);

    if (error instanceof PostCreationError) {
      throw error;
    }

    throw new PostCreationError(
      "게시물 생성 중 알 수 없는 오류가 발생했습니다.",
      "post_creation",
      error,
    );
  }
}

/**
 * 단일 파일과 함께 게시물 생성하는 함수
 *
 * @param input 게시물 생성 입력 데이터 (단일 파일)
 * @param file 업로드할 단일 파일
 * @returns 생성된 게시물 정보
 */
export async function createPostWithSingleFile(
  input: Omit<CreatePostWithFilesInput, "files">,
  file: File | any,
): Promise<CreatePostResponse> {
  try {
    let mediaIds: string[] = [];

    // 1단계: 단일 파일 업로드
    console.log("단일 파일 업로드 시작...");

    // 진행 상황 콜백 함수가 input에 있는 경우 사용
    const progressCallback = (input as any).onProgress as
      | ((progress: UploadProgress) => void)
      | undefined;

    try {
      const uploadedFiles = await uploadFilesWithProgress(
        [file],
        progressCallback,
      );
      if (uploadedFiles.length > 0) {
        mediaIds = [uploadedFiles[0].id];
      }

      console.log("단일 파일 업로드 완료:", {
        mediaId: uploadedFiles[0]?.id,
        originalName: uploadedFiles[0]?.originalName,
      });
    } catch (uploadError) {
      console.error("단일 파일 업로드 실패:", uploadError);

      if (uploadError instanceof UploadError) {
        throw new PostCreationError(
          `파일 업로드 실패: ${uploadError.message}`,
          "upload",
          uploadError,
        );
      }

      throw new PostCreationError(
        "파일 업로드 중 알 수 없는 오류가 발생했습니다.",
        "upload",
        uploadError,
      );
    }

    // 2단계: GraphQL로 게시물 생성
    console.log("게시물 생성 시작...", {
      title: input.title,
      type: input.type,
      mediaIds,
    });

    try {
      const postInput: CreatePostInput = {
        title: input.title,
        content: input.content,
        type: input.type,
        isPublic: input.isPublic ?? true,
        mediaIds,
      };

      const result = await client.mutate({
        mutation: CREATE_POST_MUTATION,
        variables: { input: postInput },
        refetchQueries: ["GetPosts", "GetMyPosts"],
        awaitRefetchQueries: true,
      });

      if (result.errors) {
        throw new Error(result.errors.map((e) => e.message).join(", "));
      }

      const createdPost = result.data?.createPost;
      if (!createdPost) {
        throw new Error("게시물 생성 응답이 비어있습니다.");
      }

      console.log("단일 파일 게시물 생성 완료:", {
        postId: createdPost.id,
        title: createdPost.title,
        mediaCount: createdPost.media?.length || 0,
      });

      return createdPost;
    } catch (postError) {
      console.error("게시물 생성 실패:", postError);

      throw new PostCreationError(
        `게시물 생성 실패: ${postError.message}`,
        "post_creation",
        postError,
      );
    }
  } catch (error) {
    console.error("단일 파일 게시물 생성 프로세스 전체 실패:", error);

    if (error instanceof PostCreationError) {
      throw error;
    }

    throw new PostCreationError(
      "게시물 생성 중 알 수 없는 오류가 발생했습니다.",
      "post_creation",
      error,
    );
  }
}

/**
 * 파일 없이 텍스트만으로 게시물 생성하는 함수
 *
 * @param input 게시물 생성 입력 데이터
 * @returns 생성된 게시물 정보
 */
export async function createTextOnlyPost(
  input: Omit<CreatePostWithFilesInput, "files">,
): Promise<CreatePostResponse> {
  try {
    console.log("텍스트 전용 게시물 생성 시작...", {
      title: input.title,
      type: input.type,
    });

    const postInput: CreatePostInput = {
      title: input.title,
      content: input.content,
      type: input.type,
      isPublic: input.isPublic ?? true,
    };

    const result = await client.mutate({
      mutation: CREATE_POST_MUTATION,
      variables: { input: postInput },
      refetchQueries: ["GetPosts", "GetMyPosts"],
      awaitRefetchQueries: true,
    });

    if (result.errors) {
      throw new Error(result.errors.map((e) => e.message).join(", "));
    }

    const createdPost = result.data?.createPost;
    if (!createdPost) {
      throw new Error("게시물 생성 응답이 비어있습니다.");
    }

    console.log("텍스트 전용 게시물 생성 완료:", {
      postId: createdPost.id,
      title: createdPost.title,
    });

    return createdPost;
  } catch (error) {
    console.error("텍스트 전용 게시물 생성 실패:", error);

    throw new PostCreationError(
      `게시물 생성 실패: ${error.message}`,
      "post_creation",
      error,
    );
  }
}

/**
 * 하이브리드 업로드 링크 생성 함수
 * 웹과 React Native 환경 모두를 지원하는 Apollo 업로드 링크를 생성합니다.
 *
 * @param options 링크 생성 옵션
 * @returns Apollo 링크 인스턴스
 */
export const createHybridUploadLink = ({
  uri,
  headers = {},
  credentials,
  includeExtensions = false,
  ...requestOptions
}: {
  uri: string | ((operation: any) => string);
  headers?: Record<string, string>;
  credentials?: string;
  includeExtensions?: boolean;
  debug?: boolean;
  [key: string]: any;
}) => {
  // 디버그 옵션이 있으면 사용하고, 없으면 기본값 false 적용
  const debug =
    typeof requestOptions.debug === "boolean" ? requestOptions.debug : false;

  // requestOptions에서 debug 속성 제거 (표준 fetch 옵션이 아니므로)
  if ("debug" in requestOptions) {
    delete requestOptions.debug;
  }

  return new ApolloLink((operation) => {
    return new Observable((observer) => {
      (async () => {
        try {
          // 인증 토큰 가져오기
          const { token } = await getSession();
          const authHeaders = token ? { authorization: `Bearer ${token}` } : {};

          // 운영 컨텍스트에서 추가 헤더 가져오기
          const contextHeaders = operation.getContext().headers || {};

          // 요청 헤더 통합
          const requestHeaders = {
            ...headers,
            ...authHeaders,
            ...contextHeaders,
            "Apollo-Require-Preflight": "true", // CORS 프리플라이트 요청 방지
          };

          // 쿼리 정보 추출
          const { variables, operationName, query } = operation;
          const queryString = print(query);

          // 파일 추출
          const { clone, files } = extractFiles(variables, "", isUploadable);

          // 실행 환경에 맞는 endpoint URI 결정
          const endpoint = typeof uri === "function" ? uri(operation) : uri;

          // 파일이 없으면 일반 JSON 요청으로 처리
          if (files.size === 0) {
            const options = {
              method: "POST",
              headers: {
                ...requestHeaders,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: queryString,
                variables: clone,
                operationName,
                extensions: includeExtensions
                  ? operation.extensions
                  : undefined,
              }),
              credentials: credentials as RequestCredentials,
              ...requestOptions,
            };

            const response = await fetch(endpoint, options);
            const result = await response.json();

            if (result.errors) {
              observer.next(result);
              observer.error(new Error(JSON.stringify(result.errors)));
            } else {
              observer.next(result);
              observer.complete();
            }
            return;
          }

          // 파일이 있으면 multipart/form-data로 요청
          const form = new FormData();

          // GraphQL 쿼리, 변수, 오퍼레이션 이름을 FormData에 추가
          // Apollo Server는 'operations'라는 필드에 GraphQL 작업을 기대합니다
          form.append(
            "operations",
            JSON.stringify({
              query: queryString,
              variables: clone,
              operationName,
              extensions: includeExtensions ? operation.extensions : undefined,
            }),
          );

          // 파일 맵핑 정보 생성 (Apollo Upload 스펙)
          // 각 파일은 변수 경로에 매핑되어야 합니다
          const map = {};
          let i = 0;
          files.forEach((paths, file) => {
            map[i] = paths;
            i++;
          });

          // map 객체를 JSON 문자열로 변환하여 'map' 필드에 추가
          form.append("map", JSON.stringify(map));

          // 파일 추가 (플랫폼별 처리)
          i = 0;
          files.forEach((paths, file) => {
            try {
              if (isWeb()) {
                // 웹 환경: File/Blob 객체 그대로 사용
                // 파일 객체는 '0', '1', '2'와 같은 문자열 키로 전송되어야 함
                if (file instanceof File || file instanceof Blob) {
                  form.append(i.toString(), file);
                } else {
                  console.error("웹 환경에서 유효한 File 객체가 아님:", file);
                  throw new Error("웹 환경에서 유효한 File 객체가 아닙니다");
                }
              } else if (isReactNative()) {
                // React Native 환경: 특수한 형태로 파일 정보 추가
                // TypeScript 타입 오류를 방지하기 위해 타입 단언 사용
                form.append(i.toString(), {
                  uri: file.uri,
                  name: file.name,
                  type: file.type,
                } as unknown as Blob);
              }
              i++;
            } catch (fileError) {
              console.error(`파일 ${i} 추가 중 오류 발생:`, fileError);
            }
          });

          // 헤더 설정 (Content-Type은 FormData에서 자동 생성되므로 명시하지 않음)
          const uploadOptions = {
            method: "POST",
            headers: {
              ...requestHeaders,
              // FormData를 사용할 때는 Content-Type을 명시하지 않음
              // 브라우저가 자동으로 boundary와 함께 추가함
              // Apollo Upload 클라이언트 호환성을 위해 확실히 제거
              "Content-Type": undefined,
            },
            body: form,
            credentials: credentials as RequestCredentials,
            ...requestOptions,
          };

          // 디버그 모드일 때만 로깅
          if (debug) {
            console.log("[Apollo Upload Link] 파일 업로드 요청:", {
              endpoint,
              filesCount: files.size,
              operation: operationName,
              variables: clone,
              formDataEntries: Array.from(files.keys()).map((key) => ({
                key,
                type: files.get(key)?.type || "unknown",
              })),
            });

            // FormData 내용 로깅 (디버깅용)
            console.log("FormData 내용:");
            // React Native에서는 entries 함수가 없을 수 있으므로 타입 체크
            if (isWeb()) {
              try {
                // 웹 환경에서만 entries 메서드 사용 가능
                const hasEntries =
                  "entries" in form &&
                  typeof (form as any).entries === "function";
                if (hasEntries) {
                  const entries = Array.from((form as any).entries());
                  for (const pair of entries) {
                    console.log(
                      `- ${pair[0]}: ${
                        pair[1] instanceof File
                          ? `File(${pair[1].name}, ${pair[1].type}, ${pair[1].size} bytes)`
                          : pair[1]
                      }`,
                    );
                  }
                } else {
                  console.log("FormData entries 메서드를 사용할 수 없습니다.");
                }
              } catch (e) {
                console.log("FormData entries 접근 오류:", e);
              }
            }
          }

          try {
            if (debug) {
              console.log("업로드 요청 옵션:", {
                method: uploadOptions.method,
                headers: uploadOptions.headers,
                hasBody: !!uploadOptions.body,
              });
            }

            const response = await fetch(endpoint, uploadOptions);

            // 응답 상태 확인
            if (!response.ok) {
              const errorText = await response.text();
              console.error("서버 응답 에러:", errorText);
              throw new Error(
                `${response.status} ${response.statusText}: ${errorText}`,
              );
            }

            const result = await response.json();

            // GraphQL 결과 처리
            if (result.errors) {
              observer.next(result);
              observer.error(new Error(JSON.stringify(result.errors)));
            } else {
              observer.next(result);
              observer.complete();
            }
          } catch (fetchError) {
            console.error(`[Apollo 업로드 링크 에러]: ${fetchError.message}`);
            if (debug) {
              console.error("[Apollo Upload Link] 요청 실패:", fetchError);
            }
            observer.error(fetchError);
          }
        } catch (error) {
          console.error("[업로드 링크 에러]:", error);
          observer.error(error);
        }
      })();

      // 구독 해제 핸들러 반환
      return () => {};
    });
  });
};

// 파일 타입 체커 - 웹의 File/Blob 객체 또는 React Native의 파일 객체인지 확인
export const isUploadable = (value: any): boolean => {
  if (value === null || typeof value !== "object") return false;

  // 웹 환경: File 또는 Blob 객체 확인
  if (isWeb()) {
    return (
      (typeof File !== "undefined" && value instanceof File) ||
      (typeof Blob !== "undefined" && value instanceof Blob)
    );
  }

  // React Native 환경: uri, name, type을 가진 객체 확인
  if (isReactNative()) {
    return (
      typeof value.uri === "string" &&
      typeof value.name === "string" &&
      typeof value.type === "string"
    );
  }

  return false;
};

/**
 * React Native 환경에서 GraphQL 파일 업로드를 지원하는 Apollo 링크 생성
 */
export const createReactNativeUploadLink = ({
  uri,
  headers = {},
  credentials,
  includeExtensions = false,
  ...requestOptions
}: {
  uri: string | ((operation: any) => string);
  headers?: Record<string, string>;
  credentials?: string;
  includeExtensions?: boolean;
  [key: string]: any;
}) => {
  return new ApolloLink((operation) => {
    return new Observable((observer) => {
      (async () => {
        try {
          // 인증 토큰 가져오기
          const { token } = await getSession();
          if (token) {
            operation.setContext({
              headers: {
                authorization: `Bearer ${token}`,
              },
            });
          }

          // 쿼리 정보 추출
          const { variables, operationName, query } = operation;
          const queryString = print(query);

          // 파일 추출
          const { clone, files } = extractFiles(variables, "", (value) => {
            return (
              value !== null &&
              typeof value === "object" &&
              typeof value.uri === "string" &&
              typeof value.name === "string" &&
              typeof value.type === "string"
            );
          });

          // 실행 환경에 맞는 endpoint URI 결정
          const endpoint = typeof uri === "function" ? uri(operation) : uri;

          // 파일이 없으면 일반 JSON 요청으로 처리
          if (files.size === 0) {
            // 운영 컨텍스트에서 인증 헤더 가져오기
            const contextHeaders = operation.getContext().headers || {};

            const options = {
              method: "POST",
              headers: {
                ...headers,
                ...contextHeaders, // 컨텍스트 헤더 포함 (인증 토큰 포함)
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: queryString,
                variables: clone,
                operationName,
                extensions: includeExtensions
                  ? operation.extensions
                  : undefined,
              }),
              credentials: credentials as RequestCredentials,
              ...requestOptions,
            };

            const response = await fetch(endpoint, options);
            const result = await response.json();

            if (result.errors) {
              observer.next(result);
              observer.error(new Error(JSON.stringify(result.errors)));
            } else {
              observer.next(result);
              observer.complete();
            }
            return;
          }

          // 파일이 있으면 multipart/form-data로 요청
          const form = new FormData();

          // GraphQL 쿼리, 변수, 오퍼레이션 이름을 FormData에 추가
          form.append(
            "operations",
            JSON.stringify({
              query: queryString,
              variables: clone,
              operationName,
              extensions: includeExtensions ? operation.extensions : undefined,
            }),
          );

          // 파일 맵핑 정보 생성
          const map = {};
          let i = 0;
          files.forEach((paths, file) => {
            map[i] = paths;
            i++;
          });

          form.append("map", JSON.stringify(map));

          // 파일 추가
          i = 0;
          files.forEach((paths, file) => {
            // React Native의 파일 객체 구조에 맞게 처리
            if (file.uri && file.name && file.type) {
              // React Native에서는 이 형식으로 동작함
              // TypeScript 오류 방지를 위해 타입 단언 사용
              form.append(i.toString(), {
                uri: file.uri,
                name: file.name,
                type: file.type,
              } as unknown as Blob);
            }
            i++;
          });

          // 운영 컨텍스트에서 인증 헤더 가져오기
          const contextHeaders = operation.getContext().headers || {};

          const uploadOptions = {
            method: "POST",
            headers: {
              ...headers,
              ...contextHeaders, // 컨텍스트 헤더 포함 (인증 토큰 포함)
              // multipart/form-data는 헤더에서 Content-Type을 명시하지 않음
              // React Native가 자동으로 boundary를 설정
              "Apollo-Require-Preflight": "true", // CORS 프리플라이트 요청 방지
            },
            body: form,
            credentials: credentials as RequestCredentials,
            ...requestOptions,
          };

          try {
            const response = await fetch(endpoint, uploadOptions);

            // 응답 상태 확인
            if (!response.ok) {
              const errorText = await response.text();
              console.error("서버 응답 에러:", errorText);
              throw new Error(
                `${response.status} ${response.statusText}: ${errorText}`,
              );
            }

            const result = await response.json();

            // GraphQL 결과 처리
            if (result.errors) {
              observer.next(result);
              observer.error(new Error(JSON.stringify(result.errors)));
            } else {
              observer.next(result);
              observer.complete();
            }
          } catch (fetchError) {
            console.error(`[Apollo 업로드 링크 에러]: ${fetchError.message}`);
            observer.error(fetchError);
          }
        } catch (error) {
          console.error("[인증 에러]:", error);
          observer.error(error);
        }
      })();

      // 구독 해제 핸들러 반환
      return () => {};
    });
  });
};
