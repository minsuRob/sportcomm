import React from "react";
import { View } from "react-native";
import PostHeader, { PostType } from "../shared/PostHeader";

/**
 * PostHeader 컴포넌트 테스트용 컴포넌트
 */
export default function PostHeaderTest() {
  const mockPost = {
    id: "test-post-1",
    title: "테스트 게시물 제목",
    content:
      "테스트 게시물 내용입니다. 이것은 수정 기능을 테스트하기 위한 샘플 내용입니다.",
    author: {
      id: "test-user-1",
      nickname: "테스트사용자",
      profileImageUrl: undefined,
    },
    createdAt: new Date().toISOString(),
    type: PostType.ANALYSIS,
  };

  const handleFollowToggle = async () => {
    console.log("팔로우 토글 테스트");
  };

  const handlePress = () => {
    console.log("게시물 클릭 테스트");
  };

  const handlePostUpdated = (updatedPost: any) => {
    console.log("게시물 수정됨:", updatedPost);
  };

  return (
    <View style={{ padding: 16, backgroundColor: "white" }}>
      <PostHeader
        post={mockPost}
        currentUserId="test-user-1" // 본인 게시물로 설정하여 수정 버튼 테스트
        isFollowing={false}
        onFollowToggle={handleFollowToggle}
        onPress={handlePress}
        showFollowButton={true}
        onPostUpdated={handlePostUpdated}
      />
    </View>
  );
}
