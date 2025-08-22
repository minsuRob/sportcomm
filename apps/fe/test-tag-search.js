const {
  ApolloClient,
  InMemoryCache,
  gql,
  createHttpLink,
} = require("@apollo/client");
const fetch = require("cross-fetch");

/**
 * 태그 검색 테스트 스크립트
 * "#전술분석" 같은 태그로 검색하고 결과를 반복해서 확인합니다.
 */

// GraphQL 클라이언트 설정
const client = new ApolloClient({
  link: createHttpLink({
    uri: "http://localhost:3000/graphql",
    fetch,
  }),
  cache: new InMemoryCache(),
});

// 태그 검색 쿼리
const SEARCH_TAGS_QUERY = gql`
  query SearchTags($input: SearchInput!) {
    search(input: $input) {
      posts {
        id
        title
        content
        tags {
          id
          name
          color
        }
        author {
          id
          nickname
        }
        createdAt
        viewCount
        likeCount
        commentCount
      }
      metadata {
        totalCount
        currentPage
        pageSize
        totalPages
        hasNextPage
      }
    }
  }
`;

/**
 * 태그 검색 실행
 */
async function searchWithTag(tagQuery, searchCount = 1) {
  console.log(`\n🔍 [${searchCount}번째 검색] "${tagQuery}" 태그로 검색 중...`);

  try {
    const { data } = await client.query({
      query: SEARCH_TAGS_QUERY,
      variables: {
        input: {
          query: tagQuery,
          page: 0,
          pageSize: 10,
          type: "POSTS",
        },
      },
      fetchPolicy: "network-only",
    });

    const posts = data?.search?.posts || [];
    const metadata = data?.search?.metadata;

    console.log(`✅ 검색 완료: ${metadata?.totalCount || 0}개 게시물 발견`);

    if (posts.length === 0) {
      console.log("❌ 검색 결과가 없습니다.");
      return;
    }

    // 검색 결과 표시
    posts.forEach((post, index) => {
      console.log(`\n📝 게시물 ${index + 1}:`);
      console.log(`   ID: ${post.id}`);
      console.log(`   제목: ${post.title || "제목 없음"}`);
      console.log(`   내용: ${post.content?.substring(0, 100)}...`);
      console.log(`   작성자: ${post.author?.nickname || "알 수 없음"}`);
      console.log(
        `   조회수: ${post.viewCount}, 좋아요: ${post.likeCount}, 댓글: ${post.commentCount}`,
      );

      // 태그 정보 표시
      if (post.tags && post.tags.length > 0) {
        console.log(
          `   태그: ${post.tags.map((tag) => `#${tag.name}`).join(", ")}`,
        );
      } else {
        console.log(`   태그: 없음`);
      }
    });

    return { posts, metadata };
  } catch (error) {
    console.error(`❌ 검색 중 오류 발생:`, error.message);
    return null;
  }
}

/**
 * 반복 검색 테스트
 */
async function runRepeatedSearchTest() {
  console.log("🚀 태그 검색 반복 테스트 시작\n");

  const testTags = [
    "#전술분석",
    "#이적소식",
    "#경기예측",
    "#하이라이트",
    "#MVP",
    "전술분석", // # 없이도 검색
    "손흥민", // 일반 검색어
    "EPL", // 일반 검색어
  ];

  let totalSearchCount = 0;

  for (const tag of testTags) {
    totalSearchCount++;
    const result = await searchWithTag(tag, totalSearchCount);

    if (result) {
      console.log(`\n📊 "${tag}" 검색 결과 요약:`);
      console.log(`   - 총 게시물: ${result.metadata.totalCount}개`);
      console.log(
        `   - 현재 페이지: ${result.metadata.currentPage + 1}/${result.metadata.totalPages}`,
      );
      console.log(
        `   - 다음 페이지: ${result.metadata.hasNextPage ? "있음" : "없음"}`,
      );
    }

    // 검색 간격을 두기 위해 잠시 대기
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(
    `\n🎉 모든 태그 검색 테스트 완료! 총 ${totalSearchCount}번의 검색을 수행했습니다.`,
  );
}

/**
 * 특정 태그로 반복 검색 테스트
 */
async function runSpecificTagRepeatedTest(tagQuery, repeatCount = 5) {
  console.log(
    `🔄 "${tagQuery}" 태그로 ${repeatCount}번 반복 검색 테스트 시작\n`,
  );

  for (let i = 1; i <= repeatCount; i++) {
    const result = await searchWithTag(tagQuery, i);

    if (result) {
      console.log(`\n📈 ${i}번째 검색 결과:`);
      console.log(`   - 검색된 게시물: ${result.posts.length}개`);
      console.log(`   - 총 게시물: ${result.metadata.totalCount}개`);
    }

    // 검색 간격을 두기 위해 잠시 대기
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ "${tagQuery}" 반복 검색 테스트 완료!`);
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log("🏟️ 스포츠 커뮤니티 태그 검색 테스트");
    console.log("=" * 50);

    // 1. 다양한 태그로 검색 테스트
    await runRepeatedSearchTest();

    console.log("\n" + "=" * 50);

    // 2. "#전술분석" 태그로 반복 검색 테스트
    await runSpecificTagRepeatedTest("#전술분석", 3);
  } catch (error) {
    console.error("❌ 테스트 실행 중 오류 발생:", error);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = {
  searchWithTag,
  runRepeatedSearchTest,
  runSpecificTagRepeatedTest,
};
