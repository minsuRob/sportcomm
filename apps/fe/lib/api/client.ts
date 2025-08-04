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
// import { createHybridUploadLink } from "./fileUpload"; // 임시 비활성화
import { logPlatformInfo, getPlatformType } from "@/lib/platform";
import { SERVER_URL } from "@env";
/**
 * API 기본 URL 설정
 * 개발 환경에서는 로컬 서버, 프로덕션 환경에서는 실제 API 서버 URL 사용
 */
const API_URL = `${SERVER_URL}/graphql`;
// const API_URL = __DEV__
//   ? Platform.OS === "android"
//     ? "http://10.0.2.2:3000/graphql" // Android 에뮬레이터용
//     : "http://localhost:3000/graphql" // iOS 에뮬레이터용
//   : "https://api.sportcomm.com/graphql"; // 프로덕션 URL

/**
 * 파일 업로드를 지원하는 HTTP 링크 생성
 * Apollo Upload Client 사용
 */
// 임시로 기본 HTTP 링크 사용
const uploadLink = new HttpLink({
  uri: API_URL,
  headers: {
    "Apollo-Require-Preflight": "true", // CORS 방지를 위한 헤더
  },
  credentials: "include", // 쿠키 포함
});

/**
 * 에러 처리 링크
 */
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL 에러]: 메시지: ${message}, 위치: ${locations}, 경로: ${path}`
      );

      // 인증 오류 처리
      if (
        message.includes('Unauthorized') ||
        message.includes('인증') ||
        message.includes('로그인') ||
        message.includes('token') ||
        message.includes('access denied') ||
        (extensions && extensions.code === 'UNAUTHENTICATED')
      ) {
        console.error('인증 오류 감지:', message);
        // 여기서 리프레시 토큰 처리나 로그인 페이지로 리다이렉트 등의 로직을 추가할 수 있음
      }
    });
  }

  if (networkError) {
    console.error(`[네트워크 에러]: ${networkError}`);
  }

  return forward(operation);
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
  // 요청 전 상세 정보 출력
  console.log(`GraphQL 요청: ${operation.operationName}`, {
    variables: operation.variables,
    query: operation.query.loc?.source.body,
    headers: operation.getContext().headers,
  });

  // files 변수 확인 (파일 업로드 관련)
  if (operation.variables && operation.variables.files) {
    console.log("파일 업로드 변수 세부 정보:", operation.variables.files);

    // 파일 객체 타입 검사
    if (Array.isArray(operation.variables.files)) {
      operation.variables.files.forEach((file, index) => {
        console.log(
          `파일[${index}] 타입:`,
          file instanceof File
            ? "File"
            : file.uri
              ? "ReactNativeFile"
              : "알 수 없음"
        );
        console.log(`파일[${index}] 속성:`, Object.keys(file));
      });
    }
  }

  return forward(operation).map((response) => {
    // 응답 상세 정보 출력
    console.log(`GraphQL 응답: ${operation.operationName}`, {
      data: response.data,
      errors: response.errors,
      extensions: response.extensions,
    });

    // 에러 발생 시 더 자세한 정보 출력
    if (response.errors && response.errors.length) {
      console.error(`GraphQL 에러 상세 정보:`, {
        operation: operation.operationName,
        errorMessages: response.errors.map((e) => e.message),
        errorDetails: response.errors,
      });
    }

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

// 인증 상태 체크 함수
export const checkAuthStatus = async () => {
  const { token, user } = await getSession();
  return { isAuthenticated: !!token && !!user, token, user };
};

export const client = new ApolloClient({
  link: from([requestDebugLink, authLink, errorLink, uploadLink]),
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
      // 뮤테이션에서 인증 관련 컨텍스트를 항상 최신으로 유지
      context: {
        getAuth: async () => {
          const { token } = await getSession();
          return {
            headers: {
              authorization: token ? `Bearer ${token}` : "",
            },
          };
        }
      }
    },
  },
});
// 알림 서비스에 Apollo Client 설정
import { notificationService } from "@/lib/notifications/notificationService";
notificationService.setApolloClient(client);
