import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import PostCard from "../PostCard";

/**
 * 태그 네비게이션 테스트 컴포넌트
 * PostCard에서 태그 클릭 시 검색 화면으로 이동하는 기능을 테스트합니다.
 */
export const TagNavigationTest: React.FC = () => {
  // 테스트용 게시물 데이터
  const testPost = {
    id: "test-post-1",
    title: "테스트 게시물",
    content: "이것은 태그 네비게이션을 테스트하기 위한 게시물입니다.",
    type: "ANALYSIS" as const,
    teamId: "test-team",
    team: {
      id: "test-team",
      name: "테스트팀",
      sport: {
        id: "soccer",
        name: "축구",
        icon: "⚽",
      },
    },
    tags: [
      { id: "tag-1", name: "전술분석" },
      { id: "tag-2", name: "이적소식" },
      { id: "tag-3", name: "경기예측" },
    ],
    media: [],
    author: {
      id: "test-user",
      nickname: "테스트유저",
      profileImageUrl: undefined,
      isFollowing: false,
      myTeams: [],
    },
    likeCount: 5,
    isLiked: false,
    createdAt: new Date().toISOString(),
    commentCount: 2,
    viewCount: 10,
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>태그 네비게이션 테스트</Text>
      <Text style={styles.description}>
        아래 게시물의 태그를 클릭하면 검색 화면으로 이동하여 자동으로 검색이
        실행됩니다.
      </Text>

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>테스트 방법:</Text>
        <Text style={styles.instructionText}>
          1. 게시물의 태그 중 하나를 클릭하세요
        </Text>
        <Text style={styles.instructionText}>
          2. 검색 화면으로 자동 이동됩니다
        </Text>
        <Text style={styles.instructionText}>
          3. 해당 태그로 자동 검색이 실행됩니다
        </Text>
      </View>

      <View style={styles.postContainer}>
        <PostCard post={testPost} />
      </View>

      <View style={styles.noteContainer}>
        <Text style={styles.noteTitle}>참고사항:</Text>
        <Text style={styles.noteText}>
          • 태그 클릭 시 router.push()를 통해 검색 화면으로 이동
        </Text>
        <Text style={styles.noteText}>
          • URL 파라미터로 query와 autoSearch 전달
        </Text>
        <Text style={styles.noteText}>
          • 검색 화면에서 자동으로 검색어 설정 및 검색 실행
        </Text>
      </View>
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
    marginBottom: 10,
    color: "#333",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
  instructions: {
    backgroundColor: "#e3f2fd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1976d2",
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: "#424242",
    marginBottom: 4,
    lineHeight: 20,
  },
  postContainer: {
    marginBottom: 20,
  },
  noteContainer: {
    backgroundColor: "#fff3e0",
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e65100",
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: "#424242",
    marginBottom: 4,
    lineHeight: 20,
  },
});
