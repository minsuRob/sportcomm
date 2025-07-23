import { createClient, cacheExchange, fetchExchange } from "urql";
import { getSession } from "@/lib/auth";

// 커스텀 fetch 함수로 헤더를 확실하게 설정
const authenticatedFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const { token } = await getSession();

  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });
};

/**
 * localhost 환경용 urql GraphQL 클라이언트 설정
 */
export const client = createClient({
  url: "http://localhost:3000/graphql",
  exchanges: [cacheExchange, fetchExchange],
  fetch: authenticatedFetch,
});
