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
}>) => {
  const debug = requestOptions.debug || false;
  delete requestOptions.debug;

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
        form.append(
          "operations",
          JSON.stringify({
            query: queryString,
            variables: clone,
            operationName,
            extensions: includeExtensions ? operation.extensions : undefined,
          }),
        );

        // 파일 맵핑 정보 생성
        const map = {};
        let i = 0;
        files.forEach((paths, file) => {
          map[i] = paths;
          i++;
        });

        form.append("map", JSON.stringify(map));

        // 파일 추가 (플랫폼별 처리)
        i = 0;
        files.forEach((paths, file) => {
          if (isWeb()) {
            // 웹 환경: File/Blob 객체 그대로 사용
            form.append(i.toString(), file);
          } else if (isReactNative()) {
            // React Native 환경: 특수한 형태로 파일 정보 추가
            form.append(i.toString(), {
              uri: file.uri,
              name: file.name,
              type: file.type,
            });
          }
          i++;
        });

        // 헤더 설정 (Content-Type은 FormData에서 자동 생성되므로 명시하지 않음)
        const uploadOptions = {
          method: "POST",
          headers: {
            ...requestHeaders,
            // FormData를 사용할 때는 Content-Type을 명시하지 않음
            // 브라우저가 자동으로 boundary와 함께 추가함
          },
          body: form,
          credentials,
          ...requestOptions,
        };

        if (debug) {
          console.log("[Apollo Upload Link] 파일 업로드 요청:", {
            endpoint,
            filesCount: files.size,
            headers: uploadOptions.headers,
          });
        }

        try {
          const response = await fetch(endpoint, uploadOptions);

          // 응답 상태 확인
          if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
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
