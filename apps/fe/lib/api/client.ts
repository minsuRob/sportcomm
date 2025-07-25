import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  ApolloLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { Platform } from "react-native";
import { getSession } from "@/lib/auth";
import { createHybridUploadLink } from "./hybridUploadLink";
import { logPlatformInfo, getPlatformType } from "@/lib/platform";

/**
 * API 기본 URL 설정
 * 개발 환경에서는 로컬 서버, 프로덕션 환경에서는 실제 API 서버 URL 사용
 */
const API_URL = __DEV__
  ? Platform.OS === "android"
    ? "http://10.0.2.2:3000/graphql" // Android 에뮬레이터용
    : "http://localhost:3000/graphql" // iOS 에뮬레이터용
  : "https://api.sportcomm.com/graphql"; // 프로덕션 URL

/**
 * 파일 업로드를 지원하는 HTTP 링크 생성
 * Apollo Upload Client 사용
 */
const uploadLink = createHybridUploadLink({
  uri: API_URL,
  headers: {
    "Apollo-Require-Preflight": "true", // CORS 방지를 위한 헤더
  },
  credentials: "include", // 쿠키 포함
  debug: true, // 디버그 로깅 활성화
});

/**
 * 에러 처리 링크
 */
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL 에러]: 메시지: ${message}, 위치: ${locations}, 경로: ${path}`,
      );
    });
  }

  if (networkError) {
    console.error(`[네트워크 에러]: ${networkError}`);
  }
});

/**
 * 인증 링크
 * 모든 요청에 JWT 토큰을 헤더에 추가합니다.
 */
const authLink = setContext(async (_, { headers }) => {
  // auth.ts의 getSession을 통해 토큰 가져오기
  const { token } = await getSession();

  // 디버깅을 위한 토큰 로그
  console.log("현재 토큰 상태:", token ? "토큰 있음" : "토큰 없음");

  // 헤더에 토큰 추가
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

/**
 * 요청/응답 디버깅 링크
 * 모든 GraphQL 요청과 응답을 콘솔에 출력합니다.
 */
const requestDebugLink = new ApolloLink((operation, forward) => {
  console.log(`GraphQL 요청: ${operation.operationName}`, {
    variables: operation.variables,
    query: operation.query.loc?.source.body,
    headers: operation.getContext().headers,
  });

  return forward(operation).map((response) => {
    console.log(`GraphQL 응답: ${operation.operationName}`, {
      data: response.data,
      errors: response.errors,
    });
    return response;
  });
});

/**
 * Apollo Client 생성
 * urql 대체용 Apollo Client 설정
 */
// 플랫폼 정보 로깅
logPlatformInfo();
console.log(`Apollo 클라이언트 초기화 (${getPlatformType()} 환경)`);

export const client = new ApolloClient({
  link: from([authLink, errorLink, requestDebugLink, uploadLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // 페이지네이션 관련 캐시 정책 설정
          search: {
            // 검색 결과는 항상 새로운 데이터로 간주 (캐시 병합 안함)
            merge: false,
          },
          // posts 쿼리 필드에 대한 병합 정책 (페이지네이션 지원)
          posts: {
            keyArgs: ["input", ["authorId", "type"]],
            merge(existing, incoming, { args }) {
              if (!existing) return incoming;
              if (args?.input?.page === 1) return incoming;

              return {
                ...incoming,
                posts: [...(existing.posts || []), ...(incoming.posts || [])],
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
      nextFetchPolicy: "cache-first",
    },
    query: {
      fetchPolicy: "network-only",
      errorPolicy: "all",
    },
    mutate: {
      errorPolicy: "all",
    },
  },
});
