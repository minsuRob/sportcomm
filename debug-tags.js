const {
  ApolloClient,
  InMemoryCache,
  gql,
  createHttpLink,
} = require("@apollo/client");
const fetch = require("cross-fetch");

/**
 * 태그 디버깅 스크립트
 * 데이터베이스에 저장된 태그와 게시물 태그 관계를 확인합니다.
 */

// GraphQL 클라이언트 설정
const client = new ApolloClient({
  link: createHttpLink({
    uri: "http://localhost:3000/graphql",
    fetch,
  }),
  cache: new InMemoryCache(),
});

// 모든 태그 조회 쿼리
const GET_ALL_TAGS = gql`
  query GetAllTags {
    tags {
      id
      name
      usageCount
      createdAt
    }
  }
`;

// 모든 게시물 조회 쿼리
const GET_ALL_POSTS = gql`
  query GetAllPosts {
    posts(input: { limit: 20 }) {
      posts {
        id
        title
        content
        tags {
          id
          name
        }
        author {
          nickname
        }
      }
      metadata {
        totalCount
      }
    }
  }
`;

// 특정 검색어로 검색 쿼리 (디버깅용)
const DEBUG_SEARCH = gql`
  query DebugSearch($input: SearchInput!) {
    search(input: $input) {
      posts {
        id
        title
        content
        tags {
          id
          name
        }
        author {
          nickname
        }
      }
      metadata {
        totalCount
      }
    }
  }
`;

/**
 * 모든 태그 조회
 */
async function getAllTags() {
  console.log("🔍 모든 태그 조회 중...");

  try {
    const { data } = await client.query({
      query: GET_ALL_TAGS,
      fetchPolicy: "network-only",
    });

    const tags = data?.tags || [];
    console.log(`✅ 총 ${tags.length}개의 태그 발견:`);

    tags.forEach((tag, index) => {
      console.log(
        `   ${index + 1}. ${tag.name} (ID: ${tag.id}, 사용횟수: ${tag.usageCount})`
      );
    });

    return tags;
  } catch (error) {
    console.error("❌ 태그 조회 중 오류:", error.message);
    return [];
  }
}

/**
 * 모든 게시물 조회
 */
async function getAllPosts() {
  console.log("\n🔍 모든 게시물 조회 중...");

  try {
    const { data } = await client.query({
      query: GET_ALL_POSTS,
      fetchPolicy: "network-only",
    });

    const posts = data?.posts?.posts || [];
    const totalCount = data?.posts?.metadata?.totalCount || 0;

    console.log(`✅ 총 ${totalCount}개의 게시물 중 ${posts.length}개 조회:`);

    posts.forEach((post, index) => {
      console.log(`\n   📝 게시물 ${index + 1}:`);
      console.log(`      ID: ${post.id}`);
      console.log(`      제목: ${post.title || "제목 없음"}`);
      console.log(`      작성자: ${post.author?.nickname || "알 수 없음"}`);

      if (post.tags && post.tags.length > 0) {
        console.log(
          `      태그: ${post.tags.map((tag) => `#${tag.name}`).join(", ")}`
        );
      } else {
        console.log(`      태그: 없음`);
      }
    });

    return posts;
  } catch (error) {
    console.error("❌ 게시물 조회 중 오류:", error.message);
    return [];
  }
}

/**
 * 특정 검색어로 디버깅 검색
 */
async function debugSearch(searchQuery) {
  console.log(`\n🔍 디버깅 검색: "${searchQuery}"`);

  try {
    const { data } = await client.query({
      query: DEBUG_SEARCH,
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

    console.log(`✅ 검색 결과: ${totalCount}개 게시물`);

    if (posts.length === 0) {
      console.log("❌ 검색 결과가 없습니다.");
      return;
    }

    posts.forEach((post, index) => {
      console.log(`\n   📝 게시물 ${index + 1}:`);
      console.log(`      ID: ${post.id}`);
      console.log(`      제목: ${post.title || "제목 없음"}`);
      console.log(`      작성자: ${post.author?.nickname || "알 수 없음"}`);

      if (post.tags && post.tags.length > 0) {
        console.log(
          `      태그: ${post.tags.map((tag) => `#${tag.name}`).join(", ")}`
        );
      } else {
        console.log(`      태그: 없음`);
      }
    });

    return { posts, totalCount };
  } catch (error) {
    console.error("❌ 디버깅 검색 중 오류:", error.message);
    return null;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log("🏟️ 스포츠 커뮤니티 태그 디버깅");
    console.log("=" * 50);

    // 1. 모든 태그 조회
    const tags = await getAllTags();

    // 2. 모든 게시물 조회
    const posts = await getAllPosts();

    // 3. 특정 검색어로 디버깅 검색
    console.log("\n" + "=" * 50);
    console.log("🔍 디버깅 검색 테스트");

    await debugSearch("#전술분석");
    await debugSearch("전술분석");
    await debugSearch("손흥민");

    console.log("\n" + "=" * 50);
    console.log("🎯 디버깅 완료!");

    // 4. 요약 정보
    console.log(`\n📊 요약:`);
    console.log(`   - 총 태그 수: ${tags.length}개`);
    console.log(`   - 총 게시물 수: ${posts.length}개`);

    const postsWithTags = posts.filter(
      (post) => post.tags && post.tags.length > 0
    );
    console.log(`   - 태그가 있는 게시물: ${postsWithTags.length}개`);
  } catch (error) {
    console.error("❌ 디버깅 실행 중 오류 발생:", error);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = {
  getAllTags,
  getAllPosts,
  debugSearch,
};
