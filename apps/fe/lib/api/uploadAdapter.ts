/**
 * 파일 업로드 어댑터
 *
 * 웹과 React Native 환경에서 GraphQL을 통한 파일 업로드를 원활하게 처리하기 위한
 * 환경 특화 어댑터를 제공합니다.
 */

import { ReactNativeFile } from "apollo-upload-client";
import { isWeb, isReactNative } from "@/lib/platform";

/**
 * 파일 타입 정의
 * 웹과 React Native 환경에서 사용되는 파일 타입을 통합적으로 관리
 */
export type UploadableFile = File | Blob | ReactNativeFile | {
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
  options?: { fileName?: string; mimeType?: string }
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
          type: options?.mimeType || fileOrUri.type || 'application/octet-stream'
        });
      }

      // 문자열 URI인 경우
      if (typeof fileOrUri === 'string') {
        // data: URI (base64)인 경우
        if (fileOrUri.startsWith('data:')) {
          const response = await fetch(fileOrUri);
          const blob = await response.blob();
          const mimeMatch = fileOrUri.match(/^data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
          const extension = mimeType.split('/')[1] || 'bin';
          const fileName = options?.fileName || `file_${Date.now()}.${extension}`;

          return new File([blob], fileName, { type: mimeType });
        }

        // http(s): 또는 blob: URI인 경우
        if (fileOrUri.startsWith('http') || fileOrUri.startsWith('blob:')) {
          const response = await fetch(fileOrUri);
          const blob = await response.blob();
          const urlParts = fileOrUri.split('/');
          const fileName = options?.fileName || urlParts[urlParts.length - 1] || `file_${Date.now()}`;

          return new File([blob], fileName, {
            type: options?.mimeType || blob.type || 'application/octet-stream'
          });
        }
      }

      // URI 객체인 경우
      if (typeof fileOrUri === 'object' && 'uri' in fileOrUri) {
        const uri = fileOrUri.uri;
        if (typeof uri === 'string') {
          return await adaptFile(uri, options);
        }
      }

      throw new Error('지원하지 않는 파일 형식');
    }

    // React Native 환경 처리
    if (isReactNative()) {
      // 이미 ReactNativeFile인 경우
      if (
        typeof fileOrUri === 'object' &&
        'uri' in fileOrUri &&
        'name' in fileOrUri &&
        'type' in fileOrUri
      ) {
        return fileOrUri as ReactNativeFile;
      }

      // 문자열 URI인 경우
      if (typeof fileOrUri === 'string') {
        const uri = fileOrUri;
        const uriParts = uri.split('/');
        const fileName = options?.fileName || uriParts[uriParts.length - 1] || `file_${Date.now()}`;

        // MIME 타입 결정
        let mimeType = options?.mimeType || 'application/octet-stream';
        const extension = fileName.split('.').pop()?.toLowerCase();

        if (extension && !options?.mimeType) {
          if (['jpg', 'jpeg'].includes(extension)) mimeType = 'image/jpeg';
          else if (extension === 'png') mimeType = 'image/png';
          else if (extension === 'gif') mimeType = 'image/gif';
          else if (extension === 'webp') mimeType = 'image/webp';
          else if (extension === 'pdf') mimeType = 'application/pdf';
        }

        return new ReactNativeFile({
          uri,
          name: fileName,
          type: mimeType
        });
      }

      // URI 객체인 경우
      if (typeof fileOrUri === 'object' && 'uri' in fileOrUri) {
        const uri = fileOrUri.uri;
        if (typeof uri === 'string') {
          return await adaptFile(uri, options);
        }
      }

      throw new Error('지원하지 않는 파일 형식');
    }

    // 지원하지 않는 환경
    throw new Error('지원하지 않는 환경');
  } catch (error) {
    console.error('파일 형식 변환 실패:', error);
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
  options?: { fileNames?: string[]; mimeTypes?: string[] }
): Promise<UploadableFile[]> {
  const adaptedFiles = await Promise.all(
    filesOrUris.map((fileOrUri, index) =>
      adaptFile(fileOrUri, {
        fileName: options?.fileNames?.[index],
        mimeType: options?.mimeTypes?.[index]
      })
    )
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
  operations: { query: string; variables: any; operationName?: string; extensions?: any },
  filesMap: { [path: string]: UploadableFile }
): FormData {
  // FormData 생성
  const formData = new FormData();

  // operations 추가 (GraphQL 작업 정보)
  formData.append('operations', JSON.stringify(operations));

  // map 객체 생성 (파일 경로 매핑)
  const map: { [key: string]: string[] } = {};
  let i = 0;

  // 파일 경로 매핑
  for (const [path, file] of Object.entries(filesMap)) {
    map[i.toString()] = [path];
    i++;
  }

  // map 추가
  formData.append('map', JSON.stringify(map));

  // 파일 추가
  i = 0;
  for (const file of Object.values(filesMap)) {
    formData.append(i.toString(), file);
    i++;
  }

  return formData;
}

/**
 * FormData가 올바르게 구성되었는지 디버깅 정보를 출력
 * @param formData 검사할 FormData 객체
 */
export function debugFormData(formData: FormData): void {
  console.log('===== FormData 디버깅 =====');

  // FormData 항목 순회 (지원되는 브라우저에서만)
  if (typeof formData.entries === 'function') {
    for (const pair of formData.entries()) {
      const key = pair[0];
      const value = pair[1];

      if (value instanceof File) {
        console.log(`${key}: File(이름: ${value.name}, 타입: ${value.type}, 크기: ${value.size} bytes)`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`${key}: 객체`, value);
      } else {
        console.log(`${key}:`, value);
      }
    }
  } else {
    console.log('FormData 항목을 나열할 수 없습니다 (entries 메서드 지원 안 함)');
  }

  console.log('===========================');
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
        reject(new Error('웹 환경에서만 사용 가능합니다'));
        return;
      }

      // 파일 선택 input 생성
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';

      // 파일 선택 이벤트 처리
      input.onchange = (event) => {
        const files = Array.from((event.target as HTMLInputElement).files || []);
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
