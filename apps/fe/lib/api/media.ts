import { useMutation } from "@apollo/client";
import { UPLOAD_FILES } from "@/lib/graphql";
// @ts-ignore
import { ReactNativeFile } from "apollo-upload-client";

/**
 * 업로드된 미디어 정보 타입
 */
export interface UploadedMedia {
  id: string;
  originalName: string;
  url: string;
  type: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * GraphQL 파일 업로드 훅
 * Apollo Client의 GraphQL Upload를 사용하여 파일을 업로드합니다.
 */
export function useUploadFiles() {
  const [uploadFilesMutation, { loading, error }] = useMutation(UPLOAD_FILES);

  const uploadFiles = async (imageUris: string[]): Promise<UploadedMedia[]> => {
    try {
      console.log("GraphQL 파일 업로드 시작:", imageUris.length, "개 파일");

      // React Native 파일 객체 생성
      const files = imageUris.map((uri, index) => {
        return new ReactNativeFile({
          uri,
          type: "image/jpeg",
          name: `image_${Date.now()}_${index}.jpg`,
        });
      });

      // GraphQL 뮤테이션 실행
      const { data } = await uploadFilesMutation({
        variables: {
          files,
        },
      });

      if (!data?.uploadFiles) {
        throw new Error("업로드 응답 데이터가 없습니다.");
      }

      console.log(
        "GraphQL 파일 업로드 완료:",
        data.uploadFiles.length,
        "개 파일"
      );
      return data.uploadFiles;
    } catch (error) {
      console.error("GraphQL 파일 업로드 오류:", error);
      throw error;
    }
  };

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
  imageUris: string[]
): Promise<UploadedMedia[]> {
  throw new Error(
    "uploadImages는 더 이상 지원되지 않습니다. useUploadFiles 훅을 사용하세요."
  );
}

/**
 * 단일 이미지 업로드 (편의 함수)
 * @deprecated useUploadFiles 훅을 사용하세요
 */
export async function uploadSingleImage(
  imageUri: string
): Promise<UploadedMedia> {
  throw new Error(
    "uploadSingleImage는 더 이상 지원되지 않습니다. useUploadFiles 훅을 사용하세요."
  );
}
