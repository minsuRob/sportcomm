import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";

/**
 * 태그 검색 테스트 컴포넌트
 * "#전술분석" 같은 태그로 검색하고 결과를 반복해서 확인할 수 있습니다.
 */
export const TagSearchTest: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("#전술분석");
  const [searchCount, setSearchCount] = useState(0);

  // 검색 쿼리 정의
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

  const { loading, error, data, refetch } = useQuery(SEARCH_TAGS_QUERY, {
    variables: {
      input: {
        query: searchQuery,
        page: 0,
        pageSize: 10,
        type: "POSTS",
      },
    },
    skip: !searchQuery.trim(),
  });

  /**
   * 태그 검색 실행
   */
  const handleSearch = () => {
    setSearchCount((prev) => prev + 1);
    refetch();
  };

  /**
   * 다른 태그로 검색
   */
  const searchWithTag = (tag: string) => {
    setSearchQuery(tag);
    setSearchCount(0);
  };

  /**
   * 검색 결과 표시
   */
  const renderSearchResults = () => {
    if (!data?.search?.posts) return null;

    const posts = data.search.posts;
    const metadata = data.search.metadata;

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsHeader}>
          검색 결과: {metadata.totalCount}개 게시물
        </Text>

        {posts.map((post: any) => (
          <View key={post.id} style={styles.postContainer}>
            <Text style={styles.postTitle}>
              {post.title || "제목 없음"} (ID: {post.id})
            </Text>
            <Text style={styles.postContent}>
              내용: {post.content?.substring(0, 100)}...
            </Text>

            {/* 태그 정보 표시 */}
            <View style={styles.tagsContainer}>
              <Text style={styles.tagsLabel}>태그:</Text>
              {post.tags && post.tags.length > 0 ? (
                post.tags.map((tag: any) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: tag.color
                          ? tag.color + "20"
                          : "#007AFF20",
                      },
                    ]}
                    onPress={() => searchWithTag(`#${tag.name}`)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { color: tag.color || "#007AFF" },
                      ]}
                    >
                      #{tag.name}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noTags}>태그 없음</Text>
              )}
            </View>

            <Text style={styles.authorInfo}>
              작성자: {post.author?.nickname || "알 수 없음"}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>태그 검색 테스트</Text>

      {/* 검색어 표시 */}
      <View style={styles.searchInfo}>
        <Text style={styles.searchQuery}>현재 검색어: {searchQuery}</Text>
        <Text style={styles.searchCount}>검색 횟수: {searchCount}회</Text>
      </View>

      {/* 빠른 태그 검색 버튼들 */}
      <View style={styles.quickSearchContainer}>
        <Text style={styles.sectionTitle}>빠른 태그 검색</Text>
        <View style={styles.tagButtons}>
          {["#전술분석", "#이적소식", "#경기예측", "#하이라이트", "#MVP"].map(
            (tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.quickTagButton}
                onPress={() => searchWithTag(tag)}
              >
                <Text style={styles.quickTagText}>{tag}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* 검색 실행 버튼 */}
      <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
        <Text style={styles.searchButtonText}>검색 실행 (재검색)</Text>
      </TouchableOpacity>

      {/* 로딩 상태 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>검색 중...</Text>
        </View>
      )}

      {/* 오류 상태 */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>오류 발생: {error.message}</Text>
        </View>
      )}

      {/* 검색 결과 */}
      {renderSearchResults()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  searchInfo: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchQuery: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  searchCount: {
    fontSize: 14,
    color: "#666",
  },
  quickSearchContainer: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  tagButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  quickTagButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  quickTagText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  searchButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  searchButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    backgroundColor: "#f8d7da",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f5c6cb",
  },
  errorText: {
    fontSize: 16,
    color: "#721c24",
    textAlign: "center",
  },
  resultsContainer: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  resultsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  postContainer: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 10,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 8,
    color: "#333",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  noTags: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  authorInfo: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
});
