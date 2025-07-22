import { createClient, cacheExchange, fetchExchange } from "urql";
import { authExchange } from "@urql/exchange-auth";
import Constants from "expo-constants";
import { getSession, clearSession } from "@/lib/auth";

// 환경 변수에서 GraphQL URL 가져오기 (여러 방법 시도)
const GRAPHQL_URL =
  process.env.EXPO_PUBLIC_GRAPHQL_URL ||
  Constants.expoConfig?.extra?.GRAPHQL_URL ||
  "https://bibliographic-blues-ci-clinton.trycloudflare.com/graphql";

// GraphQL URL 설정 완료

/**
 * urql GraphQL 클라이언트 설정
 * 인증 토큰을 자동으로 헤더에 포함합니다
 */
export const client = createClient({
  url: GRAPHQL_URL || "http://localhost:3000/graphql",
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

        async getAuth() {
          const { token } = await getSession();

          if (token) {
            // JWT 토큰 구조 확인
            try {
              const parts = token.split(".");
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));

                // 토큰이 만료되었으면 null 반환
                if (payload.exp * 1000 < Date.now()) {
                  await clearSession();
                  authState = null;
                  return null;
                }
              }
            } catch (e) {
              authState = null;
              return null;
            }

            authState = { token };
            return { token };
          }

          authState = null;
          return null;
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
