/**
 * 파일 업로드 통합 인터페이스 (호환성 유지)
 *
 * 기존 코드와의 호환성을 위해 유지되는 파일입니다.
 * 새로운 코드에서는 플랫폼별 모듈을 직접 사용하는 것을 권장합니다:
 * - 웹: webUpload.ts
 * - 모바일: mobileUpload.ts
 * - 게시물 생성: postCreation.ts
 * - 공통 유틸리티: common.ts
 */

import { isWeb } from "@/lib/platform";

// 공통 타입 및 유틸리티 재내보내기
export * from "./common";

// 플랫폼별 업로드 함수 재내보내기
export * from "./webUpload";
export * from "./mobileUpload";

// 게시물 생성 함수 재내보내기
export * from "./postCreation";

// 호환성을 위한 통합 업로드 함수
import { uploadFilesWeb } from "./webUpload";
import { uploadFilesMobile } from "./mobileUpload";
import { UploadedMedia, ProgressCallback } from "./common";

/**
 * 플랫폼에 맞는 파일 업로드 함수 (호환성 유지)
 * @deprecated 플랫폼별 함수를 직접 사용하세요
 */
export async function uploadFiles(
  files: Array<File | Blob | any>,
  onProgress?: ProgressCallback
): Promise<UploadedMedia[]> {
  if (isWeb()) {
    return uploadFilesWeb(files as (File | Blob)[], onProgress);
  } else {
    return uploadFilesMobile(
      files as { uri: string; name: string; type: string }[],
      onProgress
    );
  }
}

/**
 * 플랫폼에 맞는 단일 파일 업로드 함수 (호환성 유지)
 * @deprecated 플랫폼별 함수를 직접 사용하세요
 */
export async function uploadFile(
  file: File | Blob | any,
  onProgress?: ProgressCallback
): Promise<UploadedMedia> {
  const result = await uploadFiles([file], onProgress);
  if (result.length === 0) {
    throw new Error("파일 업로드에 실패했습니다.");
  }
  return result[0];
}

// React Hooks (호환성 유지)
export function useFileUpload() {
  return {
    uploadFiles,
    uploadFile,
  };
}

export function useUploadWithProgress() {
  return {
    uploadWithProgress: uploadFiles,
    uploadFileWithProgress: uploadFile,
  };
}
