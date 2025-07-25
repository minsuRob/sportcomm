import { ReactNativeFile } from "apollo-upload-client";
import { useMutation } from "@apollo/client";
import { UPLOAD_FILE, UPLOAD_FILES } from "@/lib/graphql";
import { getSession } from "@/lib/auth";
import { isWeb, isReactNative } from "@/lib/platform";

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
export async function uriToReactNativeFile(
  uri: string,
): Promise<ReactNativeFile | File> {
  // 웹 환경에서는 URL에서 Blob을 가져와 File 객체 생성
  if (
    isWeb() &&
    (uri.startsWith("http://") ||
      uri.startsWith("https://") ||
      uri.startsWith("blob:"))
  ) {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = getFileNameFromUri(uri);
      const file = new File([blob], fileName, {
        type: getMimeTypeFromUri(uri),
      });
      return file;
    } catch (error) {
      console.error("Failed to convert URI to File:", error);
      throw error;
    }
  }

  // React Native 환경에서는 ReactNativeFile 객체 생성
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
export async function urisToFiles(
  uris: string[],
): Promise<(ReactNativeFile | File)[]> {
  if (isWeb()) {
    // 웹 환경에서는 Promise 결과를 기다려야 함
    const promises = uris.map((uri) => uriToReactNativeFile(uri));
    return Promise.all(promises);
  } else {
    // React Native 환경에서도 비동기 처리를 위해 Promise.all 사용
    const promises = uris.map((uri) => uriToReactNativeFile(uri));
    return Promise.all(promises);
  }
}

// 하위 호환성을 위한 별칭 함수
export async function urisToReactNativeFiles(
  uris: string[],
): Promise<ReactNativeFile[]> {
  console.warn("urisToReactNativeFiles is deprecated, use urisToFiles instead");
  const files = await Promise.all(uris.map((uri) => uriToReactNativeFile(uri)));
  return files as ReactNativeFile[];
}

/**
 * 단일 파일 업로드를 위한 훅
 */
export function useUploadFile() {
  const [uploadFileMutation, { loading, error }] = useMutation(UPLOAD_FILE);

  const uploadFile = async (uri: string): Promise<UploadedMedia> => {
    try {
      console.log("단일 파일 업로드 시작:", uri);

      // 플랫폼에 맞는 파일 객체 생성
      const file = await uriToReactNativeFile(uri);

      // 인증 토큰 가져오기
      const { token } = await getSession();

      const { data } = await uploadFileMutation({
        variables: { file },
        context: {
          // 공통 헤더 설정
          headers: {
            "Apollo-Require-Preflight": "true",
            Authorization: token ? `Bearer ${token}` : "",
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

      // 플랫폼에 맞는 파일 객체 생성
      const files = await urisToFiles(uris);

      console.log(
        "파일 변환 완료:",
        isWeb()
          ? "Web 환경 (File 객체)"
          : "React Native 환경 (ReactNativeFile 객체)",
      );

      // 인증 토큰 가져오기
      const { token } = await getSession();

      const { data } = await uploadFilesMutation({
        variables: { files },
        context: {
          // 공통 헤더 설정
          headers: {
            "Apollo-Require-Preflight": "true",
            Authorization: token ? `Bearer ${token}` : "",
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
export function base64ToFile(
  base64: string,
  fileName: string,
): Promise<File | ReactNativeFile> {
  // Base64 문자열에서 MIME 타입 추출 (data:image/jpeg;base64,/9j/4AAQ... 형식)
  const mimeMatch = base64.match(/^data:([^;]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

  if (isWeb()) {
    // 웹 환경에서는 Base64를 Blob으로 변환 후 File 객체 생성
    return new Promise((resolve) => {
      const base64WithoutHeader = base64.replace(/^data:([^;]+);base64,/, "");
      const binaryString = atob(base64WithoutHeader);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const file = new File(
        [blob],
        fileName || `image_${Date.now()}.${mimeType.split("/")[1]}`,
        { type: mimeType },
      );

      resolve(file);
    });
  } else {
    // React Native 환경에서는 ReactNativeFile 객체 생성
    return Promise.resolve(
      new ReactNativeFile({
        uri: base64,
        name: fileName || `image_${Date.now()}.${mimeType.split("/")[1]}`,
        type: mimeType,
      }),
    );
  }
}

// 하위 호환성을 위한 별칭 함수
export function base64ToReactNativeFile(
  base64: string,
  fileName: string,
): ReactNativeFile {
  console.warn(
    "base64ToReactNativeFile is deprecated, use base64ToFile instead",
  );
  return new ReactNativeFile({
    uri: base64,
    name: fileName || `image_${Date.now()}.${mimeType.split("/")[1]}`,
    type: mimeMatch ? mimeMatch[1] : "image/jpeg",
  });
}
