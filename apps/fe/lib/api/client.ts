import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  ApolloLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { supabase } from "@/lib/supabase/client";
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
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    console.log("Auth Link: No token found.");
  }

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
  // console.log(`GraphQL Request: ${operation.operationName}`);
  return forward(operation).map((response) => {
    // console.log(`GraphQL Response: ${operation.operationName}`);
    return response;
  });
});

/**
 * Apollo Client 생성
 */
logPlatformInfo();
console.log(`Apollo client initializing for ${getPlatformType()} environment`);

export const client = new ApolloClient({
  link: from([requestDebugLink, errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          search: { merge: false },
          myTeams: { merge: false },
          sports: { merge: (_, incoming) => incoming },
          posts: {
            keyArgs: ["input", ["authorId", "type"]],
            merge(existing, incoming, { args }) {
              if (!existing || args?.input?.page === 1) return incoming;
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
