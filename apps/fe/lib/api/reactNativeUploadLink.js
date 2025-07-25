// React Native용 커스텀 업로드 링크
// 웹 환경과 달리 React Native에서는 FormData와 Blob 객체가 다르게 작동하기 때문에
// 파일 업로드를 위한 커스텀 로직이 필요합니다.

import { ApolloLink, Observable } from '@apollo/client';
import { print } from 'graphql';
import { extractFiles } from 'extract-files';
import { Platform } from 'react-native';

/**
 * React Native 환경에서 GraphQL 파일 업로드를 지원하는 Apollo 링크
 * apollo-upload-client의 createUploadLink를 기반으로 React Native에 맞게 수정됨
 */
export const createReactNativeUploadLink = ({
  uri,
  headers = {},
  credentials,
  includeExtensions = false,
  ...requestOptions
}) => {
  return new ApolloLink(operation => {
    // Operation 정보를 FormData로 변환하는 함수
    const transformOperation = async operation => {
      const { variables, operationName, query } = operation;
      const queryString = print(query);

      // 파일 추출
      const { clone, files } = extractFiles(variables, '', (value) => {
        return (
          value !== null &&
          typeof value === 'object' &&
          typeof value.uri === 'string' &&
          typeof value.name === 'string' &&
          typeof value.type === 'string'
        );
      });

      // 파일이 없으면 일반 JSON 요청으로 처리
      if (files.size === 0) {
        return {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
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
      }

      // 파일이 있으면 multipart/form-data로 요청
      const form = new FormData();

      // GraphQL 쿼리, 변수, 오퍼레이션 이름을 FormData에 추가
      form.append('operations', JSON.stringify({
        query: queryString,
        variables: clone,
        operationName,
        extensions: includeExtensions ? operation.extensions : undefined,
      }));

      // 파일 맵핑 정보 생성
      const map = {};
      let i = 0;
      files.forEach((paths, file) => {
        map[i] = paths;
        i++;
      });

      form.append('map', JSON.stringify(map));

      // 파일 추가
      i = 0;
      files.forEach((paths, file) => {
        // React Native의 파일 객체 구조에 맞게 처리
        if (file.uri && file.name && file.type) {
          form.append(i.toString(), {
            uri: file.uri,
            name: file.name,
            type: file.type,
          });
        }
        i++;
      });

      return {
        method: 'POST',
        headers: {
          ...headers,
          // multipart/form-data는 헤더에서 Content-Type을 명시하지 않음
          // React Native가 자동으로 boundary를 설정
          'Apollo-Require-Preflight': 'true', // CORS 프리플라이트 요청 방지
        },
        body: form,
        credentials,
        ...requestOptions,
      };
    };

    // 실제 요청을 Observable로 래핑하여 반환
    return new Observable(observer => {
      // 실행 환경에 맞는 endpoint URI 결정
      const endpoint = typeof uri === 'function' ? uri(operation) : uri;

      // 요청 준비 및 실행
      transformOperation(operation)
        .then(fetchOptions => {
          return fetch(endpoint, fetchOptions);
        })
        .then(response => {
          // 응답 상태 확인
          if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
          }

          // JSON 응답 파싱
          return response.json();
        })
        .then(result => {
          // GraphQL 결과 처리
          if (result.errors) {
            observer.next(result);
            observer.error(new Error(JSON.stringify(result.errors)));
          } else {
            observer.next(result);
            observer.complete();
          }
        })
        .catch(error => {
          // 에러 처리
          if (error.name === 'AbortError') {
            // 요청이 중단된 경우
            return;
          }
          console.error(`[Apollo 업로드 링크 에러]: ${error.message}`);
          observer.error(error);
        });
    });
  });
};
