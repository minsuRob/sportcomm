import { createClient, cacheExchange, fetchExchange } from "urql";
import { authExchange } from "@urql/exchange-auth";
import Constants from "expo-constants";
import { getSession, clearSession } from "@/lib/auth";

// 환경 변수에서 GraphQL URL 가져오기 (여러 방법 시도)
const GRAPHQL_URL =
  process.env.EXPO_PUBLIC_GRAPHQL_URL ||
  Constants.expoConfig?.extra?.GRAPHQL_URL ||
  "https://bibliographic-blues-ci-clinton.trycloudflare.com/graphql";

console.log("🌐 GraphQL URL:", GRAPHQL_URL);
console.log(
  "🔍 process.env.EXPO_PUBLIC_GRAPHQL_URL:",
  process.env.EXPO_PUBLIC_GRAPHQL_URL
);
console.log(
  "🔍 Constants.expoConfig?.extra?.GRAPHQL_URL:",
  Constants.expoConfig?.extra?.GRAPHQL_URL
);

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
          console.log("🔑 토큰 확인:", token ? "토큰 있음" : "토큰 없음");

          if (token) {
            console.log("🔑 전체 토큰:", token);
            console.log("🔑 토큰 길이:", token.length);

            // JWT 토큰 구조 확인
            try {
              const parts = token.split(".");
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.log("🔍 토큰 페이로드:", payload);
                console.log("🕐 토큰 만료 시간:", new Date(payload.exp * 1000));
                console.log("🕐 현재 시간:", new Date());
                console.log(
                  "⏰ 토큰 만료 여부:",
                  payload.exp * 1000 < Date.now()
                );

                // 토큰이 만료되었으면 null 반환
                if (payload.exp * 1000 < Date.now()) {
                  console.log("❌ 토큰이 만료되어 세션을 클리어합니다");
                  await clearSession();
                  authState = null;
                  return null;
                }
              }
            } catch (e) {
              console.error("❌ 토큰 파싱 실패:", e);
              authState = null;
              return null;
            }

            console.log("✅ 유효한 토큰을 반환합니다");
            authState = { token };
            return { token };
          }

          console.log("❌ 토큰이 없습니다");
          authState = null;
          return null;
        },

        async refreshAuth() {
          // 토큰 갱신 로직 (현재는 단순히 세션 클리어)
          console.log("🔄 토큰 갱신 시도 - 세션을 클리어합니다");
          await clearSession();
          authState = null;
          return null;
        },
      };
    }),
    fetchExchange,
  ],
});
