import { createClient, cacheExchange, fetchExchange } from "urql";
import { authExchange } from "@urql/exchange-auth";
import Constants from "expo-constants";
import { getSession, clearSession } from "@/lib/auth";

import { GRAPHQL_URL } from "@env";

// 환경 변수에서 GraphQL URL 가져오기 (여러 방법 시도)
// const GRAPHQL_URL =
//   process.env.EXPO_PUBLIC_GRAPHQL_URL ||
//   Constants.expoConfig?.extra?.GRAPHQL_URL ||
//   "https://bibliographic-blues-ci-clinton.trycloudflare.com/graphql";

// GraphQL URL 설정 완료

/**
 * urql GraphQL 클라이언트 설정
 * 인증 토큰을 자동으로 헤더에 포함합니다
 */
export const client = createClient({
  url: GRAPHQL_URL,
  exchanges: [
    cacheExchange,
    authExchange(async (utils) => {
      let authState: { token: string } | null = null;

      return {
        addAuthToOperation(operation) {
          if (!authState?.token) {
            return operation;
          }

          return utils.appendHeaders(operation, {
            Authorization: `Bearer ${authState.token}`,
          });
        },

        didAuthError(error) {
          return error.graphQLErrors.some(
            (e) =>
              e.extensions?.code === "UNAUTHENTICATED" ||
              e.message.includes("인증에 실패했습니다") ||
              e.message.includes("Unauthorized") ||
              e.message.includes("토큰이 만료되었습니다")
          );
        },

        async getAuth(): Promise<{ token: string } | null> {
          // getSession을 호출하여 인증 토큰을 가져옵니다.
          const { token } = await getSession();

          // 토큰이 존재하지 않으면 인증되지 않은 것으로 간주합니다.
          if (!token) {
            authState = null;
            return null;
          }

          // 가져온 토큰으로 authState를 설정하고 반환합니다.
          authState = { token };
          return { token };
        },

        async refreshAuth() {
          // 토큰 갱신 로직 (현재는 단순히 세션 클리어)
          await clearSession();
          authState = null;
          return null;
        },
      };
    }),
    fetchExchange,
  ],
});
