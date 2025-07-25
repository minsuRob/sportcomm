import React from "react";
import { View } from "react-native";
import PostHeader, { PostType } from "../shared/PostHeader";

/**
 * PostHeader 컴포넌트 테스트용 컴포넌트
 */
export default function PostHeaderTest() {
  const mockPost = {
    id: "test-post-1",
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

  return (
    <View style={{ padding: 16, backgroundColor: "white" }}>
      <PostHeader
        post={mockPost}
        currentUserId="current-user-id"
        isFollowing={false}
        onFollowToggle={handleFollowToggle}
        onPress={handlePress}
        showFollowButton={true}
      />
    </View>
  );
}
