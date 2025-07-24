import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * API 기본 URL 설정
 * 개발 환경에서는 로컬 서버, 프로덕션 환경에서는 실제 API 서버 URL 사용
 */
const API_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:4000/graphql' // Android 에뮬레이터용
    : 'http://localhost:4000/graphql'  // iOS 에뮬레이터용
  : 'https://api.sportcomm.com/graphql'; // 프로덕션 URL

/**
 * HTTP 링크 생성
 */
const httpLink = createHttpLink({
  uri: API_URL,
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
  // AsyncStorage에서 토큰 가져오기
  const token = await AsyncStorage.getItem('auth_token');

  // 헤더에 토큰 추가
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

/**
 * Apollo Client 생성
 */
export const client = new ApolloClient({
  link: authLink.concat(errorLink).concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // 페이지네이션 관련 캐시 정책 설정
          search: {
            // 검색 결과는 항상 새로운 데이터로 간주 (캐시 병합 안함)
            merge: false,
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});
