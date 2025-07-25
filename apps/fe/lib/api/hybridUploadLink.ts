/**
 * 하이브리드 업로드 링크
 *
 * 이 모듈은 웹 환경과 React Native 환경 모두에서 파일 업로드를 지원하는
 * Apollo Link를 제공합니다. 각 환경에 맞는 방식으로 FormData를 구성하여
 * GraphQL 파일 업로드를 처리합니다.
 */

import { ApolloLink, Observable } from "@apollo/client";
import { print } from "graphql";
import { extractFiles } from "extract-files";
import { isWeb, isReactNative } from "@/lib/platform";
import { getSession } from "@/lib/auth";
import { Platform } from "react-native";

// 파일 타입 체커 - 웹의 File/Blob 객체 또는 React Native의 파일 객체인지 확인
const isUploadable = (value: any): boolean => {
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
 * 웹과 React Native 환경 모두를 지원하는 파일 업로드 링크 생성
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
    return new Observable(async (observer) => {
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
              extensions: includeExtensions ? operation.extensions : undefined,
            }),
            credentials,
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
              form.append(i.toString(), {
                uri: file.uri,
                name: file.name,
                type: file.type,
              });
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
          credentials,
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
          if (typeof form.entries === "function") {
            for (const pair of form.entries()) {
              console.log(
                `- ${pair[0]}: ${
                  pair[1] instanceof File
                    ? `File(${pair[1].name}, ${pair[1].type}, ${pair[1].size} bytes)`
                    : pair[1]
                }`,
              );
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
    });
  });
};
