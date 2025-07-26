/**
 * 웹 환경 전용 파일 업로드 유틸리티
 *
 * 웹 브라우저 환경에서의 파일 업로드 기능을 제공합니다.
 */

import { getSession } from "@/lib/auth";
import { isWeb } from "@/lib/platform";
import {
  UploadProgress,
  ProgressCallback,
  UploadedMedia,
  UploadError,
  getUploadEndpoints,
  debugFormData,
} from "./common";

// --------------------------
// 웹 전용 타입 정의
// --------------------------

export interface WebUploadResponse {
  success: boolean;
  message: string;
  data: {
    files: UploadedMedia[];
    totalCount: number;
  };
  timestamp: string;
}

export interface WebSingleUploadResponse {
  success: boolean;
  message: string;
  data: UploadedMedia;
  timestamp: string;
}

// --------------------------
// 웹 전용 업로드 함수
// --------------------------

/**
 * 웹 환경에서 다중 파일 업로드 (진행률 추적 지원)
 *
 * @param files 업로드할 파일 배열 (File 또는 Blob)
 * @param onProgress 진행률 콜백 함수 (선택적)
 * @returns 업로드된 미디어 파일 정보 배열
 * @throws UploadError 업로드 실패 시
 */
export async function uploadFilesWeb(
  files: Array<File | Blob>,
  onProgress?: ProgressCallback
): Promise<UploadedMedia[]> {
  if (!isWeb()) {
    throw new UploadError("이 함수는 웹 환경에서만 사용할 수 있습니다.", 400);
  }

  try {
    // 파일 유효성 검증
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.warn("uploadFilesWeb: 업로드할 파일이 없습니다.");
      return [];
    }

    const validFiles = files.filter(
      (file) => (file instanceof File || file instanceof Blob) && file.size > 0
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

    console.log(`웹 환경에서 ${validFiles.length}개 파일 업로드 시작`);

    // 인증 토큰 가져오기
    const { token } = await getSession();
    if (!token) {
      throw new UploadError("인증 토큰이 없습니다. 로그인이 필요합니다.", 401);
    }

    // FormData 생성
    const formData = new FormData();

    // 파일 추가
    validFiles.forEach((file, index) => {
      const fileName =
        file instanceof File ? file.name : `file_${index}_${Date.now()}`;
      formData.append("files", file, fileName);

      console.log(
        `웹 환경 - 파일 추가: ${fileName}, 크기: ${file.size}바이트, 타입: ${file.type || "알 수 없음"}`
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
            const response = JSON.parse(xhr.responseText) as WebUploadResponse;
            if (response.success) {
              console.log(
                "웹 파일 업로드 성공:",
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

      // FormData는 자동으로 multipart/form-data 콘텐츠 타입 설정
      xhr.send(formData);
    });
  } catch (error) {
    console.error("웹 파일 업로드 오류:", error);
    throw error instanceof UploadError
      ? error
      : new UploadError(error.message || "알 수 없는 업로드 오류");
  }
}

/**
 * 웹 환경에서 단일 파일 업로드
 *
 * @param file 업로드할 파일
 * @param onProgress 진행률 콜백 함수 (선택적)
 * @returns 업로드된 미디어 파일 정보
 */
export async function uploadFileWeb(
  file: File | Blob,
  onProgress?: ProgressCallback
): Promise<UploadedMedia> {
  if (!isWeb()) {
    throw new UploadError("이 함수는 웹 환경에서만 사용할 수 있습니다.", 400);
  }

  try {
    // 인증 토큰 가져오기
    const { token } = await getSession();
    if (!token) {
      throw new UploadError("인증 토큰이 없습니다. 로그인이 필요합니다.", 401);
    }

    if (!file || file.size <= 0) {
      throw new UploadError("업로드할 유효한 파일이 없습니다.", 400);
    }

    // FormData 생성
    const formData = new FormData();
    const fileName = file instanceof File ? file.name : `file_${Date.now()}`;
    formData.append("file", file, fileName);

    console.log(
      `웹 환경 - 단일 파일 업로드: ${fileName}, 크기: ${file.size}바이트`
    );

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
            ) as WebSingleUploadResponse;
            if (response.success) {
              console.log("웹 단일 파일 업로드 성공:", response.data.id);
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
    console.error("웹 단일 파일 업로드 오류:", error);
    throw error instanceof UploadError
      ? error
      : new UploadError(error.message || "알 수 없는 업로드 오류");
  }
}

/**
 * 웹 환경에서 파일 선택기 생성
 * @returns 선택된 파일 목록을 처리하는 함수
 */
export function createWebFileSelector(): () => Promise<File[]> {
  return () => {
    return new Promise((resolve, reject) => {
      if (!isWeb()) {
        reject(new Error("웹 환경에서만 사용 가능합니다"));
        return;
      }

      // 파일 선택 input 생성
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = "image/*";

      // 파일 선택 이벤트 처리
      input.onchange = (event) => {
        const files = Array.from(
          (event.target as HTMLInputElement).files || []
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

/**
 * 웹 환경에서 이미지 압축 및 File 객체 생성
 * @param imageUri 이미지 URI (blob: 또는 data: 형식)
 * @param options 압축 옵션
 * @returns 압축된 File 객체
 */
export async function compressImageWeb(
  imageUri: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    fileName?: string;
  } = {}
): Promise<File> {
  if (!isWeb()) {
    throw new Error("이 함수는 웹 환경에서만 사용할 수 있습니다.");
  }

  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    fileName = `compressed_image_${Date.now()}.jpg`,
  } = options;

  try {
    // 이미지 로드
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Canvas를 사용한 이미지 압축
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas 컨텍스트를 생성할 수 없습니다."));
          return;
        }

        // 비율 유지하면서 크기 조정
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);

        // Blob으로 변환
        canvas.toBlob(
          (compressedBlob) => {
            if (compressedBlob) {
              const file = new File([compressedBlob], fileName, {
                type: "image/jpeg",
              });
              resolve(file);
            } else {
              reject(new Error("이미지 압축에 실패했습니다."));
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        reject(new Error("이미지 로드에 실패했습니다."));
      };

      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error("웹 이미지 압축 실패:", error);
    throw error;
  }
}
