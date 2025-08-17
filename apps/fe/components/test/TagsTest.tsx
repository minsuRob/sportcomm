import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@apollo/client";
import { GET_POSTS } from "../../lib/graphql";

/**
 * 태그 데이터 로딩 테스트 컴포넌트
 * 백엔드에서 tags 데이터가 올바르게 반환되는지 확인합니다.
 */
export const TagsTest: React.FC = () => {
  const { loading, error, data } = useQuery(GET_POSTS, {
    variables: { input: { limit: 5 } },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>로딩 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>오류 발생: {error.message}</Text>
      </View>
    );
  }

  const posts = data?.posts?.posts || [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>태그 데이터 테스트</Text>
      <Text style={styles.subtitle}>총 {posts.length}개의 게시물</Text>

      {posts.map((post: any) => (
        <View key={post.id} style={styles.postContainer}>
          <Text style={styles.postTitle}>
            {post.title || "제목 없음"} (ID: {post.id})
          </Text>
          <Text style={styles.postContent}>
            내용: {post.content?.substring(0, 50)}...
          </Text>

          {/* 태그 정보 표시 */}
          <View style={styles.tagsContainer}>
            <Text style={styles.tagsLabel}>태그:</Text>
            {post.tags && post.tags.length > 0 ? (
              post.tags.map((tag: any) => (
                <Text key={tag.id} style={styles.tag}>
                  #{tag.name}
                </Text>
              ))
            ) : (
              <Text style={styles.noTags}>태그 없음</Text>
            )}
          </View>

          {/* 디버깅 정보 */}
          <Text style={styles.debugInfo}>
            tags 배열 타입:{" "}
            {Array.isArray(post.tags) ? "Array" : typeof post.tags}
          </Text>
          <Text style={styles.debugInfo}>
            tags 길이: {post.tags?.length || 0}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  postContainer: {
    backgroundColor: "white",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  postContent: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
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
    backgroundColor: "#007AFF",
    color: "white",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    fontSize: 12,
  },
  noTags: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  debugInfo: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
});
