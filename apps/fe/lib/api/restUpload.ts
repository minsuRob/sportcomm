/**
 * REST API 파일 업로드 유틸리티
 *
 * 이 모듈은 GraphQL 대신 REST API를 통해 파일을 업로드하는 기능을 제공합니다.
 * 웹과 React Native 환경 모두에서 작동하며 진행률 추적 기능을 포함합니다.
 */

import { Platform } from "react-native";
import { getSession } from "@/lib/auth";
import { isWeb, isReactNative } from "@/lib/platform";
import { ReactNativeFile } from "apollo-upload-client";

/**
 * 업로드 진행 상태 인터페이스
 */
export interface UploadProgress {
  loaded: number;     // 업로드된 바이트
  total: number;      // 전체 바이트
  percentage: number; // 완료율 (0-100)
}

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
  status: string;
  thumbnailUrl?: string;
}

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
 * 파일 업로드 응답 데이터 형식
 */
export interface UploadResponseData {
  files: UploadedMedia[];
  totalCount: number;
}

/**
 * 업로드 오류 클래스
 */
export class UploadError extends Error {
  status?: number;
  responseData?: any;

  constructor(message: string, status?: number, responseData?: any) {
    super(message);
    this.name = "UploadError";
    this.status = status;
    this.responseData = responseData;
  }
}

/**
 * API 기본 URL 설정
 * 개발 환경에서는 로컬 서버, 프로덕션 환경에서는 실제 API 서버 URL 사용
 */
const API_URL = __DEV__
  ? Platform.OS === "android"
    ? "http://10.0.2.2:3000/api" // Android 에뮬레이터용
    : "http://localhost:3000/api" // iOS 에뮬레이터와 웹용
  : "https://api.sportcomm.com/api"; // 프로덕션 URL

/**
 * 업로드 엔드포인트
 */
const UPLOAD_ENDPOINT = `${API_URL}/upload`;

/**
 * React Native 파일 객체 생성 헬퍼 함수
 * 이미지 선택기에서 가져온 이미지 정보를 업로드 가능한 형태로 변환
 */
export function createReactNativeFile(
  image: { uri: string; width?: number; height?: number; mimeType?: string; name?: string },
  index: number = 0
): ReactNativeFile {
  // 파일 이름 추출 또는 생성
  const uriParts = image.uri.split("/");
  const fileName = image.name || uriParts[uriParts.length - 1] || `image_${index}_${Date.now()}.jpg`;

  // MIME 타입 결정
  const fileType = image.mimeType || "image/jpeg";

  return new ReactNativeFile({
    uri: image.uri,
    name: fileName,
    type: fileType,
  });
}

/**
 * 진행률 콜백 타입 정의
 */
export type ProgressCallback = (progress: UploadProgress) => void;

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
  onProgress?: ProgressCallback
): Promise<UploadedMedia[]> {
  try {
    // 파일이 없으면 빈 배열 반환
    if (!files || files.length === 0) {
      return [];
    }

    console.log(`REST API로 ${files.length}개 파일 업로드 시작`);

    // 인증 토큰 가져오기
    const { token } = await getSession();

    // FormData 생성
    const formData = new FormData();

    // 플랫폼에 맞게 파일 추가
    files.forEach((file, index) => {
      console.log(`파일 ${index} 추가 중:`,
        isWeb() && file instanceof File
          ? `${file.name} (${file.size} bytes)`
          : "ReactNativeFile");

      if (isWeb() && (file instanceof File || file instanceof Blob)) {
        // 웹 환경: File/Blob 객체
        const fileName = file instanceof File ? file.name : `file_${index}_${Date.now()}`;
        formData.append('files', file, fileName);
      } else if (isReactNative() && 'uri' in file && 'name' in file && 'type' in file) {
        // React Native 환경: uri, name, type 객체
        // @ts-ignore: React Native의 FormData는 객체를 직접 지원
        formData.append('files', {
          uri: file.uri,
          name: file.name || `file_${index}_${Date.now()}`,
          type: file.type || 'image/jpeg',
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
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            };
            onProgress(progress);
          }
        });
      }

      // 요청 완료 핸들러
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText) as ApiResponse<UploadResponseData>;
            if (response.success) {
              console.log('파일 업로드 성공:', response.data.totalCount, '개 파일');
              resolve(response.data.files);
            } else {
              reject(new UploadError(response.message || '업로드 실패', xhr.status, response));
            }
          } catch (parseError) {
            reject(new UploadError(
              `응답 파싱 오류: ${parseError.message || '알 수 없는 오류'}`,
              xhr.status
            ));
          }
        } else {
          let errorMessage = '파일 업로드 실패';
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
      xhr.addEventListener('error', () => {
        reject(new UploadError('네트워크 오류가 발생했습니다.'));
      });

      // 요청 취소 이벤트 핸들러
      xhr.addEventListener('abort', () => {
        reject(new UploadError('업로드가 취소되었습니다.'));
      });

      // 요청 초기화 및 전송
      xhr.open('POST', UPLOAD_ENDPOINT, true);

      // 헤더 설정
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // FormData는 자동으로 multipart/form-data 콘텐츠 타입 설정
      // Content-Type 헤더를 수동으로 설정하지 않음

      xhr.send(formData);
    });
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    throw error instanceof UploadError
      ? error
      : new UploadError(error.message || '알 수 없는 업로드 오류');
  }
}

/**
 * 단순화된 파일 업로드 함수 (진행률 추적 없음)
 */
export async function uploadFiles(
  files: Array<File | Blob | ReactNativeFile>
): Promise<UploadedMedia[]> {
  return uploadFilesWithProgress(files);
}

/**
 * 단일 파일 업로드 (편의 함수)
 */
export async function uploadFile(
  file: File | Blob | ReactNativeFile
): Promise<UploadedMedia> {
  const results = await uploadFiles([file]);
  if (!results || results.length === 0) {
    throw new UploadError('파일 업로드 결과가 없습니다.');
  }
  return results[0];
}

/**
 * 파일 업로드 및 진행률 추적을 위한 React 훅
 */
export function useUploadWithProgress() {
  const uploadWithProgress = async (
    files: Array<File | Blob | ReactNativeFile>,
    onProgress?: ProgressCallback
  ): Promise<UploadedMedia[]> => {
    return uploadFilesWithProgress(files, onProgress);
  };

  return {
    uploadWithProgress
  };
}

/**
 * 파일 업로드를 위한 React 훅 (기본)
 */
export function useRestUpload() {
  return {
    uploadFiles,
    uploadFile
  };
}
