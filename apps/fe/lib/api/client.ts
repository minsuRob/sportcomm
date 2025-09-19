import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  ApolloLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { tokenManager } from "@/lib/auth/token-manager";
import { handleAuthError } from "@/lib/auth/auth-error-handler";
import { logPlatformInfo, getPlatformType } from "@/lib/platform";

// @ts-ignore - .env 파일은 빌드 시점에 생성되므로 타입 에러 무시
import { SERVER_URL } from "@env";

/**
 * API 기본 URL 설정
 */
const API_URL = `${SERVER_URL}/graphql`;

/**
 * HTTP 링크 생성
 */
const httpLink = new HttpLink({
  uri: API_URL,
  headers: {
    "Apollo-Require-Preflight": "true",
  },
});

/**
 * 에러 처리 링크
 */
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(async ({ message, path, extensions }) => {
      console.error(`[GraphQL Error]: Message: ${message}, Path: ${path}`);
      if (extensions?.code === "UNAUTHENTICATED") {
        console.error("Authentication error detected:", message);
        await handleAuthError({ message, extensions }, operation.operationName);
      }
    });
  }
  if (networkError) {
    console.error(`[Network Error]: ${networkError}`);
  }
});

/**
 * 인증 링크 (단순화 버전)
 */
const authLink = setContext(async (_, { headers }) => {
  // 최신 세션 확보 (만료/부재 시 refresh 포함)
  await tokenManager.ensureFreshSession();

  // 유효 토큰 획득 (ensureFreshSession 이후 재확인)
  const token = await tokenManager.getValidToken();

  // if (!token) {
    //console.log(
    //   "Auth Link: No valid token after ensureFreshSession (anonymous request).",
    // );
  // }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

/**
 * 요청/응답 디버깅 링크
 */
const requestDebugLink = new ApolloLink((operation, forward) => {
  // //console.log(`GraphQL Request: ${operation.operationName}`);
  return forward(operation).map((response) => {
    // //console.log(`GraphQL Response: ${operation.operationName}`);
    return response;
  });
});

/**
 * Apollo Client 생성
 */
// logPlatformInfo();
// //console.log(`Apollo client initializing for ${getPlatformType()} environment`);

export const client = new ApolloClient({
  link: from([requestDebugLink, errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          search: { merge: false },
          myTeams: {
            merge: false,
            read(existing) {
              // 캐시된 myTeams 데이터가 있으면 사용
              if (existing) {
                console.log('📖 [Cache] Reading cached myTeams');
                return existing;
              }
              return existing;
            },
          },
          sports: { merge: (_, incoming) => incoming },
          posts: {
            // 단순 페이지 기반 병합
            keyArgs: ["input", ["authorId", "teamIds", "publicOnly", "page"]],
            merge(existing, incoming, { args }) {
              if (!existing || args?.input?.page === 1) {
                return incoming;
              }
              return {
                ...incoming,
                posts: [...(existing.posts || []), ...(incoming.posts || [])],
              };
            },
            read(existing, { args }) {
              // 캐시된 데이터가 있으면 먼저 확인
              if (existing && existing.posts?.length > 0) {
                console.log('📖 [Cache] Reading cached posts data');
                return existing;
              }
              return existing;
            },
          },
        },
      },
      // Post 엔티티에 대한 캐시 정책
      Post: {
        fields: {
          isLiked: {
            read(existing) {
              return existing ?? false;
            },
          },
          isBookmarked: {
            read(existing) {
              return existing ?? false;
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

// 알림 서비스에 Apollo Client 설정
import { notificationService } from "@/lib/notifications/notificationService";
notificationService.setApolloClient(client);
