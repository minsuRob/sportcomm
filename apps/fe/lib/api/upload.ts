import { Platform } from "react-native";
import { getSession } from "@/lib/auth";

/**
 * REST API 기본 URL 설정
 */
const API_BASE_URL = __DEV__
  ? Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : "http://localhost:3000"
  : "https://api.sportcomm.com";

/**
 * 파일 업로드 응답 타입 정의
 */
export interface UploadedFile {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  type: "IMAGE" | "VIDEO";
  status: "UPLOADING" | "COMPLETED" | "FAILED";
  thumbnailUrl?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    files: UploadedFile[];
    totalCount: number;
  };
  timestamp: string;
}

export interface SingleUploadResponse {
  success: boolean;
  message: string;
  data: UploadedFile;
  timestamp: string;
}

/**
 * 파일 업로드 에러 타입
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = "UploadError";
  }
}

/**
 * 여러 파일 업로드 함수
 * REST API를 통해 최대 4개의 파일을 업로드합니다.
 *
 * @param files 업로드할 파일들 (File 또는 React Native의 파일 객체)
 * @returns 업로드된 파일들의 정보
 */
export async function uploadFiles(
  files: File[] | any[]
): Promise<UploadResponse> {
  try {
    // 세션에서 토큰 가져오기
    const { token } = await getSession();

    if (!token) {
      throw new UploadError("인증 토큰이 없습니다. 로그인이 필요합니다.", 401);
    }

    // 파일 개수 검증
    if (!files || files.length === 0) {
      throw new UploadError("업로드할 파일이 없습니다.", 400);
    }

    if (files.length > 4) {
      throw new UploadError("최대 4개의 파일만 업로드할 수 있습니다.", 400);
    }

    // FormData 생성
    const formData = new FormData();

    files.forEach((file, index) => {
      // React Native와 웹 환경 모두 지원
      if (file.uri) {
        // React Native 파일 객체
        formData.append("files", {
          uri: file.uri,
          type: file.type || file.mimeType,
          name: file.name || file.fileName || `file_${index}`,
        } as any);
      } else {
        // 웹 File 객체
        formData.append("files", file);
      }
    });

    // REST API 호출
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Content-Type은 FormData 사용 시 자동 설정되므로 명시하지 않음
      },
      body: formData,
    });

    // 응답 처리
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new UploadError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const result: UploadResponse = await response.json();

    if (!result.success) {
      throw new UploadError(
        result.message || "파일 업로드에 실패했습니다.",
        500,
        result
      );
    }

    console.log("파일 업로드 성공:", result);
    return result;
  } catch (error) {
    console.error("파일 업로드 오류:", error);

    if (error instanceof UploadError) {
      throw error;
    }

    // 네트워크 오류 등 기타 오류 처리
    throw new UploadError(
      error.message || "파일 업로드 중 알 수 없는 오류가 발생했습니다.",
      500,
      error
    );
  }
}

/**
 * 단일 파일 업로드 함수
 * REST API를 통해 하나의 파일을 업로드합니다.
 *
 * @param file 업로드할 파일 (File 또는 React Native의 파일 객체)
 * @returns 업로드된 파일의 정보
 */
export async function uploadSingleFile(
  file: File | any
): Promise<SingleUploadResponse> {
  try {
    // 세션에서 토큰 가져오기
    const { token } = await getSession();

    if (!token) {
      throw new UploadError("인증 토큰이 없습니다. 로그인이 필요합니다.", 401);
    }

    if (!file) {
      throw new UploadError("업로드할 파일이 없습니다.", 400);
    }

    // FormData 생성
    const formData = new FormData();

    if (file.uri) {
      // React Native 파일 객체
      formData.append("file", {
        uri: file.uri,
        type: file.type || file.mimeType,
        name: file.name || file.fileName || "file",
      } as any);
    } else {
      // 웹 File 객체
      formData.append("file", file);
    }

    // REST API 호출
    const response = await fetch(`${API_BASE_URL}/api/upload/single`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    // 응답 처리
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new UploadError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const result: SingleUploadResponse = await response.json();

    if (!result.success) {
      throw new UploadError(
        result.message || "파일 업로드에 실패했습니다.",
        500,
        result
      );
    }

    console.log("단일 파일 업로드 성공:", result);
    return result;
  } catch (error) {
    console.error("단일 파일 업로드 오류:", error);

    if (error instanceof UploadError) {
      throw error;
    }

    throw new UploadError(
      error.message || "파일 업로드 중 알 수 없는 오류가 발생했습니다.",
      500,
      error
    );
  }
}

/**
 * 파일 업로드 진행률 콜백 타입
 */
export type UploadProgressCallback = (progress: {
  loaded: number;
  total: number;
  percentage: number;
}) => void;

/**
 * 진행률을 지원하는 파일 업로드 함수
 * XMLHttpRequest를 사용하여 업로드 진행률을 추적합니다.
 *
 * @param files 업로드할 파일들
 * @param onProgress 진행률 콜백 함수
 * @returns 업로드된 파일들의 정보
 */
export async function uploadFilesWithProgress(
  files: File[] | any[],
  onProgress?: UploadProgressCallback
): Promise<UploadResponse> {
  return new Promise(async (resolve, reject) => {
    try {
      // 세션에서 토큰 가져오기
      const { token } = await getSession();

      if (!token) {
        throw new UploadError(
          "인증 토큰이 없습니다. 로그인이 필요합니다.",
          401
        );
      }

      // 파일 개수 검증
      if (!files || files.length === 0) {
        throw new UploadError("업로드할 파일이 없습니다.", 400);
      }

      if (files.length > 4) {
        throw new UploadError("최대 4개의 파일만 업로드할 수 있습니다.", 400);
      }

      // FormData 생성
      const formData = new FormData();

      files.forEach((file, index) => {
        if (file.uri) {
          // React Native 파일 객체
          formData.append("files", {
            uri: file.uri,
            type: file.type || file.mimeType,
            name: file.name || file.fileName || `file_${index}`,
          } as any);
        } else {
          // 웹 File 객체
          formData.append("files", file);
        }
      });

      // XMLHttpRequest 사용하여 진행률 추적
      const xhr = new XMLHttpRequest();

      // 진행률 이벤트 리스너
      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage,
            });
          }
        });
      }

      // 완료 이벤트 리스너
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result: UploadResponse = JSON.parse(xhr.responseText);
            if (result.success) {
              console.log("진행률 추적 파일 업로드 성공:", result);
              resolve(result);
            } else {
              reject(
                new UploadError(
                  result.message || "파일 업로드에 실패했습니다.",
                  xhr.status,
                  result
                )
              );
            }
          } catch (parseError) {
            reject(new UploadError("응답 파싱 오류", xhr.status, parseError));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(
              new UploadError(
                errorData.message || `HTTP ${xhr.status}: ${xhr.statusText}`,
                xhr.status,
                errorData
              )
            );
          } catch {
            reject(
              new UploadError(
                `HTTP ${xhr.status}: ${xhr.statusText}`,
                xhr.status
              )
            );
          }
        }
      });

      // 에러 이벤트 리스너
      xhr.addEventListener("error", () => {
        reject(new UploadError("네트워크 오류가 발생했습니다.", 0));
      });

      // 요청 설정 및 전송
      xhr.open("POST", `${API_BASE_URL}/api/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    } catch (error) {
      console.error("진행률 추적 파일 업로드 오류:", error);
      reject(
        error instanceof UploadError
          ? error
          : new UploadError(error.message, 500, error)
      );
    }
  });
}
