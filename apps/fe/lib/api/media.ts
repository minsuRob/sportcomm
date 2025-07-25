import { useUploadFiles as useUploadFilesInternal } from "./upload";
export { uriToReactNativeFile, urisToReactNativeFiles } from "./upload";

// upload.ts에서 새로운 업로드 타입과 함수를 가져옴
export { UploadedMedia, useUploadFile } from "./upload";

/**
 * GraphQL 파일 업로드 훅 (기존 호환성을 위해 유지)
 * 내부적으로는 upload.ts의 개선된 구현을 사용합니다.
 */
export function useUploadFiles() {
  // 신규 구현된 업로드 훅 사용
  const { uploadFiles, loading, error } = useUploadFilesInternal();

  // 기존 API 형태를 유지하면서 내부 구현만 개선
  return {
    uploadFiles,
    loading,
    error,
  };
}

/**
 * 레거시 함수 (호환성 유지)
 * @deprecated useUploadFiles 훅을 사용하세요
 */
export async function uploadImages(
  imageUris: string[],
): Promise<UploadedMedia[]> {
  // 새로운 구현을 사용하여 레거시 함수 지원
  const { uploadFiles } = useUploadFilesInternal();
  return uploadFiles(imageUris);
}

/**
 * 단일 이미지 업로드 (편의 함수)
 * @deprecated useUploadFiles 훅을 사용하세요
 */
export async function uploadSingleImage(
  imageUri: string,
): Promise<UploadedMedia> {
  // 새로운 구현을 사용하여 레거시 함수 지원
  const { uploadFile } = useUploadFile();
  return uploadFile(imageUri);
}
