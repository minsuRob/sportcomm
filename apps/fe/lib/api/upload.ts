import { ReactNativeFile } from "apollo-upload-client";
import { useMutation } from "@apollo/client";
import { UPLOAD_FILE, UPLOAD_FILES } from "@/lib/graphql";

/**
 * 업로드된 미디어 파일 정보를 위한 인터페이스
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
 * URI에서 MIME 타입을 추측합니다.
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
 * URI에서 파일 이름을 추출합니다.
 * @param uri 파일 URI
 * @returns 파일 이름 (없으면 타임스탬프 기반 이름 생성)
 */
export function getFileNameFromUri(uri: string): string {
  // URI에서 마지막 슬래시 이후의 부분을 파일 이름으로 간주
  const name = uri.split("/").pop();

  if (name) {
    return name;
  }

  // 파일 이름을 추출할 수 없는 경우 타임스탬프 기반 이름 생성
  const extension = uri.split(".").pop() || "jpg";
  return `file_${Date.now()}.${extension}`;
}

/**
 * URI를 ReactNativeFile 객체로 변환합니다.
 * @param uri 파일 URI
 * @returns ReactNativeFile 객체
 */
export function uriToReactNativeFile(uri: string): ReactNativeFile {
  // React Native에서 uri는 파일 시스템 경로이며, 'file://' 접두사가 있을 수 있음
  const fileUri = uri.startsWith("file://") ? uri : uri;

  return new ReactNativeFile({
    uri: fileUri,
    name: getFileNameFromUri(uri),
    type: getMimeTypeFromUri(uri),
  });
}

/**
 * 여러 URI를 ReactNativeFile 배열로 변환합니다.
 * @param uris 파일 URI 배열
 * @returns ReactNativeFile 객체 배열
 */
export function urisToReactNativeFiles(uris: string[]): ReactNativeFile[] {
  return uris.map((uri) => uriToReactNativeFile(uri));
}

/**
 * 단일 파일 업로드를 위한 훅
 */
export function useUploadFile() {
  const [uploadFileMutation, { loading, error }] = useMutation(UPLOAD_FILE);

  const uploadFile = async (uri: string): Promise<UploadedMedia> => {
    try {
      console.log("단일 파일 업로드 시작:", uri);

      const file = uriToReactNativeFile(uri);

      const { data } = await uploadFileMutation({
        variables: { file },
        context: {
          // React Native에서 필요한 헤더 설정
          headers: {
            "Apollo-Require-Preflight": "true",
          },
        },
      });

      if (!data?.uploadFile) {
        throw new Error("업로드 응답 데이터가 없습니다.");
      }

      console.log("파일 업로드 완료:", data.uploadFile.url);
      return data.uploadFile;
    } catch (error) {
      console.error("파일 업로드 실패:", error);
      throw error;
    }
  };

  return {
    uploadFile,
    loading,
    error,
  };
}

/**
 * 여러 파일 업로드를 위한 훅
 */
export function useUploadFiles() {
  const [uploadFilesMutation, { loading, error }] = useMutation(UPLOAD_FILES);

  const uploadFiles = async (uris: string[]): Promise<UploadedMedia[]> => {
    try {
      console.log("여러 파일 업로드 시작:", uris.length, "개 파일");

      const files = urisToReactNativeFiles(uris);

      // FormData 형식으로 직접 변환 (ReactNativeFile 객체의 특성 유지)
      const { data } = await uploadFilesMutation({
        variables: { files },
        context: {
          // Apollo-Upload-Client에서 필요한 헤더 추가
          headers: {
            "Apollo-Require-Preflight": "true",
          },
        },
      });

      if (!data?.uploadFiles) {
        throw new Error("업로드 응답 데이터가 없습니다.");
      }

      console.log("파일 업로드 완료:", data.uploadFiles.length, "개 파일");
      return data.uploadFiles;
    } catch (error) {
      console.error("파일 업로드 실패:", error);
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
 * Base64 인코딩된 이미지를 업로드용 임시 파일로 변환합니다.
 * (React Native에서 base64 데이터를 파일처럼 처리)
 */
export function base64ToReactNativeFile(
  base64: string,
  fileName: string,
): ReactNativeFile {
  // Base64 문자열에서 MIME 타입 추출 (data:image/jpeg;base64,/9j/4AAQ... 형식)
  const mimeMatch = base64.match(/^data:([^;]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

  // data: 접두사를 포함한 전체 데이터 URL을 ReactNativeFile의 uri로 사용
  // (React Native에서는 이미지 표시 시 base64 데이터를 직접 사용할 수 있음)
  return new ReactNativeFile({
    uri: base64,
    name: fileName || `image_${Date.now()}.${mimeType.split("/")[1]}`,
    type: mimeType,
  });
}
