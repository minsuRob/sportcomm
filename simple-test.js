const {
  ApolloClient,
  InMemoryCache,
  gql,
  createHttpLink,
} = require("@apollo/client");
const fetch = require("cross-fetch");

// GraphQL 클라이언트 설정
const client = new ApolloClient({
  link: createHttpLink({
    uri: "http://localhost:3000/graphql",
    fetch,
  }),
  cache: new InMemoryCache(),
});

// 간단한 검색 쿼리
const SIMPLE_SEARCH = gql`
  query SimpleSearch($input: SearchInput!) {
    search(input: $input) {
      posts {
        id
        title
        content
        tags {
          id
          name
        }
      }
      metadata {
        totalCount
      }
    }
  }
`;

async function testSearch(searchQuery) {
  console.log(`\n🔍 검색 테스트: "${searchQuery}"`);

  try {
    const { data } = await client.query({
      query: SIMPLE_SEARCH,
      variables: {
        input: {
          query: searchQuery,
          page: 0,
          pageSize: 10,
          type: "POSTS",
        },
      },
      fetchPolicy: "network-only",
    });

    const posts = data?.search?.posts || [];
    const totalCount = data?.search?.metadata?.totalCount || 0;

    console.log(`✅ 결과: ${totalCount}개 게시물`);

    if (posts.length > 0) {
      posts.forEach((post, index) => {
        console.log(
          `   ${index + 1}. ${post.title || "제목 없음"} (태그: ${post.tags?.map((t) => t.name).join(", ") || "없음"})`
        );
      });
    }

    return { posts, totalCount };
  } catch (error) {
    console.error(`❌ 오류: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("🧪 간단한 태그 검색 테스트");

  // 다양한 검색어로 테스트
  const testQueries = [
    "전술분석",
    "#전술분석",
    "전술",
    "분석",
    "ㅜㅜ",
    "둣산",
    "손흥민",
    "EPL",
  ];

  for (const query of testQueries) {
    await testSearch(query);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n🎯 테스트 완료!");
}

main();
